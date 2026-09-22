import { AISession, type AIRequest } from "./ai-session";
const session = new AISession();
self.onmessage = (event: MessageEvent<AIRequest>) => {
  self.postMessage(session.handle(event.data));
};
