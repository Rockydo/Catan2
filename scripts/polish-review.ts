import { chromium, expect } from "@playwright/test";
import { existsSync, mkdirSync } from "node:fs";
import { funded, started, piece } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { production } from "../src/game/economy";
import { serialize, SAVE_KEY } from "../src/game/save";
const folder = `test-artifacts/${process.env.PASS ?? "polish-final"}`;
mkdirSync(folder, { recursive: true });
const browser = await chromium.launch({
  executablePath: existsSync("/usr/bin/chromium")
    ? "/usr/bin/chromium"
    : undefined,
  args: ["--no-sandbox"],
});
for (const [label, width, height] of [
  ["desktop", 1600, 1000],
  ["laptop", 1280, 800],
  ["mobile", 390, 844],
  ["compact", 320, 740],
] as const) {
  const page = await browser.newPage({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  await page.goto("http://127.0.0.1:4173");
  if (label === "desktop")
    await page.screenshot({
      animations: "disabled",
      path: `${folder}/menu.png`,
    });
  let s = label === "compact" ? funded() : started();
  s.phase = "economy";
  s.dice = [3, 4];
  production(s, 7);
  await page.evaluate(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.waitForTimeout(100);
  await page.screenshot({
    animations: "disabled",
    path: `${folder}/${label}-opening.png`,
  });
  if (label === "desktop") {
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
    await page.screenshot({
      animations: "disabled",
      path: `${folder}/map-detail.png`,
    });
    s = funded();
    s.dice = [3, 4];
    const town = ownTowns(s)[0];
    town.level = 4;
    town.turnLevel = 4;
    town.wall = 3;
    const land = landAtVertex(s, town.vertex);
    for (const tile of land) town.extensions[tile] = 3;
    piece(s, land[0], 0, "heavy", 3);
    piece(s, land[0], 0, "light", 2);
    piece(s, land[0], 0, "cavalry", 1);
    for (const r of Object.values(s.routes).filter(
      (r) => r.owner === 0 && r.kind === "road",
    ))
      for (const tile of s.edges[r.edge].tiles)
        if (s.tiles[tile].resource !== "water") r.camps[tile] = 2;
    await page.goto("about:blank");
    await page.addInitScript(
      ({ key, data }) => localStorage.setItem(key, data),
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("http://127.0.0.1:4173");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await page.getByTestId(`town-${town.id}`).click();
    await expect(page.locator(".panel-intro")).toContainText("City III");
    await page
      .getByRole("button", { name: "Center selected location" })
      .click();
    await page.screenshot({
      animations: "disabled",
      path: `${folder}/city.png`,
    });
    for (const tab of ["Forces", "Trade", "Research", "Explore"]) {
      await page.getByRole("button", { name: tab, exact: true }).click();
      await expect(
        page.getByRole("button", { name: tab, exact: true }),
      ).toHaveClass(/active/);
      await page.screenshot({
        animations: "disabled",
        path: `${folder}/${tab.toLowerCase()}.png`,
      });
    }
    await page.getByRole("button", { name: /^Fuel:/ }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.screenshot({
      animations: "disabled",
      path: `${folder}/resource-guide.png`,
    });
  }
  if (label === "mobile" || label === "compact") {
    await page.getByRole("button", { name: "Actions & realm" }).click();
    await page.screenshot({
      animations: "disabled",
      path: `${folder}/${label}-panel.png`,
    });
  }
  console.log(
    label,
    await page.evaluate(() => ({
      viewport: innerWidth,
      body: document.body.scrollWidth,
    })),
  );
  await page.close();
}
await browser.close();
