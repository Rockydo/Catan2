import { test, expect } from "@playwright/test";
import { rebellionFixture } from "../tests/rebellion-fixture";
import { ownTowns } from "../src/game/selectors";
import { unknownAtVertex, nextRandom } from "../src/game/world";
import { SAVE_KEY, serialize, deserialize } from "../src/game/save";
import { piece } from "../tests/helpers";

test("a frontier revival is announced, can be located and persists", async ({
  page,
}, info) => {
  const s = rebellionFixture();
  s.active = 0;
  s.phase = "economy";
  s.frontierRng = Array.from({ length: 1000 }, (_, i) => i).find(
    (seed) => nextRandom(seed)[0] < 0.1,
  )!;
  const home = ownTowns(s, 0)[0];
  home.vertex = Object.keys(s.vertices).find(
    (v) =>
      unknownAtVertex(s, v).length &&
      s.vertices[v].tiles.some((id) => s.tiles[id].resource !== "water"),
  )!;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "Explore", exact: true }).click();
  await page.getByLabel("Expedition size").selectOption("3");
  await page.getByLabel("Launch point").selectOption(home.vertex);
  // The launch panel validates the actual paid expedition; no direct state mutation.
  const launch = page.getByRole("button", { name: /Launch.*expedition/i });
  await expect(launch.first()).toBeVisible();
  await launch.first().click();
  const alert = page.getByTestId("frontier-return-alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Golden Vale returns");
  await page.screenshot({
    path: `test-artifacts/alliance-growth-${info.project.name}-return.png`,
  });
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key)!,
    SAVE_KEY,
  );
  expect(deserialize(saved).players[3].alive).toBe(true);
  await alert.getByRole("button", { name: "Show new territory" }).click();
  await expect(alert).toHaveCount(0);
});

test("a human rebellion is announced when their own turn begins", async ({
  page,
}, info) => {
  const s = rebellionFixture();
  s.active = 2;
  s.phase = "economy";
  s.players[2].control = "human";
  const home = ownTowns(s, 0)[0];
  for (let i = 0; i < 60; i++)
    piece(
      s,
      s.vertices[home.vertex].tiles.find(
        (id) => s.tiles[id].resource !== "water",
      )!,
      0,
      "heavy",
      4,
    );
  s.rebellionRng = Array.from({ length: 1000 }, (_, i) => i).find(
    (seed) => nextRandom(seed)[0] < 0.08,
  )!;
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const handoff = page.getByRole("button", { name: /I am Violet Reach/ });
  if (await handoff.isVisible()) await handoff.click();
  await page.getByRole("button", { name: "End turn", exact: true }).click();
  const next = page.getByRole("button", { name: /I am Emberhold/ });
  if (await next.isVisible()) await next.click();
  const alert = page.getByTestId("rebellion-alert");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("Emberhold");
  const saved = deserialize(
    await page.evaluate((key) => localStorage.getItem(key)!, SAVE_KEY),
  );
  const r = saved.events.find((e) => e.rebellion)!.rebellion!;
  expect(r.victim).toBe(0);
  expect(r.share).toBeGreaterThanOrEqual(15);
  expect(r.share).toBeLessThanOrEqual(35);
  await page.screenshot({
    path: `test-artifacts/alliance-growth-${info.project.name}-human-rebellion.png`,
  });
});
