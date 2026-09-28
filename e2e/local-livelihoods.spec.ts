import { test, expect } from "@playwright/test";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { run } from "../tests/helpers";
import { serialize, SAVE_KEY, assertInvariants } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
import { GOODS } from "../src/game/types";
import {
  BIOME_INFO,
  type Biome,
  type Climate,
} from "../src/game/climate-content";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { neighbors } from "../src/game/world";
import { LIVELIHOOD_BRANCHES } from "../src/game/infrastructure-livelihoods";
const settings: Record<string, [Biome, Climate]> = {
  "rice-fish-refuges": ["rice-field", "monsoon"],
  "spring-sap-groves": ["woods", "temperate"],
  "kelp-longlines": ["water", "oceanic"],
  "reed-thatch-beds": ["water", "temperate"],
  "coconut-coir-yards": ["island-palms", "tropical-maritime"],
  "mine-stone-stowing": ["iron", "temperate"],
  "date-pit-feeders": ["oasis", "desert"],
  "upland-leaf-hay": ["woods", "temperate"],
  "salt-graduation-walls": ["salt-flats", "oceanic"],
  "fog-orchard-screens": ["oasis", "desert"],
  "recession-fish-pools": ["flood-sorghum", "semiarid"],
  "qiviut-gathering": ["snow-plain", "arctic"],
};
for (const branch of LIVELIHOOD_BRANCHES)
  for (const locale of [
    "coconut-coir-yards",
    "rice-fish-refuges",
    "qiviut-gathering",
  ].includes(branch.id)
    ? ["en", "fr"]
    : ["en"])
    test(`${branch.id} buys all four stages with clear effects ${locale}`, async ({
      page,
    }) => {
      let s = newGame("infrastructure-browser");
      for (let n = 0; s.phase.startsWith("setup") && n < 60; n++)
        s = run(s, chooseAIAction(s));
      s.active = 0;
      s.phase = "economy";
      s.pieces = {};
      const town = ownTowns(s, 0)[0];
      town.level = town.turnLevel = 4;
      for (const good of GOODS) town.stock[good] = 5000;
      const id = s.vertices[town.vertex].tiles.find(
        (id) => !["water", "ice", "peaks"].includes(s.tiles[id].resource),
      )!;
      const t = s.tiles[id],
        [biome, climate] = settings[branch.id];
      for (const key of Object.keys(s.climatePlan!))
        s.climatePlan![key] = climate;
      for (const h of Object.values(s.tiles)) {
        h.climate = climate;
        s.climatePlan![h.id] = climate;
        delete h.surface;
        delete h.iceWeather;
        delete h.freezeRoll;
        delete h.thawGrace;
      }
      t.biome = biome;
      t.climate = climate;
      t.resource = BIOME_INFO[biome].resource;
      delete t.surface;
      delete t.iceWeather;
      s.climatePlan![id] = climate;
      Object.assign(t.geography!, {
        pass: false,
        waterway:
          biome === "water"
            ? branch.id === "kelp-longlines"
              ? "shoal"
              : "river"
            : undefined,
        coastal: true,
        floodplain: biome === "flood-sorghum",
        elevation: 0.8,
        access: "normal",
        weather: "normal",
        projects: {},
        fauna: {},
        animals: [],
      });
      if ("freshwater" in branch) {
        const n = neighbors(id).find((n) => s.tiles[n])!,
          w = s.tiles[n];
        w.biome = "river";
        w.resource = "water";
        w.surface = "open";
        delete w.iceWeather;
        Object.assign(w.geography!, {
          waterway: "river",
          pass: false,
          access: "normal",
          projects: {},
          fauna: {},
          animals: [],
        });
        s.wildlife = s.wildlife!.filter((h) => h.tile !== n);
      }
      s.wildlife = s.wildlife!.filter((h) => h.tile !== id);
      syncSeasonSurfaces(s);
      assertInvariants(s);
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
          name: locale === "en" ? /Continue campaign/ : /Reprendre/,
        })
        .click();
      await page.getByTestId(`hex-${id}`).click();
      await page.getByTestId("inspector-details-toggle").click();
      await page.locator(".infrastructure-panel > summary").click();
      await page
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      const card = page.locator(`[data-specialist-branch="${branch.id}"]`);
      await expect(card).toContainText(
        locale === "en" ? branch.description : branch.descriptionFr,
      );
      for (const tier of ["I", "II", "III", "IV"]) {
        await card.getByRole("button").click();
        await expect(card.locator("b").first()).toContainText(` · ${tier}`);
      }
      await expect(card.getByRole("button")).toHaveCount(0);
      if (branch.id === "rice-fish-refuges") {
        await expect(
          card.locator(".infrastructure-weather-example"),
        ).toBeVisible();
        await expect(card).not.toContainText(
          locale === "en"
            ? "The rounded harvest stays the same"
            : "Récolte identique après arrondi",
        );
      }
      if (
        branch.id === "coconut-coir-yards" ||
        branch.id === "mine-stone-stowing"
      ) {
        await expect(card).toContainText(
          locale === "en" ? "No dice roll required" : "Aucun jet de dé requis",
        );
      }

      await card.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `output/local-livelihoods/${branch.id}-${locale}.png`,
      });
      expect(errors).toEqual([]);
      await page.reload();
      await page
        .getByRole("button", {
          name: locale === "en" ? /Continue campaign/ : /Reprendre/,
        })
        .click();
      await page.getByTestId(`hex-${id}`).click();
      await page.getByTestId("inspector-details-toggle").click();
      await page.locator(".infrastructure-panel > summary").click();
      await page
        .getByRole("tab", {
          name: locale === "en" ? /Specialists/ : /Compléments/,
        })
        .click();
      await expect(
        page
          .locator(`[data-specialist-branch="${branch.id}"]`)
          .locator("b")
          .first(),
      ).toContainText(" · IV");
    });
