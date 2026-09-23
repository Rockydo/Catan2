import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import type { Game } from "../src/game/types";

for (const operation of ["siege", "raid", "destroy"] as const)
  test(`a siege fleet can ${operation} a coastal town through the ordinary controls`, async ({
    page,
  }) => {
    const { s, enemy } = maritimeFixture();
    s.tiles["3,0"].resource = "water";
    const ship = piece(s, "3,0", 0, "carrack", 2);
    if (operation === "siege") {
      enemy.level = enemy.turnLevel = 4;
      enemy.wall = 2;
    }
    if (operation === "destroy")
      s.sieges[`0:${enemy.id}`] = {
        owner: 0,
        town: enemy.id,
        progress: 0,
        last: 9,
        raided: 9,
        units: [ship.id],
      };
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(
      ({ key, data }) => {
        localStorage.setItem(key, data);
        localStorage.setItem("catane-language", "en");
      },
      { key: SAVE_KEY, data: serialize(s) },
    );
    await page.goto("/");
    await page.getByRole("button", { name: /Continue campaign/ }).click();
    await page
      .getByRole("button", { name: "Fit entire map", exact: true })
      .click();
    await page.getByTestId("army-3,0").click();
    await expect(page.getByTestId("army-overview")).toContainText(
      "2 siege power",
    );
    const saved = () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game as Game,
        SAVE_KEY,
      );
    if (operation === "siege") {
      await page
        .getByRole("button", { name: "Begin siege", exact: true })
        .click();
      await expect
        .poll(async () => (await saved()).sieges[`0:${enemy.id}`]?.progress)
        .toBe(1);
      // On mobile the force inspector covers part of the map after the order.
      // Close it through its normal control before inspecting the siege badge.
      const actions = page.getByRole("button", { name: "Actions & realm" });
      if (
        (await actions.isVisible()) &&
        (await actions.getAttribute("aria-expanded")) === "true"
      )
        await actions.click();
      await page.getByTestId(`siege-badge-${enemy.id}`).click();
      await expect(page.getByRole("dialog")).toContainText("Fleet at 3,0");
      await expect(page.getByRole("dialog")).toContainText("Battle Carrack");
    } else if (operation === "raid") {
      await page
        .getByRole("button", { name: "Raid town", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Raid all goods", exact: true })
        .click();
      await expect
        .poll(async () => (await saved()).towns[enemy.id].stock)
        .toEqual({});
      expect((await saved()).pieces[ship.id].moved).toBe(1);
    } else {
      await page
        .getByRole("button", { name: "Destroy town", exact: true })
        .click();
      await page.getByRole("button", { name: "Confirm destruction" }).click();
      await expect
        .poll(async () => (await saved()).towns[enemy.id])
        .toBeUndefined();
      expect((await saved()).winner).toBe(0);
    }
    expect(errors).toEqual([]);
  });
