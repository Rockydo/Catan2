import { chromium } from "@playwright/test";
import { funded } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { waterAtVertex } from "../src/game/world";
import { fishingFixture } from "../tests/maritime-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import { writeFileSync } from "node:fs";
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
const results = [];
for (const viewport of [
  { width: 1440, height: 900 },
  { width: 1280, height: 720 },
  { width: 393, height: 873 },
]) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const { s, home } = fishingFixture();
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("http://127.0.0.1:4173/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.screenshot({
    animations: "disabled",
    path: `test-artifacts/ux-map-${viewport.width}.png`,
  });
  const metrics = await page.locator(".board-frame").evaluate((el) => ({
    width: el.clientWidth,
    height: el.clientHeight,
    area: el.clientWidth * el.clientHeight,
    viewportArea: innerWidth * innerHeight,
  }));
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page.getByRole("button", { name: "Navy", exact: true }).click();
  await page.getByRole("button", { name: "Tier II", exact: true }).click();
  await page.screenshot({
    animations: "disabled",
    path: `test-artifacts/ux-navy-${viewport.width}.png`,
  });
  const scroll = await page
    .locator(".panel-content")
    .evaluate((el) => ({ content: el.scrollHeight, visible: el.clientHeight }));
  results.push({ viewport, ...metrics, scroll, errors });
  await page.close();
}
writeFileSync(
  "test-artifacts/ux-metrics.json",
  JSON.stringify(results, null, 2),
);
console.log(JSON.stringify(results));
const page = await browser.newPage({
  viewport: { width: 1440, height: 900 },
  reducedMotion: "reduce",
});
const campaign = funded("ux-final-review");
const port = ownTowns(campaign).find(
  (t) => waterAtVertex(campaign, t.vertex).length,
)!;
port.level = port.turnLevel = 4;
await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
  key: SAVE_KEY,
  data: serialize(campaign),
});
await page.goto("http://127.0.0.1:4173/");
await page.getByRole("button", { name: /Continue campaign/ }).click();
await page.screenshot({
  path: "test-artifacts/ux-final-map.png",
  animations: "disabled",
});
await page.getByTestId(`town-${port.id}`).click();
for (const name of ["Build", "Forces", "Trade", "Research", "Explore"]) {
  await page.getByRole("button", { name, exact: true }).click();
  if (name === "Forces") {
    await page.getByRole("button", { name: "Navy", exact: true }).click();
    await page.getByRole("button", { name: "Tier II", exact: true }).click();
  }
  await page.screenshot({
    path: `test-artifacts/ux-final-${name.toLowerCase()}.png`,
    animations: "disabled",
  });
}
await page.getByRole("button", { name: "Close action panel" }).click();
await page
  .getByRole("button", { name: "Realms & chronicle", exact: true })
  .click();
await page.screenshot({
  path: "test-artifacts/ux-final-realms.png",
  animations: "disabled",
});
await browser.close();
