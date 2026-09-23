import type { AIRequest, AIReply } from "./ai-session";
import type { Game, Piece } from "./types";

export type AIInput = AIRequest | AIUpload;
type AIUpload =
  | (Omit<AIRequest, "state" | "baseRequest"> & {
      upload: "start";
      state: Game;
      pieceCount: number;
    })
  | { upload: "pieces"; request: number; offset: number; pieces: Piece[] }
  | { upload: "ready"; request: number };

/** Assemble one initial snapshot without exposing a partial army to planning.
 * Later requests still use AISession's existing published-state token. */
export class AIInputQueue {
  private rejected?: number;
  private pending?: {
    message: AIRequest & { state: Game };
    count: number;
    received: number;
  };
  constructor(private handle: (request: AIRequest) => AIReply) {}

  receive(message: AIInput): AIReply | undefined {
    if (!("upload" in message)) {
      this.pending = undefined;
      this.rejected = undefined;
      return this.handle(message);
    }
    if (message.upload === "start") {
      // Stale packets cannot replace a newer transfer already in progress.
      if (this.pending && message.request < this.pending.message.request)
        return this.resync(message.request);
      this.pending = undefined;
      const { upload: _, pieceCount, ...request } = message;
      if (
        !Number.isSafeInteger(pieceCount) ||
        pieceCount < 0 ||
        !request.state?.pieces ||
        typeof request.state.pieces !== "object" ||
        Array.isArray(request.state.pieces) ||
        Object.keys(request.state.pieces).length
      )
        return this.resync(message.request);
      this.rejected = undefined;
      this.pending = { message: request, count: pieceCount, received: 0 };
      return;
    }
    const pending = this.pending;
    if (!pending || pending.message.request !== message.request)
      return this.resync(message.request);
    if (message.upload === "pieces") {
      if (
        message.offset !== pending.received ||
        !Array.isArray(message.pieces) ||
        message.pieces.length === 0 ||
        pending.received + message.pieces.length > pending.count
      )
        return this.reject(message.request);
      const records = pending.message.state.pieces;
      for (const piece of message.pieces) {
        if (
          !piece ||
          typeof piece.id !== "string" ||
          !piece.id ||
          ["__proto__", "constructor", "prototype"].includes(piece.id) ||
          Object.hasOwn(records, piece.id)
        )
          return this.reject(message.request);
        records[piece.id] = piece;
      }
      pending.received += message.pieces.length;
      return;
    }
    this.pending = undefined;
    if (message.upload !== "ready" || pending.received !== pending.count)
      return this.resync(message.request);
    return this.handle(pending.message);
  }

  private reject(request: number): AIReply | undefined {
    this.pending = undefined;
    return this.resync(request);
  }

  private resync(request: number): AIReply | undefined {
    // Several already-posted chunks can follow a failed transfer. Report it
    // once; repeated resync replies must not cancel the replacement upload.
    if (this.rejected === request) return;
    this.rejected = request;
    return { request, resync: true };
  }
}
