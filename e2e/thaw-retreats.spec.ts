import { test, expect } from "@playwright/test";
import { thawFixture } from "../tests/thaw-fixture";
import { piece, run } from "../tests/helpers";
import { syncSeasonSurfaces } from "../src/game/seasons";
import { SAVE_KEY, serialize } from "../src/game/save";

for (const locale of ["en", "fr"] as const)
  test(`${locale}: forced thaw landings keep casualty choices and the retreat queue through reload`, async ({
    page,
  }, info) => {
    const { s, land, ice } = thawFixture();
    land("1,0");
    land("1,2");
    ice("0,2");
    const a = piece(s, "0,0", 1, "heavy", 4),
      b = piece(s, "0,2", 1, "heavy", 4);
    piece(s, "1,0", 0, "heavy", 3);
    piece(s, "1,2", 0);
    syncSeasonSurfaces(s);
    const next = run(s, { type: "end-turn" });
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(next), locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const continueGame = () =>
      page
        .getByRole("button", {
          name: locale === "en" ? /Continue campaign/ : /Reprendre/,
        })
        .click();
    await page.goto("/");
    await continueGame();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toContainText(
      locale === "en"
        ? "Melting ice forced this army"
        : "Le dégel force cette armée",
    );
    await expect(dialog).toContainText(
      locale === "en" ? "3 unit points" : "3 points d'unité",
    );
    await page.screenshot({
      path: `test-artifacts/thaw-retreat-${locale}-${info.project.name}.png`,
    });
    const confirm = () =>
      page
        .getByRole("button", {
          name: locale === "en" ? "Confirm casualties" : "Confirmer les pertes",
        })
        .click();
    await confirm();
    await expect
      .poll(async () =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).game.battle?.target,
          SAVE_KEY,
        ),
      )
      .toBe("1,2");
    await page.reload();
    await continueGame();
    await expect(dialog).toContainText(
      locale === "en"
        ? "Melting ice forced this army"
        : "Le dégel force cette armée",
    );
    await confirm();
    await expect(dialog).toHaveCount(0);
    await expect
      .poll(async () =>
        page.evaluate(
          (key) => JSON.parse(localStorage.getItem(key)!).game.battle ?? null,
          SAVE_KEY,
        ),
      )
      .toBe(null);
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!),
      SAVE_KEY,
    );
    expect(saved.version).toBe(14);
    expect(saved.game.battle).toBeUndefined();
    expect(saved.game.thawRetreats).toBeUndefined();
    expect(saved.game.pieces[a.id].tile).toBe("1,0");
    expect(saved.game.pieces[b.id].tile).toBe("1,2");
    expect(saved.game.active).toBe(0);
    expect(saved.game.phase).toBe("roll");
    expect(errors).toEqual([]);
  });
