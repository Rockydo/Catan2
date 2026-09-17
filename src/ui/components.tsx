import { localize as tx, useLocale } from "../i18n";
import { recipePayment } from "../game/selectors";
import { MilitaryIcon, MilitaryPortrait } from "./MilitaryArt";
import { ShipMiniature } from "./MapPieces";
import { ResourceIcon } from "./ResourceIcon";
import { useEffect, useRef, type ReactNode } from "react";
import {
  X,
  Coins,
  Shield,
  Swords,
  Navigation,
  Anchor,
  Factory,
  Compass,
  BookOpen,
  ChevronRight,
  Flag,
} from "lucide-react";
import {
  GOODS,
  RAW_SUBSTITUTES,
  type Good,
  type Stock,
  type Game,
  type Command,
  type Piece,
  type UnitClass,
  type ShipClass,
} from "../game/types";
import { GOOD_INFO, UNIT_INFO, SHIP_INFO } from "../game/content";
import { commandError } from "../game/engine";
export function GoodIcon({ good, size = 24 }: { good: Good; size?: number }) {
  useLocale();

  return <ResourceIcon good={good} size={size} />;
}
export function Cost({ cost, available }: { cost: Stock; available?: Stock }) {
  useLocale();

  return (
    <span
      className="cost"
      aria-label={tx(
        Object.entries(cost)
          .filter(([, n]) => n)
          .map(([g, n]) => `${n} ${GOOD_INFO[g as Good].name}`)
          .join(", ") || "Free",
      )}
    >
      {tx(
        GOODS.filter((g) => cost[g]).map((g) => (
          <span
            key={g}
            className={
              available &&
              (available[g] ?? 0) +
                (RAW_SUBSTITUTES[g]
                  ? Math.max(
                      0,
                      (available[RAW_SUBSTITUTES[g]!] ?? 0) -
                        (cost[RAW_SUBSTITUTES[g]!] ?? 0),
                    )
                  : 0) <
                cost[g]!
                ? "cost-shortage"
                : undefined
            }
            title={tx(`${cost[g]} ${GOOD_INFO[g].name}`)}
          >
            <GoodIcon good={g} size={19} />
            {tx(cost[g])}
          </span>
        )),
      )}
      {tx(
        !Object.values(cost).some((n) => n) ? (
          <span className="free">{tx("Free")}</span>
        ) : null,
      )}
    </span>
  );
}
export function GoodsList({
  stock,
  empty = "No goods stored",
}: {
  stock: Stock;
  empty?: string;
}) {
  useLocale();

  return (
    <div className="goods-list">
      {tx(
        GOODS.filter((g) => stock[g]).map((g) => (
          <span key={g}>
            <GoodIcon good={g} />
            <span>{tx(GOOD_INFO[g].name)}</span>
            <b>{tx(stock[g])}</b>
          </span>
        )),
      )}
      {tx(
        !Object.values(stock).some((n) => n) && (
          <p className="muted">{tx(empty)}</p>
        ),
      )}
    </div>
  );
}
export function GoodsPicker({
  value,
  onChange,
  available,
  goods = GOODS,
  totalLimit = Number.MAX_SAFE_INTEGER,
}: {
  value: Stock;
  onChange: (v: Stock) => void;
  available?: Stock;
  goods?: readonly Good[];
  totalLimit?: number;
}) {
  useLocale();

  const total = Object.values(value).reduce((a, b) => a + (b ?? 0), 0);
  return (
    <div className="goods-picker">
      {tx(
        goods.map((g) => (
          <label key={g}>
            <GoodIcon good={g} />
            <span>{tx(GOOD_INFO[g].name)}</span>
            <input
              aria-label={tx(`${GOOD_INFO[g].name} quantity`)}
              type="number"
              min={0}
              max={Math.min(
                available ? (available[g] ?? 0) : totalLimit,
                totalLimit - total + (value[g] ?? 0),
              )}
              value={value[g] ?? 0}
              onChange={(e) =>
                onChange({
                  ...value,
                  [g]: Math.max(
                    0,
                    Math.min(
                      Number(e.target.value) || 0,
                      available ? (available[g] ?? 0) : totalLimit,
                      totalLimit - total + (value[g] ?? 0),
                    ),
                  ),
                })
              }
            />
            {tx(available && <small>/ {tx(available[g] ?? 0)}</small>)}
          </label>
        )),
      )}
    </div>
  );
}
export function ActionButton({
  game,
  command,
  onAction,
  children,
  cost,
  disabled = false,
  exactCost = false,
  className = "",
}: {
  game: Game;
  command: Command;
  onAction: (c: Command) => void;
  children: ReactNode;
  cost?: Stock;
  disabled?: boolean;
  exactCost?: boolean;
  className?: string;
}) {
  useLocale();

  const reason = disabled ? "Wait for your turn." : commandError(game, command);
  const payment = cost && !exactCost ? recipePayment(game, cost) : undefined;
  return (
    <button
      className={`action-button ${className}`}
      disabled={disabled || !!reason}
      title={tx(reason)}
      onClick={() => onAction(command)}
    >
      <span>{tx(children)}</span>
      {tx(cost && <Cost cost={cost} />)}
      {tx(
        payment &&
          cost &&
          Object.entries(RAW_SUBSTITUTES).map(([base, alternate]) => {
            const used = (payment[alternate] ?? 0) - (cost[alternate] ?? 0);
            return used > 0 ? (
              <small className="fish-payment" key={base}>
                {tx("Uses ")}
                {tx(used)} {tx(GOOD_INFO[alternate].name)}
                {tx(" instead of")}
                {tx(" ")}
                {tx(GOOD_INFO[base as Good].name)}
              </small>
            ) : null;
          }),
      )}
    </button>
  );
}
export function Modal({
  title,
  children,
  onClose,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  onClose?: () => void;
  wide?: boolean;
}) {
  useLocale();

  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const dialog = ref.current;
    dialog?.focus();
    const listener = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onClose) {
        event.preventDefault();
        onClose();
      }
      if (event.key === "Tab") {
        const focusable = dialog?.querySelectorAll<HTMLElement>(
          'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]',
        );
        if (!focusable?.length) {
          event.preventDefault();
          return;
        }
        const first = focusable[0],
          last = focusable[focusable.length - 1];
        if (
          event.shiftKey &&
          (document.activeElement === first ||
            document.activeElement === dialog)
        ) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.removeEventListener("keydown", listener);
      previous?.focus();
    };
  }, [onClose]);
  return (
    <div
      className="modal-backdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className={`modal ${wide ? "wide" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={tx(title)}
        tabIndex={-1}
        ref={ref}
      >
        <div className="modal-header">
          <h2>{tx(title)}</h2>
          {tx(
            onClose && (
              <button
                className="icon-button"
                aria-label={tx("Close dialog")}
                onClick={onClose}
              >
                <X size={20} />
              </button>
            ),
          )}
        </div>
        {tx(children)}
      </div>
    </div>
  );
}
export function UnitSymbol({
  kind,
  tier = 1,
  size = 24,
}: {
  kind: string;
  tier?: number;
  size?: number;
}) {
  useLocale();

  return <MilitaryIcon kind={kind} tier={tier} size={size} />;
}
export function UnitPortrait({
  unit,
}: {
  unit: Pick<Piece, "kind" | "tier" | "naval"> & Partial<Pick<Piece, "owner">>;
}) {
  useLocale();

  return <MilitaryPortrait unit={unit} />;
}
export function Empty({ children }: { children: ReactNode }) {
  useLocale();

  return (
    <div className="empty-state">
      <Compass size={30} />
      <p>{tx(children)}</p>
    </div>
  );
}
export function SectionTitle({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  useLocale();

  return (
    <div className="section-title">
      <h3>{tx(children)}</h3>
      {tx(aside)}
    </div>
  );
}
