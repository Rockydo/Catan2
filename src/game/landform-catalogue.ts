/** Version 10 provinces. Shared descriptions and coefficients keep terrain,
 * river supply, the inspector and the guide aligned. No per-tile save fields. */
export const EXTRA_LANDFORMS = {
  canyonlands: {
    en: "Canyon country",
    fr: "Pays des canyons",
    water: 0.3,
    runoff: 0.85,
    detail:
      "Branching, deeply cut valleys divide high ground. Stone-rich shoulders and narrow low corridors make crossings valuable.",
    detailFr:
      "Des vallées profondes et ramifiées divisent les hauteurs. Épaulements pierreux et couloirs bas étroits donnent de la valeur aux passages.",
  },
  "mesa-country": {
    en: "Mesa and butte country",
    fr: "Pays des mesas et buttes",
    water: 0.28,
    runoff: 0.7,
    detail:
      "Isolated flat-topped massifs stand above open ground. Rocky rims separate sheltered interiors from surrounding routes.",
    detailFr:
      "Des massifs isolés à sommet plat dominent les espaces ouverts. Leurs bordures rocheuses séparent les plateaux des voies environnantes.",
  },
  "alluvial-fans": {
    en: "Alluvial fan apron",
    fr: "Piémont à cônes alluviaux",
    water: 0.3,
    runoff: 1.15,
    detail:
      "Fan-shaped slopes spread beneath mountain fronts. Gentle lower fans favor local crops; upper fans remain stony and water-dependent.",
    detailFr:
      "Des pentes en éventail s’étendent au pied des montagnes. Les bas de cônes doux favorisent les cultures locales ; les hauts restent pierreux et dépendants de l’eau.",
  },
  "loess-hills": {
    en: "Loess hill country",
    fr: "Collines de lœss",
    water: 0.28,
    runoff: 1.05,
    detail:
      "Rounded silt hills are cut by winding gullies. Gentle ground favors local grain and clay, with fewer hard-rock deposits.",
    detailFr:
      "Des collines de limon arrondies sont entaillées de ravins sinueux. Les sols doux favorisent céréales locales et argile, avec moins de roche dure.",
  },
  "drumlin-fields": {
    en: "Drumlin field",
    fr: "Champ de drumlins",
    water: 0.34,
    runoff: 0.9,
    detail:
      "Elongated glacial hills line up along an old ice-flow direction. Routes and drainage thread between their uneven ridges.",
    detailFr:
      "Des collines glaciaires allongées suivent une ancienne direction d’écoulement des glaces. Routes et eaux se glissent entre leurs crêtes irrégulières.",
  },
  "moraine-belts": {
    en: "Moraine belt",
    fr: "Ceinture morainique",
    water: 0.32,
    runoff: 1,
    detail:
      "Curving ridges of glacial debris enclose irregular hollows. Stony ridges interrupt movement while wetter pockets favor local bogs.",
    detailFr:
      "Des cordons courbes de débris glaciaires entourent des creux irréguliers. Les crêtes pierreuses interrompent les voies ; les poches humides favorisent les tourbières locales.",
  },
  "outwash-plains": {
    en: "Glacial outwash plain",
    fr: "Plaine fluvioglaciaire",
    water: 0.3,
    runoff: 1.2,
    detail:
      "A broad, gently graded gravel plain descends from uplands. Open corridors and connected meltwater-style drainage favor movement over dense farming.",
    detailFr:
      "Une large plaine de graviers descend doucement des hauteurs. Couloirs ouverts et drainage connecté favorisent la circulation plutôt qu’une agriculture dense.",
  },
  "tombolo-coasts": {
    en: "Tombolo coast",
    fr: "Côte à tombolos",
    water: 0.48,
    runoff: 0.75,
    detail:
      "Offshore rocky heads are linked by low sediment necks. Surviving land bridges offer narrow routes between sheltered bays.",
    detailFr:
      "Des caps rocheux sont reliés par de bas cordons sédimentaires. Les ponts de terre émergés offrent des routes étroites entre des baies abritées.",
  },
  "caldera-highlands": {
    en: "Caldera highlands",
    fr: "Hautes terres à caldeiras",
    water: 0.32,
    runoff: 0.8,
    detail:
      "Broken volcanic rims surround broad depressed interiors. Gaps in the rim concentrate access; weathered low ground can support local crops.",
    detailFr:
      "Des remparts volcaniques discontinus entourent de larges dépressions. Les brèches concentrent les accès ; les sols bas altérés peuvent porter les cultures locales.",
  },
  "lava-plateaus": {
    en: "Lava plateau",
    fr: "Plateau de lave",
    water: 0.3,
    runoff: 0.65,
    detail:
      "Overlapping ancient flow benches form stepped uplands. Building stone is favored, while porous ground carries fewer surface streams.",
    detailFr:
      "D’anciennes coulées superposées forment des hauts plateaux étagés. La pierre est favorisée ; les sols poreux portent moins de cours d’eau de surface.",
  },
  "inselberg-plains": {
    en: "Inselberg plain",
    fr: "Plaine à inselbergs",
    water: 0.26,
    runoff: 0.7,
    detail:
      "Widely spaced rock massifs rise from an otherwise open plain. Isolated stone sources punctuate long grazing and travel corridors.",
    detailFr:
      "Des massifs rocheux espacés surgissent d’une plaine ouverte. Des sources de pierre isolées ponctuent de longs couloirs de pâturage et de circulation.",
  },
  "dune-seas": {
    en: "Dune field",
    fr: "Champ de dunes",
    water: 0.25,
    runoff: 0.3,
    detail:
      "Wind-aligned sand ridges alternate with low corridors. Existing desert sands become more common and surface rivers rarer; oases still require suitable water conditions.",
    detailFr:
      "Des crêtes sableuses suivent le vent et alternent avec des couloirs bas. Les sables désertiques locaux deviennent plus fréquents, les rivières plus rares ; les oasis exigent toujours de l’eau adaptée.",
  },
  "tidal-estuaries": {
    en: "Estuary coast",
    fr: "Côte à estuaires",
    water: 0.48,
    runoff: 1.15,
    detail:
      "Broad funnel-shaped inlets branch into low coastal ground. Bays and river mouths create naval approaches and scarce land connections.",
    detailFr:
      "De larges bras de mer en entonnoir se ramifient dans les basses côtes. Baies et embouchures créent des approches navales et de rares liaisons terrestres.",
  },
  "raised-beaches": {
    en: "Raised beach terraces",
    fr: "Terrasses marines soulevées",
    water: 0.4,
    runoff: 0.9,
    detail:
      "Successive coastal benches rise above the sea. Flat settlement shelves alternate with steeper scarps and protected lower shoreline.",
    detailFr:
      "Des gradins côtiers successifs dominent la mer. Replats d’établissement et escarpements alternent au-dessus du rivage inférieur.",
  },
  "fault-scarps": {
    en: "Fault scarp country",
    fr: "Pays des escarpements de faille",
    water: 0.3,
    runoff: 1.05,
    detail:
      "Offset blocks form abrupt, interrupted scarps. Longer valleys follow their feet while broken sections provide routes across the uplands.",
    detailFr:
      "Des blocs décalés forment des escarpements abrupts et discontinus. De longues vallées suivent leur pied ; les interruptions ouvrent des voies à travers les hauteurs.",
  },
} as const;
export type ExtraLandform = keyof typeof EXTRA_LANDFORMS;
export const EXTRA_LANDFORM_IDS = Object.keys(
  EXTRA_LANDFORMS,
) as ExtraLandform[];
export const isExtraLandform = (s: string): s is ExtraLandform =>
  Object.hasOwn(EXTRA_LANDFORMS, s);
