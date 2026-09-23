/** Keep shared values while displayed, plus a bounded reuse window after the
 * last consumer leaves. Evicting a displayed value would duplicate its memory
 * and preparation work when another consumer arrives on a large map. */
export function retainedCache<T>(idleLimit: number) {
  const entries = new Map<string, { value: T; users: number }>();
  const idle = new Set<string>();
  return {
    retain(key: string, create: () => T | undefined) {
      let entry = entries.get(key);
      if (!entry) {
        const value = create();
        if (value === undefined) return undefined;
        entry = { value, users: 0 };
        entries.set(key, entry);
      }
      idle.delete(key);
      entry.users++;
      let released = false;
      return {
        value: entry.value,
        release() {
          if (released) return;
          released = true;
          if (--entry.users > 0) return;
          idle.add(key);
          while (idle.size > idleLimit) {
            const oldest = idle.values().next().value!;
            idle.delete(oldest);
            entries.delete(oldest);
          }
        },
      };
    },
  };
}
