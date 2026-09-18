import { test, expect, type Page } from "@playwright/test";
import { funded, piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";
import { ownTowns } from "../src/game/selectors";
import { landAtVertex } from "../src/game/world";
import { newGame } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { REALM_NAMES } from "../src/game/content";
import { run } from "../tests/helpers";

async function load(page: Page, s = funded()) {
  const tile = landAtVertex(s, ownTowns(s)[0].vertex)[0];
  const unit = piece(s, tile, 0, "light", 2);
  await page.addInitScript(
    ({ key, data }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, data);
    },
    { key: SAVE_KEY, data: serialize(s) },
  );
  await page.goto("/");
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  return { tile, unit };
}
async function closePanel(page: Page) {
  const close = page.getByRole("button", { name: "Close action panel" });
  if (await close.isVisible()) await close.click();
}
async function layersMatch(page: Page) {
  await expect
    .poll(async () => ({
      foreground: await page.locator(".world-map").getAttribute("viewBox"),
      background: await page.locator(".terrain-map").getAttribute("viewBox"),
      transform: await page
        .locator(".map-camera-layer")
        .evaluate((e) => e.style.transform),
    }))
    .toEqual({
      foreground: await page.locator(".world-map").getAttribute("viewBox"),
      background: await page.locator(".world-map").getAttribute("viewBox"),
      transform: "",
    });
}

test("dice labels sharpen promptly after a notch and a continuous zoom gesture", async ({
  page,
}) => {
  await load(page);
  await closePanel(page);
  await page.waitForLoadState("networkidle");
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  for (const notches of [1, 12]) {
    const timing = await page.evaluate(async (count) => {
      const map = document.querySelector<SVGSVGElement>(".world-map")!;
      const layer = document.querySelector<HTMLElement>(".map-camera-layer")!;
      const rect = layer.parentElement!.getBoundingClientRect();
      let sent = 0,
        lastWheel = 0,
        lastCommit = 0;
      const observer = new MutationObserver(() => {
        lastCommit = performance.now();
      });
      observer.observe(map, { attributes: true, attributeFilter: ["viewBox"] });
      try {
        for (; sent < count;) {
          sent++;
          lastWheel = performance.now();
          map.dispatchEvent(
            new WheelEvent("wheel", {
              deltaY: -100,
              clientX: rect.x + rect.width / 2,
              clientY: rect.y + rect.height / 2,
              cancelable: true,
            }),
          );
          if (sent < count) await new Promise((r) => setTimeout(r, 20));
        }
        while (
          (lastCommit < lastWheel || layer.style.transform) &&
          performance.now() - lastWheel < 1000
        )
          await new Promise(requestAnimationFrame);
        // Observe a presentation frame after the crisp SVG geometry is installed.
        await new Promise(requestAnimationFrame);
        return {
          delay: performance.now() - lastWheel,
          transform: layer.style.transform,
          foreground: map.getAttribute("viewBox"),
          background: document
            .querySelector(".terrain-map")!
            .getAttribute("viewBox"),
        };
      } finally {
        observer.disconnect();
      }
    }, notches);
    // Allow headless/CI scheduling slack; the old 600 ms policy must fail.
    expect(timing.delay).toBeLessThan(250);
    expect(timing.transform).toBe("");
    expect(timing.foreground).toBe(timing.background);
  }
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(saved);
});

test("camera drag, anchored wheel zoom, fit, resize and keyboard selection stay aligned", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await load(page);
  await closePanel(page);
  const map = page.locator(".world-map");
  const initial = await map.getAttribute("viewBox");
  const saved = await page.evaluate(
    (key) => localStorage.getItem(key),
    SAVE_KEY,
  );
  const box = (await map.boundingBox())!;
  const x = box.x + box.width * 0.5,
    y = box.y + box.height * 0.5;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + 50, y + 35, { steps: 12 });
  await page.mouse.up();
  await expect(map).not.toHaveAttribute("viewBox", initial!);
  await layersMatch(page);
  expect(
    await page.evaluate((key) => localStorage.getItem(key), SAVE_KEY),
  ).toBe(saved);
  const point = () =>
    map.evaluate(
      (e, p) => {
        const v = new DOMPoint(p.x, p.y).matrixTransform(
          (e as SVGSVGElement).getScreenCTM()!.inverse(),
        );
        return { x: v.x, y: v.y };
      },
      { x, y },
    );
  const before = await point();
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -300);
  await expect
    .poll(async () =>
      Number((await map.getAttribute("viewBox"))!.split(" ")[2]),
    )
    .toBeLessThan(Number(initial!.split(" ")[2]));
  await layersMatch(page);
  const after = await point();
  expect(Math.abs(after.x - before.x)).toBeLessThan(0.1);
  expect(Math.abs(after.y - before.y)).toBeLessThan(0.1);
  await page.getByRole("button", { name: "Fit entire map" }).click();
  await expect(map).toHaveAttribute("viewBox", initial!);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({
    width: viewport.width - 30,
    height: viewport.height - 20,
  });
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await expect(map).not.toHaveAttribute("viewBox", initial!);
  await layersMatch(page);
  await page.getByRole("button", { name: "Fit entire map" }).click();
  const hex = page.locator(".map-tile").first();
  await hex.focus();
  await hex.press("Enter");
  await expect(hex).toHaveClass(/selected/);
  await closePanel(page);
  await expect(page.locator(".board-frame pattern")).toHaveCount(86);
  await page.getByRole("button", { name: "Hide dice numbers" }).click();
  await expect(
    page.locator(".terrain-map .production-token circle"),
  ).toHaveCount(0);
  await page.getByRole("button", { name: "Show dice numbers" }).click();
  await expect(
    page.locator(".terrain-map .production-token circle").first(),
  ).toBeVisible();
  await page.screenshot({
    path: `test-artifacts/map-camera-${test.info().project.name}.png`,
  });
  expect(errors).toEqual([]);
});

test("army moves to the clicked hex after camera zoom and recenter, and persists", async ({
  page,
}) => {
  const { tile, unit } = await load(page);
  await page.getByTestId(`army-${tile}`).click();
  await closePanel(page);
  await page.getByRole("button", { name: "Center selected location" }).click();
  await expect
    .poll(async () =>
      page.locator(".map-camera-layer").evaluate((e) => e.style.transform),
    )
    .toBe("");
  const open = page.getByRole("button", { name: "Actions & realm" });
  if (await open.isVisible()) await open.click();
  await page.getByRole("button", { name: "Forces", exact: true }).click();
  await page
    .getByRole("button", { name: /Move \/ attack with selected/ })
    .click();
  const target = page.locator(".map-tile.reachable").first();
  const destination = (await target.getAttribute("data-testid"))!.slice(4);
  await target.click();
  await expect
    .poll(async () =>
      page.evaluate(
        ({ key, id }) =>
          JSON.parse(localStorage.getItem(key)!).game.pieces[id].tile,
        { key: SAVE_KEY, id: unit.id },
      ),
    )
    .toBe(destination);
  await page.reload();
  await page.getByRole("button", { name: /Continue campaign/ }).click();
  await expect(page.getByTestId(`army-${destination}`)).toBeVisible();
});

test("deep zoom culls distant artwork, keeps the viewport covered while dragging, and restores the full map", async ({
  page,
}) => {
  let s = newGame(
    "zoom-coverage",
    REALM_NAMES.map((name) => ({ name, control: "human" })),
  );
  while (s.phase.startsWith("setup")) s = run(s, chooseAIAction(s));
  s.phase = "economy";
  s.players.forEach((p) => {
    p.turns = 10;
  });
  const { tile } = await load(page, s);
  const handoff = page.getByRole("button", { name: "I am Emberhold" });
  if (await handoff.isVisible()) await handoff.click();
  await closePanel(page);
  const map = page.locator(".world-map"),
    original = await map.getAttribute("viewBox");
  const frame = (await page.locator(".board-frame").boundingBox())!;
  await page.mouse.move(frame.x + frame.width / 2, frame.y + frame.height / 2);
  for (let i = 0; i < 22; i++) {
    await page.mouse.wheel(0, -100);
    await page.waitForTimeout(25);
  }
  await expect
    .poll(() => page.locator(".map-tile[style*='display: none']").count())
    .toBeGreaterThan(0);
  async function covered() {
    // Every tile intersecting the viewport must remain in both scene layers.
    expect(
      await page.evaluate(() => {
        const svg = document.querySelector<SVGSVGElement>(".world-map")!,
          parent = svg.closest(".board-frame")!.getBoundingClientRect(),
          matrix = svg.getScreenCTM()!;
        return [
          ...document.querySelectorAll<SVGElement>("[data-map-x]"),
        ].filter((e) => {
          const p = new DOMPoint(
            Number(e.dataset.mapX),
            Number(e.dataset.mapY),
          ).matrixTransform(matrix);
          return (
            p.x >= parent.left - 60 &&
            p.x <= parent.right + 60 &&
            p.y >= parent.top - 60 &&
            p.y <= parent.bottom + 60 &&
            e.style.display === "none"
          );
        }).length;
      }),
    ).toBe(0);
  }
  await covered();
  await expect(page.locator(".map-camera-layer text")).toHaveCount(0);
  await expect(
    page.locator(".production-token [role=img]").first(),
  ).toHaveAttribute("aria-label", /.+/);
  for (let i = 0; i < 4; i++) {
    await page.mouse.move(
      frame.x + frame.width * 0.15,
      frame.y + frame.height * 0.5,
    );
    await page.mouse.down();
    await page.mouse.move(
      frame.x + frame.width * 0.85,
      frame.y + frame.height * 0.5,
      { steps: 12 },
    );
    await covered();
    await page.mouse.up();
    await covered();
  }
  // Zoom out rapidly while content is culled, including before the settle timer.
  for (let i = 0; i < 22; i++) {
    await page.mouse.wheel(0, 100);
    await page.waitForTimeout(25);
    await covered();
  }
  await page.getByRole("button", { name: "Fit entire map" }).click();
  await expect(map).toHaveAttribute("viewBox", original!);
  await expect(page.locator(".map-tile[style*='display: none']")).toHaveCount(
    0,
  );
  await expect(
    page.locator(".terrain-map [data-map-x][style*='display: none']"),
  ).toHaveCount(0);
  await expect(page.getByTestId(`army-${tile}`)).toBeVisible();
  await page.getByTestId(`army-${tile}`).click();
  await closePanel(page);
  await page.getByRole("button", { name: "Center selected location" }).click();
  await expect(page.getByTestId(`army-${tile}`)).toBeVisible();
  await page.screenshot({
    path: `test-artifacts/zoom-coverage-${test.info().project.name}.png`,
  });
});
