import { expect, test } from "@playwright/test";
import { SAVE_KEY, deserialize, serialize } from "../src/game/save";
import { applySnapshotDelta } from "../src/game/snapshot-delta";
import { funded } from "../tests/helpers";
import { browserSave } from "../scripts/browser-save";

test("AI patches save directly and coalesce exactly behind a pending acknowledgement", async ({
  page,
}) => {
  const initial = funded("ai-save-delta"),
    errors: string[] = [];
  initial.players[0].control = "standard";
  initial.players[1].control = "human";
  initial.players[0].turns = 4;
  initial.players[0].researchPurchases = 6;
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-ai-pacing", "20");
      localStorage.setItem("catane-language", "en");
      const w = window as any,
        Native = window.Worker;
      w.received = [];
      w.savePosts = [];
      w.holdSave = false;
      const deltas = new WeakSet();
      window.Worker = class extends Native {
        ai: boolean;
        saving: boolean;
        constructor(url: string | URL, options?: WorkerOptions) {
          super(url, options);
          this.ai = String(url).includes("ai.worker");
          this.saving = String(url).includes("save.worker");
          if (this.ai) w.aiWorker = this;
          if (this.saving) w.saveWorker = this;
          this.addEventListener("message", (event) => {
            if (this.ai) {
              event.stopImmediatePropagation();
              w.received.push(event.data);
              if (event.data.delta) deltas.add(event.data.delta);
            } else if (
              this.saving &&
              w.holdSave &&
              event.data.type === "save"
            ) {
              event.stopImmediatePropagation();
              w.heldSave = event.data;
            }
          });
        }
        postMessage(data: any) {
          if (this.saving && data.type === "save")
            w.savePosts.push({
              full: !!data.game,
              forwarded: deltas.has(data.delta),
              delta: data.delta,
            });
          super.postMessage(data);
        }
      };
    },
    { key: SAVE_KEY, data: serialize(initial) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  const start = await page.evaluate(() => {
    (window as any).holdSave = true;
    return (window as any).savePosts.length;
  });
  let expected = deserialize(serialize(initial));
  for (let reply = 0; reply < 3; reply++) {
    await expect
      .poll(() => page.evaluate(() => (window as any).received.length))
      .toBeGreaterThan(reply);
    const next = await page.evaluate(
      (index) => (window as any).received[index],
      reply,
    );
    expect(next.error).toBeUndefined();
    expect(next.delta).toBeDefined();
    expect(next.commands.length).toBeGreaterThan(0);
    expected = applySnapshotDelta(expected, next.delta);
    await page.evaluate((index) => {
      const w = window as any;
      w.aiWorker.onmessage(
        new MessageEvent("message", { data: w.received[index] }),
      );
    }, reply);
    if (reply === 0)
      await expect
        .poll(() => page.evaluate(() => !!(window as any).heldSave))
        .toBe(true);
  }
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
  await expect(page.locator(".save-status")).toHaveText("Saving…");
  const posted = await page.evaluate(
    (offset) => (window as any).savePosts.slice(offset),
    start,
  );
  expect(posted).toHaveLength(1);
  expect(posted[0]).toMatchObject({ forwarded: true, full: false });
  await page.evaluate(() => {
    const w = window as any;
    w.holdSave = false;
    w.saveWorker.onmessage(new MessageEvent("message", { data: w.heldSave }));
  });
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  expect(
    await page.evaluate(
      (offset) => (window as any).savePosts.length - offset,
      start,
    ),
  ).toBe(2);
  expect(JSON.parse((await browserSave(page))!).game).toEqual(expected);
  // Reload the durable result. The held first AI reply prevents advancing it.
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  expect(JSON.parse((await browserSave(page))!).game).toEqual(expected);
  expect(errors).toEqual([]);
});
