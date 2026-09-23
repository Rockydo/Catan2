import { AISession } from "./ai-session";
import { AIInputQueue, type AIInput } from "./ai-input";
const session = new AISession();
const input = new AIInputQueue((message) => session.handle(message));
self.onmessage = (event: MessageEvent<AIInput>) => {
  const reply = input.receive(event.data);
  if (reply) self.postMessage(reply);
};
