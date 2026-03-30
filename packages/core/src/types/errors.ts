export enum ScoringErrorCode {
  DataFetchFailed = 'DATA_FETCH_FAILED',
  InvalidCoordinate = 'INVALID_COORDINATE',
  InvalidWeights = 'INVALID_WEIGHTS',
  Timeout = 'TIMEOUT',
  Unknown = 'UNKNOWN',
}

export interface ScoringError {
  code: ScoringErrorCode;
  message: string;
  cause?: unknown;
}

export function scoringError(
  code: ScoringErrorCode,
  message: string,
  cause?: unknown,
): ScoringError {
  return { code, message, cause };
}
