/**
 * Null/Undefined Safety Utilities
 * Provides consistent patterns for handling null and undefined values
 */

/**
 * Check if a value is null or undefined
 */
export function isNullish<T>(value: T | null | undefined): value is null | undefined {
  return value === null || value === undefined;
}

/**
 * Check if a value is NOT null or undefined
 */
export function isNotNullish<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

/**
 * Safely access nested properties with null coalescing
 * @example
 * const name = safeGet(user, 'profile.name', 'Unknown');
 */
export function safeGet<T = any>(
  obj: any,
  path: string,
  defaultValue?: T
): T | undefined {
  try {
    const value = path.split('.').reduce((current, prop) => current?.[prop], obj);
    return isNotNullish(value) ? value : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Safely access array elements
 */
export function safeGetArray<T>(
  arr: T[] | null | undefined,
  index: number,
  defaultValue?: T
): T | undefined {
  if (!Array.isArray(arr) || index < 0 || index >= arr.length) {
    return defaultValue;
  }
  return arr[index] ?? defaultValue;
}

/**
 * Safely get first element of array
 */
export function safeFirst<T>(
  arr: T[] | null | undefined,
  defaultValue?: T
): T | undefined {
  return safeGetArray(arr, 0, defaultValue);
}

/**
 * Safely get last element of array
 */
export function safeLast<T>(
  arr: T[] | null | undefined,
  defaultValue?: T
): T | undefined {
  if (!Array.isArray(arr) || arr.length === 0) {
    return defaultValue;
  }
  return arr[arr.length - 1] ?? defaultValue;
}

/**
 * Filter out null/undefined values from array
 */
export function compact<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter(isNotNullish);
}

/**
 * Map array with null safety
 */
export function safeMap<T, U>(
  arr: T[] | null | undefined,
  fn: (item: T, index: number) => U | null | undefined
): U[] {
  if (!Array.isArray(arr)) {
    return [];
  }
  return compact(arr.map(fn));
}

/**
 * Safely access object property with type guard
 */
export function safeProperty<T extends object, K extends keyof T>(
  obj: T | null | undefined,
  key: K,
  defaultValue?: T[K]
): T[K] | undefined {
  if (isNullish(obj)) {
    return defaultValue;
  }
  return obj[key] ?? defaultValue;
}

/**
 * Coalesce multiple values, returning first non-nullish
 */
export function coalesce<T>(...values: (T | null | undefined)[]): T | undefined {
  return values.find(isNotNullish);
}

/**
 * Safely parse JSON with fallback
 */
export function safeParseJSON<T = any>(
  json: string | null | undefined,
  defaultValue?: T
): T | undefined {
  if (!json) {
    return defaultValue;
  }
  try {
    return JSON.parse(json);
  } catch {
    return defaultValue;
  }
}

/**
 * Safely stringify value
 */
export function safeStringify(value: any, defaultValue: string = ''): string {
  try {
    return JSON.stringify(value);
  } catch {
    return defaultValue;
  }
}

/**
 * Ensure value is array
 */
export function ensureArray<T>(value: T | T[] | null | undefined): T[] {
  if (Array.isArray(value)) {
    return value;
  }
  if (isNotNullish(value)) {
    return [value];
  }
  return [];
}

/**
 * Safely check if array has items
 */
export function hasItems<T>(arr: T[] | null | undefined): arr is T[] {
  return Array.isArray(arr) && arr.length > 0;
}

/**
 * Safely check if object is empty
 */
export function isEmpty(obj: any): boolean {
  if (isNullish(obj)) {
    return true;
  }
  if (Array.isArray(obj)) {
    return obj.length === 0;
  }
  if (typeof obj === 'object') {
    return Object.keys(obj).length === 0;
  }
  if (typeof obj === 'string') {
    return obj.trim().length === 0;
  }
  return false;
}

/**
 * Safely check if object is not empty
 */
export function isNotEmpty(obj: any): boolean {
  return !isEmpty(obj);
}

/**
 * Type guard for checking if value exists and is of specific type
 */
export function isOfType<T>(value: any, type: string): value is T {
  return isNotNullish(value) && typeof value === type;
}

/**
 * Safely execute function with null safety
 */
export function safeExecute<T>(
  fn: () => T,
  defaultValue?: T,
  onError?: (error: Error) => void
): T | undefined {
  try {
    return fn();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return defaultValue;
  }
}

/**
 * Safely execute async function with null safety
 */
export async function safeExecuteAsync<T>(
  fn: () => Promise<T>,
  defaultValue?: T,
  onError?: (error: Error) => void
): Promise<T | undefined> {
  try {
    return await fn();
  } catch (error) {
    if (onError && error instanceof Error) {
      onError(error);
    }
    return defaultValue;
  }
}

/**
 * Create a null-safe chain for accessing nested properties
 */
export class NullSafeChain<T> {
  constructor(private value: T | null | undefined) {}

  get<K extends keyof T>(key: K): NullSafeChain<T[K]> {
    if (isNullish(this.value)) {
      return new NullSafeChain(undefined) as NullSafeChain<T[K]>;
    }
    return new NullSafeChain((this.value as any)[key]);
  }

  getOrDefault<D>(defaultValue: D): T | D {
    return isNotNullish(this.value) ? this.value : defaultValue;
  }

  getOrNull(): T | null {
    return this.value ?? null;
  }

  getOrUndefined(): T | undefined {
    return (this.value === null ? undefined : this.value) as T | undefined;
  }

  map<U>(fn: (value: T) => U): NullSafeChain<U> {
    if (isNullish(this.value)) {
      return new NullSafeChain(undefined) as NullSafeChain<U>;
    }
    return new NullSafeChain(fn(this.value));
  }

  filter(predicate: (value: T) => boolean): NullSafeChain<T | undefined> {
    if (isNullish(this.value) || !predicate(this.value)) {
      return new NullSafeChain(undefined);
    }
    return new NullSafeChain(this.value);
  }
}

/**
 * Create a null-safe chain
 */
export function chain<T>(value: T | null | undefined): NullSafeChain<T> {
  return new NullSafeChain(value);
}

