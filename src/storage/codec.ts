import { deserialize, serializePacked } from "../game/save";
import type { Game } from "../game/types";

// Limit expanded input too: a small compressed file can conceal a huge payload.
export const MAX_SAVE_BYTES = 128_000_000;
export type SaveInput = string | Uint8Array<ArrayBuffer>;
export async function compress(text: string): Promise<Uint8Array<ArrayBuffer>> {
  const blob = new Blob([text]);
  // Include the envelope and table metadata in the decompressed byte budget.
  // Never acknowledge a write that our loader would have to reject.
  if (blob.size >= MAX_SAVE_BYTES)
    throw new Error("This save exceeds the 128 MB expanded limit.");
  return new Uint8Array(
    await new Response(
      blob.stream().pipeThrough(new CompressionStream("gzip")),
    ).arrayBuffer(),
  );
}
export async function expand(
  bytes: Uint8Array<ArrayBuffer>,
  maxBytes = MAX_SAVE_BYTES,
): Promise<string> {
  const reader = new Blob([bytes])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"))
    .getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  const parts: string[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes)
        throw new Error("This save exceeds the 128 MB expanded limit.");
      parts.push(decoder.decode(value, { stream: true }));
    }
    parts.push(decoder.decode());
    return parts.join("");
  } finally {
    await reader.cancel();
  }
}
export async function exportCompact(game: Game): Promise<string> {
  const bytes = await compress(serializePacked(game));
  const parts: string[] = [];
  // Bounded chunks, without spreading a large array into a function call.
  for (let start = 0; start < bytes.length; start += 16384) {
    let part = "";
    for (let i = start; i < Math.min(start + 16384, bytes.length); i++)
      part += String.fromCharCode(bytes[i]);
    parts.push(part);
  }
  return JSON.stringify({
    format: "catane-frontiers-compressed",
    version: 1,
    encoding: "gzip-base64",
    data: btoa(parts.join("")),
  });
}
/** Portable binary archive. The gzip payload includes the versioned envelope
 * and checksum; avoid base64's extra third and its intermediate text copies. */
export async function exportArchive(
  game: Game,
): Promise<Uint8Array<ArrayBuffer>> {
  return compress(serializePacked(game));
}
export async function unpackSave(input: SaveInput): Promise<string> {
  if (typeof input !== "string") {
    if (input.byteLength > MAX_SAVE_BYTES)
      throw new Error("Save files must be under 128 MB.");
    // Detect content, not the extension, so renamed files and old JSON exports
    // still import through the same file picker.
    if (input[0] === 0x1f && input[1] === 0x8b) return expand(input);
    input = new TextDecoder("utf-8", { fatal: true }).decode(input);
  }
  const text = input;
  if (text.length > MAX_SAVE_BYTES)
    throw new Error("Save files must be under 128 MB.");
  // The normal legacy header avoids parsing a large game twice.
  if (/^\s*\{\s*"format"\s*:\s*"catane-frontiers(?:-packed)?"/.test(text))
    return text;
  // Ordinary historical JSON files remain supported without re-encoding.
  if (!/^\s*\{\s*"format"\s*:\s*"catane-frontiers-compressed"/.test(text)) {
    const candidate = JSON.parse(text);
    if (candidate?.format !== "catane-frontiers-compressed") return text;
  }
  const data = JSON.parse(text);
  if (
    data.version !== 1 ||
    data.encoding !== "gzip-base64" ||
    typeof data.data !== "string"
  )
    throw new Error("This is not a supported Catane save.");
  const binary = atob(data.data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return expand(bytes);
}

export async function importSave(input: SaveInput): Promise<Game> {
  return deserialize(await unpackSave(input));
}
