import {
  specialistServiceTier,
  specialistMaterialSavings,
} from "../game/infrastructure-services";
import {
  SPECIALIST_PROJECTS,
  isSpecialist,
} from "../game/infrastructure-specialists";
import {
  SERVICE_RULES,
  serviceRisks,
} from "../game/infrastructure-service-rules";
import {
  floodComparison,
  weatherComparison,
  withoutInvestment,
  type WeatherRisk,
} from "./infrastructure-preview";
import {
  WeatherBenefits,
  HarvestComparison,
  weatherName,
} from "./InfrastructureWeather";
import { useState, type ReactNode } from "react";
import type { Game, Hex, Command, Good, Stock } from "../game/types";
import {
  INFRASTRUCTURE,
  tierOf,
  infrastructureSuitable,
  specialistBranches,
  specialistTier,
  installedRotation,
  rotationPrerequisites,
  type InfrastructureKind,
} from "../game/infrastructure";
import {
  specialistId,
  type SpecialistBranch,
} from "../game/infrastructure-specialists";
import {
  projectCost,
  projectSite,
  freshwaterSite,
} from "../game/geography-actions";
import type { Project } from "../game/geography";
import {
  SEASONS,
  ordinarySeasonalProfile,
  seasonalProfile,
  seasonYear,
} from "../game/seasons";
import { affordable, inventory } from "../game/selectors";
import { localTechnique } from "../game/infrastructure-techniques";
import { techniqueSite } from "../game/infrastructure-specializations";
import { CLIMATE_INFO, BIOME_INFO } from "../game/climate-content";
import { GOOD_INFO } from "../game/content";
import { Cost, GoodsList } from "./components";
import { localize as tx, useLocale } from "../i18n";
import { developmentLevel } from "./development-level";

const ROMAN = ["", "I", "II", "III", "IV"];
const annual = (profile: ReturnType<typeof seasonalProfile>): Stock => {
  const total: Stock = {};
  for (const season of SEASONS)
    for (const [good, n] of Object.entries(profile[season]))
      total[good as Good] = (total[good as Good] ?? 0) + n!;
  return total;
};
const difference = (future: Stock, current: Stock): Stock =>
  Object.fromEntries(
    Object.entries(future)
      .filter(([g, n]) => n! > (current[g as Good] ?? 0))
      .map(([g, n]) => [g, n! - (current[g as Good] ?? 0)]),
  );
type PanelProps = {
  game: Game;
  tile: Hex;
  viewer: number;
  interactive: boolean;
  onAction: (c: Command) => void;
};

export function InfrastructurePanel(props: PanelProps) {
  const { tile } = props,
    fr = useLocale() === "fr";
  const [tab, setTab] = useState<"main" | "specialists" | "rotations">("main");
  const kinds = (Object.keys(INFRASTRUCTURE) as InfrastructureKind[]).filter(
    (kind) =>
      tile.geography?.projects?.[kind] || infrastructureSuitable(tile, kind),
  );
  const branches = specialistBranches(tile),
    specialists = branches.filter((b) => !b.rotation),
    rotations = branches.filter((b) => b.rotation);
  if (!kinds.length) return null;
  return (
    <details
      className="infrastructure-panel"
      data-development-level={developmentLevel(tile)}
    >
      <summary>
        {fr ? "Infrastructure de production" : "Production infrastructure"}
      </summary>
      <p className="infrastructure-intro">
        {fr
          ? "Développez ce terrain. Chaque ouvrage bénéficie à vos producteurs et reste vulnérable aux armées ennemies."
          : "Develop this site. Each investment serves your producers and must be defended from enemy armies."}
      </p>
      <div
        className="infrastructure-tabs"
        role="tablist"
        aria-label={fr ? "Types d’améliorations" : "Improvement types"}
      >
        {(
          [
            ["main", fr ? "Principales" : "Main", kinds.length],
            [
              "specialists",
              fr ? "Compléments" : "Specialists",
              specialists.length,
            ],
            ["rotations", fr ? "Rotations" : "Rotations", rotations.length],
          ] as const
        ).map(([id, label, n]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            aria-controls={tab === id ? `infra-${id}` : undefined}
            tabIndex={tab === id ? 0 : -1}
            onKeyDown={(event) => {
              const names = ["main", "specialists", "rotations"] as const;
              const index = names.indexOf(id);
              const next =
                event.key === "ArrowRight"
                  ? (index + 1) % 3
                  : event.key === "ArrowLeft"
                    ? (index + 2) % 3
                    : event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? 2
                        : -1;
              if (next < 0) return;
              event.preventDefault();
              setTab(names[next]);
              event.currentTarget.parentElement
                ?.querySelectorAll<HTMLButtonElement>("[role=tab]")
                [next]?.focus();
            }}
            id={`infra-tab-${id}`}
            onClick={() => setTab(id)}
          >
            {label}
            <span>{n}</span>
          </button>
        ))}
      </div>
      <div
        role="tabpanel"
        id={`infra-${tab}`}
        aria-labelledby={`infra-tab-${tab}`}
      >
        {tab === "main" ? (
          kinds.map((kind) => <MainCard {...props} kind={kind} key={kind} />)
        ) : (
          <>
            <p className="infrastructure-category-note">
              {tab === "rotations"
                ? fr
                  ? "Une rotation par champ. Les cultures secondaires occupent de petites parcelles pendant les saisons sans récolte principale."
                  : "Choose one rotation per field. Small secondary plots produce during gaps in the main harvest calendar."
                : fr
                  ? "Des investissements facultatifs qui complètent vos ouvrages principaux. Rendements plus modestes, coût plus élevé."
                  : "Optional investments alongside your main improvements. Smaller gains at a higher cost."}
            </p>
            {(tab === "rotations" ? rotations : specialists).map((branch) => (
              <SpecialistCard {...props} branch={branch} key={branch.id} />
            ))}
            {!(tab === "rotations" ? rotations : specialists).length && (
              <p className="infrastructure-empty">
                {fr
                  ? "Ce terrain ne présente pas les conditions nécessaires."
                  : "This site does not have the conditions for these improvements."}
              </p>
            )}
          </>
        )}
      </div>
      <details className="infrastructure-rules">
        <summary>
          {fr ? "Construction et récoltes" : "Construction & harvest rules"}
        </summary>
        <p>
          {fr
            ? "Un établissement adjacent du niveau requis doit vous appartenir et être libre de siège. Les coûts sont payés à la construction. Aucun entretien."
            : "Requires your adjacent settlement or city of the stated tier, free of siege. Costs are paid once at construction. No upkeep."}
        </p>
        <p>
          {fr
            ? "Les gains indiqués additionnent les quatre saisons, par producteur, avant météo et inondation. Chaque récolte nécessite le bon jet de dé. Une saison dure deux tours."
            : "Harvest gains add up the four seasonal yields per producer, before weather and flooding. Each harvest still needs the matching dice roll. A season lasts two rounds."}
        </p>
        <p>
          {fr
            ? "La meilleure protection principale s’applique. Les compléments réduisent ensuite les pertes restantes, jusqu’à 90 % de protection au total. Les levées protègent des crues ; la glace ferme toujours la récolte."
            : "The strongest main protection applies. Specialist shelters reduce the remaining weather losses, up to 90% total protection. Levees protect against flooding; ice still closes the harvest."}
        </p>
      </details>
    </details>
  );
}
function ProjectCard({
  game: s,
  tile,
  viewer,
  interactive,
  onAction,
  id,
  tier,
  title,
  subtitle,
  description,
  site,
  priority,
  protection,
  blocked,
  attributes,
  conditional,
  stage,
  floodRescue,
  children,
}: PanelProps & {
  id: Project;
  tier: number;
  title: string;
  subtitle: string;
  description: string;
  site?: string;
  priority?: string;
  protection?: WeatherRisk[];
  blocked?: string;
  attributes?: Record<string, string>;
  conditional?: string;
  stage?: string;
  floodRescue?: boolean;
  children?: ReactNode;
}) {
  const fr = useLocale() === "fr",
    next = tier + 1,
    installed = tile.geography?.projects?.[id];
  const foreign = installed && installed.owner !== viewer,
    full = tier >= 4;
  const allowed = !blocked && projectSite(s, tile, id, viewer),
    cost = full ? {} : projectCost(tile, id, viewer);
  const beforeTile = full ? withoutInvestment(tile, id) : tile;
  const current = seasonalProfile(beforeTile, viewer);
  const main = Object.hasOwn(INFRASTRUCTURE, id);
  const preview: Hex = full
    ? tile
    : {
        ...tile,
        geography: {
          ...tile.geography!,
          projects: {
            ...tile.geography?.projects,
            [id]: { owner: viewer, born: s.round, tier: main ? next : 1 },
          },
        },
      };
  const future = seasonalProfile(preview, viewer),
    delta = difference(annual(future), annual(current));
  const gains = Object.keys(delta).length > 0;
  const gainSeasons = SEASONS.filter(
    (season) => Object.keys(difference(future[season], current[season])).length,
  );
  const weather = (protection ?? []).map((risk) =>
    weatherComparison(beforeTile, preview, viewer, risk, current, future),
  );
  const branch = isSpecialist(id) ? SPECIALIST_PROJECTS[id].branch : undefined;
  const role = branch?.service;
  const strength = role
    ? [
        specialistServiceTier(beforeTile, role, viewer),
        specialistServiceTier(preview, role, viewer),
      ]
    : [0, 0];
  const serviceChange =
    role === "fish-nursery"
      ? `${fr ? "Préférence des poissons" : "Fish habitat preference"}: +${strength[0] * 20}% → +${strength[1] * 20}%`
      : role === "habitat-margins"
        ? `${fr ? "Réduction des perturbations voisines" : "Neighboring disturbance reduction"}: ${strength[0] * 10}% → ${strength[1] * 10}%`
        : role === "material-reuse"
          ? `${fr ? "Plafond d’économie par matériau admissible" : "Saving ceiling per eligible material"}: ${strength[0]} → ${strength[1]}`
          : undefined;
  const saved = full
    ? {}
    : specialistMaterialSavings(tile, projectCost(tile, id), id, viewer);
  const flood = floodRescue
    ? floodComparison(beforeTile, preview, viewer, current, future)
    : undefined;
  return (
    <article className="infrastructure-card" {...attributes}>
      <header>
        <div>
          <b>
            {title}
            {tier ? ` · ${ROMAN[tier]}` : ""}
          </b>
          <h4>{full ? subtitle : (stage ?? subtitle)}</h4>
        </div>
        <span className={`infrastructure-tier ${full ? "complete" : ""}`}>
          {full
            ? fr
              ? "Achevé"
              : "Complete"
            : `${fr ? "Niveau" : "Tier"} ${ROMAN[next]}`}
        </span>
      </header>
      {site && (
        <small className="infrastructure-site" data-method-site>
          {site}
        </small>
      )}
      <p className="infrastructure-description">{description}</p>
      {priority && (
        <small data-recovery-priority>
          {fr ? "Production privilégiée : " : "Favors: "}
          {priority}
        </small>
      )}
      {children}
      {((tile.geography?.access === "flooded" &&
        !tile.geography.projects?.levee) ||
        tile.geography?.damagedUntil ||
        tile.surface === "frozen") && (
        <small className="infrastructure-no-change">
          {fr
            ? "Récolte normale actuellement bloquée. Seul un éventuel sauvetage en crue reste possible ; les prévisions supposent un terrain accessible et intact."
            : "Normal harvesting is currently blocked. Only applicable flood salvage may remain; forecasts assume an accessible, undamaged site."}
        </small>
      )}
      {!foreign && (
        <>
          <div className="infrastructure-benefits">
            <small className="infrastructure-benefit-label">
              {full
                ? fr
                  ? "Effet des quatre étapes"
                  : "Benefit from all four stages"
                : fr
                  ? "Gain de la prochaine étape"
                  : "Next-stage benefit"}
            </small>
            {gains ? (
              <div className="infrastructure-gain">
                <span>+</span>
                <GoodsList stock={delta} />
                <small>
                  {gainSeasons.length === 4
                    ? fr
                      ? "sur les 4 saisons"
                      : "across 4 seasons"
                    : gainSeasons
                        .map((season) =>
                          tx(season[0].toUpperCase() + season.slice(1)),
                        )
                        .join(" · ")}
                </small>
              </div>
            ) : (
              !conditional && (
                <span>
                  {serviceChange ??
                    (protection?.length
                      ? fr
                        ? "Récolte normale inchangée"
                        : "Normal-weather harvest unchanged"
                      : fr
                        ? "Aucun gain dans les conditions actuelles"
                        : "No added harvest under current conditions")}
                </span>
              )
            )}
            {conditional && (
              <small className="infrastructure-conditional">
                {conditional}
              </small>
            )}
            {!!weather.length && <WeatherBenefits comparisons={weather} />}
            {flood && (
              <div data-flood-benefit>
                <strong>
                  {fr ? "Récolte pendant une crue" : "Harvest during a flood"}
                </strong>
                <HarvestComparison
                  current={flood.current}
                  future={flood.future}
                />
                <small>
                  {fr
                    ? "Ressources sauvées, par producteur et au bon jet de dé. Les déplacements restent bloqués."
                    : "Resources rescued per producer on the matching roll. Movement remains blocked."}
                </small>
              </div>
            )}
            <small>
              {fr
                ? "Par producteur, au bon jet de dé ; les gains sont répartis entre les saisons indiquées."
                : "Per producer, on the matching dice roll; gains are split between the listed seasons."}
            </small>
          </div>
          <details className="infrastructure-effects">
            <summary>
              {fr ? "Calendrier et détails" : "Harvest calendar & details"}
            </summary>
            <small>
              {full
                ? fr
                  ? "Sans ces ouvrages → Avec les quatre étapes"
                  : "Without these works → With all four stages"
                : fr
                  ? "Avant → Après la prochaine étape"
                  : "Before → After the next stage"}
            </small>
            {(gains || !weather.length) && (
              <>
                <strong>{fr ? "Météo normale" : "Normal weather"}</strong>
                <HarvestComparison current={current} future={future} />
              </>
            )}
            {weather.map((c) => (
              <div key={c.weather} data-weather-calendar={c.weather}>
                <strong>{weatherName(c.weather, fr)}</strong>
                <HarvestComparison
                  current={
                    Object.fromEntries(
                      c.seasons.map((s) => [s.season, s.from]),
                    ) as typeof current
                  }
                  future={
                    Object.fromEntries(
                      c.seasons.map((s) => [s.season, s.to]),
                    ) as typeof future
                  }
                />
              </div>
            ))}
            <small>
              {floodRescue
                ? fr
                  ? "Quantités arrondies avant multiplicateurs. En crue, seule la part sauvée est récoltée. Glace et occupation bloquent toujours la collecte."
                  : "Rounded amounts before producer multipliers. During floods, only the rescued share is collected. Ice and occupation still block collection."
                : fr
                  ? "Quantités réellement récoltées après arrondi, par producteur. Crue, glace et occupation peuvent toujours bloquer la récolte. Les abris météo ne protègent pas des crues."
                  : "Actual rounded harvest per producer. Flooding, ice and occupation can still block production. Weather shelters do not protect against floods."}
            </small>
            {conditional && (
              <small>
                {fr
                  ? "Les migrations peuvent changer les gains prévus."
                  : "Wildlife migration can change these gains."}
              </small>
            )}
          </details>
          {!full && (
            <footer>
              <small>{fr ? "Coût de construction" : "Construction cost"}</small>
              {Object.keys(saved).length > 0 && (
                <small data-material-savings>
                  {fr
                    ? "Réemploi local déjà déduit : "
                    : "Local material reuse already deducted: "}
                  <GoodsList stock={saved} />
                </small>
              )}
              <Cost cost={cost} available={inventory(s, viewer)} />
              {!allowed && (
                <small className="infrastructure-requirement">
                  {blocked ??
                    (id === "irrigation" && !freshwaterSite(s, tile)
                      ? fr
                        ? "Rivière, lac, source ou oasis requis."
                        : "Requires a river, lake, spring or oasis."
                      : fr
                        ? `Établissement adjacent de niveau ${ROMAN[next]}, sans siège ni ennemi sur le terrain.`
                        : `Requires an adjacent tier ${ROMAN[next]} settlement/city, free of siege and enemy occupation.`)}
                </small>
              )}
              <button
                className="primary"
                disabled={
                  !interactive || !allowed || !affordable(s, cost, viewer)
                }
                onClick={() =>
                  onAction({ type: "project", tile: tile.id, kind: id })
                }
              >
                {tier ? (fr ? "Améliorer" : "Upgrade") : tx("Build")}
                {` · ${ROMAN[next]}`}
              </button>
            </footer>
          )}
        </>
      )}
      {foreign && (
        <small>
          {fr ? "Ouvrage de " : "Built by "}
          {s.players[installed.owner].name}
        </small>
      )}
      {full && (
        <small className="infrastructure-complete">
          {fr
            ? "Les quatre étapes sont en service."
            : "All four stages are in service."}
        </small>
      )}
    </article>
  );
}
function MainCard(props: PanelProps & { kind: InfrastructureKind }) {
  const { tile, kind } = props,
    fr = useLocale() === "fr",
    method = localTechnique(tile, kind),
    tier = tierOf(tile, kind),
    site = techniqueSite(method.id);
  const settings = site
    ? [
        site.biomes ? tx(BIOME_INFO[tile.biome!].name) : "",
        site.climates ? tx(CLIMATE_INFO[tile.climate ?? "temperate"].name) : "",
        site.waterways
          ? tx(
              tile.geography?.waterway === "shoal"
                ? "Shallows"
                : tile.geography?.waterway === "river"
                  ? "River"
                  : tile.geography?.waterway === "lake"
                    ? "Lake"
                    : "Coast",
            )
          : "",
        site.minElevation !== undefined
          ? fr
            ? "Terrain élevé"
            : "High ground"
          : "",
        site.maxElevation !== undefined
          ? fr
            ? "Basses terres"
            : "Low ground"
          : "",
        site.coastal ? (fr ? "Littoral" : "Coastal") : "",
        site.delta ? "Delta" : "",
      ]
        .filter(Boolean)
        .join(" · ")
    : "";
  const favored = Object.entries(method.goods ?? {})
    .filter(([, n]) => n > 1)
    .map(([g]) => tx(GOOD_INFO[g as Good].name))
    .join(", ");
  const conditional =
    kind === "whaling" && !tile.geography?.fauna?.oil
      ? fr
        ? "Aucune baleine actuellement. Les installations seront prêtes pour leur retour."
        : "No whales currently. The landing works will be ready when they return."
      : kind === "fishery" && !tile.geography?.fauna?.fish
        ? fr
          ? "Aucun banc actuellement. Les installations seront prêtes à son retour."
          : "No shoal currently. The landing works will be ready when fish return."
        : kind === "hunting" &&
            !Object.values(tile.geography?.fauna ?? {}).some(Boolean)
          ? fr
            ? "Aucun animal actuellement. Les chasseurs attendent le passage du gibier."
            : "No animals currently. Hunters await the next passing herd."
          : undefined;
  const protection = Object.keys(method.protection ?? {}) as WeatherRisk[];
  return (
    <ProjectCard
      {...props}
      id={kind}
      tier={tier}
      title={tx(INFRASTRUCTURE[kind].name)}
      subtitle={tx(method.name)}
      stage={tx(method.stages[tier] ?? method.name)}
      description={tx(method.description)}
      site={settings}
      priority={favored}
      protection={protection.length ? protection : undefined}
      conditional={conditional}
      attributes={{
        "data-infrastructure": kind,
        "data-infrastructure-method": method.id,
      }}
    />
  );
}
function SpecialistCard(props: PanelProps & { branch: SpecialistBranch }) {
  const { tile, viewer, branch } = props,
    fr = useLocale() === "fr",
    tier = specialistTier(tile, branch, viewer),
    id = specialistId(branch, Math.min(4, tier + 1));
  const currentRotation = installedRotation(tile);
  const foreign = Object.entries(tile.geography?.projects ?? {}).some(
    ([key, p]) => key === specialistId(branch, 1) && p?.owner !== viewer,
  );
  const ordinary = branch.rotation
    ? ordinarySeasonalProfile(tile, viewer)
    : undefined;
  const blocked =
    (branch.track === "irrigation" || branch.freshwater) &&
    !freshwaterSite(props.game, tile)
      ? fr
        ? "Rivière, lac, source ou oasis requis."
        : "Requires a river, lake, spring or oasis."
      : foreign
        ? fr
          ? "Ces ouvrages appartiennent à une autre faction."
          : "These works belong to another faction."
        : branch.rotation && currentRotation && currentRotation.id !== branch.id
          ? fr
            ? "Une autre rotation occupe déjà ce champ."
            : "This field already follows another rotation."
          : branch.rotation &&
              !branch.rotation.seasons.some(
                (season) => !(ordinary![season].grain || ordinary![season].oil),
              )
            ? fr
              ? "Le calendrier principal occupe déjà les saisons disponibles. Choisissez une récolte concentrée pour libérer une saison."
              : "The main harvest already occupies these seasons. A concentrated calendar can leave room for a secondary crop."
            : !rotationPrerequisites(tile, branch, viewer)
              ? fr
                ? "Construisez d’abord l’irrigation et, en terrain humide, le drainage requis."
                : "Build the required irrigation and, on wet ground, drainage first."
              : undefined;
  const waiting =
    branch.primary !== false &&
    ["hunting", "whaling", "fishery"].includes(branch.track) &&
    !branch.goods.some((g) => tile.geography?.fauna?.[g]);
  return (
    <ProjectCard
      {...props}
      id={id}
      tier={tier}
      title={fr ? branch.fr : branch.name}
      subtitle={tx(INFRASTRUCTURE[branch.track].name)}
      stage={
        branch.rotation
          ? (fr ? branch.stagesFr : branch.stages)[tier]
              ?.split(": ")
              .slice(1)
              .join(": ")
              .replace(/^./, (c) => c.toUpperCase())
          : (fr ? branch.stagesFr : branch.stages)[tier]
      }
      description={fr ? branch.descriptionFr : branch.description}
      blocked={blocked}
      conditional={
        waiting
          ? fr
            ? "Le prochain passage d’animaux permettra la reprise des récoltes."
            : "Harvests resume when wildlife returns."
          : undefined
      }
      protection={Array.from(
        new Set<WeatherRisk>([
          ...(branch.effect !== "yield" ? [branch.effect] : []),
          ...serviceRisks(branch.service),
        ]),
      )}
      floodRescue={branch.service === "flood-rescue"}
      attributes={{
        "data-specialist-branch": branch.id,
        "data-side-project": id,
      }}
    >
      {branch.service && (
        <p
          className="infrastructure-special-role"
          data-specialist-service={branch.service}
        >
          {SERVICE_RULES[branch.service][fr ? "fr" : "en"]}
        </p>
      )}
      {branch.specialty && (
        <p
          className="infrastructure-special-role"
          data-specialist-role={branch.specialty}
        >
          {
            (fr
              ? {
                  pantry:
                    "Réserves : +1 nourriture répartie entre les saisons creuses au niveau II, +2 au IV, à l’abri des pénalités météo. Seul le meilleur garde-manger s’applique.",
                  refuge:
                    "Corridors calmes : perturbation due aux villes et routes réduite de 15/30/45/60 %. Les troupeaux restent libres de migrer ; le meilleur corridor s’applique.",
                  recovery:
                    "Sauvetage : récupère jusqu’à 1 ressource perdue par récolte aux niveaux I–II, 2 aux III–IV, après la protection météo. Capacité partagée ; seuls les meilleurs abris s’appliquent.",
                  aggregate:
                    "Valorisation des stériles : +1 pierre répartie entre les saisons minières au niveau II, +2 au IV. Seuls les meilleurs ateliers de récupération s’appliquent.",
                }
              : {
                  pantry:
                    "Pantry: +1 food across the lean seasons at tier II, +2 at IV, protected from weather penalties. Only the best pantry applies.",
                  refuge:
                    "Quiet corridors: reduce disturbance from towns and roads by 15/30/45/60%. Herds remain free to migrate; only the best corridor applies.",
                  recovery:
                    "Salvage: recovers up to 1 lost resource per harvest at tiers I–II, 2 at III–IV, after weather protection. Shared capacity; only the best shelters apply.",
                  aggregate:
                    "Rock recovery: +1 stone across ore-producing seasons at tier II, +2 at IV. Only the best recovery works apply.",
                })[branch.specialty]
          }
        </p>
      )}
      {branch.freshwater && (
        <small>
          {fr ? "Eau douce locale requise" : "Requires local fresh water"}
        </small>
      )}
      {branch.seasonalWeights && (
        <small>
          {fr ? "Rendement favorisé en " : "Harvest emphasis: "}
          {SEASONS.filter(
            (_, i) =>
              branch.seasonalWeights![i] ===
              branch.seasonalWeights!.reduce(
                (max, weight) => Math.max(max, weight),
                0,
              ),
          )
            .map((season) => tx(season[0].toUpperCase() + season.slice(1)))
            .join(" · ")}
        </small>
      )}
      {branch.rotation && (
        <small className="infrastructure-rotation-seasons">
          {fr ? "Récolte secondaire : " : "Secondary harvest: "}
          {branch.rotation.seasons
            .map((season) => tx(season[0].toUpperCase() + season.slice(1)))
            .join(" · ")}
          {branch.rotation.water
            ? fr
              ? " · Irrigation requise"
              : " · Irrigation required"
            : ""}
          {branch.rotation.drainage
            ? fr
              ? " · Drainage en terrain humide"
              : " · Drainage on wet ground"
            : ""}
        </small>
      )}
    </ProjectCard>
  );
}
export function IrrigationCalendar({
  game: s,
  tile,
  viewer,
}: {
  game: Game;
  tile: Hex;
  viewer: number;
}) {
  const fr = useLocale() === "fr",
    g = tile.geography!;
  const active = g.harvestMode ?? "concentrated";
  const queued = g.nextHarvestMode;
  const profiles = (["concentrated", "spread"] as const).map((mode) => ({
    mode,
    profile: seasonalProfile(
      { ...tile, geography: { ...g, harvestMode: mode } },
      viewer,
    ),
  }));
  return (
    <div className="irrigation-calendars">
      <p>
        {fr
          ? "La récolte principale conserve son total annuel. Une rotation secondaire nécessite une saison libre ; un calendrier échelonné peut occuper cette saison."
          : "The main crop keeps its annual total. Secondary rotations need a free season; a staggered calendar may occupy that window."}
      </p>
      {profiles.map(({ mode, profile }) => (
        <div key={mode}>
          <b>
            {tx(mode === "spread" ? "Spread harvest" : "Concentrated harvest")}
            {mode === active ? (fr ? " · actif" : " · active") : ""}
            {mode === queued
              ? ` · ${fr ? "année" : "year"} ${seasonYear(s) + 1}`
              : ""}
          </b>
          <div className="geography-calendar">
            {SEASONS.map((season) => (
              <div key={season}>
                <small>{tx(season[0].toUpperCase() + season.slice(1))}</small>
                <GoodsList
                  stock={{
                    grain: profile[season].grain ?? 0,
                    oil: profile[season].oil ?? 0,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      ))}
      <small>
        {fr
          ? "Prévision par producteur, avant météo et inondations ; le numéro du dé reste requis. Aucun changement rétroactif."
          : "Per producer, before weather and flooding; the matching dice roll is still required. Changes are not retroactive."}
      </small>
    </div>
  );
}
