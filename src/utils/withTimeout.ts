export async function withTimeout<T>(promise: Promise<T>, ms = 15000, label?: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      const err = new Error(`Operation timed out after ${ms}ms${label ? `: ${label}` : ''}`);
      (err as any).code = 'ETIMEDOUT';
      reject(err);
    }, ms);
  });
  try {
    const res = await Promise.race([promise, timeoutPromise]);
    return res as T;
  } finally {
    clearTimeout(timeoutId!);
  }
}