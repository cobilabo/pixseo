/** Convert Firestore Timestamp / Date / {seconds,nanoseconds} to Date safely */
export function safeToDate(value: unknown): Date {
  if (!value) return new Date();
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? new Date() : value;
  }
  if (typeof value === 'object') {
    const v = value as {
      toDate?: unknown;
      seconds?: unknown;
      nanoseconds?: unknown;
      _seconds?: unknown;
      _nanoseconds?: unknown;
    };
    if (typeof v.toDate === 'function') {
      try {
        const d = (v.toDate as () => Date)();
        if (d instanceof Date && !Number.isNaN(d.getTime())) return d;
      } catch {
        // fall through
      }
    }
    const seconds =
      typeof v.seconds === 'number'
        ? v.seconds
        : typeof v._seconds === 'number'
          ? v._seconds
          : null;
    if (seconds !== null) {
      const nanos =
        typeof v.nanoseconds === 'number'
          ? v.nanoseconds
          : typeof v._nanoseconds === 'number'
            ? v._nanoseconds
            : 0;
      return new Date(seconds * 1000 + Math.floor(nanos / 1e6));
    }
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const d = new Date(value);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}
