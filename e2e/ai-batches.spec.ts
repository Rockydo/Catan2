import { test, expect } from "@playwright/test";
import { funded, run } from "../tests/helpers";
import { SAVE_KEY, deserialize, serialize } from "../src/game/save";
import type { Command } from "../src/game/types";

test("bulk AI orders are applied together and saved with exact payments", async ({
  page,
}) => {
  const s = funded();
  s.players[0].control = "standard";
  s.players[1].control = "human";
  s.players[0].turns = 4;
  s.players[0].researchPurchases = 6;
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-ai-pacing", "20");
      const w = window as any;
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          if (!String(url).includes("ai.worker")) return;
          w.aiWorker = this;
          this.addEventListener("message", (event) => {
            event.stopImmediatePropagation();
            w.aiReply = event.data;
          });
        }
      };
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(() => page.evaluate(() => Boolean((window as any).aiReply)))
    .toBe(true);
  const reply = await page.evaluate(() => (window as any).aiReply);
  expect(reply.error).toBeUndefined();
  const commands: Command[] = reply.commands;
  expect(commands.length).toBeGreaterThan(1);
  expect(commands[0]).toMatchObject({ type: "recruit", count: 3 });
  let expected = s;
  for (const c of commands) expected = run(expected, c);
  await page.evaluate(() => {
    const w = window as any;
    w.aiWorker.onmessage(new MessageEvent("message", { data: w.aiReply }));
  });
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
        SAVE_KEY,
      ),
    )
    .toBe(expected.actions);
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
  const actual = deserialize(
    await page.evaluate((key) => localStorage.getItem(key)!, SAVE_KEY),
  );
  expect(actual.pieces).toEqual(expected.pieces);
  expect(actual.towns).toEqual(expected.towns);
  expect(actual.routes).toEqual(expected.routes);
  expect(errors).toEqual([]);
});
