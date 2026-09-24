import { baseGeographicYield, RIPARIAN_TERRAIN } from "../src/game/geography";
import {
  SEASONS,
  seasonalProfile,
  ICE_TRANSITIONS,
  iceOdds,
} from "../src/game/seasons";
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
import { format } from "prettier";
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
  lines.push(
    `## ${text("Legacy climate probabilities", "Probabilités climatiques historiques")}`,
  );
  for (const climate of CLIMATES) {
    const c = CLIMATE_INFO[climate];
    const whaleChance = c.water.find(([b]) => b === "whale")?.[1];
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
      whaleChance
        ? text(
            `Open water (no adjacent land): Whale check ${Math.min(1, whaleChance * 2) * 100}%; effective share ${Number(((waterProbabilities(climate, true).find(([b]) => b === "whale")?.[1] ?? 0) * 100).toFixed(3))}%. Table above: coastal water.`,
            `Haute mer (sans terre adjacente) : tirage Baleines ${Math.min(1, whaleChance * 2) * 100} % ; part effective ${Number(((waterProbabilities(climate, true).find(([b]) => b === "whale")?.[1] ?? 0) * 100).toFixed(3))} %. Tableau ci-dessus : eau côtière.`,
          )
        : text("No whales in this climate.", "Aucune baleine dans ce climat."),
    );
  }
  lines.push(
    `## ${text("Geographic riverbank weights", "Poids des terrains riverains")}`,
    text(
      "Low gentle riverbanks retain one quarter of ordinary eligible weights and add the weights below before a single draw. These are relative weights, not map percentages. Warm rice deltas add 25 for Delta gardens.",
      "Les basses rives peu pentues conservent un quart des poids ordinaires admissibles et ajoutent les poids ci-dessous avant un seul tirage. Ce sont des poids relatifs, pas des pourcentages de carte. Les deltas rizicoles chauds ajoutent 25 aux Jardins du delta.",
    ),
  );
  for (const climate of CLIMATES) {
    lines.push(
      `### ${tx(CLIMATE_INFO[climate].name)}`,
      ...RIPARIAN_TERRAIN[climate].map(
        ([b, w]) => `- ${tx(BIOME_INFO[b].name)}: ${w}`,
      ),
    );
  }
  lines.push(
    `## ${text("Terrain yields", "Production des terrains")}`,
    text(
      "Geography campaigns: permanent terrain only. Migrating animals add the yields in the Living geography chapter. Earlier climate probabilities describe legacy maps.",
      "Campagnes géographiques : terrain permanent uniquement. Les animaux migrateurs ajoutent les rendements du chapitre Géographie vivante. Les probabilités climatiques précédentes décrivent les anciennes cartes.",
    ),
    text(
      "Current annual baselines include climate-specific crop productivity. Each seasonal calendar totals four times that baseline, not necessarily the value used by an earlier game version.",
      "Les bases annuelles actuelles incluent la productivité des cultures propre au climat. Chaque calendrier totalise quatre fois cette base, qui peut différer de celle d’une ancienne version du jeu.",
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
        cost(
          baseGeographicYield({
            biome: b,
            climate,
            geography: { elevation: 0.5, region: "reference" },
          } as Hex),
        ) || "0";
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
      "Each season lasts two full rounds, early and late, with the same scheduled yield per matching roll in both halves. These are permanent terrain outputs. Migrating fish, whales and wild game add their current population yields; ice and floods can block production. No missed harvest is repaid. Physical ice changes independently at each half-season boundary using the tables below. Select a tile for its current surface, harvest values and next weather risks.",
      "Chaque saison dure deux manches complètes, début et fin, avec le même rendement prévu par jet correspondant. Ces rendements concernent le terrain permanent. Poissons, baleines et gibier migrateurs ajoutent les productions des populations présentes ; glace et crues peuvent bloquer la production. Aucune récolte manquée n’est compensée. La glace évolue indépendamment à chaque demi-saison selon les tables ci-dessous. Sélectionnez une tuile pour connaître son état actuel, ses rendements et ses risques météorologiques.",
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
      for (const choice of [undefined]) {
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
          geography: { elevation: 0.5, region: "reference" },
          ...(choice ? { woodsChoices: { 0: choice } } : {}),
        };
        const profile = seasonalProfile(tile, 0);
        lines.push(
          `| ${tx(BIOME_INFO[biome].name)} | ${SEASONS.map((season) => cost(profile[season]) || "0").join(" | ")} |`,
        );
      }
  }
  lines.push(
    `## ${text("Half-season freeze and thaw chances", "Probabilités de gel et de dégel par demi-saison")}`,
    text(
      "Each sea tile checks once per full round. Open water uses the freeze chance; ice uses the thaw chance. Otherwise its surface stays unchanged. Results are saved and can differ between years. Other climates stay open year-round. Glacial Frozen sea is permanent pack ice; ordinary Glacial seas thaw by Late Summer. Arctic Frozen sea has its own heavier-ice table.",
      "Chaque tuile marine effectue un tirage par manche complète. L’eau libre utilise la probabilité de gel ; la glace utilise celle de dégel. Sinon, l’état reste inchangé. Les résultats sont sauvegardés et peuvent varier d’une année à l’autre. Les autres climats restent libres toute l’année. La Banquise glaciale est permanente ; les mers glaciales ordinaires dégèlent au plus tard en fin d’été. La Banquise arctique possède sa propre table de glace persistante.",
    ),
  );
  for (const climate of Object.keys(ICE_TRANSITIONS) as Array<
    keyof typeof ICE_TRANSITIONS
  >) {
    for (const pack of climate === "arctic" ? [false, true] : [false]) {
      lines.push(
        `### ${tx(CLIMATE_INFO[climate].name)}${pack ? text(" Frozen sea", " : Banquise") : ""}`,
        `| ${text("Half-season entered | Open water: freezes | Frozen water: thaws", "Demi-saison atteinte | Eau libre : gel | Eau gelée : dégel")} |`,
        "|---|---|---|",
      );
      for (const season of SEASONS)
        for (const half of ["early", "late"] as const) {
          const odds = iceOdds(
            { climate, resource: pack ? "ice" : "water" } as Hex,
            season,
            half,
          );
          const name = `${half === "early" ? "Early" : "Late"} ${season[0].toUpperCase() + season.slice(1)}`;
          lines.push(
            `| ${tx(name)} | ${Math.round(odds[0] * 100)}% | ${Math.round(odds[1] * 100)}% |`,
          );
        }
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
        `| ${tx(u.names[i])} | ${ROMAN[i + 1]} | ${kind === "merchant" || kind === "settler" ? 0 : kind === "hunter" ? i : i + 1} | ${u.speed} | ${u.family ? "×2 " + tx(u.family) : "0"} |`,
      );
  lines.push(
    `## ${text("Ship roster", "Navires")}`,
    "| " +
      text(
        "Ship | Tier | Power / casualty points | Movement | Berths | Siege",
        "Navire | Palier | Puissance / points de pertes | Mouvement | Places | Siège",
      ) +
      " |",
    "|---|---|---|---|---|---|",
  );
  for (const k of Object.keys(SHIP_INFO) as ShipClass[])
    for (let i = SHIP_INFO[k].level; i <= SHIP_NAMES[k].length; i++) {
      const s = shipStats(k, i);
      lines.push(
        `| ${tx(s.name)} | ${ROMAN[i]} | ${s.power} | ${s.speed} | ${s.capacity} | ${s.siege} |`,
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
    await format(
      lines
        .map((line, index) =>
          index === 0
            ? line
            : `${line.startsWith("|") && lines[index - 1].startsWith("|") ? "\n" : "\n\n"}${line}`,
        )
        .join(""),
      { parser: "markdown" },
    ),
  );
}
console.log("Exported complete English and French rules to docs/rules.");
