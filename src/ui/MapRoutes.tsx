import { memo } from "react";
import type { Game } from "../game/types";
import type { Selection } from "./Board";
import { localize as tx, useLocale } from "../i18n";
import { vertexPoint, hexCenter } from "../game/world";
import { COLORS } from "../game/content";
import { MapLabel } from "./MapLabel";

/** Selection and army updates do not change route artwork. Geometry, camps,
 * ownership, language and current callbacks remain explicit inputs. */
export const MapRoutes = memo(function MapRoutes({
  routes,
  edges,
  vertices,
  tiles,
  playerNames,
  onSelect,
  clicked,
}: {
  routes: Game["routes"];
  edges: Game["edges"];
  vertices: Game["vertices"];
  tiles: Game["tiles"];
  playerNames: readonly string[];
  onSelect: (selection: Selection) => void;
  clicked: (action: () => void) => void;
}) {
  useLocale();
  return (
    <>
      {tx(
        Object.values(routes).map((r) => {
          const e = edges[r.edge],
            a = vertexPoint(vertices[e.vertices[0]]),
            b = vertexPoint(vertices[e.vertices[1]]);
          return (
            <g
              key={r.id}
              data-testid={`road-${r.edge}`}
              data-map-x={(a.x + b.x) / 2}
              data-map-y={(a.y + b.y) / 2}
              onClick={(ev) => {
                ev.stopPropagation();
                clicked(() => onSelect({ type: "edge", id: r.edge }));
              }}
              role="button"
              tabIndex={0}
              aria-label={tx(
                `${playerNames[r.owner]} ${r.kind === "road" ? "road" : "shipping route"}${Object.keys(r.camps).length ? ", with camps" : ""}`,
              )}
              onKeyDown={(ev) => {
                if (ev.key === "Enter") onSelect({ type: "edge", id: r.edge });
              }}
            >
              <circle
                cx={(a.x + b.x) / 2}
                cy={(a.y + b.y) / 2}
                r="9"
                fill="transparent"
              />
              <path
                d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                stroke="#ece0bb"
                strokeWidth="6.5"
                strokeLinecap="round"
              />
              <circle
                cx={(a.x + b.x) / 2}
                cy={(a.y + b.y) / 2}
                r="9"
                fill="transparent"
              />
              <path
                d={`M${a.x} ${a.y}L${b.x} ${b.y}`}
                stroke={COLORS[r.owner]}
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray={r.kind === "route" ? "8 5" : undefined}
              />
              {tx(
                Object.entries(r.camps).map(([tile, tier]) => {
                  const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
                    center = hexCenter(tiles[tile]),
                    dx = center.x - mid.x,
                    dy = center.y - mid.y,
                    len = Math.hypot(dx, dy);
                  return (
                    <g
                      key={tile}
                      transform={`translate(${mid.x + (dx / len) * 14} ${mid.y + (dy / len) * 14})`}
                    >
                      <path
                        d="M-7 6V-3L0-10 7-3V6Z"
                        fill="#fff1ce"
                        stroke={COLORS[r.owner]}
                        strokeWidth="2"
                      />
                      <path
                        d="M-9-3L0-11 9-3"
                        stroke="#66482c"
                        strokeWidth="2"
                        fill="none"
                      />
                      <MapLabel
                        textAnchor="middle"
                        y="4"
                        fontSize="8"
                        fontWeight="800"
                        fill="#3b3529"
                      >
                        {tx(tier === 2 ? "II" : "I")}
                      </MapLabel>
                    </g>
                  );
                }),
              )}
            </g>
          );
        }),
      )}
    </>
  );
});
