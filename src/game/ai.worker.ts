import { chooseAIOrders } from "./ai-orders";
import { type Game } from "./types";
self.onmessage = (event: MessageEvent<{ state: Game; request: number }>) => {
  try {
    const started = performance.now();
    const commands = chooseAIOrders(event.data.state);
    self.postMessage({
      request: event.data.request,
      command: commands[0],
      commands,
      ms: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      request: event.data.request,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
  }
};
