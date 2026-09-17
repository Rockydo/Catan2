import { describe, it, expect } from "vitest";
import { funded, piece, run } from "./helpers";
import { applyCommand } from "../src/game/engine";
import { chooseAIAction } from "../src/game/ai";
import { moveTargets, pathTo } from "../src/game/selectors";

for (const naval of [false, true]) {
  describe(naval ? "fleet interception" : "army interception", () => {
    function corridor(detour = false) {
      const s = funded();
      s.phase = "military";
      // Isolate a three-hex corridor, optionally with a three-step way around.
      for (const tile of Object.values(s.tiles))
        tile.resource = naval ? "grain" : "water";
      for (const id of ["0,0", "1,0", "2,0", ...(detour ? ["0,1", "1,1"] : [])])
        s.tiles[id].resource = naval ? "water" : "grain";
      const mover = piece(s, "0,0", 0, naval ? "galley" : "cavalry"),
        blocker = piece(s, "1,0", 1, naval ? "transport" : "light");
      return { s, mover, blocker };
    }

    it("cannot cross an enemy even with extra movement or a direct command", () => {
      const { s, mover } = corridor();
      mover.bonus = 4;
      const targets = moveTargets(s, [mover.id]);
      expect(targets["1,0"]).toEqual(["1,0"]);
      expect(targets["2,0"]).toBeUndefined();
      expect(pathTo(s, "0,0", "2,0", naval, 0)).toBeNull();
      expect(pathTo(s, "0,0", "1,0", naval, 0)).toEqual(["1,0"]);
      const result = applyCommand(s, {
        type: "move",
        ids: [mover.id],
        to: "2,0",
      });
      expect(result.ok).toBe(false);
      expect(result.state).toBe(s);
      expect(s.pieces[mover.id].tile).toBe("0,0");
    });

    it("can go around only when the full clear detour fits its remaining movement", () => {
      const { s, mover, blocker } = corridor(true);
      const route = moveTargets(s, [mover.id])["2,0"];
      expect(route).toEqual(["0,1", "1,1", "2,0"]);
      expect(pathTo(s, "0,0", "2,0", naval, 0, 2)).toBeNull();
      expect(pathTo(s, "0,0", "2,0", naval, 0, 3)).toEqual(route);
      mover.moved = 1;
      expect(moveTargets(s, [mover.id])["2,0"]).toBeUndefined();
      mover.moved = 0;
      const next = run(s, { type: "move", ids: [mover.id], to: "2,0" });
      expect(next.pieces[mover.id].moved).toBe(3);
      expect(next.pieces[blocker.id].tile).toBe("1,0");
      expect(next.battle).toBeUndefined();
    });

    it("combat costs one point and survivors can continue through the cleared route", () => {
      let { s, mover, blocker } = corridor();
      s = run(s, { type: "move", ids: [mover.id], to: "1,0" });
      expect(s.battle?.target).toBe("1,0");
      s = run(s, chooseAIAction(s));
      expect(s.pieces[blocker.id]).toBeUndefined();
      expect(s.pieces[mover.id].tile).toBe("1,0");
      expect(s.pieces[mover.id].moved).toBe(1);
      expect(s.pieces[mover.id].acted).toBe(false);
      expect(moveTargets(s, [mover.id])["2,0"]).toEqual(["2,0"]);
      s = run(s, { type: "move", ids: [mover.id], to: "2,0" });
      expect(s.pieces[mover.id].tile).toBe("2,0");
    });

    it("allows passage through its own units", () => {
      const { s, mover, blocker } = corridor();
      blocker.owner = 0;
      expect(moveTargets(s, [mover.id])["2,0"]).toEqual(["1,0", "2,0"]);
      const next = run(s, { type: "move", ids: [mover.id], to: "2,0" });
      expect(next.pieces[mover.id].tile).toBe("2,0");
      expect(next.battle).toBeUndefined();
    });
  });
}
