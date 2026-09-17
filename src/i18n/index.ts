import { useSyncExternalStore } from "react";
import french from "./fr.json";
export type Locale = "en" | "fr";
export const LANGUAGE_KEY = "catane-language";
const listeners = new Set<() => void>();
function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    if (saved === "en" || saved === "fr") return saved;
    return typeof navigator !== "undefined" &&
      navigator.language.startsWith("fr")
      ? "fr"
      : "en";
  } catch {
    return "en";
  }
}
let locale: Locale = initialLocale();
export function setLocale(next: Locale) {
  if (next !== "en" && next !== "fr") return;
  locale = next;
  try {
    localStorage.setItem(LANGUAGE_KEY, next);
  } catch {
    /* Language still changes when storage is unavailable. */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = next;
    document.title = next === "fr" ? "Catane Frontières" : "Catane Frontiers";
  }
  listeners.forEach((listener) => listener());
}
export const getLocale = () => locale;
export function useLocale() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getLocale,
    () => "en" as Locale,
  );
}
export const rulesUrl = () =>
  locale === "fr" ? "./rules-fr.html" : "./rules.html";
const clean = (value: string) =>
  value
    .replace(/\u2014/g, ": ")
    .replace(/\s+/g, " ")
    .trim();
const dictionary = new Map(
  Object.entries(french).map(([key, value]) => [clean(key), value]),
);
const cache = new Map<string, string>();
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = [...dictionary]
  .filter(([key]) => /\{\d+\}/.test(key))
  .map(([key, value]) => {
    const captures: number[] = [];
    const parts = key.split(/(\{\d+\})/g);
    const re = new RegExp(
      "^" +
        parts
          .map((part) =>
            /^\{\d+\}$/.test(part)
              ? (captures.push(Number(part.slice(1, -1))), "(.*?)")
              : escape(part),
          )
          .join("") +
        "$",
    );
    return {
      re,
      value,
      captures,
      fixed: key.replace(/\{\d+\}/g, "").length,
      prefix: parts[0],
    };
  })
  .sort((a, b) => b.fixed - a.fixed);
export const missingTranslations = new Set<string>();
function translate(value: string, depth = 0): string {
  const key = clean(value);
  if (!/[A-Za-z]/.test(key)) return value.replace(/\u2014/g, ": ");
  const known =
    dictionary.get(key) ?? (depth === 0 ? cache.get(key) : undefined);
  let result = known;
  if (result === undefined && depth < 4) {
    for (const pattern of patterns) {
      if (pattern.prefix && !key.startsWith(pattern.prefix)) continue;
      const match = pattern.re.exec(key);
      if (!match) continue;
      const args = new Map(pattern.captures.map((id, i) => [id, match[i + 1]]));
      result = pattern.value.replace(/\{(\d+)\}/g, (_, id) =>
        translate(args.get(Number(id)) ?? "", depth + 1),
      );
      break;
    }
  }
  if (result === undefined) {
    // Lists are assembled from already named goods or units. Translate each item.
    const parts = key.split(/( · |, | → | \+ | \| |\n)/);
    if (parts.length > 1 && depth < 4)
      result = parts
        .map((part, i) => (i % 2 ? part : translate(part, depth + 1)))
        .join("");
    else {
      result = key;
      if (missingTranslations.size < 3000) missingTranslations.add(key);
    }
  }
  if (cache.size >= 6000) cache.clear();
  if (depth === 0) cache.set(key, result);
  return value.replace(value.trim(), result).replace(/\u2014/g, ": ");
}
/** Presentation only: engine IDs, command payloads, saves and player names stay unchanged. */
export function localize<T>(value: T): T {
  if (typeof value === "string")
    return (
      locale === "fr" ? translate(value) : value.replace(/\u2014/g, ": ")
    ) as T;
  if (Array.isArray(value)) return value.map(localize) as T;
  return value;
}
