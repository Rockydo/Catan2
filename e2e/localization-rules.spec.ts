import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { fishingFixture } from "../tests/maritime-fixture";
import { SAVE_KEY, serialize } from "../src/game/save";

test("French game uses the same save and can switch languages without a reload", async ({
  page,
}) => {
  const { s } = fishingFixture();
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "fr");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await expect(
    page.getByRole("button", { name: "Nouvelle partie", exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Apprendre à jouer" }),
  ).toHaveAttribute("href", "./rules-fr.html");
  await page.getByRole("button", { name: /Reprendre/ }).click();
  await expect(
    page.getByRole("button", { name: "Terminer le tour", exact: true }),
  ).toBeVisible();
  const before = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  await page.getByRole("button", { name: /Paramètres.*sauvegardes/i }).click();
  await page.getByLabel("Language / Langue").selectOption("en");
  await expect(
    page.getByRole("heading", { name: "Campaign & settings" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(before);
  await page.getByLabel("Language / Langue").selectOption("fr");
  await expect(
    page.getByRole("heading", { name: "Partie et paramètres" }),
  ).toBeVisible();
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(before);
  expect(errors).toEqual([]);
});

test("bilingual rule guide has responsive navigation, search and working examples", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/rules.html");
  await expect(
    page.getByRole("heading", { name: "Rules of play" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Français", exact: true }).click();
  await expect(page).toHaveURL(/rules-fr.html/);
  await expect(page.locator("html")).toHaveAttribute("lang", "fr");
  await page.getByLabel("Niveau de ville", { exact: true }).selectOption("4");
  await page.getByLabel("Palier de forge", { exact: true }).selectOption("3");
  await expect(page.locator(".harvest-result")).toContainText("+4");
  await expect(page.locator(".harvest-result")).toContainText("+5");
  await page.getByLabel("Une armée ennemie occupe la tuile").check();
  await expect(page.locator(".harvest-result")).not.toContainText("+4");
  const menu = page.getByRole("button", { name: "Afficher la navigation" });
  if (await menu.isVisible()) await menu.click();
  await page
    .getByRole("textbox", { name: "Chercher dans les règles" })
    .fill("rébellion");
  await expect(page.locator(".search-results")).toContainText(
    "Expéditions et retours de factions",
  );
  await page
    .locator(
      (await menu.isVisible())
        ? ".mobile-search-results>button"
        : ".search-results>button",
    )
    .filter({ hasText: "Expéditions et retours de factions" })
    .click();
  await expect(page.locator("h1")).toHaveText(
    "Expéditions et retours de factions",
  );
  await page.goto("/rules-fr.html#siege");
  await page.getByLabel("Niveau de ville", { exact: true }).selectOption("4");
  await page
    .getByLabel("Palier de muraille", { exact: true })
    .selectOption("4");
  await page
    .getByLabel("Puissance de siège", { exact: true })
    .selectOption("4");
  await expect(page.locator(".siege-result>strong")).toHaveText("3");
  await expect(page.locator(".siege-result")).toContainText(
    "Pillage au tour 4",
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
  ).toBe(true);
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa"])
    .analyze();
  expect(
    audit.violations.filter((v) =>
      ["serious", "critical"].includes(v.impact ?? ""),
    ),
  ).toEqual([]);
  expect(errors).toEqual([]);
});

test("catalogue exposes every tier of cards, ships and guilds in French", async ({
  page,
}) => {
  await page.goto("/rules-fr.html#catalog");
  await expect(page.locator(".good-card")).toHaveCount(22);
  await page.getByRole("tab", { name: "Développement", exact: true }).click();
  for (const roman of ["I", "II", "III", "IV"]) {
    await page
      .locator(".tier-buttons")
      .getByRole("button", { name: roman, exact: true })
      .click();
    await expect(page.locator(".research-reference")).toHaveCount(8);
    await expect(page.locator(".catalogue")).not.toContainText(
      "Build one free",
    );
  }
  await page.getByRole("tab", { name: "Navires", exact: true }).click();
  await expect(page.locator(".unit-card")).toHaveCount(6);
  await expect(page.locator('.unit-card [data-unit-tier="4"]')).toHaveCount(6);
  await page.getByRole("tab", { name: "Guildes", exact: true }).click();
  await expect(page.locator(".guild-card")).toHaveCount(10);
  await expect(page.locator(".guild-card")).not.toHaveCount(0);
  await page
    .getByRole("textbox", { name: "Filtrer le catalogue" })
    .fill("fermiers");
  await expect(page.locator(".guild-card")).toHaveCount(1);
  await page
    .getByRole("tab", { name: "Bâtiments et coûts", exact: true })
    .click();
  await page
    .getByRole("textbox", { name: "Filtrer le catalogue" })
    .fill("Usine chimique");
  await expect(page.locator(".recipe-grid article")).toHaveCount(3);
  await page.screenshot({
    path: `test-artifacts/rules-catalogue-${test.info().project.name}.png`,
    fullPage: true,
  });
});

test("French recruitment, trade and research controls retain working commands", async ({
  page,
}) => {
  const { s } = fishingFixture();
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem(key, data);
      localStorage.setItem("catane-language", "fr");
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Reprendre/ }).click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await expect(page.locator(".right-panel")).toContainText("terrain accidenté");
  await expect(page.locator(".right-panel")).not.toContainText("rugged");
  await page
    .getByRole("button", { name: "Recruter 1 Colporteur", exact: true })
    .first()
    .click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          Object.keys(JSON.parse(localStorage.getItem(key)!).game.pieces)
            .length,
        SAVE_KEY,
      ),
    )
    .toBe(1);
  // Dismiss the mobile drawer before using the action rail again.
  const close = page.getByRole("button", {
    name: /Fermer le panneau/,
  });
  if (await close.isVisible()) await close.click();
  await page.getByRole("button", { name: "Commerce", exact: true }).click();
  await expect(page.locator(".right-panel")).toContainText("en stock");
  await expect(page.locator(".right-panel")).not.toContainText(" held");
  if (await close.isVisible()) await close.click();
  await page
    .getByRole("button", { name: "Développement", exact: true })
    .click();
  await page
    .getByRole("button", {
      name: /Financer le développement de palier I(?:\s|$)/,
    })
    .click();
  await expect(page.locator(".research-card")).toHaveCount(2);
  await page.locator(".research-card").first().click();
  await expect
    .poll(() =>
      page.evaluate(
        (key) =>
          JSON.parse(localStorage.getItem(key)!).game.players[0].hand.length,
        SAVE_KEY,
      ),
    )
    .toBe(1);
});

test("illustrated terrain reference pairs artwork with raw and workshop outputs", async ({
  page,
}) => {
  for (const locale of ["en", "fr"]) {
    await page.goto(`/rules${locale === "fr" ? "-fr" : ""}.html#economy`);
    await expect(page.locator(".terrain-row")).toHaveCount(31);
    const whale = page.locator('[data-terrain="whale"]');
    for (const name of locale === "fr"
      ? ["Peaux", "Huile", "Cuir"]
      : ["Hides", "Oil", "Leather"])
      await expect(whale.locator(".terrain-outputs")).toContainText([name]);
    await expect(page.locator('[data-terrain="fish"]')).toContainText(
      "Rations",
    );
    await expect(page.locator('[data-terrain="water"]')).toContainText(
      locale === "fr" ? "Aucune" : "No production",
    );
    // Load the exact files used by CSS, not just placeholder elements.
    const art = await page
      .locator(".terrain-picture")
      .evaluateAll(async (nodes) => {
        const urls = [
          ...new Set(
            nodes
              .map(
                (n) =>
                  getComputedStyle(n).backgroundImage.match(
                    /url\(["']?(.*?)["']?\)/,
                  )?.[1],
              )
              .filter(Boolean),
          ),
        ];
        return await Promise.all(
          urls.map(
            (url) =>
              new Promise<boolean>((resolve) => {
                const image = new Image();
                image.onload = () => resolve(image.naturalWidth > 0);
                image.onerror = () => resolve(false);
                image.src = url!;
              }),
          ),
        );
      });
    expect(art).toHaveLength(24);
    expect(art.every(Boolean)).toBe(true);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    ).toBe(true);
    const audit = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa"])
      .analyze();
    expect(
      audit.violations.filter((v) =>
        ["serious", "critical"].includes(v.impact ?? ""),
      ),
    ).toEqual([]);
  }
  await page.screenshot({
    path: `test-artifacts/terrain-rulebook-${test.info().project.name}.png`,
    fullPage: true,
  });
  await page.goto("/rules-fr.html#catalog");
  await expect(page.locator(".good-card")).toHaveCount(22);
  await expect(
    page
      .locator(".good-card")
      .filter({
        has: page.getByRole("heading", { name: "Huile", exact: true }),
      })
      .locator(".terrain-picture"),
  ).toHaveCount(2);
});
