import { localize as tx, useLocale } from "../i18n";
import {
  ArrowLeftRight,
  Anchor,
  Compass,
  Factory,
  Footprints,
  Hammer,
  Landmark,
  Navigation,
  Package,
  Shield,
  Swords,
  Wheat,
  type LucideIcon,
} from "lucide-react";
import { CARDS, ROMAN } from "../game/content";
const symbols: Record<string, LucideIcon> = {
  fishingcharter: Anchor,
  survey: Compass,
  caravan: Package,
  masonry: Landmark,
  prospecting: Compass,
  coastal: Anchor,
  frontier: Navigation,
  mobilization: Swords,
  roads: Navigation,
  harvest: Wheat,
  levy: Swords,
  palisade: Shield,
  march: Footprints,
  merchant: ArrowLeftRight,
  supplies: Package,
  craftsmen: Hammer,
  volunteers: Swords,
  workshops: Factory,
  patrol: Anchor,
  logistics: Footprints,
  industry: Factory,
  skilled: Swords,
  naval: Anchor,
  guild: ArrowLeftRight,
  coordinated: Footprints,
  engineers: Hammer,
  civic: Landmark,
  muster: Swords,
  admiralty: Anchor,
  charter: Compass,
  grand: ArrowLeftRight,
  campaign: Footprints,
};
export function ResearchArt({ kind }: { kind: string }) {
  useLocale();

  const Icon = symbols[kind] ?? Package,
    tier = CARDS[kind].tier;
  return (
    <span
      className={`research-emblem research-emblem-${tier}`}
      aria-hidden="true"
    >
      <Icon size={29} strokeWidth={1.65} />
      <small>{tx(ROMAN[tier])}</small>
    </span>
  );
}
