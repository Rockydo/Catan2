import { SEASONS, seasonalProfile } from "../src/game/seasons";
import type { Hex } from "../src/game/types";
import {
  CLIMATES,
  CLIMATE_INFO,
  BIOMES,
  BIOME_INFO,
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
      `${text("Transition weights", "Poids des transitions")} : ${c.compatible.map((n) => `${tx(CLIMATE_INFO[n].name)} ×${climateTransitionWeight(climate, n).toLocaleString(locale)}`).join(", ")}`,
      `| ${text("Land terrain | Conditional chance", "Terrain terrestre | Probabilité conditionnelle")} |`,
      "|---|---|",
      ...c.terrain.map(([b, n]) => `| ${tx(BIOME_INFO[b].name)} | ${n}% |`),
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
    `| ${text("Terrain | Base yield | Family", "Terrain | Production de base | Famille")} |`,
    "|---|---|---|",
  );
  for (const b of BIOMES)
    lines.push(
      `| ${tx(BIOME_INFO[b].name)} | ${b === "woods" ? text("1 Wood OR 1 Hides", "1 Bois OU 1 Peau") : cost(BIOME_INFO[b].yield) || "0"} | ${tx(BIOME_INFO[b].family)} |`,
    );
  lines.push(
    text(
      "Bare Peaks: no production and no unit entry, including recruitment, retreat or disembarkation. Roads may follow their edges; towns need adjacent walkable solid land.",
      "Pics rocheux : aucune production et aucune entrée d’unité, y compris par recrutement, repli ou débarquement. Les routes peuvent suivre leurs arêtes ; une agglomération exige une terre ferme praticable adjacente.",
    ),
  );
  lines.push(
    `## ${text("Complete seasonal harvest tables", "Tables complètes des récoltes saisonnières")}`,
    text(
      "Marine rows show the open-water baseline. Ordinary sea hexes have fixed Spring/Autumn freezing chances: Arctic 70%/50%, Alpine 35%/25%, Cold 20%/10%; ordinary seas in these three climates all freeze in Winter and open in Summer. The original Frozen sea terrain stays frozen outside Summer. For each tile and each raw resource, frozen Spring or Autumn yield moves into Summer without changing its annual total. Select a tile in the game for its exact surfaces and adjusted yields.",
      "Les lignes marines indiquent le calendrier de base en eau libre. Les mers ordinaires ont des probabilités fixes de gel au Printemps/en Automne : Arctique 70 %/50 %, Alpin 35 %/25 %, Froid 20 %/10 % ; les mers ordinaires de ces trois climats gèlent toutes en Hiver et s’ouvrent en Été. Le terrain Banquise d’origine reste gelé hors Été. Pour chaque tuile et chaque ressource brute, le rendement supprimé par le gel du Printemps ou de l’Automne est reporté en Été sans modifier le total annuel. Sélectionnez une tuile dans le jeu pour connaître son état exact et ses rendements ajustés.",
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
