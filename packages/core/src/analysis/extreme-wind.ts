import type { MonthlyWindHistory, DailyWindData } from '../types/datasources.js';
import type { ExtremeWindResult } from '../types/wind-assessment.js';

/**
 * Estimate extreme wind speeds using Gumbel Type I distribution fitted to
 * annual maximum wind speeds.
 *
 * Extracts annual maxima from historical data and fits the Gumbel distribution
 * to estimate 50-year and 1-year return period wind speeds.
 *
 * @param history - Monthly or daily wind history data
 * @param heightKey - Which height to analyse: 'ws10m' or 'ws50m' (default: 'ws50m')
 * @returns Extreme wind estimation with return period speeds and IEC classification
 */
export function estimateExtremeWind(
  history: MonthlyWindHistory | DailyWindData,
  heightKey: 'ws10m' | 'ws50m' = 'ws50m',
): ExtremeWindResult {
  const annualMaxima = extractAnnualMaxima(history, heightKey);

  if (annualMaxima.length < 5) {
    return insufficientDataResult(annualMaxima, heightKey);
  }

  const speeds = annualMaxima.map((a) => a.maxSpeedMs);

  // Fit Gumbel Type I distribution using method of moments
  const { mu, sigma } = fitGumbel(speeds);

  // Return period wind speeds
  // V_T = mu - sigma * ln(-ln(1 - 1/T))
  const v50 = gumbelQuantile(mu, sigma, 50);
  const v1 = gumbelQuantile(mu, sigma, 1);

  // Determine reference height
  const refHeight = heightKey === 'ws50m' ? 50 : 10;

  // IEC wind class based on Vref (50-year return at hub height)
  // For now, using the reference height value directly
  // Class I: Vref = 50 m/s, II: 42.5, III: 37.5
  const iecWindClass = classifyWindClass(v50);

  // Confidence assessment
  const isMonthly = 'startYear' in history;
  const confidence = assessConfidence(annualMaxima.length, isMonthly);

  const heightLabel = refHeight === 50 ? '50m' : '10m';
  const dataNote = isMonthly
    ? 'Based on monthly mean data (likely underestimates true peak speeds).'
    : 'Based on daily data.';

  return {
    annualMaxima,
    gumbelMu: Math.round(mu * 100) / 100,
    gumbelSigma: Math.round(sigma * 100) / 100,
    v50YearMs: Math.round(v50 * 100) / 100,
    v1YearMs: Math.round(v1 * 100) / 100,
    iecWindClass,
    confidence,
    referenceHeightM: refHeight,
    summary:
      `50-year return wind speed: ${v50.toFixed(1)} m/s at ${heightLabel}. ` +
      `1-year return: ${v1.toFixed(1)} m/s. ` +
      `IEC Wind Class ${iecWindClass}. ` +
      `${dataNote} ` +
      `Based on ${annualMaxima.length} years of data.`,
  };
}

/**
 * Extract annual maximum wind speeds from historical data.
 */
function extractAnnualMaxima(
  data: MonthlyWindHistory | DailyWindData,
  heightKey: 'ws10m' | 'ws50m',
): Array<{ year: number; maxSpeedMs: number }> {
  const yearMaxMap = new Map<number, number>();

  if ('startYear' in data) {
    // MonthlyWindHistory
    for (const rec of data.records) {
      const speed = rec[heightKey];
      const current = yearMaxMap.get(rec.year) ?? 0;
      if (speed > current) {
        yearMaxMap.set(rec.year, speed);
      }
    }
  } else {
    // DailyWindData
    for (const rec of (data as DailyWindData).records) {
      const year = parseInt(rec.date.substring(0, 4), 10);
      const speed = rec[heightKey];
      const current = yearMaxMap.get(year) ?? 0;
      if (speed > current) {
        yearMaxMap.set(year, speed);
      }
    }
  }

  return [...yearMaxMap.entries()]
    .map(([year, maxSpeedMs]) => ({ year, maxSpeedMs }))
    .sort((a, b) => a.year - b.year);
}

/**
 * Fit a Gumbel Type I (maximum) distribution using the method of moments.
 *
 * The Gumbel distribution has CDF: F(x) = exp(-exp(-(x - mu) / sigma))
 *
 * Method of moments:
 * - mu = mean - gamma * sigma (where gamma = Euler-Mascheroni constant ~ 0.5772)
 * - sigma = (sqrt(6) / pi) * stddev
 */
export function fitGumbel(values: number[]): { mu: number; sigma: number } {
  const n = values.length;
  if (n === 0) return { mu: 0, sigma: 1 };

  const mean = values.reduce((s, v) => s + v, 0) / n;
  const variance = values.reduce((s, v) => s + (v - mean) ** 2, 0) / n;
  const stddev = Math.sqrt(variance);

  const EULER_MASCHERONI = 0.5772156649;
  const sigma = (Math.sqrt(6) / Math.PI) * stddev;
  const mu = mean - EULER_MASCHERONI * sigma;

  return { mu: Math.max(mu, 0), sigma: Math.max(sigma, 0.01) };
}

/**
 * Compute the quantile (return period value) from a Gumbel distribution.
 *
 * V_T = mu - sigma * ln(-ln(1 - 1/T))
 *
 * @param mu - Location parameter
 * @param sigma - Scale parameter
 * @param returnPeriod - Return period in years (e.g. 50)
 */
export function gumbelQuantile(
  mu: number,
  sigma: number,
  returnPeriod: number,
): number {
  // T=1 gives p=0 which is undefined; clamp to a minimum of 1.001
  const clampedT = Math.max(returnPeriod, 1.001);
  const p = 1 - 1 / clampedT;
  return mu - sigma * Math.log(-Math.log(p));
}

/**
 * Classify wind class according to IEC 61400-1.
 * Based on reference wind speed (Vref = 50-year return).
 */
function classifyWindClass(v50: number): 'I' | 'II' | 'III' | 'S' {
  if (v50 >= 50) return 'I';
  if (v50 >= 42.5) return 'II';
  if (v50 >= 37.5) return 'III';
  return 'S'; // Special class (below Class III)
}

function assessConfidence(
  yearCount: number,
  isMonthlyData: boolean,
): 'high' | 'medium' | 'low' {
  if (isMonthlyData) {
    // Monthly data always has lower confidence for extremes
    return yearCount >= 20 ? 'medium' : 'low';
  }
  // Daily data
  if (yearCount >= 20) return 'high';
  if (yearCount >= 10) return 'medium';
  return 'low';
}

function insufficientDataResult(
  annualMaxima: Array<{ year: number; maxSpeedMs: number }>,
  heightKey: string,
): ExtremeWindResult {
  const refHeight = heightKey === 'ws50m' ? 50 : 10;
  return {
    annualMaxima,
    gumbelMu: 0,
    gumbelSigma: 0,
    v50YearMs: 0,
    v1YearMs: 0,
    iecWindClass: 'S',
    confidence: 'low',
    referenceHeightM: refHeight,
    summary: `Insufficient data for extreme wind analysis (${annualMaxima.length} years, minimum 5 required).`,
  };
}
