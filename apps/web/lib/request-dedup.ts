const pendingRequests = new Map<string, Promise<any>>();

export async function deduplicate<T>(
  key: string,
  fn: () => Promise<T>,
  ttl: number = 5000
): Promise<T> {
  const existing = pendingRequests.get(key);
  if (existing) {
    return existing;
  }

  const promise = fn();
  pendingRequests.set(key, promise);

  promise.finally(() => {
    setTimeout(() => {
      pendingRequests.delete(key);
    }, ttl);
  });

  return promise;
}
