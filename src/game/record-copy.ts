type Records<T> = Record<string, T>;

function put<T>(target: Records<T>, key: string, value: T) {
  // Game IDs reject this name, but copying plain data must not invoke the
  // legacy prototype setter. Match object spread and Object.fromEntries.
  if (key === "__proto__")
    Object.defineProperty(target, key, {
      value,
      enumerable: true,
      writable: true,
      configurable: true,
    });
  else target[key] = value;
}

/** Copy a plain JSON record dictionary without object spread or an array of
 * entry tuples. Values stay shared; callers detach a record before editing it.
 * A patch may replace values, or supply the exact post-change key order when
 * records were inserted/deleted/reordered. An explicit undefined is a value.
 * Only own enumerable string keys are data, as in a serialized campaign. */
export function copyRecords<T>(
  source: Records<T>,
  patch?: { values: Records<T>; keys?: readonly string[] },
): Records<T> {
  const result: Records<T> = {};
  if (patch?.keys) {
    for (const key of patch.keys)
      put(
        result,
        key,
        Object.hasOwn(patch.values, key) ? patch.values[key] : source[key],
      );
  } else {
    for (const key of Object.keys(source)) put(result, key, source[key]);
    if (patch)
      for (const key of Object.keys(patch.values))
        put(result, key, patch.values[key]);
  }
  return result;
}
