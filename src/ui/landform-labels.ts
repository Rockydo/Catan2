import type { PhysicalLandform } from "../game/physical-landforms";
/** Region-scale landforms; these do not override a tile's climate or access. */
export const LANDFORM_LABELS: Record<
  PhysicalLandform,
  { en: string; fr: string }
> = {
  continent: { en: "Continental interior", fr: "Intérieur continental" },
  archipelago: { en: "Archipelago", fr: "Archipel" },
  "inland-seas": { en: "Inland sea basin", fr: "Bassin de mer intérieure" },
  peninsulas: { en: "Peninsular coast", fr: "Côte à péninsules" },
  "island-chains": { en: "Island chain", fr: "Chapelet d’îles" },
  skerries: { en: "Skerry coast", fr: "Côte à îlots rocheux" },
  fjords: { en: "Fjord coast", fr: "Côte à fjords" },
  "barrier-coasts": { en: "Barrier coast", fr: "Côte à cordons littoraux" },
  atolls: { en: "Atoll province", fr: "Région d’atolls" },
  "rift-valleys": { en: "Rift valley", fr: "Vallée de rift" },
  "drowned-valleys": { en: "Drowned valley coast", fr: "Côte à rias" },
  "volcanic-arcs": { en: "Volcanic arc", fr: "Arc volcanique" },
  "basin-ranges": {
    en: "Basin and range",
    fr: "Bassins et chaînes parallèles",
  },
  "dissected-plateaus": { en: "Dissected plateau", fr: "Plateau entaillé" },
  "great-river-basins": { en: "Great river basin", fr: "Grand bassin fluvial" },
  "cuesta-belts": { en: "Cuesta belt", fr: "Ceinture de cuestas" },
  "lake-districts": {
    en: "Glacial lake district",
    fr: "Région de lacs glaciaires",
  },
  "karst-uplands": { en: "Karst uplands", fr: "Hauts plateaux karstiques" },
  badlands: { en: "Badlands", fr: "Terres ravinées" },
};
