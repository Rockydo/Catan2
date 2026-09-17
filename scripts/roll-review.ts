import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { harvestFixture } from "../tests/roll-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
mkdirSync("test-artifacts/roll", { recursive: true });
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
for (const [name, width, height] of [
  ["desktop", 1600, 1000],
  ["laptop", 1280, 800],
  ["mobile", 390, 844],
  ["compact", 320, 740],
] as const) {
  const page = await browser.newPage({ viewport: { width, height } });
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(harvestFixture()),
  });
  await page.goto("http://127.0.0.1:4173");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "Roll dice", exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Skip animation" }),
  ).toHaveCount(0);
  if (name === "desktop")
    await page.screenshot({ path: "test-artifacts/roll/immediate.png" });
  await page.getByRole("button", { name: "Keep open" }).click();
  await expect(
    page.getByRole("region", { name: "Dice roll and production" }),
  ).toContainText("Report held open");
  await page.screenshot({
    path: `test-artifacts/roll/${name}.png`,
    animations: "disabled",
  });
  console.log(
    name,
    await page.evaluate(() => ({
      body: document.body.scrollWidth,
      viewport: innerWidth,
    })),
  );
  await page.close();
}
await browser.close();
