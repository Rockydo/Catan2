import { CLIMATES } from "../game/climate-content";
import { createRoot } from "react-dom/client";
import { flushSync } from "react-dom";
import { useEffect, useState, type ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Search,
  BookOpen,
  Compass,
  Pickaxe,
  Sword,
  Anchor,
  Shield,
  ScrollText,
  Landmark,
  Handshake,
  Menu,
  X,
  Printer,
  Home,
  Sprout,
  Map,
  MousePointer2,
} from "lucide-react";
import chapters from "./chapters.json";
import {
  TerrainReference,
  GoodSources,
  ClimateReference,
} from "./TerrainReference";
import { localize as tx, getLocale, setLocale, useLocale } from "../i18n";
import { ResourceIcon } from "../ui/ResourceIcon";
import { MilitaryPortrait } from "../ui/MilitaryArt";
import { ResearchArt } from "../ui/ResearchArt";
import {
  COSTS,
  GOOD_INFO,
  GOODS,
  RAW,
  processedFor,
  extensionName,
  UNIT_INFO,
  SHIP_INFO,
  shipStats,
  unitCost,
  shipCost,
  CARDS,
  ROMAN,
  RESEARCH_NAMES,
} from "../game/content";
import { GUILDS, GUILD_KINDS, guildCost } from "../game/guilds";
import type { Good, Stock, UnitClass, ShipClass } from "../game/types";
import "./rules.css";
setLocale(location.pathname.endsWith("rules-fr.html") ? "fr" : "en");
const icons = [
  Compass,
  Map,
  Sprout,
  Pickaxe,
  Sword,
  Shield,
  Anchor,
  ScrollText,
  Landmark,
  Compass,
  Handshake,
  MousePointer2,
];
const labels = (en: string, fr: string) => (getLocale() === "fr" ? fr : en);
const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
function Cost({ stock }: { stock: Stock }) {
  return (
    <span className="cost-list">
      {Object.entries(stock).map(([good, n]) => (
        <span className="cost-good" key={good}>
          <ResourceIcon good={good as Good} />
          <b>{n}</b> {tx(GOOD_INFO[good as Good].name)}
        </span>
      ))}
    </span>
  );
}
function Prose({ body }: { body: string }) {
  const blocks = body
    .split("\n")
    .filter(Boolean)
    .reduce<string[][]>((result, line) => {
      if (line.startsWith("- ") && result.at(-1)?.[0].startsWith("- "))
        result.at(-1)!.push(line);
      else result.push([line]);
      return result;
    }, []);
  return (
    <div className="prose">
      {blocks.map((lines, i) =>
        lines[0].startsWith("## ") ? (
          <h3 key={i}>{lines[0].slice(3)}</h3>
        ) : lines[0].startsWith("- ") ? (
          <ul key={i}>
            {lines.map((line, j) => (
              <li key={j}>{line.slice(2)}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{lines[0]}</p>
        ),
      )}
    </div>
  );
}
function ProductionDemo() {
  const [level, setLevel] = useState(2),
    [workshop, setWorkshop] = useState(1),
    [roll, setRoll] = useState(7),
    [blocked, setBlocked] = useState(false);
  const active = roll === 7 && !blocked;
  return (
    <section
      className="demo"
      aria-label={labels("Production example", "Exemple de production")}
    >
      <div>
        <span className="eyebrow">
          {labels("WORKED EXAMPLE", "EXEMPLE DE CALCUL")}
        </span>
        <h3>
          {labels(
            "Production: town and workshop",
            "Production : agglomération et atelier",
          )}
        </h3>
        <p>
          {labels(
            "This ore tile produces on 7. Change the town and roll to see the harvest.",
            "Cette montagne produit sur un 7. Modifiez la ville et les dés pour voir la récolte.",
          )}
        </p>
        <div className="demo-controls">
          <label>
            {labels("Town level", "Niveau de ville")}
            <select
              aria-label={labels("Town level", "Niveau de ville")}
              value={level}
              onChange={(e) => {
                setLevel(+e.target.value);
                setWorkshop(Math.min(workshop, +e.target.value - 1));
              }}
            >
              {[1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels("Forge tier", "Palier de forge")}
            <select
              aria-label={labels("Forge tier", "Palier de forge")}
              value={workshop}
              onChange={(e) => setWorkshop(+e.target.value)}
            >
              {Array.from({ length: level }, (_, n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label>
            {labels("Dice total", "Total des dés")}
            <select
              aria-label={labels("Dice total", "Total des dés")}
              value={roll}
              onChange={(e) => setRoll(+e.target.value)}
            >
              {Array.from({ length: 11 }, (_, n) => (
                <option key={n} value={n + 2}>
                  {n + 2}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={blocked}
            onChange={(e) => setBlocked(e.target.checked)}
          />
          {labels(
            "Enemy army occupies this tile",
            "Une armée ennemie occupe la tuile",
          )}
        </label>
      </div>
      <div className="harvest-scene">
        <div
          className="ore-tile"
          style={{ backgroundImage: "url(./assets/terrain-atlas-v2.png)" }}
        >
          <span className="number-token">
            7<small>••••••</small>
          </span>
        </div>
        <div className="harvest-result" aria-live="polite">
          <span>
            <ResourceIcon good="ore" size={32} />
            <b>+{active ? level : 0}</b>
            {tx("Iron ore")}
          </span>
          <span>
            <ResourceIcon good="steel" size={32} />
            <b>+{active ? workshop + Math.max(0, level - 2) : 0}</b>
            {tx("Steel")}
          </span>
        </div>
        <small>
          {labels(
            `Steel: ${Math.max(0, level - 2)} from the town + ${workshop} from the forge.`,
            `Acier : ${Math.max(0, level - 2)} pour la ville + ${workshop} pour la forge.`,
          )}
        </small>
      </div>
    </section>
  );
}
function SiegeDemo() {
  const [level, setLevel] = useState(2),
    [wall, setWall] = useState(1),
    [tower, setTower] = useState(0),
    [art, setArt] = useState(0);
  const steps = Math.max(0, level - 1 + wall + tower - art);
  const inputs: [string, number, (n: number) => void, number][] = [
    [
      labels("Town level", "Niveau de ville"),
      level,
      (n) => {
        setLevel(n);
        setWall(Math.min(wall, n));
      },
      4,
    ],
    [labels("Wall tier", "Palier de muraille"), wall, setWall, level],
    [labels("Tower support", "Soutien des tours"), tower, setTower, 8],
    [labels("Siege power", "Puissance de siège"), art, setArt, 12],
  ];
  return (
    <section className="demo siege-demo">
      <div>
        <span className="eyebrow">
          {labels("SIEGE CALCULATION", "CALCUL DU SIÈGE")}
        </span>
        <h3>{labels("When can I raid?", "Quand puis-je piller ?")}</h3>
        <p>
          {labels(
            "Assumes all defending guards have been cleared and you maintain the siege each turn.",
            "Tous les gardes défenseurs doivent être chassés et le siège maintenu à chaque tour.",
          )}
        </p>
        <div className="demo-controls">
          {inputs.map(([name, value, set, max], i) => (
            <label key={name}>
              {name}
              <select
                aria-label={name}
                value={value}
                onChange={(e) => set(+e.target.value)}
              >
                {Array.from({ length: max + (i === 0 ? 0 : 1) }, (_, n) => (
                  <option key={n} value={n + (i === 0 ? 1 : 0)}>
                    {n + (i === 0 ? 1 : 0)}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>
      </div>
      <div className="siege-result" aria-live="polite">
        <Shield size={38} />
        <strong>{steps}</strong>
        <span>{labels("siege-only turns", "tours de siège seuls")}</span>
        <p>
          {labels("Raid on turn", "Pillage au tour")} <b>{steps + 1}</b>
          <br />
          {labels("Destroy from turn", "Destruction dès le tour")}{" "}
          <b>{steps + 2}</b>
        </p>
        <small>
          {labels(
            "Raid: 1 MP. Destruction: fresh units, on a later turn.",
            "Pillage : 1 PM. Destruction : unités fraîches, à un tour ultérieur.",
          )}
        </small>
      </div>
    </section>
  );
}
function PrintedRoster() {
  return (
    <section className="print-roster">
      <h1>
        {labels(
          "Unit and ship statistics",
          "Statistiques des unités et navires",
        )}
      </h1>
      {Object.entries(UNIT_INFO).map(([kind, u]) => (
        <article key={kind}>
          <h3>{tx(u.name)}</h3>
          <p>
            {labels("Movement", "Mouvement")}: {u.speed}.{" "}
            {u.family
              ? `×2 ${tx(u.family)}`
              : kind === "merchant"
                ? labels("No combat power.", "Aucune puissance de combat.")
                : labels(
                    "Siege power equals tier.",
                    "Puissance de siège égale au palier.",
                  )}
          </p>
          {u.names.map((n, i) => (
            <p key={n}>
              {ROMAN[i + 1]} · {tx(n)} · {labels("Power", "Puissance")}:{" "}
              {kind === "merchant" ? 0 : i + 1}
            </p>
          ))}
        </article>
      ))}
      {(Object.keys(SHIP_INFO) as ShipClass[]).map((k) => (
        <article key={k}>
          <h3>{tx(SHIP_INFO[k].name)}</h3>
          {[1, 2, 3, 4].map((t) => {
            const s = shipStats(k, t);
            return (
              <p key={t}>
                {ROMAN[t]} · {tx(s.name)} ·{" "}
                {labels("Power / loss points", "Puissance / points de pertes")}:{" "}
                {s.power} · {labels("Movement", "Mouvement")}: {s.speed} ·{" "}
                {labels("Berths", "Places")}: {s.capacity}
              </p>
            );
          })}
        </article>
      ))}
      <h1>
        {labels("Raw goods and industries", "Ressources brutes et industries")}
      </h1>
      {RAW.map((g) => (
        <p key={g}>
          {tx(GOOD_INFO[g].name)} →{" "}
          {g === "oil" ? tx(GUILDS.artisans.name) : tx(extensionName(g))} →{" "}
          {tx(GOOD_INFO[processedFor(g)].name)}
        </p>
      ))}
    </section>
  );
}

function DiceOdds() {
  return (
    <div
      className="dice-odds"
      aria-label={labels(
        "Dice probabilities out of 36",
        "Probabilités des dés sur 36",
      )}
    >
      {Array.from({ length: 11 }, (_, i) => {
        const n = i + 2,
          ways = 6 - Math.abs(7 - n);
        return (
          <div key={n}>
            <div
              className={n === 7 ? "best" : ""}
              style={{ height: ways * 13 }}
            />
            <b>{n}</b>
            <small>{ways}/36</small>
          </div>
        );
      })}
    </div>
  );
}
const catalogSections = [
  ["goods", "Goods", "Ressources"],
  ["buildings", "Buildings & costs", "Bâtiments et coûts"],
  ["units", "Land units", "Unités terrestres"],
  ["ships", "Ships", "Navires"],
  ["cards", "Research", "Développement"],
  ["guilds", "Guilds", "Guildes"],
] as const;
type CatalogSection = (typeof catalogSections)[number][0];
function Catalogue({ initial = "goods" }: { initial?: CatalogSection }) {
  const [kind, setKind] = useState<CatalogSection>(initial),
    [query, setQuery] = useState(""),
    [tier, setTier] = useState(1);
  const matches = (s: string) => fold(s).includes(fold(query));
  return (
    <section className="catalogue" id="catalogue">
      <div className="section-heading">
        <div>
          <span className="eyebrow">
            {labels("LIVE GAME REFERENCE", "DONNÉES DU JEU")}
          </span>
          <h2>{labels("Reference tables", "Tables de référence")}</h2>
        </div>
        <span className="data-note">
          {labels(
            "Costs and effects come from the game itself.",
            "Coûts et effets proviennent directement du jeu.",
          )}
        </span>
      </div>
      <div
        className="catalog-tabs"
        role="tablist"
        aria-label={labels("Catalogue", "Catalogue")}
      >
        {catalogSections.map(([id, en, fr]) => (
          <button
            key={id}
            role="tab"
            aria-selected={kind === id}
            onClick={() => {
              setKind(id);
              setQuery("");
            }}
          >
            {labels(en, fr)}
          </button>
        ))}
      </div>
      <div className="catalog-tools">
        <label className="search-field">
          <Search size={18} />
          <input
            aria-label={labels("Filter catalogue", "Filtrer le catalogue")}
            placeholder={labels(
              "Find a good, unit or recipe…",
              "Ressource, unité ou recette…",
            )}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {["units", "ships", "cards", "guilds"].includes(kind) && (
          <div className="tier-buttons" aria-label={labels("Tier", "Palier")}>
            {Array.from({ length: kind === "guilds" ? 3 : 4 }, (_, i) => (
              <button
                key={i}
                aria-pressed={tier === i + 1}
                onClick={() => setTier(i + 1)}
              >
                {ROMAN[i + 1]}
              </button>
            ))}
          </div>
        )}
      </div>
      <div
        className={`catalog-grid ${kind === "buildings" ? "recipe-grid" : ""}`}
        role="tabpanel"
      >
        {kind === "goods" &&
          GOODS.filter((g) => matches(tx(GOOD_INFO[g].name))).map((g) => (
            <article className="good-card" key={g}>
              <GoodSources good={g} />
              <ResourceIcon good={g} size={48} />
              <h3>{tx(GOOD_INFO[g].name)}</h3>
              <span>
                {RAW.includes(g as (typeof RAW)[number])
                  ? labels("Raw resource", "Ressource brute")
                  : labels("Processed good", "Produit transformé")}
              </span>
              {RAW.includes(g as (typeof RAW)[number]) && (
                <p>
                  {g === "oil" ? (
                    labels(
                      "Coal substitute · Artisans → Fuel",
                      "Remplace le Charbon · Artisans → Combustible",
                    )
                  ) : (
                    <>
                      {tx(extensionName(g as (typeof RAW)[number]))}{" "}
                      <ArrowRight size={12} />{" "}
                      {tx(
                        GOOD_INFO[processedFor(g as (typeof RAW)[number])].name,
                      )}
                    </>
                  )}
                </p>
              )}
            </article>
          ))}
        {kind === "buildings" &&
          Object.entries(COSTS)
            .filter(([name, stock]) =>
              matches(
                tx(name) +
                  " " +
                  Object.keys(stock)
                    .map((g) => tx(GOOD_INFO[g as Good].name))
                    .join(" "),
              ),
            )
            .map(([name, stock]) => (
              <article key={name}>
                <h3>{tx(name)}</h3>
                <Cost stock={stock} />
                {name === "Watchtower 1" && (
                  <small>
                    {labels(
                      "Alternative: 2 Stone, not an additional cost.",
                      "Autre choix : 2 Pierres, pas un coût supplémentaire.",
                    )}
                  </small>
                )}
              </article>
            ))}
        {kind === "units" &&
          (Object.keys(UNIT_INFO) as UnitClass[])
            .filter((k) =>
              matches(
                tx(UNIT_INFO[k].name) + " " + tx(UNIT_INFO[k].names[tier - 1]),
              ),
            )
            .map((k) => {
              const u = UNIT_INFO[k];
              return (
                <article className="unit-card" key={k}>
                  <MilitaryPortrait unit={{ kind: k, tier, naval: false }} />
                  <span className="eyebrow">
                    {tx(u.name)} · {ROMAN[tier]}
                  </span>
                  <h3>{tx(u.names[tier - 1])}</h3>
                  <div className="stats">
                    <span>
                      <Sword size={15} />
                      {k === "merchant" ? 0 : tier}{" "}
                      {labels("power", "puissance")}
                    </span>
                    <span>
                      <Compass size={15} />
                      {u.speed} {labels("movement", "mouvement")}
                    </span>
                  </div>
                  <p>
                    {u.family
                      ? labels(
                          `×2 on ${u.family} terrain`,
                          `×2 en ${u.family === "rugged" ? "terrain accidenté" : u.family === "forest" ? "forêt" : "plaine"}`,
                        )
                      : k === "artillery"
                        ? labels(
                            `−${tier} siege turns`,
                            `−${tier} tours de siège`,
                          )
                        : labels(
                            `Current tile + ${tier} neighbours · ×${tier} raw output${tier >= 3 ? ` + ${tier - 2} processed per resource type` : ""}`,
                            `Tuile actuelle + ${tier} voisines · production brute ×${tier}${tier >= 3 ? ` + ${tier - 2} produit transformé par type de ressource` : ""}`,
                          )}
                  </p>
                  <Cost stock={unitCost(k, tier)} />
                </article>
              );
            })}
        {kind === "ships" &&
          (Object.keys(SHIP_INFO) as ShipClass[])
            .filter((k) =>
              matches(
                tx(SHIP_INFO[k].name) + " " + tx(shipStats(k, tier).name),
              ),
            )
            .map((k) => {
              const s = shipStats(k, tier);
              return (
                <article className="unit-card" key={k}>
                  <MilitaryPortrait unit={{ kind: k, tier, naval: true }} />
                  <span className="eyebrow">
                    {tx(SHIP_INFO[k].name)} · {ROMAN[tier]}
                  </span>
                  <h3>{tx(s.name)}</h3>
                  <div className="stats">
                    <span>
                      <Sword size={15} />
                      {s.power}{" "}
                      {labels(
                        "power / loss points",
                        "puissance / points de pertes",
                      )}
                    </span>
                    <span>
                      <Compass size={15} />
                      {s.speed} {labels("movement", "mouvement")}
                    </span>
                    <span>
                      <Anchor size={15} />
                      {s.capacity} {labels("berths", "places")}
                    </span>
                  </div>
                  {k === "fishing" && (
                    <p>
                      {labels(
                        `Fishing range ${tier} water tiles · ×${tier} raw output`,
                        `Portée de pêche : ${tier} tuiles d’eau · production brute ×${tier}`,
                      )}
                    </p>
                  )}
                  {k === "merchantship" && (
                    <p>
                      {labels(
                        `Adjacent land · ×${tier} raw output${tier >= 3 ? ` + ${tier - 2} processed per resource type` : ""}`,
                        `Terres voisines · production brute ×${tier}${tier >= 3 ? ` + ${tier - 2} produit transformé par type de ressource` : ""}`,
                      )}
                    </p>
                  )}
                  <Cost stock={shipCost(k, tier)} />
                </article>
              );
            })}
        {kind === "cards" && (
          <>
            <div className="catalog-intro">
              <h3>{tx(RESEARCH_NAMES[tier])}</h3>
              <Cost stock={COSTS[`Research ${RESEARCH_NAMES[tier]}`]} />
              <p>
                {labels(
                  "Eight possibilities. Two distinct random choices. Keep one.",
                  "Huit possibilités. Deux choix aléatoires distincts. Gardez-en un.",
                )}
              </p>
            </div>
            {Object.entries(CARDS)
              .filter(
                ([, c]) =>
                  c.tier === tier && matches(tx(c.name) + " " + tx(c.text)),
              )
              .map(([id, c]) => (
                <article className="research-reference" key={id}>
                  <ResearchArt kind={id} />
                  <span className="eyebrow">
                    {labels("TIER", "PALIER")} {ROMAN[tier]}
                  </span>
                  <h3>{tx(c.name)}</h3>
                  <p>{tx(c.text)}</p>
                </article>
              ))}
          </>
        )}
        {kind === "guilds" &&
          GUILD_KINDS.filter((k) =>
            matches(tx(GUILDS[k].name) + " " + tx(GUILDS[k].purpose)),
          ).map((k) => {
            const g = GUILDS[k],
              gt = Math.min(tier, 3);
            return (
              <article key={k} className="guild-card">
                <Landmark size={32} color={g.color} />
                <h3>
                  {tx(g.name)} · {ROMAN[gt]}
                </h3>
                <p>{tx(g.purpose)}</p>
                <h4>{labels("Construction", "Construction")}</h4>
                <Cost stock={guildCost(k, gt)} />
                <h4>{labels("Contract", "Contrat")}</h4>
                <p className="contract">{tx(g.tiers[gt - 1])}</p>
              </article>
            );
          })}
      </div>
      {query && (
        <p className="filter-note">
          {labels(
            "Clear the filter to see every entry.",
            "Effacez le filtre pour voir toutes les entrées.",
          )}{" "}
          <button onClick={() => setQuery("")}>
            {labels("Clear", "Effacer")}
          </button>
        </p>
      )}
    </section>
  );
}
function App() {
  const locale = useLocale(),
    [current, setCurrent] = useState(location.hash.slice(1) || "home"),
    [query, setQuery] = useState(""),
    [menu, setMenu] = useState(false),
    [printing, setPrinting] = useState(false);
  useEffect(() => {
    const onHash = () => {
      setCurrent(location.hash.slice(1) || "home");
      setQuery("");
      setMenu(false);
      window.scrollTo(0, 0);
    };
    const before = () => flushSync(() => setPrinting(true)),
      after = () => setPrinting(false);
    window.addEventListener("hashchange", onHash);
    window.addEventListener("beforeprint", before);
    window.addEventListener("afterprint", after);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.removeEventListener("beforeprint", before);
      window.removeEventListener("afterprint", after);
    };
  }, []);
  useEffect(() => {
    document.title = labels(
      "How to play | Catane Frontiers",
      "Comment jouer | Catane Frontières",
    );
  }, [locale]);
  const index = chapters.findIndex((c) => c.id === current),
    chapter = chapters[index];
  const found = chapters.filter((c) =>
    fold(c.title[locale] + " " + c.body[locale]).includes(fold(query)),
  );
  const go = (id: string) => {
    location.hash = id;
    setQuery("");
    setMenu(false);
    window.scrollTo(0, 0);
  };
  const switchLanguage = () => {
    const next = locale === "en" ? "fr" : "en";
    setLocale(next);
    history.replaceState(
      null,
      "",
      `./rules${next === "fr" ? "-fr" : ""}.html${location.hash}`,
    );
  };
  const header = (
    <header className="rule-header">
      <a className="wordmark" href="#home" onClick={() => go("home")}>
        <BookOpen size={23} />
        <span>
          CATANE{" "}
          <small>
            {labels("FRONTIERS / RULEBOOK", "FRONTIÈRES / RÈGLES DU JEU")}
          </small>
        </span>
      </a>
      <div>
        <button
          className="mobile-menu"
          onClick={() => setMenu(!menu)}
          aria-label={labels("Toggle navigation", "Afficher la navigation")}
          aria-expanded={menu}
        >
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
        <button onClick={switchLanguage} lang={locale === "en" ? "fr" : "en"}>
          {locale === "en" ? "Français" : "English"}
        </button>
        <button
          className="print-button"
          onClick={() => {
            setPrinting(true);
            setTimeout(() => window.print(), 50);
          }}
          aria-label={labels(
            "Print complete rules",
            "Imprimer toutes les règles",
          )}
        >
          <Printer size={18} />
        </button>
        <a className="play-link" href="./">
          {labels("Play", "Jouer")} <ArrowRight size={16} />
        </a>
      </div>
    </header>
  );
  function chapterView(c: (typeof chapters)[number]): ReactNode {
    return (
      <>
        <div className="chapter-heading">
          <span className="eyebrow">
            {labels("RULEBOOK", "LIVRET DE RÈGLES")} /{" "}
            {String(chapters.indexOf(c) + 1).padStart(2, "0")}
          </span>
          <h1>{c.title[locale]}</h1>
          <p>{c.summary[locale]}</p>
        </div>
        {c.id === "economy" && <TerrainReference />}
        {c.id === "sea" && <TerrainReference seaOnly />}
        {c.id === "world" && (
          <>
            <ClimateReference />
            <DiceOdds />
          </>
        )}
        {c.id === "siege" && <SiegeDemo />}
        <Prose body={c.body[locale]} />
        {c.id === "economy" && <ProductionDemo />}
        {c.id === "research" && <Catalogue initial="cards" />}
        {c.id === "guilds" && <Catalogue initial="guilds" />}
        {c.id === "armies" && <Catalogue initial="units" />}
        {c.id === "sea" && <Catalogue initial="ships" />}
        {c.id === "build" && <Catalogue initial="buildings" />}
      </>
    );
  }
  return (
    <>
      {header}
      <aside
        className={`rule-sidebar ${menu ? "open" : ""}`}
        data-searching={!!query}
      >
        <label className="search-field">
          <Search size={17} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={labels("Search the rules…", "Chercher une règle…")}
            aria-label={labels("Search rules", "Chercher dans les règles")}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              aria-label={labels("Clear search", "Effacer la recherche")}
            >
              <X size={15} />
            </button>
          )}
        </label>
        {query && (
          <div
            className="mobile-search-results"
            aria-label={labels("Search results", "Résultats de recherche")}
          >
            {found.map((c) => (
              <button key={c.id} onClick={() => go(c.id)}>
                {c.title[locale]}
                <ArrowRight size={16} />
              </button>
            ))}
            {!found.length && (
              <p>
                {labels(
                  "No matching chapter. Try another word.",
                  "Aucun chapitre trouvé. Essayez un autre mot.",
                )}
              </p>
            )}
            <button onClick={() => go("catalog")}>
              {labels("Open catalogue", "Ouvrir le catalogue")}
              <BookOpen size={16} />
            </button>
          </div>
        )}
        <nav aria-label={labels("Rule chapters", "Chapitres des règles")}>
          <a
            href="#home"
            aria-current={current === "home" ? "page" : undefined}
            onClick={() => go("home")}
          >
            <Home size={17} />
            {labels("Start here", "Commencez ici")}
          </a>
          {chapters.map((c, i) => {
            const Icon = icons[i];
            return (
              <a
                key={c.id}
                href={`#${c.id}`}
                aria-current={current === c.id ? "page" : undefined}
                onClick={() => go(c.id)}
              >
                <Icon size={17} />
                {c.title[locale]}
              </a>
            );
          })}
          <a
            href="#catalog"
            aria-current={current === "catalog" ? "page" : undefined}
            onClick={() => go("catalog")}
          >
            <BookOpen size={17} />
            {labels("All costs & cards", "Tous les coûts et cartes")}
          </a>
        </nav>
        <div className="sidebar-bottom">
          <span className="status-dot" />
          {labels(
            "Rules for the current game",
            "Règles de la version actuelle",
          )}
        </div>
      </aside>
      <main className="rule-main" id="main">
        {printing ? (
          <div className="print-content">
            {chapters.map((c) => (
              <section key={c.id}>
                <div className="chapter-heading">
                  <h1>{c.title[locale]}</h1>
                </div>
                {c.id === "world" &&
                  CLIMATES.map((climate) => (
                    <ClimateReference
                      key={climate}
                      initial={climate}
                      readOnly
                    />
                  ))}
                {c.id === "economy" && <TerrainReference />}
                <Prose body={c.body[locale]} />
              </section>
            ))}
            <h1>
              {labels(
                "Complete recipe reference",
                "Référence complète des recettes",
              )}
            </h1>
            {Object.entries(COSTS).map(([n, s]) => (
              <article key={n}>
                <h3>{tx(n)}</h3>
                <Cost stock={s} />
              </article>
            ))}
            <PrintedRoster />
            <h1>
              {labels(
                "All research effects",
                "Tous les effets de Développement",
              )}
            </h1>
            {Object.values(CARDS).map((c) => (
              <article key={c.name}>
                <h3>
                  {tx(c.name)} · {ROMAN[c.tier]}
                </h3>
                <p>{tx(c.text)}</p>
              </article>
            ))}
            <h1>{labels("Guild contracts", "Contrats des guildes")}</h1>
            {GUILD_KINDS.map((k) => (
              <article key={k}>
                <h3>{tx(GUILDS[k].name)}</h3>
                {GUILDS[k].tiers.map((t, i) => (
                  <p key={i}>
                    {ROMAN[i + 1]}: {tx(t)}
                  </p>
                ))}
              </article>
            ))}
          </div>
        ) : query ? (
          <section className="search-results">
            <span className="eyebrow">
              {labels("SEARCH RESULTS", "RÉSULTATS")}
            </span>
            <h1>{labels("Search results", "Résultats de recherche")}</h1>
            <p>
              {found.length}{" "}
              {labels("matching chapters", "chapitres correspondants")}
            </p>
            {found.map((c) => {
              const lines = c.body[locale]
                .split("\n")
                .filter(
                  (l) => !l.startsWith("##") && fold(l).includes(fold(query)),
                );
              return (
                <button key={c.id} onClick={() => go(c.id)}>
                  <h2>
                    {c.title[locale]} <ArrowRight size={20} />
                  </h2>
                  <p>{lines[0] ?? c.summary[locale]}</p>
                </button>
              );
            })}
            {!found.length && (
              <p>
                {labels(
                  "Try a shorter term, or open the catalogue for unit names and costs.",
                  "Essayez un terme plus court ou le catalogue pour les noms et coûts.",
                )}
              </p>
            )}
            <button className="primary" onClick={() => go("catalog")}>
              {labels("Search the catalogue", "Chercher dans le catalogue")}{" "}
              <ArrowRight size={18} />
            </button>
          </section>
        ) : current === "catalog" ? (
          <Catalogue />
        ) : chapter ? (
          <article className="chapter" key={chapter.id}>
            {chapterView(chapter)}
            <div className="chapter-pagination">
              <button
                onClick={() =>
                  go(index === 0 ? "home" : chapters[index - 1].id)
                }
              >
                <ArrowLeft size={17} />
                {labels("Previous", "Précédent")}
              </button>
              {index < chapters.length - 1 && (
                <button onClick={() => go(chapters[index + 1].id)}>
                  {chapters[index + 1].title[locale]}
                  <ArrowRight size={17} />
                </button>
              )}
            </div>
          </article>
        ) : (
          <>
            <section
              className="guide-hero"
              style={{ backgroundImage: "url(./assets/frontiers-cover.png)" }}
            >
              <div className="hero-shade" />
              <div className="hero-copy">
                <span className="eyebrow">
                  {labels("CATANE FRONTIERS", "CATANE FRONTIÈRES")}
                </span>
                <h1>{labels("Rules of play", "Règles du jeu")}</h1>
                <p>
                  {labels(
                    "Setup, turn sequence and complete rules. Costs, unit statistics and card effects are listed in the reference tables.",
                    "Mise en place, déroulement d’un tour et règles complètes. Les tables de référence regroupent les coûts, les caractéristiques des unités et les effets des cartes.",
                  )}
                </p>
                <button className="primary" onClick={() => go("start")}>
                  {labels("Learn to play", "Apprendre à jouer")}
                  <ArrowRight size={19} />
                </button>
                <button
                  className="hero-secondary"
                  onClick={() => go("catalog")}
                >
                  {labels("Browse costs & cards", "Voir les coûts et cartes")}
                </button>
              </div>
              <div className="hero-facts">
                <span>
                  5 / 10 <small>{labels("factions", "factions")}</small>
                </span>
                <span>
                  22 <small>{labels("goods", "ressources")}</small>
                </span>
                <span>
                  125 / 250{" "}
                  <small>{labels("starting tiles", "tuiles initiales")}</small>
                </span>
              </div>
            </section>
            <section className="learning-path">
              <span className="eyebrow">
                {labels("QUICK REFERENCE", "REPÈRES")}
              </span>
              <h2>
                {labels(
                  "Setup and turn sequence",
                  "Mise en place et déroulement",
                )}
              </h2>
              <div className="steps">
                <button onClick={() => go("start")}>
                  <span>01</span>
                  <Sprout />
                  <h3>{labels("1. Setup", "1. Mise en place")}</h3>
                  <p>
                    {labels(
                      "Place two settlements, each with a road or sea route. Collect starting resources from the second settlement.",
                      "Placez deux colonies, chacune avec une route ou liaison maritime. La seconde reçoit les ressources de départ.",
                    )}
                  </p>
                  <ArrowRight />
                </button>
                <button onClick={() => go("economy")}>
                  <span>02</span>
                  <Pickaxe />
                  <h3>{labels("2. Production", "2. Production")}</h3>
                  <p>
                    {labels(
                      "Roll two dice. Every faction collects from tiles matching the total, including 7.",
                      "Lancez deux dés. Toutes les factions produisent sur les tuiles portant le total obtenu, y compris 7.",
                    )}
                  </p>
                  <ArrowRight />
                </button>
                <button onClick={() => go("start")}>
                  <span>03</span>
                  <Shield />
                  <h3>{labels("3. Actions", "3. Actions")}</h3>
                  <p>
                    {labels(
                      "Build, trade, recruit, move and fight in any order. Then end your turn.",
                      "Construisez, échangez, recrutez, déplacez et combattez dans l’ordre souhaité. Puis terminez votre tour.",
                    )}
                  </p>
                  <ArrowRight />
                </button>
              </div>
            </section>
            <ProductionDemo />
            <section className="topic-section">
              <span className="eyebrow">{labels("CONTENTS", "SOMMAIRE")}</span>
              <h2>{labels("Rules by subject", "Règles par thème")}</h2>
              <div className="topic-grid">
                {chapters.slice(1).map((c, i) => {
                  const Icon = icons[i + 1];
                  return (
                    <button key={c.id} onClick={() => go(c.id)}>
                      <Icon size={23} />
                      <h3>{c.title[locale]}</h3>
                      <p>{c.summary[locale]}</p>
                      <ArrowRight size={18} />
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
        <footer className="rule-footer">
          <span>
            Catane Frontiers ·{" "}
            {labels("Independent fan game", "Jeu indépendant de fans")}
          </span>
          <p>
            {labels(
              "French base-game terms follow the publisher’s official rules. The added systems are specific to Frontiers.",
              "Les termes français du jeu de base suivent les règles officielles de l’éditeur. Les systèmes ajoutés sont propres à Frontières.",
            )}{" "}
            <a
              href="https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2025/11/CATAN-REGLES.pdf"
              target="_blank"
              rel="noreferrer"
            >
              Catan
            </a>{" "}
            ·{" "}
            <a
              href="https://cdn.svc.asmodee.net/production-asmodeeca/uploads/2025/11/CATAN-MARINS-REGLES.pdf"
              target="_blank"
              rel="noreferrer"
            >
              {labels("Seafarers", "Marins")}
            </a>
          </p>
        </footer>
      </main>
    </>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
