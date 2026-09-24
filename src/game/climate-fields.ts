import { coord, key, randomAt } from "./world";
const clamp = (n: number) => Math.max(0, Math.min(1, n));
export function physicalField(
  seed: string,
  q: number,
  r: number,
  scale: number,
  stream: string,
) {
  const x = q / scale,
    y = r / scale,
    a = Math.floor(x),
    b = Math.floor(y),
    smooth = (n: number) => n * n * (3 - 2 * n),
    u = smooth(x - a),
    v = smooth(y - b);
  const at = (i: number, j: number) => randomAt(seed, key(i, j), stream);
  return (
    (at(a, b) * (1 - u) + at(a + 1, b) * u) * (1 - v) +
    (at(a, b + 1) * (1 - u) + at(a + 1, b + 1) * u) * v
  );
}
/** Temperature and moisture potential, independent of relief and climate labels.
 * Shared by landforms and climate selection to avoid generation-order feedback. */
export function regionalClimateFields(seed: string, id: string) {
  const [q, r] = coord(id);
  return {
    temperature: clamp(
      (physicalField(seed, q, r, 11, "regional-temperature") - 0.5) * 1.6 + 0.5,
    ),
    moisture: clamp(
      (physicalField(seed, q, r, 11, "regional-moisture") - 0.5) * 1.6 + 0.5,
    ),
  };
}
