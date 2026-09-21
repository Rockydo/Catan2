import { test, expect } from "@playwright/test";
import { coalitionStressFixture } from "../tests/coalition-stress-fixture";
import {
  serialize,
  deserialize,
  SAVE_KEY,
  assertInvariants,
} from "../src/game/save";

test("a large coalition trade completes in the real worker and survives reload", async ({
  page,
}) => {
  const state = coalitionStressFixture();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "en");
      localStorage.setItem("catane-ai-pacing", "20");
      const w = window as any;
      w.replies = [];
      const NativeWorker = window.Worker;
      window.Worker = class extends NativeWorker {
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          w.testWorker = this;
          this.addEventListener("message", (event) => {
            // Inspect the genuine worker reply before allowing the next action.
            event.stopImmediatePropagation();
            w.replies.push(event.data);
          });
        }
      };
    },
    { key: SAVE_KEY, data: serialize(state) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).replies.length))
    .toBe(1);
  const reply = await page.evaluate(() => (window as any).replies[0]);
  expect(reply.error, reply.stack).toBeUndefined();
  expect(reply.command).toMatchObject({ type: "respond-trade", actor: 0 });
  await page.evaluate(() => {
    const w = window as any;
    w.testWorker.onmessage(new MessageEvent("message", { data: w.replies[0] }));
  });
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game.actions,
        SAVE_KEY,
      ),
    )
    .toBe(state.actions + 1);
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
  const saved = deserialize(
    await page.evaluate((key) => localStorage.getItem(key)!, SAVE_KEY),
  );
  assertInvariants(saved);
  expect(saved.trade).toBeUndefined();
  expect(Object.keys(saved.pieces)).toHaveLength(3000);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const reloaded = deserialize(
    await page.evaluate((key) => localStorage.getItem(key)!, SAVE_KEY),
  );
  expect(reloaded).toEqual(saved);
  expect(errors).toEqual([]);
});
