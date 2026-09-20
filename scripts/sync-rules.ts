import { SEASONS, seasonalProfile } from "../src/game/seasons";
import type { Hex } from "../src/game/types";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
  biomeYield,
  climateInitialWeight,
  climateTransitionWeight,
  waterProbabilities,
} from "../src/game/climate-content";
/** Export the same bilingual guide and live catalogue as portable Markdown. */
import { mkdirSync, writeFileSync } from "node:fs";
import chapters from "../src/rules/chapters.json";
import {
  COSTS,
  CARDS,
  UNIT_INFO,
  SHIP_INFO,
  SHIP_NAMES,
  shipStats,
  ROMAN,
} from "../src/game/content";
import { GOOD_INFO } from "../src/game/content";
import { GUILDS } from "../src/game/guilds";
import type { Good, ShipClass, Stock } from "../src/game/types";
import { setLocale, localize as tx } from "../src/i18n";
mkdirSync(new URL("../docs/rules/", import.meta.url), { recursive: true });
for (const locale of ["en", "fr"] as const) {
  setLocale(locale);
  const text = (en: string, fr: string) => (locale === "en" ? en : fr);
  const cost = (s: Stock) =>
    Object.entries(s)
      .map(([g, n]) => `${n} ${tx(GOOD_INFO[g as Good].name)}`)
      .join(" + ");
  const lines = [
    `# ${text("Catane Frontiers: complete rules", "Catane Frontières : règles complètes")}`,
    text(
      "Generated from the interactive guide and game data. Launch the game and choose Learn to play for the illustrated version.",
      "Généré depuis le guide interactif et les données du jeu. Lancez le jeu et choisissez Apprendre à jouer pour la version illustrée.",
    ),
  ];
  for (const c of chapters)
    lines.push(
      `## ${c.title[locale]}`,
      c.body[locale].replace(/^## /gm, "### "),
    );
  lines.push(`## ${text("Climate tables", "Tables climatiques")}`);
  for (const climate of CLIMATES) {
    const c = CLIMATE_INFO[climate];
    lines.push(
      `### ${tx(c.name)}: ${Math.round(c.land * 100)}% ${text("land", "terre")} / ${Math.round((1 - c.land) * 100)}% ${text("water", "eau")}`,
      `${text("Compatible", "Compatible")} : ${c.compatible.map((n) => tx(CLIMATE_INFO[n].name)).join(", ")}`,
      `${text("Initial climate weight", "Poids du climat initial")} : ${climateInitialWeight(climate).toLocaleString(locale)}`,
      `${text("Transition weights", "Poids des transitions")} : ${c.compatible.map((n) => `${tx(CLIMATE_INFO[n].name)} ×${climateTransitionWeight(climate, n).toLocaleString(locale)}`).join(", ")}`,
      `| ${text("Land terrain | Conditional chance | Annual baseline", "Terrain terrestre | Probabilité conditionnelle | Base annuelle")} |`,
      "|---|---|---|",
      ...c.terrain.map(
        ([b, n]) =>
          `| ${tx(BIOME_INFO[b].name)} | ${n}% | ${b === "woods" ? text("1 Wood OR 1 Hides", "1 Bois OU 1 Peau") : cost(biomeYield(b, climate)) || "0"} |`,
      ),
      `| ${text("Water terrain | Sequential check | Effective water share", "Terrain aquatique | Tirage successif | Part effective de l’eau")} |`,
      "|---|---|---|",
      ...waterProbabilities(climate).map(
        ([b, n]) =>
          `| ${tx(BIOME_INFO[b].name)} | ${b === "water" ? "" : Math.round(c.water.find(([t]) => t === b)![1] * 100) + "%"} | ${Number((n * 100).toFixed(3))}% |`,
      ),
      text(
        `Open water (no adjacent land): Whale check ${c.water.find(([b]) => b === "whale")![1] * 200}%; effective share ${Number((waterProbabilities(climate, true).find(([b]) => b === "whale")![1] * 100).toFixed(3))}%. Table above: coastal water.`,
        `Haute mer (sans terre adjacente) : tirage Baleines ${c.water.find(([b]) => b === "whale")![1] * 200} % ; part effective ${Number((waterProbabilities(climate, true).find(([b]) => b === "whale")![1] * 100).toFixed(3))} %. Tableau ci-dessus : eau côtière.`,
      ),
    );
  }
  lines.push(
    `## ${text("Terrain yields", "Production des terrains")}`,
    text(
      "Current annual baselines include climate-specific cereal productivity. Each seasonal calendar totals four times that baseline, not necessarily the value used by an earlier game version.",
      "Les bases annuelles actuelles incluent la productivité des céréales propre au climat. Chaque calendrier totalise quatre fois cette base, qui peut différer de celle d’une ancienne version du jeu.",
    ),
    `| ${text("Terrain | Climates | Base yield | Family", "Terrain | Climats | Production de base | Famille")} |`,
    "|---|---|---|---|",
  );
  for (const b of BIOMES) {
    const variants = new Map<string, string[]>();
    for (const climate of CLIMATES) {
      const info = CLIMATE_INFO[climate];
      if (
        b !== "water" &&
        ![...info.terrain, ...info.water].some(([biome]) => biome === b)
      )
        continue;
      const yieldText =
        b === "woods"
          ? text("1 Wood OR 1 Hides", "1 Bois OU 1 Peau")
          : cost(biomeYield(b, climate)) || "0";
      variants.set(yieldText, [
        ...(variants.get(yieldText) ?? []),
        tx(info.name),
      ]);
    }
    for (const [yieldText, climates] of variants)
      lines.push(
        `| ${tx(BIOME_INFO[b].name)} | ${climates.join(" / ")} | ${yieldText} | ${tx(BIOME_INFO[b].family)} |`,
      );
  }
  lines.push(
    text(
      "Bare Peaks: no production and no unit entry, including recruitment, retreat or disembarkation. Roads may follow their edges; towns need adjacent walkable solid land.",
      "Pics rocheux : aucune production et aucune entrée d’unité, y compris par recrutement, repli ou débarquement. Les routes peuvent suivre leurs arêtes ; une agglomération exige une terre ferme praticable adjacente.",
    ),
  );
  lines.push(
    `## ${text("Complete seasonal harvest tables", "Tables complètes des récoltes saisonnières")}`,
    text(
      "Ordinary seas freeze in Spring/Autumn with fixed chances: Glacial 100%/100%, Arctic 70%/50%, Alpine 35%/25%, Cold 20%/10%. They all freeze in Winter and open in Summer. Glacial Frozen sea terrain stays frozen all year; Arctic Frozen sea opens in Summer. Glacial marine harvests occur only in Summer. Other marine rows show the open-water baseline: frozen Spring or Autumn yield moves into Summer without changing the current annual total. Select a tile for exact surfaces and yields.",
      "Les mers ordinaires gèlent au Printemps/en Automne selon des probabilités fixes : Glacial 100 %/100 %, Arctique 70 %/50 %, Alpin 35 %/25 %, Froid 20 %/10 %. Elles gèlent toutes en Hiver et s’ouvrent en Été. La Banquise du climat Glacial reste gelée toute l’année ; la Banquise arctique s’ouvre en Été. Les récoltes marines du climat Glacial ont lieu seulement en Été. Les autres lignes marines indiquent la base en eau libre : le rendement bloqué par le gel printanier ou automnal est reporté en Été sans changer le total annuel actuel. Sélectionnez une tuile pour connaître ses états et rendements exacts.",
    ),
  );
  for (const climate of CLIMATES) {
    lines.push(
      `### ${tx(CLIMATE_INFO[climate].name)}`,
      `| ${text("Terrain | Spring | Summer | Autumn | Winter", "Terrain | Printemps | Été | Automne | Hiver")} |`,
      "|---|---|---|---|---|",
    );
    const biomes = [
      ...new Set([
        ...CLIMATE_INFO[climate].terrain.map(([b]) => b),
        ...CLIMATE_INFO[climate].water.map(([b]) => b),
      ]),
    ];
    for (const biome of biomes)
      for (const choice of biome === "woods"
        ? (["lumber", "hides"] as const)
        : [undefined]) {
        const tile: Hex = {
          id: "0,0",
          q: 0,
          r: 0,
          number: 7,
          climate,
          biome,
          resource: BIOME_INFO[biome].resource,
          vertices: [],
          edges: [],
          ...(choice ? { woodsChoices: { 0: choice } } : {}),
        };
        const profile = seasonalProfile(tile, 0);
        lines.push(
          `| ${tx(BIOME_INFO[biome].name)}${choice ? ` (${tx(GOOD_INFO[choice].name)})` : ""} | ${SEASONS.map((season) => cost(profile[season]) || "0").join(" | ")} |`,
        );
      }
  }
  lines.push(
    `## ${text("All costs", "Tous les coûts")}`,
    text(
      "Prices are paid per construction or upgrade step. Watchtower I offers two alternative payments: 2 Wood OR 2 Stone.",
      "Les coûts concernent chaque construction ou étape. La Tour de guet I propose deux paiements alternatifs : 2 Bois OU 2 Pierres.",
    ),
    "| " + text("Recipe | Cost", "Recette | Coût") + " |",
    "|---|---|",
    ...Object.entries(COSTS).map(([n, s]) => `| ${tx(n)} | ${cost(s)} |`),
  );
  lines.push(
    `## ${text("Land roster", "Unités terrestres")}`,
    "| " +
      text(
        "Unit | Tier | Power | Movement | Terrain bonus",
        "Unité | Palier | Puissance | Mouvement | Bonus de terrain",
      ) +
      " |",
    "|---|---|---|---|---|",
  );
  for (const [kind, u] of Object.entries(UNIT_INFO))
    for (let i = 0; i < u.names.length; i++)
      lines.push(
        `| ${tx(u.names[i])} | ${ROMAN[i + 1]} | ${kind === "merchant" || kind === "settler" ? 0 : i + 1} | ${u.speed} | ${u.family ? "×2 " + tx(u.family) : "0"} |`,
      );
  lines.push(
    `## ${text("Ship roster", "Navires")}`,
    "| " +
      text(
        "Ship | Tier | Power / casualty points | Movement | Berths",
        "Navire | Palier | Puissance / points de pertes | Mouvement | Places",
      ) +
      " |",
    "|---|---|---|---|---|",
  );
  for (const k of Object.keys(SHIP_INFO) as ShipClass[])
    for (let i = 1; i <= SHIP_NAMES[k].length; i++) {
      const s = shipStats(k, i);
      lines.push(
        `| ${tx(s.name)} | ${ROMAN[i]} | ${s.power} | ${s.speed} | ${s.capacity} |`,
      );
    }
  lines.push(
    `## ${text("All research cards", "Toutes les cartes Développement")}`,
  );
  for (let tier = 1; tier <= 4; tier++) {
    lines.push(`### ${text("Tier", "Palier")} ${ROMAN[tier]}`);
    for (const c of Object.values(CARDS).filter((c) => c.tier === tier))
      lines.push(`**${tx(c.name)}:** ${tx(c.text)}`);
  }
  lines.push(`## ${text("Guild contracts", "Contrats des guildes")}`);
  for (const g of Object.values(GUILDS))
    lines.push(
      `### ${tx(g.name)}`,
      tx(g.purpose),
      ...g.tiers.map((s, i) => `- ${ROMAN[i + 1]}: ${tx(s)}`),
    );
  writeFileSync(
    new URL(`../docs/rules/${locale}.md`, import.meta.url),
    lines.join("\n\n") + "\n",
  );
}
console.log("Exported complete English and French rules to docs/rules.");
