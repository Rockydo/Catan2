import { test, expect } from "@playwright/test";
import { grandAllianceFixture } from "../tests/alliance-fixture";
import { piece } from "../tests/helpers";
import { SAVE_KEY, serialize } from "../src/game/save";

for (const language of ["en", "fr"] as const)
  test(`loaded coalition immediately displays its new target (${language})`, async ({
    page,
  }) => {
    const { s, towns } = grandAllianceFixture();
    s.pieces = {};
    for (const tile of Object.values(s.tiles)) {
      tile.resource = "snow";
      tile.biome = "snow-plain";
    }
    for (const town of towns) {
      town.level = town.turnLevel = 1;
      town.wall = 0;
      town.stock = {};
    }
    for (let i = 0; i < 20; i++) piece(s, "0,2", 3, "heavy");
    for (let i = 0; i < 21; i++) piece(s, "-5,0", 1, "heavy");
    s.alliances = [
      {
        id: `a${s.nextId++}`,
        members: [0, 1, 2, 4, 5, 6, 7],
        threat: 3,
        lockedUntil: s.round,
        emergency: "locked",
      },
    ];
    await page.addInitScript(
      ({ key, data, language }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", language);
      },
      { key: SAVE_KEY, data: serialize(s), language },
    );
    await page.goto("/");
    await page
      .getByRole("button", {
        name: language === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    await page
      .getByRole("button", {
        name:
          language === "en" ? "Realms & chronicle" : "Royaumes et chronique",
        exact: true,
      })
      .click();
    const panel = page.getByLabel("Alliances", { exact: true });
    await expect(panel.locator(".alliance-pact")).toHaveCount(1);
    await expect(panel.locator(".alliance-members")).toContainText(
      s.players[3].name,
    );
    await expect(panel.locator(".alliance-members")).not.toContainText(
      s.players[1].name,
    );
    await expect(panel).toContainText(
      language === "en"
        ? `Emergency coalition · locked until ${s.players[1].name} falls to 20% of global power`
        : `Coalition d’urgence · verrouillée jusqu’à ce que ${s.players[1].name} retombe à 20 % de la puissance mondiale`,
    );
    await expect(
      panel.getByRole("button", {
        name: language === "en" ? "Leave alliance" : "Quitter l'alliance",
      }),
    ).toBeDisabled();
    await expect(
      page.getByText(
        language === "en"
          ? `Emergency coalition switches from ${s.players[3].name} to ${s.players[1].name}, now the strongest faction.`
          : `La coalition d’urgence change de cible : ${s.players[1].name}, désormais la faction la plus puissante, remplace ${s.players[3].name}.`,
        { exact: false },
      ),
    ).toBeVisible();
  });
