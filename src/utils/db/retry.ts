const TRANSIENT_DB_ERROR_PATTERN =
  /fetch failed|etimedout|econnreset|socket hang up|websocket|network/i;

export const isTransientDbError = (error: unknown): boolean => {
  if (!error) return false;

  if (error instanceof Error) {
    if (TRANSIENT_DB_ERROR_PATTERN.test(error.message)) return true;
    if ("cause" in error) return isTransientDbError(error.cause);
  }

  if (typeof error === "object" && error !== null) {
    const record = error as Record<string, unknown>;
    if (typeof record.code === "string" && record.code === "ETIMEDOUT") {
      return true;
    }
    if ("sourceError" in record) {
      return isTransientDbError(record.sourceError);
    }
    if ("kError" in record) {
      return isTransientDbError(record.kError);
    }
    if (Array.isArray(record.errors)) {
      return record.errors.some(isTransientDbError);
    }
  }

  return false;
};

export async function withDbRetry<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (attempt === maxAttempts || !isTransientDbError(error)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt));
    }
  }

  throw lastError;
}
