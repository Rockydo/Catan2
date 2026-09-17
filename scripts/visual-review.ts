import { chromium } from "@playwright/test";
import { funded } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const page = await browser.newPage({
  viewport: { width: 1600, height: 1000 },
  deviceScaleFactor: 1,
});
await page.goto("http://127.0.0.1:4173");
await page.screenshot({ path: "test-artifacts/v2-menu.png" });
await page.evaluate(({ key, data }) => localStorage.setItem(key, data), {
  key: SAVE_KEY,
  data: serialize(funded()),
});
await page.reload();
await page.getByRole("button", { name: /Continue campaign/ }).click();
await page.waitForTimeout(700);
await page.screenshot({ path: "test-artifacts/v2-board.png" });
await browser.close();
