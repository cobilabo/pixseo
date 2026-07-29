export { safeToDate } from './date-utils';
import { Timestamp } from 'firebase/firestore';

function isFirestoreTimestampLike(obj: object): boolean {
  if (obj instanceof Timestamp) return true;
  const v = obj as { toDate?: unknown; seconds?: unknown; nanoseconds?: unknown };
  return (
    typeof v.toDate === 'function' &&
    typeof v.seconds === 'number' &&
    typeof v.nanoseconds === 'number'
  );
}

export function removeUndefinedDeep(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (obj instanceof Date) return obj;
  if (typeof obj === 'object' && isFirestoreTimestampLike(obj)) return obj;
  if (Array.isArray(obj)) {
    return obj.map(removeUndefinedDeep).filter((v) => v !== undefined);
  }
  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, removeUndefinedDeep(v)])
    );
  }
  return obj;
}

export function toFirestoreTimestamp(value: unknown): Timestamp {
  if (value instanceof Timestamp) return value;
  if (value instanceof Date) return Timestamp.fromDate(value);
  if (typeof value === 'object' && value !== null) {
    const v = value as {
      toDate?: unknown;
      seconds?: unknown;
      _seconds?: unknown;
      nanoseconds?: unknown;
      _nanoseconds?: unknown;
    };
    if (typeof v.toDate === 'function') {
      try {
        return Timestamp.fromDate((v.toDate as () => Date)());
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
      return new Timestamp(seconds, nanos);
    }
  }
  return Timestamp.now();
}
