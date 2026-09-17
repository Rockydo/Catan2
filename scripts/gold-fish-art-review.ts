import { chromium, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { generateHex } from "../src/game/world";
import { serialize, SAVE_KEY } from "../src/game/save";
const { s, home } = maritimeFixture();
for (const tile of Object.values(s.tiles)) {
  const art = generateHex("art-review", tile.id);
  tile.resource = art.resource;
  tile.number = art.number;
  if (art.fish) tile.fish = true;
  else delete tile.fish;
}
s.tiles["0,0"].resource = "gold";
delete s.tiles["0,0"].fish;
s.tiles["3,0"].resource = "coal";
delete s.tiles["3,0"].fish;
for (const id of ["0,-1", "1,0"]) {
  s.tiles[id].resource = "water";
  s.tiles[id].fish = true;
}
s.tiles["1,-1"].resource = "water";
delete s.tiles["1,-1"].fish;
for (const town of Object.values(s.towns))
  for (const g of Object.keys(town.stock))
    town.stock[g as keyof typeof town.stock] = 3;
const browser = await chromium.launch({
  executablePath: "/usr/bin/chromium",
  args: ["--no-sandbox"],
});
try {
  const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    }),
    errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("http://127.0.0.1:4173/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByTestId(`town-${home.id}`).click();
  await page.getByRole("button", { name: "Center selected location" }).click();
  for (let i = 0; i < 3; i++)
    await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.evaluate(async () => {
    await Promise.all(
      ["terrain-gold-v1.png", "terrain-fish-v2.png"].map(
        (file) =>
          new Promise((resolve, reject) => {
            const i = new Image();
            i.onload = resolve;
            i.onerror = reject;
            i.src = `/assets/${file}`;
          }),
      ),
    );
  });
  await page.screenshot({ path: "test-artifacts/gold-fish-art-board.png" });
  expect(errors).toEqual([]);
  console.log(
    "Generated terrain loaded and board rendered without browser errors.",
  );
} finally {
  await browser.close();
}
