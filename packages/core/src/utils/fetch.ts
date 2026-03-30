import { type ScoringError, ScoringErrorCode, scoringError } from '../types/errors.js';
import { type Result, ok, err } from '../types/result.js';

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  baseDelayMs: 500,
  maxDelayMs: 10000,
};

export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  retryOptions: Partial<RetryOptions> = {},
): Promise<Result<Response, ScoringError>> {
  const { maxRetries, baseDelayMs, maxDelayMs } = {
    ...DEFAULT_RETRY_OPTIONS,
    ...retryOptions,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        signal: options.signal ?? AbortSignal.timeout(30000),
      });

      if (response.ok) {
        return ok(response);
      }

      if (response.status >= 400 && response.status < 500 && response.status !== 429) {
        return err(
          scoringError(
            ScoringErrorCode.DataFetchFailed,
            `HTTP ${response.status}: ${response.statusText} for ${url}`,
          ),
        );
      }

      lastError = new Error(`HTTP ${response.status}: ${response.statusText}`);
    } catch (error) {
      lastError = error;
    }

    if (attempt < maxRetries) {
      const delayMs = Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
      await sleep(delayMs);
    }
  }

  return err(
    scoringError(
      ScoringErrorCode.DataFetchFailed,
      `Failed after ${maxRetries + 1} attempts: ${url}`,
      lastError,
    ),
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
