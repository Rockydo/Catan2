import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { SAVE_KEY, BACKUP_KEY, serialize } from "../src/game/save";

for (const locale of ["en", "fr"] as const)
  test(`${locale}: replaces saved Andean snow and preserves the campaign and backup`, async ({
    page,
  }) => {
    const { s } = maritimeFixture();
    const ids = ["0,0", "-2,0", "0,2"];
    for (const tile of Object.values(s.tiles)) tile.climate = "andean";
    for (const id of ids)
      Object.assign(s.tiles[id], { biome: "snow-plain", resource: "snow" });
    const unit = piece(s, "-2,0");
    const source = serialize(s);
    await page.addInitScript(
      ({ key, source, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, source);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, source, locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await expect(
      page.getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      }),
    ).toBeVisible();
    await expect
      .poll(() =>
        page.evaluate(
          ({ key, ids }) => {
            const game = JSON.parse(localStorage.getItem(key)!).game;
            return ids.filter((id) => game.tiles[id].biome === "snow-plain")
              .length;
          },
          { key: SAVE_KEY, ids },
        ),
      )
      .toBe(0);
    const saved = await page.evaluate(
      ({ key, backup }) => ({
        game: JSON.parse(localStorage.getItem(key)!).game,
        backup: JSON.parse(localStorage.getItem(backup)!).game,
      }),
      { key: SAVE_KEY, backup: BACKUP_KEY },
    );
    for (const id of ids) {
      expect(["iron", "gold", "bare-peaks"]).toContain(
        saved.game.tiles[id].biome,
      );
      expect(saved.game.tiles[id].number).toBe(s.tiles[id].number);
      expect(saved.backup.tiles[id].biome).toBe("snow-plain");
    }
    expect(saved.game.tiles[unit.tile].resource).not.toBe("peaks");
    expect(saved.game.towns).toEqual(s.towns);
    expect(saved.game.pieces).toEqual(s.pieces);
    expect(saved.game.rng).toBe(s.rng);
    await page.reload();
    await expect(
      page.getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      }),
    ).toBeVisible();
    const reloaded = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(reloaded.tiles).toEqual(saved.game.tiles);
    expect(reloaded.pieces).toEqual(saved.game.pieces);
    expect(errors).toEqual([]);
  });
