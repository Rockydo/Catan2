import { test, expect } from "@playwright/test";
import { maritimeFixture } from "../tests/maritime-fixture";
import { piece } from "../tests/helpers";
import { serialize, SAVE_KEY } from "../src/game/save";

for (const locale of ["en", "fr"] as const) {
  test(`${locale}: Bare Peaks are identifiable, not deployable or reachable, and keep edge roads`, async ({
    page,
  }) => {
    const { s, home } = maritimeFixture();
    Object.assign(s.tiles["0,0"], {
      biome: "bare-peaks",
      resource: "peaks",
      climate: "alpine",
    });
    const troop = piece(s, "-1,0", 0, "cavalry", 1);
    troop.bonus = 5;
    const edge = s.vertices[home.vertex].edges.find((e) =>
      s.edges[e].tiles.includes("0,0"),
    )!;
    s.routes[edge] = {
      id: `r${s.nextId++}`,
      owner: 0,
      kind: "road",
      edge,
      born: 0,
      camps: {},
    };
    await page.addInitScript(
      ({ key, data, locale }) => {
        if (!localStorage.getItem(key)) localStorage.setItem(key, data);
        localStorage.setItem("catane-language", locale);
      },
      { key: SAVE_KEY, data: serialize(s), locale },
    );
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto("/");
    await page
      .getByRole("button", {
        name: locale === "en" ? /Continue campaign/ : /Reprendre/,
      })
      .click();
    const peak = page.getByTestId("hex-0,0");
    await expect(peak).toHaveAttribute("data-impassable", "true");
    await expect(peak).toHaveAttribute(
      "aria-label",
      locale === "en" ? /Impassable/ : /Infranchissable/,
    );
    await peak.press("Enter");
    await expect(page.locator(".panel-intro")).toContainText(
      locale === "en"
        ? "Impassable. No units can enter."
        : "Infranchissable. Aucune unité ne peut y entrer.",
    );
    await page.keyboard.press("Escape");
    await page.getByTestId(`town-${home.id}`).press("Enter");
    await page.getByRole("button", { name: "Forces", exact: true }).click();
    const deployment = page.getByLabel(
      locale === "en" ? "Land deployment" : "Déploiement terrestre",
    );
    await expect(deployment.locator('option[value="0,0"]')).toHaveCount(0);
    await expect(deployment.locator("option")).not.toHaveCount(0);
    await page.keyboard.press("Escape");
    await page.getByTestId("army--1,0").press("Enter");
    await page.getByRole("button", { name: "Forces", exact: true }).click();
    await page
      .getByRole("button", {
        name:
          locale === "en"
            ? /Move \/ attack with selected/
            : /Déplacer \/ attaquer/,
      })
      .click();
    await expect(peak).not.toHaveClass(/reachable/);
    await expect(page.locator(".map-tile.reachable")).not.toHaveCount(0);
    await expect(page.getByTestId(`road-${edge}`)).toBeAttached();
    await page.keyboard.press("Escape");
    await page.screenshot({
      path: `test-artifacts/peaks-board-${locale}-${test.info().project.name}.png`,
    });
    expect(errors).toEqual([]);
  });
}
