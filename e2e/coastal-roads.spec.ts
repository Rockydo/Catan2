import { test, expect } from "@playwright/test";
import { funded } from "../tests/helpers";
import { inventory, ownTowns } from "../src/game/selectors";
import { serialize, SAVE_KEY } from "../src/game/save";

test("coastal edge is offered as a road, never a ship lane, and remains a road on reload", async ({
  page,
}) => {
  const s = funded("coastal-road-regression");
  s.routes = {};
  const town = ownTowns(s)[0];
  const edge = s.vertices[town.vertex].edges
    .map((id) => s.edges[id])
    .find((e) => e.tiles.length === 2)!;
  s.tiles[edge.tiles[0]].resource = "lumber";
  s.tiles[edge.tiles[1]].resource = "water";
  delete edge.harbor;
  const before = inventory(s);
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const mobile = page.getByRole("button", { name: "Actions & realm" });
  if (await mobile.isVisible()) await mobile.click();
  await page
    .locator(".build-tool")
    .filter({ has: page.getByText("Ship route", { exact: true }) })
    .click();
  await expect(page.getByTestId(`edge-target-${edge.id}`)).toHaveCount(0);
  if (await mobile.isVisible()) await mobile.click();
  await page
    .locator(".build-tool")
    .filter({ has: page.getByText("Road", { exact: true }) })
    .click();
  if (
    await page.getByRole("button", { name: "Close action panel" }).isVisible()
  )
    await page.getByRole("button", { name: "Close action panel" }).click();
  await page.getByTestId(`edge-target-${edge.id}`).click();
  const road = page.getByTestId(`road-${edge.id}`);
  await expect(road).toHaveAttribute("aria-label", "Emberhold road");
  expect(await road.locator("path[stroke-dasharray]").count()).toBe(0);
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
  expect(saved.routes[edge.id].kind).toBe("road");
  expect(inventory(saved).brick).toBe(before.brick! - 1);
  expect(inventory(saved).wool).toBe(before.wool);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.getByTestId(`road-${edge.id}`)).toHaveAttribute(
    "aria-label",
    "Emberhold road",
  );
});
