import { describe, it, expect } from 'vitest';
import { ok, err } from '../src/types/result.js';
import { ScoringErrorCode, scoringError } from '../src/types/errors.js';

describe('Result type', () => {
  it('creates ok results', () => {
    const result = ok(42);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBe(42);
    }
  });

  it('creates err results', () => {
    const error = scoringError(ScoringErrorCode.InvalidCoordinate, 'Bad coord');
    const result = err(error);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe(ScoringErrorCode.InvalidCoordinate);
      expect(result.error.message).toBe('Bad coord');
    }
  });

  it('creates errors with causes', () => {
    const cause = new Error('network failure');
    const error = scoringError(ScoringErrorCode.DataFetchFailed, 'Fetch failed', cause);
    expect(error.cause).toBe(cause);
  });
});
