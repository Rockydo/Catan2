import { test, expect } from "@playwright/test";
import { crossing } from "../tests/transport-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";

test("the production AI worker uses a sea shortcut and preserves embarked troops on reload", async ({
  page,
}) => {
  const { s } = crossing();
  const army = piece(s, "-4,0", 0, "heavy", 3),
    ship = piece(s, "-3,0", 0, "convoy", 1);
  s.players[1].control = "human";
  s.phase = "economy";
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem("catane-language", "en");
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const carrier = () =>
    page.evaluate(
      ({ key, id }) =>
        JSON.parse(localStorage.getItem(key)!).game.pieces[id]?.carrier,
      { key: SAVE_KEY, id: army.id },
    );
  await expect.poll(carrier).toBe(ship.id);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect(await carrier()).toBe(ship.id);
  expect(errors).toEqual([]);
});
