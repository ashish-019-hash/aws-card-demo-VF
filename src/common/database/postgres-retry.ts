export interface PostgresErrorLike {
  code?: string;
}

const RETRYABLE_CODES = new Set(['40001', '40P01']);

export function isRetryablePostgresError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    typeof (error as PostgresErrorLike).code === 'string' &&
    RETRYABLE_CODES.has((error as PostgresErrorLike).code!)
  );
}

export async function withPostgresRetry<T>(operation: () => Promise<T>, attempts = 3): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (!isRetryablePostgresError(error) || attempt === attempts) throw error;
      await new Promise<void>((resolve) => setTimeout(resolve, Math.min(25 * attempt, 100)));
    }
  }
  throw lastError;
}
