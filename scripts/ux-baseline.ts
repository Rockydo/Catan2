import { chromium } from "@playwright/test";
import { fishingFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const { s, home } = fishingFixture();
await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
  key: SAVE_KEY,
  data: serialize(s),
});
await page.goto("http://127.0.0.1:4173/");
await page.getByRole("button", { name: /Continue campaign/ }).click();
await page.screenshot({ path: "test-artifacts/ux-before/map.png" });
const metrics = await page.locator(".board-frame").evaluate((el) => ({
  width: el.clientWidth,
  height: el.clientHeight,
  viewport: innerWidth * innerHeight,
  area: el.clientWidth * el.clientHeight,
}));
writeFileSync("test-artifacts/ux-before/metrics.json", JSON.stringify(metrics));
await page.getByTestId(`town-${home.id}`).click();
await page.getByRole("button", { name: "Forces", exact: true }).click();
await page.screenshot({ path: "test-artifacts/ux-before/recruitment.png" });
await browser.close();
