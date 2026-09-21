/** Collections belong on the heap, not in a function's argument list. These
 * scans have constant call-stack usage regardless of campaign size. */
export function minValue(values: Iterable<number>): number {
  let result = Infinity;
  for (const value of values) result = Math.min(result, value);
  return result;
}

export function maxValue(values: Iterable<number>): number {
  let result = -Infinity;
  for (const value of values) result = Math.max(result, value);
  return result;
}

/** Append in order without one function argument per element. */
export function appendValues<T>(target: T[], values: Iterable<T>): number {
  const source = values === target ? target.slice() : values;
  for (const value of source) target.push(value);
  return target.length;
}
