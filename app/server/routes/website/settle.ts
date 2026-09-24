/** Rejects with a timeout error if `promise` has not settled within `ms`. */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timeout after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      (e) => {
        clearTimeout(timer);
        reject(e);
      }
    );
  });
}

/** Resolves to `undefined` when `promise` rejects or misses the `ms` deadline. */
export async function settle<T>(promise: Promise<T>, ms: number): Promise<T | undefined> {
  try {
    return await withTimeout(promise, ms);
  } catch {
    return undefined;
  }
}
