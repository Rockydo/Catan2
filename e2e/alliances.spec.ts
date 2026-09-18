import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import {
  allianceFixture,
  mergerFixture,
  grandAllianceFixture,
  pact,
} from "../tests/alliance-fixture";
import { piece, run } from "../tests/helpers";
import { serialize, deserialize, SAVE_KEY } from "../src/game/save";
import { factionStrengths } from "../src/game/ai-strategy";
import type { Game } from "../src/game/types";
async function open(page: Page, s: Game) {
  deserialize(serialize(s));
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
test("alliances display all members and exact combined power; the five-round lock is visible", async ({
  page,
}, info) => {
  const { s } = grandAllianceFixture();
  pact(s, [0, 1, 2, 4]);
  pact(s, [5, 6, 7]);
  const scores = factionStrengths(s);
  await open(page, s);
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  const panel = page.getByLabel("Alliances", { exact: true });
  await expect(panel.locator(".alliance-pact")).toHaveCount(2);
  for (const a of s.alliances!) {
    await expect(page.getByTestId(`alliance-power-${a.id}`)).toHaveText(
      a.members.reduce((n, id) => n + scores[id], 0).toFixed(1),
    );
    for (const id of a.members)
      await expect(page.getByTestId(`alliance-${a.id}`)).toContainText(
        s.players[id].name,
      );
  }
  await expect(
    panel.getByRole("button", { name: /Leave alliance/ }),
  ).toBeDisabled();
  await expect(panel).toContainText("5 more rounds");
  expect(
    (await new AxeBuilder({ page }).include(".alliance-summary").analyze())
      .violations,
  ).toEqual([]);
  await page.locator(".power-card").last().scrollIntoViewIfNeeded();
  await expect(page.locator(".power-card").last()).toBeInViewport();
  await panel.scrollIntoViewIfNeeded();
  await page.screenshot({
    path: `test-artifacts/alliance-${info.project.name}-standings.png`,
  });
});
test("player can leave an unlocked pact without dissolving the remaining members", async ({
  page,
}) => {
  const { s } = allianceFixture();
  pact(s, [0, 1, 2]);
  s.round += 5;
  await open(page, s);
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Leave alliance", exact: true })
    .click();
  const panel = page.getByLabel("Alliances", { exact: true });
  await expect(panel).toContainText("2 factions");
  await expect(
    panel.getByRole("button", { name: /Leave alliance/ }),
  ).toHaveCount(0);
  await expect(panel).not.toContainText("(you)");
});
test("alliance invitation pauses the AI and can be accepted", async ({
  page,
}, info) => {
  let { s } = allianceFixture();
  s.active = 1;
  s = run(s, { type: "manage-alliance" });
  await open(page, s);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("proposes an alliance");
  await expect(dialog).toContainText("Combined faction power");
  await expect(dialog).toContainText("Five-round commitment");
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/alliance-${info.project.name}-offer.png`,
  });
  await page
    .getByRole("button", { name: "Accept alliance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Accept alliance", exact: true }),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Pause AI", exact: true }).click();
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  await expect(page.getByLabel("Alliances", { exact: true })).toContainText(
    "Your alliance",
  );
});
test("declining an invitation dismisses it immediately", async ({ page }) => {
  let { s } = allianceFixture();
  s.active = 1;
  s = run(s, { type: "manage-alliance" });
  await open(page, s);
  await page
    .getByRole("button", { name: "Decline alliance", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Decline alliance", exact: true }),
  ).toHaveCount(0);
});
test("allied forces share a tile with colored map badges, separate owners and no attack popup", async ({
  page,
}) => {
  const { s } = allianceFixture();
  pact(s);
  piece(s, "-1,0", 0, "cavalry", 2);
  piece(s, "0,0", 1, "heavy", 2);
  await open(page, s);
  await page
    .getByRole("button", { name: "Fit entire map", exact: true })
    .click();
  await page.getByTestId("army--1,0").click();
  await page
    .getByRole("button", { name: "Move / attack with selected", exact: true })
    .click();
  await page.getByTestId("army-0,0").click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByTestId("army-0,0").click();
  const overview = page.getByTestId("army-overview");
  await expect(overview).toContainText("Your army");
  await expect(overview).toContainText("Allied army");
  await expect(
    page.getByTestId("army-0,0").locator(".alliance-map-badges circle"),
  ).toHaveCount(2);
});

test("an oversized saved pact breaks after the AI roll and explains the departure", async ({
  page,
}) => {
  const { s } = allianceFixture();
  s.pieces = {};
  for (const town of Object.values(s.towns)) town.level = town.turnLevel = 1;
  [11, 11, 0, 15].forEach((n, owner) => {
    for (let i = 0; i < n; i++)
      piece(s, ["-2,0", "0,0", "2,0", "0,2"][owner], owner, "heavy", 4);
  });
  pact(s);
  s.round += 5;
  s.active = 1;
  s.phase = "roll";
  await open(page, s);
  await expect
    .poll(async () =>
      page.evaluate((key) => {
        const game = JSON.parse(localStorage.getItem(key)!).game;
        return (
          !game.alliances.some(
            (a: { members: number[] }) =>
              a.members.includes(0) && a.members.includes(1),
          ) &&
          game.events.some((e: { text: string }) => e.text.includes("150%"))
        );
      }, SAVE_KEY),
    )
    .toBe(true);
});

test("human inside the proposing alliance approves a merger, sees its power, and can reload it", async ({
  page,
}, info) => {
  let s = mergerFixture([0]);
  s.alliances![0].lockedUntil = 12;
  s.alliances![1].lockedUntil = 14;
  s = run(s, { type: "manage-alliance" });
  await open(page, s);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toContainText("proposes merging alliances");
  await expect(dialog).toContainText("4 rounds remain");
  await expect(dialog).toContainText("No new five-round lock");
  for (const id of [0, 1, 2, 4])
    await expect(dialog.locator(".alliance-members")).toContainText(
      s.players[id].name,
    );
  const scores = factionStrengths(s);
  await expect(dialog.locator(".battle-powers strong").first()).toHaveText(
    [0, 1, 2, 4].reduce((n, id) => n + scores[id], 0).toFixed(0),
  );
  expect(
    (await new AxeBuilder({ page }).include('[role="dialog"]').analyze())
      .violations,
  ).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/alliance-merge-${info.project.name}-offer.png`,
  });
  await page
    .getByRole("button", { name: "Accept merger", exact: true })
    .click();
  await expect
    .poll(async () =>
      page.evaluate(
        (key) => JSON.parse(localStorage.getItem(key)!).game.alliances.length,
        SAVE_KEY,
      ),
    )
    .toBe(1);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page
    .getByRole("button", { name: "Realms & chronicle", exact: true })
    .click();
  await expect(page.getByLabel("Alliances", { exact: true })).toContainText(
    "4 factions",
  );
});

test("declining a merger from inside the target alliance keeps both pacts", async ({
  page,
}) => {
  let s = mergerFixture([4]);
  s = run(s, { type: "manage-alliance" });
  await open(page, s);
  await page
    .getByRole("button", { name: "Decline merger", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Decline merger", exact: true }),
  ).toHaveCount(0);
  const alliances = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game.alliances,
    SAVE_KEY,
  );
  expect(alliances).toEqual(s.alliances);
});

for (const language of ["en", "fr"] as const)
  test(`existing campaigns activate the global coalition immediately (${language})`, async ({
    page,
  }) => {
    const { s } = grandAllianceFixture();
    for (let i = 0; i < 100; i++) piece(s, "0,2", 3, "heavy", 4);
    pact(s, [0, 1]);
    pact(s, [2, 4]);
    const previous = {
      round: s.round,
      actions: s.actions,
      pieces: s.pieces,
      towns: s.towns,
    };
    await page.addInitScript(
      ({ key, data, language }) => {
        localStorage.setItem(key, data);
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
    await expect(panel).toContainText(
      language === "en" ? "Emergency coalition" : "Coalition d’urgence",
    );
    await expect(panel).toContainText(language === "en" ? "20%" : "20 %");
    await expect(
      panel.getByRole("button", {
        name: language === "en" ? "Leave alliance" : "Quitter l'alliance",
      }),
    ).toBeDisabled();
    const saved = await page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
    expect(saved.alliances[0]).toMatchObject({
      emergency: "locked",
      threat: 3,
      members: [0, 1, 2, 4, 5, 6, 7],
    });
    expect({
      round: saved.round,
      actions: saved.actions,
      pieces: saved.pieces,
      towns: saved.towns,
    }).toEqual(previous);
  });
