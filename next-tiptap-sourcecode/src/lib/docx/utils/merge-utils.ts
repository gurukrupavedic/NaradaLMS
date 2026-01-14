/**
 * Checks whether a value is a plain object (not an array, function, etc.)
 *
 * @example
 * isObject({}) // true
 * isObject([]) // false
 * isObject(null) // false
 */
export function isObject(value: any): value is object {
  if (typeof value !== "object" || value === null) return false;
  const proto = Object.getPrototypeOf(value);
  return proto === null || proto === Object.prototype;
}

/**
 * Transforms an array into an object keyed by a specific property.
 *
 * @example
 * keyBy([{ id: 1, name: 'A' }, { id: 2, name: 'B' }], 'id')
 * // => { '1': { id: 1, name: 'A' }, '2': { id: 2, name: 'B' } }
 */
export function keyBy<T extends Record<string, any>, K extends keyof T>(
  arr: T[],
  key: K
): Record<string, T> {
  return arr.reduce(
    (acc, item) => {
      const keyValue = item[key];
      if (keyValue != null) {
        acc[String(keyValue)] = item;
      }
      return acc;
    },
    {} as Record<string, T>
  );
}

/**
 * Deeply merges two objects.
 * - Merges nested objects recursively
 * - Merges arrays by concatenation (or custom strategy)
 * - Does NOT mutate the original objects
 *
 * @example
 * deepMerge({ a: 1, b: { c: 2 } }, { b: { d: 3 } })
 * // => { a: 1, b: { c: 2, d: 3 } }
 */
export function deepMerge<T extends Record<string, any>>(
  target: T,
  source: T | undefined,
  options?: { mergeArray?: (target: any[], source: any[]) => any[] }
): T {
  if (!isObject(source)) return target;

  const result = { ...target };

  (Object.keys(source) as (keyof T)[]).forEach((key) => {
    const targetValue = target[key];
    const sourceValue = source[key];

    if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
      const merged =
        typeof options?.mergeArray === "function"
          ? options.mergeArray(targetValue, sourceValue)
          : [...targetValue, ...sourceValue];
      result[key] = merged as T[keyof T];
    } else if (isObject(targetValue) && isObject(sourceValue)) {
      result[key] = deepMerge(targetValue, sourceValue, options);
    } else {
      result[key] = sourceValue;
    }
  });

  return result;
}

/**
 * Creates a merge function that merges two arrays of objects by a specific key.
 * If two objects share the same key, they are deep-merged.
 *
 * @example
 * const mergeById = mergeArrayByKey('id');
 * mergeById([{id: 1, a: 1}], [{id: 1, b: 2}, {id: 2, c: 3}])
 * // => [{id: 1, a: 1, b: 2}, {id: 2, c: 3}]
 */
export function mergeArrayByKey<T extends Record<string, any>>(key: keyof T) {
  return (target: T[], source: T[]): T[] => {
    const result = [...target];

    for (const value of source) {
      if (isObject(value) && key in value) {
        const index = result.findIndex((item) => item[key] === value[key]);
        if (index !== -1) {
          result[index] = deepMerge(result[index], value);
        } else {
          result.push(value);
        }
      } else {
        result.push(value);
      }
    }

    return result;
  };
}
