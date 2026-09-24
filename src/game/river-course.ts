import { neighbors } from "./world";

/** Remove a course's side-by-side hairpins, and join an existing lower channel
 * at first contact. All selected links remain neighboring, downhill steps. */
export function convergeRiverCourse(
  course: ReadonlyMap<string, string>,
  existing: ReadonlyMap<string, string>,
  elevation: (id: string) => number,
): { course: Map<string, string>; joined: boolean } {
  const result = new Map<string, string>();
  const ids = [...course.keys()];
  if (!ids.length) return { course: result, joined: false };
  ids.push(course.get(ids[ids.length - 1])!);
  const order = new Map(ids.map((id, i) => [id, i]));
  let at = 0;
  while (at < ids.length - 1) {
    const id = ids[at];
    if (existing.has(id)) return { course: result, joined: true };
    const nearby = neighbors(id);
    let join: string | undefined,
      low = elevation(id);
    for (const n of nearby) {
      if (!existing.has(n)) continue;
      const h = elevation(n);
      if (h < low) {
        join = n;
        low = h;
      }
    }
    if (join) {
      result.set(id, join);
      return { course: result, joined: true };
    }
    // The latest adjacent step removes a loop without inventing terrain.
    let next = at + 1;
    for (const n of nearby) {
      const index = order.get(n);
      if (index !== undefined && index > next && elevation(n) < elevation(id))
        next = index;
    }
    result.set(id, ids[next]);
    at = next;
  }
  return { course: result, joined: false };
}
