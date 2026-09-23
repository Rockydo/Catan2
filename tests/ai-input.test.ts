import { expect, it, vi } from "vitest";
import { AIInputQueue, type AIInput } from "../src/game/ai-input";
import { AISession, type AIRequest } from "../src/game/ai-session";
import { uploadAIRequest } from "../src/ui/ai-upload";
import { applySnapshotDelta } from "../src/game/snapshot-delta";
import { prepareGameView } from "../src/game/selectors";
import { fishingFixture } from "./maritime-fixture";
import { piece } from "./helpers";

function army(count = 20_000) {
  const { s, water } = fishingFixture();
  for (let i = 0; i < count; i++) piece(s, water, 0, "fishing", 1 + (i % 4));
  return s;
}

it("assembles the complete snapshot in exact order before planning, without mutating the source", async () => {
  const game = army();
  const first = Object.values(game.pieces)[0];
  Object.assign(first, {
    future: { orders: ["Île 雪", { a: 1 }] },
    absent: undefined,
  });
  delete game.pieces[first.id];
  game.pieces[first.id] = first;
  prepareGameView(game);
  const before = structuredClone(game),
    snapshots: AIRequest[] = [],
    packets: AIInput[] = [];
  const receiver = new AIInputQueue((message) => {
    snapshots.push(message);
    return { request: message.request };
  });
  let clock = 0;
  const yielded = vi.fn(async () => {
    expect(snapshots).toHaveLength(0);
  });
  await uploadAIRequest(
    {
      postMessage(message) {
        packets.push(message);
        receiver.receive(structuredClone(message));
        clock += 2;
      },
    },
    { state: game, request: 7, delta: true, batchMoves: true },
    () => true,
    () => clock,
    yielded,
  );
  expect(yielded).toHaveBeenCalled();
  expect(snapshots).toHaveLength(1);
  expect(snapshots[0]).toStrictEqual({
    request: 7,
    delta: true,
    batchMoves: true,
    state: game,
  });
  expect(JSON.stringify(snapshots[0].state)).toBe(JSON.stringify(game));
  expect(Object.keys(snapshots[0].state!.pieces)).toEqual(
    Object.keys(game.pieces),
  );
  for (const packet of packets)
    if ("upload" in packet && packet.upload === "pieces")
      expect(packet.pieces.length).toBeLessThanOrEqual(2048);
  (snapshots[0].state!.pieces[first.id] as any).future.orders.push(2);
  expect(game).toStrictEqual(before);
});

it("keeps small snapshots and token continuations on the direct path", async () => {
  const worker = { postMessage: vi.fn() },
    yieldToUI = vi.fn();
  for (const message of [
    { request: 1, state: army(100) },
    { request: 2, baseRequest: 1, delta: true },
  ]) {
    await uploadAIRequest(
      worker,
      message,
      () => true,
      () => 0,
      yieldToUI,
    );
    expect(worker.postMessage).toHaveBeenLastCalledWith(message);
  }
  expect(worker.postMessage).toHaveBeenCalledTimes(2);
  expect(yieldToUI).not.toHaveBeenCalled();
});

it("cancels a partial upload before the ready packet and starts a replacement cleanly", async () => {
  const state = army(),
    source = JSON.stringify(state),
    calls: AIRequest[] = [];
  const receiver = new AIInputQueue((message) => {
    calls.push(message);
    return { request: message.request };
  });
  const messages: AIInput[] = [];
  let active = true,
    clock = 0;
  const worker = {
    postMessage(message: AIInput) {
      messages.push(message);
      receiver.receive(structuredClone(message));
      clock += 7;
    },
  };
  await uploadAIRequest(
    worker,
    { request: 1, state },
    () => active,
    () => clock,
    async () => {
      active = false;
    },
  );
  expect(messages.length).toBeLessThan(4);
  expect(calls).toHaveLength(0);
  const count = messages.length;
  await uploadAIRequest(worker, { request: 2, state }, () => false);
  expect(messages).toHaveLength(count);
  active = true;
  await uploadAIRequest(
    worker,
    { request: 3, state },
    () => active,
    () => clock,
    async () => {},
  );
  expect(calls).toHaveLength(1);
  expect(calls[0].request).toBe(3);
  expect(JSON.stringify(calls[0].state)).toBe(source);
});

it("rejects failed posting without acknowledging or publishing the upload", async () => {
  const worker = {
    postMessage: vi.fn(() => {
      throw Error("Worker unavailable");
    }),
  };
  await expect(
    uploadAIRequest(worker, { request: 1, state: army() }, () => true),
  ).rejects.toThrow("Worker unavailable");
  expect(worker.postMessage).toHaveBeenCalledTimes(1);
});

it("rejects missing, reordered, repeated and incomplete chunks and protects newer requests", () => {
  const s = army(4),
    units = Object.values(s.pieces),
    handle = vi.fn((message: AIRequest) => ({ request: message.request }));
  const queue = new AIInputQueue(handle);
  const start = (request: number) =>
    queue.receive({
      request,
      upload: "start",
      state: { ...s, pieces: {} },
      pieceCount: units.length,
    });
  const chunk = (request: number, offset = 0, pieces = units) =>
    queue.receive({ upload: "pieces", request, offset, pieces });
  expect(chunk(1)).toEqual({ request: 1, resync: true });
  start(2);
  expect(chunk(2, 1)).toEqual({ request: 2, resync: true });
  expect(chunk(2)).toBeUndefined();
  start(3);
  chunk(3, 0, [units[0]]);
  expect(chunk(3, 1, [units[0]])).toEqual({ request: 3, resync: true });
  start(4);
  expect(queue.receive({ request: 4, upload: "ready" })).toEqual({
    request: 4,
    resync: true,
  });
  start(10);
  expect(start(9)).toEqual({ request: 9, resync: true });
  expect(chunk(9)).toBeUndefined();
  expect(queue.receive({ request: 9, upload: "ready" })).toBeUndefined();
  expect(handle).not.toHaveBeenCalled();
  chunk(10);
  expect(queue.receive({ request: 10, upload: "ready" })).toEqual({
    request: 10,
  });
  expect(handle).toHaveBeenCalledTimes(1);
  expect(handle.mock.calls[0][0].state).toStrictEqual(s);
});

it.each(["__proto__", "constructor", "prototype", ""])(
  'rejects unsafe troop keys: "%s"',
  (id) => {
    const s = army(1),
      u = Object.values(s.pieces)[0],
      handle = vi.fn();
    const queue = new AIInputQueue(handle);
    queue.receive({
      request: 1,
      upload: "start",
      state: { ...s, pieces: {} },
      pieceCount: 1,
    });
    expect(
      queue.receive({
        request: 1,
        upload: "pieces",
        offset: 0,
        pieces: [{ ...u, id }],
      }),
    ).toEqual({ request: 1, resync: true });
    expect(handle).not.toHaveBeenCalled();
    expect((Object.prototype as any).kind).toBeUndefined();
  },
);

it("preserves actual AI results, published continuations and resynchronization", () => {
  const s = army(30);
  s.phase = "roll";
  s.players[0].control = "standard";
  const original = new AISession(),
    chunked = new AISession();
  const queue = new AIInputQueue((message) => chunked.handle(message, () => 0));
  const message = { request: 1, state: s, delta: true, batchMoves: true };
  const expected = original.handle(structuredClone(message), () => 0);
  queue.receive({
    ...message,
    state: { ...structuredClone(s), pieces: {} },
    upload: "start",
    pieceCount: 30,
  });
  queue.receive({
    request: 1,
    upload: "pieces",
    offset: 0,
    pieces: structuredClone(Object.values(s.pieces)),
  });
  const actual = queue.receive({ request: 1, upload: "ready" });
  expect(actual).toStrictEqual(expected);
  expect(actual?.error).toBeUndefined();
  const continuation = {
    request: 2,
    baseRequest: 1,
    delta: true,
    batchMoves: true,
  };
  expect(queue.receive(continuation)).toStrictEqual(
    original.handle(continuation, () => 0),
  );
  const stale = { request: 3, baseRequest: 1, delta: true };
  expect(queue.receive(stale)).toStrictEqual(original.handle(stale, () => 0));
  const next = applySnapshotDelta(s, actual!.delta!);
  const fresh = { request: 3, state: next, delta: true };
  expect(queue.receive(structuredClone(fresh))).toStrictEqual(
    original.handle(structuredClone(fresh), () => 0),
  );
});
