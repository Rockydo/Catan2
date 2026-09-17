import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { mixedRoutesFixture } from "../tests/mixed-routes-fixture";
import { funded, started, piece, run, nextOwnerTurn } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { ownTowns, inventory, routeSites } from "../src/game/selectors";
import { landAtVertex, neighbors } from "../src/game/world";
import type { Game } from "../src/game/types";

async function saved(page: Page, s: Game) {
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
}
async function state(page: Page): Promise<Game> {
  return page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)!).game,
    SAVE_KEY,
  );
}
async function panel(page: Page, name?: string) {
  const mobile = page.getByRole("button", { name: "Actions & realm" });
  if (
    (await mobile.isVisible()) &&
    !(await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open")))
  )
    await mobile.click();
  if (name) await page.getByRole("button", { name, exact: true }).click();
}
async function closePanel(page: Page) {
  if (
    await page
      .locator(".right-panel")
      .evaluate((e) => e.classList.contains("mobile-open"))
  )
    await page.getByRole("button", { name: "Close action panel" }).click();
}

test("new campaign completes snake setup and a human turn with live worker AI", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: /New campaign/ }).click();
  await page.getByLabel("World seed").fill("test-frontier");
  await page.getByRole("button", { name: "Found your realm" }).click();
  await page.getByRole("button", { name: /begin/ }).click();
  await page.locator('[data-testid^="settlement-target-"]').first().click();
  await page.locator('[data-testid^="edge-target-"]').first().click();
  await expect
    .poll(async () => Object.keys((await state(page)).towns).length)
    .toBe(9);
  await page.locator('[data-testid^="settlement-target-"]').first().click();
  await page.locator('[data-testid^="edge-target-"]').first().click();
  await page.getByRole("button", { name: "Roll dice" }).click();
  await expect(
    page.getByRole("button", { name: "End turn", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect
    .poll(
      async () => {
        const decline = page
          .getByRole("dialog")
          .getByRole("button", { name: "Decline", exact: true });
        if (await decline.isVisible()) await decline.click();
        const current = await state(page);
        return current.active === 0 && current.phase === "roll";
      },
      { timeout: 45000 },
    )
    .toBe(true);
  expect((await state(page)).round).toBe(2);
  expect(errors).toEqual([]);
  await page.screenshot({
    path: `test-artifacts/${test.info().project.name}-campaign.png`,
    fullPage: true,
  });
});

test("town upgrades, production extensions, bank trade, research and reload persist", async ({
  page,
}) => {
  const s = funded();
  const town = ownTowns(s)[0];
  await saved(page, s);
  await page.getByTestId(`town-${town.id}`).click();
  await panel(page, "Build");
  await page.getByRole("button", { name: "Upgrade to City I" }).click();
  expect((await state(page)).towns[town.id].level).toBe(2);
  await page
    .getByRole("button", { name: "Build Palisade", exact: false })
    .click();
  expect((await state(page)).towns[town.id].wall).toBe(1);
  const ext = page.locator(".industry-row button").first();
  await ext.click();
  expect(
    Object.keys((await state(page)).towns[town.id].extensions),
  ).toHaveLength(1);
  await panel(page, "Research");
  await page.getByRole("button", { name: /Fund tier I research/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Choose your discovery");
  await page.locator(".research-card").first().click();
  expect((await state(page)).players[0].hand).toHaveLength(1);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  expect((await state(page)).towns[town.id].level).toBe(2);
  expect((await state(page)).players[0].hand).toHaveLength(1);
});

test("moving an army and ending its turn work through map controls", async ({
  page,
}) => {
  const s = funded();
  s.phase = "military";
  const tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
  const u = piece(s, tile, 0, "light", 2);
  await saved(page, s);
  await page.getByTestId(`army-${tile}`).click();
  await panel(page, "Forces");
  await page
    .getByRole("button", { name: /Move \/ attack with selected/ })
    .click();
  const targets = page.locator(".map-tile.reachable");
  await expect(targets.first()).toBeVisible();
  await targets.first().click();
  expect((await state(page)).pieces[u.id].tile).not.toBe(tile);
});

test("human casualties use whole units and a siege finishes the campaign", async ({
  page,
}) => {
  let s = funded();
  s.phase = "military";
  for (const p of s.players)
    if (p.id > 1) {
      p.alive = false;
      for (const t of ownTowns(s, p.id)) delete s.towns[t.id];
      for (const [k, r] of Object.entries(s.routes))
        if (r.owner === p.id) delete s.routes[k];
    }
  const enemies = ownTowns(s, 1);
  for (const t of enemies.slice(1)) delete s.towns[t.id];
  const town = enemies[0],
    tile = landAtVertex(s, town.vertex)[0];
  const u = piece(s, tile, 0, "artillery", 3);
  s.sieges[`0:${town.id}`] = {
    owner: 0,
    town: town.id,
    progress: 0,
    last: 0,
    raided: 0,
  };
  await saved(page, s);
  await page.getByTestId(`army-${tile}`).click();
  await panel(page, "Forces");
  await page.getByRole("button", { name: "Destroy town", exact: true }).click();
  await page.getByRole("button", { name: "Confirm destruction" }).click();
  await expect(page.getByRole("dialog")).toContainText(
    /frontier|victory|realm|domination/i,
  );
  expect((await state(page)).winner).toBe(0);
  expect((await state(page)).phase).toBe("finished");
});

test("export imports intact and rejects a corrupted file without losing the campaign", async ({
  page,
}) => {
  const s = funded();
  await saved(page, s);
  await page.getByRole("button", { name: "Open campaign menu" }).click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Export saved game" }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/\.json$/);
  await page.locator("input[type=file]").setInputFiles({
    name: "broken.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"broken":true}'),
  });
  await expect(page.getByRole("alert").last()).toContainText(
    /supported|save|game/i,
  );
  expect((await state(page)).seed).toBe(s.seed);
  await page.locator("input[type=file]").setInputFiles({
    name: "valid.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(s)),
  });
  expect((await state(page)).seed).toBe(s.seed);
});

test("menu and active game have no serious accessibility violations", async ({
  page,
}) => {
  await page.goto("/");
  let audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  const s = funded();
  await page.evaluate(({ key, data }) => localStorage.setItem(key, data), {
    key: SAVE_KEY,
    data: serialize(s),
  });
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
});

test("bank imports and a played research reward reach the local warehouse", async ({
  page,
}) => {
  const s = funded();
  s.players[0].hand = [{ id: "c-test", tier: 1, kind: "harvest", bought: 0 }];
  await saved(page, s);
  await panel(page, "Trade");
  await page.getByLabel("Give goods", { exact: true }).selectOption("lumber");
  await page.getByLabel("Receive goods", { exact: true }).selectOption("steel");
  const before = inventory(await state(page));
  await page
    .getByRole("button", { name: /Exchange .*Wood for 1 Steel/ })
    .click();
  expect(inventory(await state(page)).steel).toBe(before.steel! + 1);
  await panel(page, "Research");
  await page.getByRole("button", { name: "Play card" }).click();
  await page.getByLabel("Grain quantity").fill("4");
  await page
    .getByRole("button", { name: "Play research", exact: true })
    .click();
  expect(inventory(await state(page)).grain).toBe(before.grain! + 4);
});

test("frontier preview and expedition launch grow the rendered map", async ({
  page,
}) => {
  const s = funded(),
    t = ownTowns(s)[0];
  t.vertex = Object.values(s.vertices).find(
    (v) =>
      v.tiles.length < 3 &&
      landAtVertex(s, v.id).length &&
      !Object.values(s.towns).some((t) =>
        s.vertices[t.vertex].edges.some((e) =>
          s.edges[e].vertices.includes(v.id),
        ),
      ),
  )!.id;
  await saved(page, s);
  await panel(page, "Explore");
  await page.getByLabel("Expedition size").selectOption("3");
  await page
    .getByRole("button", { name: "Preview expedition footprint" })
    .click();
  await page.getByRole("button", { name: /Launch expedition/ }).click();
  expect(Object.keys((await state(page)).tiles)).toHaveLength(140);
  await closePanel(page);
  expect(await page.locator('[data-testid^="hex-"]').count()).toBe(140);
});

test("a losing human chooses whole casualties through the battle dialog", async ({
  page,
}) => {
  let s = funded();
  s.phase = "military";
  const target = landAtVertex(s, ownTowns(s)[0].vertex)[0];
  const origin = Object.values(s.tiles).find(
    (t) =>
      t.resource !== "water" &&
      s.tiles[target].vertices.some((v) => t.vertices.includes(v)) &&
      t.id !== target,
  )!.id;
  const a = piece(s, origin, 1, "artillery", 3),
    b = piece(s, origin, 1, "artillery", 2),
    d = piece(s, target, 0, "artillery", 3);
  s.active = 1;
  s.players[1].turns = 1;
  s = run(s, { type: "move", ids: [a.id, b.id], to: target });
  expect(s.battle?.required).toBe(3);
  await saved(page, s);
  await expect(page.getByRole("dialog")).toContainText(/casualties|battle/i);
  await page.getByRole("button", { name: "Confirm casualties" }).click();
  expect((await state(page)).pieces[d.id]).toBeUndefined();
});

test("hotseat handoff conceals private research and allows the next human turn", async ({
  page,
}) => {
  const s = funded();
  s.players[1].control = "human";
  s.players[0].hand = [
    { id: "c-private", tier: 1, kind: "harvest", bought: 0 },
  ];
  await saved(page, s);
  await expect(page.getByRole("dialog")).toContainText("Pass to Emberhold");
  await page.getByRole("button", { name: "I am Emberhold" }).click();
  await panel(page, "Research");
  expect(await page.locator(".hand-card").count()).toBe(1);
  await closePanel(page);

  await page.getByRole("button", { name: "End turn", exact: true }).click();
  await expect(page.getByRole("dialog")).toContainText("Pass to Tidewatch");
  expect(await page.locator(".hand-card").count()).toBe(0);
  await page.getByRole("button", { name: "I am Tidewatch" }).click();
  await page.getByRole("button", { name: "Roll dice" }).click();
});

test("convoy embarkation and a later landing use real transport controls", async ({
  page,
}) => {
  const s = funded();
  s.phase = "military";
  const water = Object.values(s.tiles).find(
    (t) =>
      t.resource === "water" &&
      neighbors(t.id).some(
        (n) => s.tiles[n] && s.tiles[n].resource !== "water",
      ),
  )!.id;
  const land = neighbors(water).find(
      (n) => s.tiles[n] && s.tiles[n].resource !== "water",
    )!,
    ship = piece(s, water, 0, "convoy"),
    u = piece(s, land, 0, "heavy", 3);
  await saved(page, s);
  await page.getByTestId(`army-${land}`).click();
  await panel(page, "Forces");
  await page
    .getByRole("button", { name: `Embark on fleet at ${water}`, exact: true })
    .click();
  await page.getByRole("button", { name: "Load transports" }).click();
  expect((await state(page)).pieces[u.id].carrier).toBe(ship.id);
  const later = await state(page);
  nextOwnerTurn(later);
  await page.locator("input[type=file]").setInputFiles({
    name: "next-turn.json",
    mimeType: "application/json",
    buffer: Buffer.from(serialize(later)),
  });
  await closePanel(page);
  await page.getByTestId(`army-${water}`).click();
  await panel(page, "Forces");
  await page.getByRole("button", { name: "Disembark passengers" }).click();
  await page.getByLabel(/Landing beach/).selectOption(land);
  await page.getByRole("button", { name: "Disembark troops" }).click();
  expect((await state(page)).pieces[u.id].tile).toBe(land);
  expect((await state(page)).pieces[u.id].carrier).toBeUndefined();
});

test("an open sea route can be relocated through highlighted map edges", async ({
  page,
}) => {
  let s = funded();
  // A sea route needs water on both sides, with the town on the third land hex.
  s.routes = {};
  for (const town of ownTowns(s)) {
    const vertex = s.vertices[town.vertex];
    const seaEdge = vertex.edges
      .map((id) => s.edges[id])
      .find(
        (e) =>
          e.tiles.length === 2 &&
          vertex.tiles.some((t) => !e.tiles.includes(t)),
      )!;
    for (const tile of vertex.tiles)
      s.tiles[tile].resource = seaEdge.tiles.includes(tile)
        ? "water"
        : "lumber";
  }
  const edge = routeSites(s, "route")[0];
  s = run(s, { type: "route", edge });
  s.routes[edge].born = 0;
  await saved(page, s);
  await page
    .getByRole("button", { name: "Emberhold shipping route", exact: true })
    .click();
  await panel(page, "Build");
  await page
    .getByRole("button", { name: "Relocate open-ended ship route" })
    .click();
  await page.locator('[data-testid^="edge-target-"]').first().click();
  expect((await state(page)).players[0].routeMoved).toBe(true);
  expect((await state(page)).routes[edge]).toBeUndefined();
});

test("every action panel remains keyboard labelled and readable", async ({
  page,
}) => {
  const s = funded();
  const t = ownTowns(s)[0];
  t.level = 4;
  t.turnLevel = 4;
  await saved(page, s);
  await page.getByTestId(`town-${t.id}`).click();
  const failures: unknown[] = [];
  for (const name of ["Build", "Forces", "Trade", "Research", "Explore"]) {
    await panel(page, name);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
      .analyze();
    if (result.violations.length)
      failures.push({
        panel: name,
        errors: result.violations.map((v) => ({
          id: v.id,
          nodes: v.nodes.map((n) => n.target),
        })),
      });
  }
  expect(failures).toEqual([]);
});

test("both road sides support camps and independent tier-II upgrades", async ({
  page,
}) => {
  const s = funded();
  const e = Object.values(s.edges).find(
    (e) =>
      e.tiles.length === 2 &&
      e.tiles.every((id) => s.tiles[id].resource !== "water"),
  )!;
  s.routes[e.id] = {
    id: `r${s.nextId++}`,
    edge: e.id,
    owner: 0,
    kind: "road",
    born: 0,
    camps: {},
  };
  await saved(page, s);
  await page.getByTestId(`road-${e.id}`).click();
  await panel(page, "Build");
  const camps = page.locator(".camp-side");
  await expect(camps).toHaveCount(2);
  for (let i = 0; i < 2; i++) {
    await camps.nth(i).getByRole("button", { name: "Build camp" }).click();
    await camps
      .nth(i)
      .getByRole("button", { name: "Upgrade camp to II" })
      .click();
  }
  expect((await state(page)).routes[e.id].camps).toEqual(
    Object.fromEntries(e.tiles.map((id) => [id, 2])),
  );
});

test("raiding transfers every good immediately and requires no cargo choices", async ({
  page,
}) => {
  const s = funded();
  s.phase = "military";
  const target = ownTowns(s, 1)[0],
    tile = landAtVertex(s, target.vertex)[0];
  target.stock = { grain: 321, steel: 48 };
  piece(s, tile, 0, "light", 1);
  const before = inventory(s);
  await saved(page, s);
  await page.getByTestId(`army-${tile}`).click();
  await panel(page, "Forces");
  await page
    .locator(".siege-card")
    .filter({ has: page.getByText(target.name, { exact: true }) })
    .getByRole("button", { name: "Raid town", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toContainText("321");
  await page.getByRole("button", { name: "Raid all goods" }).click();
  const after = await state(page);
  expect(after.towns[target.id].stock).toEqual({});
  expect(inventory(after).grain).toBe(before.grain! + 321);
  expect(inventory(after).steel).toBe(before.steel! + 48);
});

test("illustrated resource guide explains production and stores and loads all artwork", async ({
  page,
}) => {
  const failures: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await saved(page, funded());
  await page.getByRole("button", { name: /^Fuel:/ }).click();
  await expect(page.getByRole("dialog")).toContainText("Refined coal fuel");
  await page.getByText(/Used in .* recipes/).click();
  await expect(page.getByRole("dialog")).toContainText("Great Bombard");
  const audit = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21aa"])
    .analyze();
  expect(
    audit.violations.map((v) => ({
      id: v.id,
      nodes: v.nodes.map((n) => n.target),
    })),
  ).toEqual([]);
  expect(failures).toEqual([]);
});

test("offshore harbors can be inspected with the keyboard", async ({
  page,
}) => {
  await saved(page, started());
  const harbor = page.getByRole("button", { name: /^Harbor:/ }).first();
  await harbor.focus();
  await harbor.press("Enter");
  await panel(page);
  await expect(page.locator(".panel-intro h2")).toHaveText("Harbor");
  await expect(page.locator(".panel-intro")).toContainText(
    "town at either end",
  );
  await expect(page.locator(".panel-intro")).toContainText(/2:1|3:1/);
});

test("map zoom stays under the cursor and pan follows the pointer", async ({
  page,
}) => {
  await saved(page, started());
  const map = page.locator(".world-map"),
    box = (await map.boundingBox())!;
  const cursor = { x: box.x + box.width * 0.32, y: box.y + box.height * 0.37 };
  const worldAtCursor = () =>
    map.evaluate((el, p) => {
      const q = new DOMPoint(p.x, p.y).matrixTransform(
        (el as SVGSVGElement).getScreenCTM()!.inverse(),
      );
      return { x: q.x, y: q.y };
    }, cursor);
  const before = await worldAtCursor(),
    oldView = await map.getAttribute("viewBox");
  await page.mouse.move(cursor.x, cursor.y);
  await page.mouse.wheel(0, -100);
  await expect(map).not.toHaveAttribute("viewBox", oldView!);
  const after = await worldAtCursor();
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.5);
  expect(Math.abs(after.y - before.y)).toBeLessThan(0.5);
  const scale = await map.evaluate(
    (el) => (el as SVGSVGElement).getScreenCTM()!.a,
  );
  await page.mouse.down();
  await page.mouse.move(cursor.x + 40, cursor.y + 25, { steps: 8 });
  await page.mouse.up();
  await expect
    .poll(async () =>
      Math.abs((await worldAtCursor()).x - after.x + 40 / scale),
    )
    .toBeLessThan(0.5);
  expect(
    Math.abs((await worldAtCursor()).y - after.y + 25 / scale),
  ).toBeLessThan(0.5);
  await page.getByRole("button", { name: "Fit entire map" }).click();
  await expect(map).toHaveAttribute("viewBox", oldView!);
});

test("large stores and the mobile turn controls stay legible without overlap", async ({
  page,
}) => {
  const s = funded();
  s.dice = [3, 4];
  ownTowns(s)[0].stock.coke = 12000;
  await saved(page, s);
  await expect(page.locator(".dice")).toBeVisible();
  const fuel = page.getByRole("button", { name: "Fuel: 12000", exact: true });
  await expect(fuel.locator("b")).toHaveText("12K");
  const overflow = await page
    .locator(".resource-chip")
    .evaluateAll((chips) =>
      chips
        .filter((el) => el.scrollWidth > el.clientWidth + 1)
        .map((el) => el.getAttribute("aria-label")),
    );
  expect(overflow).toEqual([]);
  expect(
    await page.evaluate(() => document.body.scrollWidth),
  ).toBeLessThanOrEqual(await page.evaluate(() => innerWidth));
  const actions = page.getByRole("button", { name: "Actions & realm" });
  if (await actions.isVisible()) {
    const a = (await actions.boundingBox())!,
      b = (await page
        .getByRole("button", { name: "End turn", exact: true })
        .boundingBox())!;
    expect(
      a.x + a.width <= b.x ||
        b.x + b.width <= a.x ||
        a.y + a.height <= b.y ||
        b.y + b.height <= a.y,
    ).toBe(true);
    await actions.click();
    await expect(
      page.getByRole("button", { name: "Close action panel" }),
    ).toBeVisible();
  }
});

test("roads and sea routes connect directly through highlighted build targets", async ({
  page,
}) => {
  const f = mixedRoutesFixture();
  await saved(page, f.s);
  for (const [name, edge, kind] of [
    ["Road", f.road, "road"],
    ["Ship route", f.sea, "route"],
    ["Road", f.beachRoad, "road"],
  ] as const) {
    await panel(page, "Build");
    await page
      .locator(".build-tools")
      .getByRole("button", { name: new RegExp(`^${name}`) })
      .click();
    await closePanel(page);
    await page.getByTestId(`edge-target-${edge}`).click();
    await expect
      .poll(async () => (await state(page)).routes[edge]?.kind)
      .toBe(kind);
  }
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  const restored = await state(page);
  expect(
    [f.road, f.sea, f.beachRoad].map((e) => restored.routes[e].kind),
  ).toEqual(["road", "route", "road"]);
});
