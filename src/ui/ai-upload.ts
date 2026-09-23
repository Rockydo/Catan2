import type { AIRequest } from "../game/ai-session";
import type { AIInput } from "../game/ai-input";
import { allPieces } from "../game/selectors";

const CHUNK_SIZE = 2048;
const SLICE_MS = 6;

/** Published immutable snapshots only. Bound each structured clone and yield
 * between slices so Pause, map input and painting can run during a big upload.
 * Continuations and small armies keep the ordinary single-message path. */
export async function uploadAIRequest(
  worker: { postMessage: (message: AIInput) => void },
  message: AIRequest,
  active: () => boolean,
  now = () => performance.now(),
  yieldToUI = () => new Promise<void>((resolve) => setTimeout(resolve, 0)),
): Promise<void> {
  if (!active()) return;
  const units = message.state ? allPieces(message.state) : undefined;
  if (!units || units.length <= CHUNK_SIZE * 8) {
    worker.postMessage(message);
    return;
  }
  const { state, baseRequest: _, ...flags } = message;
  let slice = now();
  let sent = 0;
  worker.postMessage({
    ...flags,
    upload: "start",
    state: { ...state!, pieces: {} },
    pieceCount: units.length,
  });
  for (let offset = 0; offset < units.length; offset += CHUNK_SIZE) {
    if (!active()) return;
    worker.postMessage({
      upload: "pieces",
      request: message.request,
      offset,
      pieces: units.slice(offset, offset + CHUNK_SIZE),
    });
    if (++sent >= 8 || now() - slice >= SLICE_MS) {
      await yieldToUI();
      if (!active()) return;
      slice = now();
      sent = 0;
    }
  }
  if (active())
    worker.postMessage({ upload: "ready", request: message.request });
}
