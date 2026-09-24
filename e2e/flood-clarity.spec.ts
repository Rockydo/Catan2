import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { serialize, assertInvariants } from "../src/game/save";

test("floodplain selection explains water level, lost harvest and protection", async ({
  page,
}) => {
  let s = newGame("flood-clarity");
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.calendar = { ...s.calendar!, startSeason: "spring" };
  s.phase = "economy";
  for (const tile of Object.values(s.tiles)) delete tile.iceWeather;
  syncSeasonSurfaces(s);
  assertInvariants(s);
  const t = Object.values(s.tiles).find(
    (t) => t.geography?.access === "flooded",
  )!;
  expect(t).toBeTruthy();
  await page.addInitScript(() => localStorage.setItem("catane-language", "en"));
  await page.goto("/");
  await page.locator("input[type=file]").setInputFiles({
    name: "flood.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(s)),
  });
  await expect(
    page.getByText("Game imported. AI is paused until you resume."),
  ).toBeVisible();
  await page.getByTestId(`hex-${t.id}`).click();
  await expect(page.getByTestId(`hex-${t.id}`)).toHaveClass(/selected/);
  const panel = page.locator(".floodplain-status");
  await expect(panel).toBeVisible();
  await expect(panel).toContainText("Flooded now");
  await expect(panel).toContainText("Water level");
  await expect(panel.locator(".flood-art-comparison svg")).toHaveCount(2);
  await page.locator(".map-view-select").selectOption("flooding");
  await expect(
    page.getByText("Dry floodplain", { exact: true }).first(),
  ).toBeVisible();
  await page.screenshot({
    path: `test-artifacts/flood-panel-${test.info().project.name}.png`,
  });
});

test("bilingual rulebook shows distinct dry and flooded seasonal ground", async ({
  page,
}) => {
  for (const locale of ["en", "fr"]) {
    await page.goto(
      locale === "en" ? "/rules.html#geography" : "/rules-fr.html#geography",
    );
    const ref = page.locator(".geography-reference");
    await ref.locator("select").selectOption("arctic");
    await expect(ref.locator(".flood-art-comparison svg")).toHaveCount(2);
    expect(
      await ref
        .locator(".flood-art-comparison")
        .evaluate((e) => e.getBoundingClientRect().width),
    ).toBeLessThanOrEqual(560);
    await expect(ref.locator(".flooded-terrain")).toHaveCount(1);
    await page.screenshot({
      path: `test-artifacts/flood-guide-${locale}-${test.info().project.name}.png`,
    });
  }
});
