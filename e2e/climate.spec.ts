import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import AxeBuilder from "@axe-core/playwright";

test("regional terrain art loads in the climate guide", async ({ page }) => {
  await page.goto("/rules.html#world");
  const reference = page.locator(".climate-reference");
  for (const [climate, assets] of [
    [
      "Desert",
      [
        "desert-gold",
        "desert-iron",
        "desert-stone",
        "desert-coal",
        "desert-salt",
        "oasis",
      ],
    ],
    [
      "Tropical",
      [
        "tropical-gold",
        "tropical-iron",
        "tropical-stone",
        "tropical-coal",
        "tropical-salt",
        "tropical-clay",
      ],
    ],
    ["Cold", ["cold-clay", "cold-stone"]],
    ["Steppe", ["steppe-clay"]],
  ] as const) {
    await reference.getByRole("button", { name: climate, exact: true }).click();
    for (const asset of assets) {
      const picture = reference.locator(`[style*="terrain-${asset}-v1.webp"]`);
      await expect(picture).toHaveCount(1);
      expect(
        await picture.evaluate(async (el) => {
          const url = getComputedStyle(el).backgroundImage.match(
            /url\(["']?(.*?)["']?\)/,
          )![1];
          const image = new Image();
          image.src = url;
          await image.decode();
          return image.naturalWidth;
        }),
      ).toBe(512);
    }
    await reference.screenshot({
      path: `test-artifacts/regional-${climate}-${test.info().project.name}.png`,
    });
  }
  await reference
    .getByRole("button", { name: "Temperate", exact: true })
    .click();
  await expect(
    reference.locator('[style*="terrain-atlas-v2.png"]'),
  ).not.toHaveCount(0);
  await expect(
    reference.locator(
      '[style*="terrain-tropical-"], [style*="terrain-desert-"]',
    ),
  ).toHaveCount(0);
});

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: choose Woods output and preserve it on reload`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    Object.assign(s.tiles["0,0"], { biome: "woods", resource: "lumber" });
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    await page.getByTestId("hex-0,0").press("Enter");
    const choice = page.getByRole("region", {
      name:
        locale === "fr" ? "Choix de récolte des Bois" : "Woods harvest choice",
    });
    await expect(choice).toBeVisible();
    await choice
      .getByRole("button", {
        name: locale === "fr" ? "Peaux" : "Hides",
        exact: true,
      })
      .click();
    await expect(
      choice.getByRole("button", {
        name: locale === "fr" ? "Peaux" : "Hides",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).game.tiles["0,0"]
            .woodsChoices[0],
        SAVE_KEY,
      ),
    ).toBe("hides");
    await page.screenshot({
      path: `test-artifacts/climate-woods-${locale}-${test.info().project.name}.png`,
    });
    await page.reload();
    await page
      .getByRole("button", {
        name: locale === "fr" ? /Reprendre/ : /Continue campaign/,
      })
      .click();
    await page.getByTestId("hex-0,0").press("Enter");
    await expect(
      choice.getByRole("button", {
        name: locale === "fr" ? "Peaux" : "Hides",
        exact: true,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(errors).toEqual([]);
  });
  test(`${locale}: climate guide exposes exact Arctic probabilities and all new art`, async ({
    page,
  }) => {
    await page.goto(`/rules${locale === "fr" ? "-fr" : ""}.html#world`);
    const climate = page.locator(".climate-reference");
    await expect(climate).toBeVisible();
    await climate
      .getByRole("button", {
        name: locale === "fr" ? "Arctique" : "Arctic",
        exact: true,
      })
      .click();
    await expect(climate).toContainText(
      locale === "fr" ? "Banquise" : "Frozen sea",
    );
    await expect(climate).toContainText(locale === "fr" ? "8,96%" : "8.96%");
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    await page.screenshot({
      path: `test-artifacts/climate-guide-${locale}-${test.info().project.name}.png`,
      fullPage: true,
    });
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      result.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  });
}
test("climate-only overview hides gameplay details and preserves the campaign", async ({
  page,
}) => {
  let s = newGame("climate-browser-preview");
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  await page.addInitScript(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  await page
    .getByRole("button", { name: "Show climates", exact: true })
    .click();
  await expect(page.locator(".climate-map-legend")).toBeVisible();
  await expect(page.locator(".climate-map-tile")).toHaveCount(
    Object.keys(s.tiles).length,
  );
  await expect(page.locator(".game-map-contents")).not.toBeVisible();
  await expect(
    page.locator(".terrain-map polygon[fill^='url(#terrain-']"),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Hide dice numbers", exact: true }),
  ).toBeDisabled();
  const expectedCounts = Object.values(s.tiles).reduce<Record<string, number>>(
    (counts, tile) => {
      const climate = tile.climate ?? "temperate";
      counts[climate] = (counts[climate] ?? 0) + 1;
      return counts;
    },
    {},
  );
  for (const [climate, count] of Object.entries(expectedCounts))
    await expect(
      page.locator(`.climate-map-tile[data-climate="${climate}"]`),
    ).toHaveCount(count);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
  await page.locator(".climate-hit-target").first().press("Enter");
  await expect(
    page.getByRole("complementary", { name: "Action inspector" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close action panel" }).click();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(before);
  await page.screenshot({
    path: `test-artifacts/climate-map-${test.info().project.name}.png`,
  });
  await page
    .getByRole("button", { name: "Show climates", exact: true })
    .click();
  await expect(page.locator(".climate-map-legend")).not.toBeVisible();
  await expect(page.locator(".climate-map-tile")).toHaveCount(0);
  await expect(page.locator(".game-map-contents")).toBeVisible();
  await expect(
    page.locator(".terrain-map polygon[fill^='url(#terrain-']").first(),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test("printed guide includes all seven climate tables", async ({ page }) => {
  await page.goto("/rules.html#world");
  await page.evaluate(() => window.dispatchEvent(new Event("beforeprint")));
  await expect(page.locator(".print-content .climate-reference")).toHaveCount(
    7,
  );
  await expect(page.locator(".print-content")).toContainText("Rice field");
  await expect(page.locator(".print-content")).toContainText("Cod grounds");
});
