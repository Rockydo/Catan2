import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { parse } from "@babel/parser";
import { expect, it } from "vitest";
import { appendValues, minValue, maxValue } from "../src/game/aggregate";
import { moveTargets, siegePower } from "../src/game/selectors";
import { selectHalfForce } from "../src/ui/ArmyComposition";
import { funded, piece } from "./helpers";

it("scans arbitrary collections with native numeric semantics and constant stack usage", () => {
  const cases = [
    [],
    [7, -2, 9],
    [Infinity, -Infinity],
    [NaN, 1],
    [0, -0],
    [-0, 0],
  ];
  for (const values of cases) {
    expect(Object.is(minValue(values), Math.min(...values))).toBe(true);
    expect(Object.is(maxValue(values), Math.max(...values))).toBe(true);
  }
  function* numbers() {
    for (let i = 0; i < 300000; i++) yield i - 150000;
  }
  expect(minValue(numbers())).toBe(-150000);
  expect(maxValue(numbers())).toBe(149999);
  const target: number[] = [];
  expect(appendValues(target, numbers())).toBe(300000);
  expect(target[0]).toBe(-150000);
  expect(target.at(-1)).toBe(149999);
  const alias = [1, 2];
  expect(appendValues(alias, alias)).toBe(4);
  expect(alias).toEqual([1, 2, 1, 2]);
});

it("movement, siege bonuses and split selection handle forces beyond argument-stack limits", () => {
  const s = funded("large-force-stack-safety");
  s.pieces = {};
  for (const tile of Object.values(s.tiles)) {
    tile.resource = "grain";
    delete tile.fish;
    delete tile.whale;
  }
  const force = Array.from({ length: 260000 }, () => piece(s, "0,0"));
  force.at(-1)!.guildSiege = 7;
  const selected = force.map((u) => u.id);
  const targets = moveTargets(s, selected);
  expect(targets["1,0"]).toEqual(["1,0"]);
  expect(targets["2,0"]).toBeUndefined();
  expect(siegePower(force)).toBe(7);
  const half = selectHalfForce(s, force);
  expect(half).toHaveLength(130000);
  expect(new Set(half).size).toBe(130000);
  expect(half[0]).toBe(force[0].id);
  expect(half.at(-1)).toBe(force[129999].id);
  expect(force.every((u) => u.moved === 0 && !u.acted)).toBe(true);
});

it("rejects argument-list expansion in runtime source before it can reach a browser", () => {
  function files(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      return entry.isDirectory()
        ? files(path)
        : /\.[jt]sx?$/.test(path)
          ? [path]
          : [];
    });
  }
  const violations: string[] = [];
  for (const file of files("src")) {
    const source = readFileSync(file, "utf8");
    const nodes: unknown[] = [
      parse(source, { sourceType: "module", plugins: ["typescript", "jsx"] }),
    ];
    while (nodes.length) {
      const value = nodes.pop();
      if (!value || typeof value !== "object") continue;
      const node = value as Record<string, any>;
      if (
        ["CallExpression", "OptionalCallExpression", "NewExpression"].includes(
          node.type,
        )
      ) {
        const spread = node.arguments?.some(
          (a: { type: string }) => a.type === "SpreadElement",
        );
        const apply =
          ["MemberExpression", "OptionalMemberExpression"].includes(
            node.callee.type,
          ) &&
          (node.callee.computed
            ? node.callee.property.value
            : node.callee.property.name) === "apply";
        if (spread || apply)
          violations.push(
            `${file}:${node.loc.start.line} ${source.slice(node.start, node.end).slice(0, 100)}`,
          );
      }
      for (const [key, child] of Object.entries(node)) {
        if (["loc", "tokens", "comments"].includes(key)) continue;
        if (Array.isArray(child)) for (const item of child) nodes.push(item);
        else if (child && typeof child === "object") nodes.push(child);
      }
    }
  }
  expect(
    violations,
    "Use minValue/maxValue/appendValues, a loop, or explicit fixed arguments. Array/object literals may still use spread.",
  ).toEqual([]);
});
