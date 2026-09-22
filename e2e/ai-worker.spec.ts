import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { REALM_NAMES } from "../src/game/content";
import { GOODS } from "../src/game/types";
import { chooseAIAction } from "../src/game/ai";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";
import { run } from "../tests/helpers";

test("Grand AI reuses its worker, ignores stale replies, and cancels pending work on pause", async ({
  page,
}) => {
  let s = newGame(
    "grand-worker-reuse",
    REALM_NAMES.map((name, i) => ({
      name,
      control: i === 0 ? "human" : "standard",
    })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.active = 1;
  s.phase = "economy";
  for (const good of GOODS) ownTowns(s, 1)[0].stock[good] = 200;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  // Instrument actual workers; hold a real response to exercise cancellation.
  await page.addInitScript(() => {
    const w = window as any;
    localStorage.setItem("catane-ai-pacing", "20");
    w.aiWorkers = [];
    w.aiRequests = [];
    w.aiHold = false;
    const NativeWorker = window.Worker;
    window.Worker = class extends NativeWorker {
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        if (!String(url).includes("ai.worker")) return;
        w.aiWorkers.push(this);
        this.addEventListener("message", (event) => {
          if (w.aiHold) {
            event.stopImmediatePropagation();
            w.aiHeldReply = event.data;
          }
        });
      }
      postMessage(message: any) {
        if (message.state) w.aiRequests.push(message.request);
        super.postMessage(message);
      }
    };
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).aiRequests.length))
    .toBeGreaterThanOrEqual(3);
  expect(await page.evaluate(() => (window as any).aiWorkers.length)).toBe(1);
  await page.evaluate(() => {
    (window as any).aiHold = true;
  });
  await expect
    .poll(() => page.evaluate(() => Boolean((window as any).aiHeldReply)))
    .toBe(true);
  const actions = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
    SAVE_KEY,
  );
  // Deliver an old request number to the live callback: it must be ignored.
  await page.evaluate(() => {
    const w = window as any;
    w.aiWorkers[0].onmessage(
      new MessageEvent("message", { data: { ...w.aiHeldReply, request: -1 } }),
    );
  });
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
      SAVE_KEY,
    ),
  ).toBe(actions);
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
  await page.waitForTimeout(400);
  expect(
    await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
      SAVE_KEY,
    ),
  ).toBe(actions);
  await page.evaluate(() => {
    (window as any).aiHold = false;
  });
  await page.getByRole("button", { name: "Resume AI", exact: true }).click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
        SAVE_KEY,
      ),
    )
    .toBeGreaterThan(actions);
  expect(await page.evaluate(() => (window as any).aiWorkers.length)).toBe(2);
  const requests = await page.evaluate(
    () => (window as any).aiRequests as number[],
  );
  expect(new Set(requests).size).toBe(requests.length);
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
});
