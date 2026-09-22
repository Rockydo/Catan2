import { createAIOrderPlanner } from "./ai-orders";
import { snapshotDelta, type SnapshotDelta } from "./snapshot-delta";
import type { Command, Game } from "./types";

export interface AIRequest {
  request: number;
  state?: Game;
  baseRequest?: number;
  delta?: boolean;
}
export interface AIReply {
  request: number;
  command?: Command;
  commands?: Command[];
  state?: Game;
  delta?: SnapshotDelta;
  resync?: true;
  ms?: number;
  error?: string;
  stack?: string;
}
/** One immutable published result per worker. A fresh input always replaces it. */
export class AISession {
  private plan = createAIOrderPlanner(true);
  private latest?: { request: number; state: Game };
  handle(message: AIRequest, now = () => performance.now()): AIReply {
    const started = now();
    const input =
      message.state ??
      (this.latest?.request === message.baseRequest
        ? this.latest?.state
        : undefined);
    if (!input) return { request: message.request, resync: true };
    // A failed calculation must not leave a reusable continuation token.
    this.latest = undefined;
    try {
      const { commands, state } = this.plan(input, now);
      const result = message.delta
        ? { delta: snapshotDelta(input, state) }
        : { state };
      this.latest = { request: message.request, state };
      return {
        request: message.request,
        command: commands[0],
        commands,
        ...result,
        ms: now() - started,
      };
    } catch (error) {
      return {
        request: message.request,
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      };
    }
  }
}
