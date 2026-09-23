import { test, expect } from "@playwright/test";
import { crossing } from "../tests/transport-fixture";
import { piece, run } from "../tests/helpers";
import { maritimeFixture } from "../tests/maritime-fixture";
import { deserialize, serialize, SAVE_KEY } from "../src/game/save";

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

test("naval casualty choices rescue passengers in order and preserve survivors on reload", async ({
  page,
}) => {
  let { s } = maritimeFixture();
  for (const tile of ["1,0", "2,0"]) s.tiles[tile].resource = "water";
  const ships = [
    piece(s, "1,0", 0, "convoy", 2),
    piece(s, "1,0", 0, "convoy", 2),
  ];
  const passengers = ships.flatMap((ship, i) =>
    Array.from({ length: i + 2 }, () => {
      const unit = piece(s, "1,0");
      unit.carrier = ship.id;
      return unit;
    }),
  );
  for (let i = 0; i < 3; i++) piece(s, "2,0", 1, "galley", 1);
  s = deserialize(
    serialize(run(s, { type: "move", ids: ships.map((u) => u.id), to: "2,0" })),
  );
  expect(s.battle?.required).toBe(2);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(
    ({ key, data }) => {
      localStorage.setItem("catane-language", "en");
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  const read = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)!).game,
      SAVE_KEY,
    );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await page.getByRole("button", { name: "Confirm casualties" }).click();
  await expect.poll(async () => !!(await read()).battle).toBe(false);
  const saved = await read(),
    lost = ships.filter((u) => !saved.pieces[u.id]).map((u) => u.id),
    remaining = passengers.filter((u) => saved.pieces[u.id]);
  expect(lost).toHaveLength(1);
  expect(remaining).toHaveLength(4);
  const expected = run(s, { type: "resolve-battle", ids: lost });
  expect(saved.pieces).toEqual(expected.pieces);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await read()).pieces).toEqual(expected.pieces);
  expect(errors).toEqual([]);
});
