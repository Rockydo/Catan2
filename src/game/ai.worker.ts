import { chooseAIAction } from "./ai";
import { type Game } from "./types";
self.onmessage = (event: MessageEvent<{ state: Game; request: number }>) => {
  try {
    const started = performance.now();
    const command = chooseAIAction(event.data.state);
    self.postMessage({
      request: event.data.request,
      command,
      ms: performance.now() - started,
    });
  } catch (error) {
    self.postMessage({
      request: event.data.request,
      error: error instanceof Error ? error.message : String(error),
    });
  }
};
