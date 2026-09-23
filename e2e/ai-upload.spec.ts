import { test, expect } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { piece, run } from "../tests/helpers";
import { deserialize, serialize } from "../src/game/save";
import { browserSave } from "../scripts/browser-save";

test("large initial AI uploads cancel on pause, resynchronize once and preserve the complete roll", async ({
  page,
}) => {
  const { s, water } = fishingFixture();
  for (let i = 0; i < 20_000; i++) piece(s, water, 0, "fishing", 1);
  s.players[0].control = "standard";
  s.players[1].control = "human";
  s.active = 0;
  s.phase = "roll";
  const loaded = deserialize(serialize(s)),
    expected = run(loaded, { type: "roll" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => {
    localStorage.setItem("catane-language", "en");
    localStorage.setItem("catane-ai-pacing", "20");
    const w = window as any,
      Native = window.Worker;
    w.uploads = [];
    w.uploadWorkerCount = 0;
    w.uploadReplies = 0;
    w.cancelUpload = true;
    w.dropChunk = false;
    w.uploadResyncs = 0;
    const pause = () => {
      const button = document.querySelector<HTMLButtonElement>(
        'button[aria-label="Pause AI"]',
      );
      if (!button) throw Error("Missing pause control during upload");
      button.click();
    };
    window.Worker = class extends Native {
      ai = false;
      constructor(url: string | URL, options?: WorkerOptions) {
        super(url, options);
        this.ai = String(url).includes("ai.worker");
        if (!this.ai) return;
        w.uploadWorkerCount++;
        this.addEventListener("message", ({ data }) => {
          if (data.resync) w.uploadResyncs++;
          else {
            w.uploadReplies++;
            setTimeout(pause, 0);
          }
        });
      }
      postMessage(data: any) {
        if (this.ai) {
          w.uploads.push({
            upload: data.upload,
            request: data.request,
            offset: data.offset,
          });
          if (data.upload === "pieces" && w.cancelUpload) {
            w.cancelUpload = false;
            setTimeout(pause, 0);
          }
          if (data.upload === "pieces" && data.offset === 2048 && w.dropChunk) {
            w.dropChunk = false;
            return; // Exercise complete restart of an incomplete transfer.
          }
        }
        super.postMessage(data);
      }
    };
  });
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "upload.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(s)),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  await expect(page.locator(".save-status")).toHaveText("Saved locally");
  await page.getByRole("button", { name: "Resume AI", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).uploads.length))
    .toBeGreaterThan(1);
  await expect(
    page.getByRole("button", { name: "Resume AI", exact: true }),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).uploadReplies)).toBe(0);
  expect(
    await page.evaluate(() =>
      (window as any).uploads.some((m: any) => m.upload === "ready"),
    ),
  ).toBe(false);
  expect(JSON.parse((await browserSave(page))!).game).toEqual(loaded);
  await page.evaluate(() => {
    (window as any).dropChunk = true;
  });
  await page.getByRole("button", { name: "Resume AI", exact: true }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).uploadReplies))
    .toBe(1);
  await expect(
    page.getByRole("button", { name: "Resume AI", exact: true }),
  ).toBeVisible();
  await expect
    .poll(async () => JSON.parse((await browserSave(page))!).game.actions)
    .toBe(expected.actions);
  expect(JSON.parse((await browserSave(page))!).game).toEqual(expected);
  expect(await page.evaluate(() => (window as any).uploadWorkerCount)).toBe(2);
  expect(await page.evaluate(() => (window as any).uploadResyncs)).toBe(1);
  expect(
    await page.evaluate(
      () =>
        (window as any).uploads.filter((m: any) => m.upload === "start").length,
    ),
  ).toBe(3);
  expect(errors).toEqual([]);
});
