import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { GOODS } from "../src/game/types";
import { syncSeasonSurfaces } from "../src/game/seasons";
for (const locale of ["en", "fr"] as const)
  for (const width of [1280, 768])
    test(`specialists, rotation and readable cards ${locale} ${width}`, async ({
      page,
    }) => {
      let s = newGame("infrastructure-browser");
      while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
      s.active = 0;
      s.phase = "economy";
      s.pieces = {};
      const town = ownTowns(s, 0)[0];
      town.level = town.turnLevel = 4;
      for (const good of GOODS) town.stock[good] = 5000;
      const id = s.vertices[town.vertex].tiles.find(
          (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
        )!,
        tile = s.tiles[id];
      tile.resource = "grain";
      tile.biome = "flood-wheat";
      tile.climate = "temperate";
      s.climatePlan![id] = "temperate";
      Object.assign(tile.geography!, {
        pass: false,
        waterway: undefined,
        access: "normal",
        floodplain: true,
        projects: {},
        fauna: {},
        animals: [],
      });
      s.wildlife = s.wildlife!.filter((w) => w.tile !== id);
      syncSeasonSurfaces(s);
      assertInvariants(s);
      const original = serialize(s),
        errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.addInitScript(
        ({ data, key, locale }) => {
          if (!localStorage.getItem(key)) localStorage.setItem(key, data);
          localStorage.setItem("catane-language", locale);
        },
        { data: original, key: SAVE_KEY, locale },
      );
      await page.setViewportSize({ width, height: 1000 });
      await page.goto("/");
      const open = async () => {
        await page
          .getByRole("button", {
            name: locale === "en" ? /Continue campaign/ : /Reprendre/,
          })
          .click();
        await page.getByTestId(`hex-${id}`).click();
        await page.getByTestId("inspector-details-toggle").click();
        await page.locator(".infrastructure-panel > summary").click();
      };
      await open();
      const panel = page.locator(".infrastructure-panel");
      await expect(
        panel.getByRole("tab", {
          name: locale === "en" ? /Main/ : /Principales/,
        }),
      ).toHaveAttribute("aria-selected", "true");
      const card = page.locator('[data-infrastructure="soil"]');
      await card.scrollIntoViewIfNeeded();
      expect((await card.boundingBox())!.height).toBeLessThan(650);
      await expect(card).not.toContainText("Visual development");
      await panel
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      const specialistTab = panel.getByRole("tab", {
        name: locale === "en" ? /Specialists/ : /Compléments/,
      });
      await specialistTab.focus();
      await page.keyboard.press("ArrowRight");
      await expect(panel.getByRole("tab", { name: /Rotations/ })).toBeFocused();
      await page.keyboard.press("ArrowLeft");
      await expect(specialistTab).toBeFocused();
      for (const branch of ["seed-selection", "field-gleaning"]) {
        const row = page.locator(`[data-specialist-branch="${branch}"]`);
        await expect(row.getByRole("button")).toBeEnabled();
        await row.getByRole("button").click();
        await expect(row.locator("b").first()).toContainText(" · I");
      }
      await page
        .locator('[data-specialist-branch="seed-selection"]')
        .scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/specialists-${locale}-${width}.png`,
      });
      await panel.getByRole("tab", { name: /Rotations/ }).click();
      const rotation = page.locator(
        '[data-specialist-branch="rotation-stubble-turnips"]',
      );
      await expect(rotation).toContainText(
        locale === "en" ? "Autumn" : "Automne",
      );
      await expect(rotation.getByRole("button")).toBeEnabled();
      await rotation.getByRole("button").click();
      await expect(rotation.locator("b").first()).toContainText(" · I");
      await rotation.locator(".infrastructure-effects summary").click();
      await expect(rotation.locator(".geography-calendar > div")).toHaveCount(
        4,
      );
      expect(
        await panel.evaluate((el) => el.scrollWidth <= el.clientWidth + 2),
      ).toBe(true);
      await rotation.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/infrastructure/rotation-${locale}-${width}.png`,
      });
      await expect
        .poll(() => page.evaluate((key) => localStorage.getItem(key), SAVE_KEY))
        .not.toBe(original);
      await page.reload();
      await open();
      await panel.getByRole("tab", { name: /Rotations/ }).click();
      await expect(rotation.locator("b").first()).toContainText(" · I");
      await panel
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      await expect(
        page.locator('[data-specialist-branch="seed-selection"] b').first(),
      ).toContainText(" · I");
      expect(errors).toEqual([]);
    });
