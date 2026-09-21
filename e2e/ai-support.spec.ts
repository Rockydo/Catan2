import { test, expect } from "@playwright/test";
import { supportFixture } from "../tests/ai-support-fixture";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { Game } from "../src/game/types";

for (const locale of ["en", "fr"]) {
  test(`${locale}: every AI receives support, with standings, receipts and stable reload`, async ({
    page,
  }) => {
    const { s, towns } = supportFixture();
    const fr = locale === "fr";
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    await page.goto("/");
    const resume = page.getByRole("button", {
      name: fr ? /Reprendre la partie/ : /Continue campaign/,
    });
    await resume.click();
    await page
      .getByRole("button", {
        name: fr ? "Royaumes et chronique" : "Realms & chronicle",
        exact: true,
      })
      .click();
    await expect(page.getByTestId("ai-gold-support")).toHaveText(
      fr
        ? "Soutien aux IA : 3 Or par colonie ou ville à chaque lancer de dés."
        : "AI support: 3 Gold per settlement or city on every dice roll.",
    );
    const perFaction = fr
      ? "Soutien aux IA : +3 Or par lancer"
      : "AI support: +3 Gold per roll";
    await expect(page.getByTestId("faction-power-0")).not.toContainText(
      perFaction,
    );
    for (const player of s.players.slice(1))
      await expect(
        page.getByTestId(`faction-power-${player.id}`),
      ).toContainText(perFaction);
    await page
      .getByRole("button", {
        name: fr
          ? "Fermer les royaumes et la chronique"
          : "Close realms and chronicle",
      })
      .click();
    await page
      .getByRole("button", {
        name: fr ? "Lancer les dés" : "Roll dice",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: fr ? "Garder ouvert" : "Keep open" })
      .click();
    const receipt = fr
      ? "Dont 3 Or de soutien aux IA"
      : "Includes 3 Gold of AI support";
    await expect(
      page.getByTestId("roll-player-0").locator(".harvest-support"),
    ).toHaveCount(0);
    for (const player of s.players.slice(1)) {
      const row = page.getByTestId(`roll-player-${player.id}`);
      await expect(row).toContainText(receipt);
      await expect(row.locator('[data-good="gold"]')).toHaveAttribute(
        "aria-label",
        fr ? "Or : +3" : "Gold: +3",
      );
    }
    const read = (): Promise<Game> =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game,
        SAVE_KEY,
      );
    const paid = await read();
    expect(paid.productionSupport?.perTown).toBe(3);
    for (const player of s.players)
      expect(paid.towns[towns[player.id].id].stock.gold ?? 0).toBe(
        player.id === 0 ? 0 : 3,
      );
    await page.screenshot({
      path: `test-artifacts/ai-support-${locale}-${test.info().project.name}.png`,
    });
    await page.reload();
    await resume.click();
    await page
      .getByRole("button", {
        name: fr ? "Voir le dernier lancer" : "View last roll",
      })
      .click();
    await expect(page.getByTestId("roll-player-7")).toContainText(receipt);
    expect((await read()).towns).toEqual(paid.towns);
    expect(errors).toEqual([]);
  });
}
