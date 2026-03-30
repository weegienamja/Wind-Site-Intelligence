import type { HourlyWindData, DailyWindData } from '../types/datasources.js';
import type {
  TurbulenceResult,
  TurbulenceBin,
  IecTurbulenceClass,
} from '../types/wind-assessment.js';

/**
 * Estimate turbulence intensity from hourly or daily wind data.
 *
 * For hourly data: TI = sigma_v / V_mean for each speed bin,
 * using consecutive-hour differences as a proxy for sub-hourly variability.
 *
 * For daily data: estimates TI from the spread between ws2m and ws50m,
 * with lower confidence.
 *
 * @param data - Hourly or daily wind data
 * @param heightKey - Which height to analyse: 'ws10m' or 'ws50m' (default: 'ws50m')
 * @param binWidthMs - Width of each speed bin in m/s (default: 1)
 * @returns Turbulence intensity analysis
 */
export function estimateTurbulenceIntensity(
  data: HourlyWindData | DailyWindData,
  heightKey: 'ws10m' | 'ws50m' = 'ws50m',
  binWidthMs: number = 1,
): TurbulenceResult {
  const isHourly = 'datetime' in (data.records[0] ?? {});

  if (isHourly) {
    return estimateFromHourly(data as HourlyWindData, heightKey, binWidthMs);
  }
  return estimateFromDaily(data as DailyWindData, heightKey, binWidthMs);
}

function estimateFromHourly(
  data: HourlyWindData,
  heightKey: 'ws10m' | 'ws50m',
  binWidthMs: number,
): TurbulenceResult {
  const speeds = data.records.map((r) => r[heightKey]).filter((s) => s > 0);

  if (speeds.length < 10) {
    return emptyResult('hourly');
  }

  // For each consecutive pair, compute the "increment" as a proxy for variability
  const increments: Array<{ speed: number; increment: number }> = [];
  for (let i = 1; i < speeds.length; i++) {
    const meanSpeed = (speeds[i]! + speeds[i - 1]!) / 2;
    const increment = Math.abs(speeds[i]! - speeds[i - 1]!);
    if (meanSpeed > 0.5) {
      increments.push({ speed: meanSpeed, increment });
    }
  }

  // Group into bins and compute TI per bin
  const binMap = new Map<number, number[]>();
  for (const { speed, increment } of increments) {
    const binCentre = Math.round(speed / binWidthMs) * binWidthMs;
    if (!binMap.has(binCentre)) {
      binMap.set(binCentre, []);
    }
    binMap.get(binCentre)!.push(increment);
  }

  // Also compute sigma directly per speed bin from the raw speeds
  const speedBinMap = new Map<number, number[]>();
  for (const speed of speeds) {
    const binCentre = Math.round(speed / binWidthMs) * binWidthMs;
    if (!speedBinMap.has(binCentre)) {
      speedBinMap.set(binCentre, []);
    }
    speedBinMap.get(binCentre)!.push(speed);
  }

  const tiBins: TurbulenceBin[] = [];
  for (const [binCentre, binSpeeds] of speedBinMap.entries()) {
    if (binCentre < 1 || binSpeeds.length < 3) continue;

    const mean = binSpeeds.reduce((s, v) => s + v, 0) / binSpeeds.length;
    const variance =
      binSpeeds.reduce((s, v) => s + (v - mean) ** 2, 0) / binSpeeds.length;
    const sigma = Math.sqrt(variance);
    const ti = mean > 0 ? sigma / mean : 0;

    tiBins.push({
      speedBinMs: binCentre,
      ti: Math.round(ti * 1000) / 1000,
      count: binSpeeds.length,
    });
  }

  tiBins.sort((a, b) => a.speedBinMs - b.speedBinMs);

  return buildResult(tiBins, 'hourly');
}

function estimateFromDaily(
  data: DailyWindData,
  heightKey: 'ws10m' | 'ws50m',
  binWidthMs: number,
): TurbulenceResult {
  const speeds = data.records.map((r) => r[heightKey]).filter((s) => s > 0);

  if (speeds.length < 10) {
    return emptyResult('daily_estimated');
  }

  // Group daily speeds by week to estimate variability
  const tiBins: TurbulenceBin[] = [];
  const binMap = new Map<number, number[]>();

  for (const speed of speeds) {
    const binCentre = Math.round(speed / binWidthMs) * binWidthMs;
    if (!binMap.has(binCentre)) {
      binMap.set(binCentre, []);
    }
    binMap.get(binCentre)!.push(speed);
  }

  for (const [binCentre, binSpeeds] of binMap.entries()) {
    if (binCentre < 1 || binSpeeds.length < 3) continue;

    const mean = binSpeeds.reduce((s, v) => s + v, 0) / binSpeeds.length;
    const variance =
      binSpeeds.reduce((s, v) => s + (v - mean) ** 2, 0) / binSpeeds.length;
    const sigma = Math.sqrt(variance);
    // Daily data underestimates TI - apply correction factor (~1.5x)
    const ti = mean > 0 ? (sigma / mean) * 1.5 : 0;

    tiBins.push({
      speedBinMs: binCentre,
      ti: Math.round(ti * 1000) / 1000,
      count: binSpeeds.length,
    });
  }

  tiBins.sort((a, b) => a.speedBinMs - b.speedBinMs);

  return buildResult(tiBins, 'daily_estimated');
}

function buildResult(
  tiBins: TurbulenceBin[],
  dataSource: 'hourly' | 'daily_estimated',
): TurbulenceResult {
  if (tiBins.length === 0) {
    return emptyResult(dataSource);
  }

  // Weighted mean TI
  let totalWeight = 0;
  let weightedTi = 0;
  for (const bin of tiBins) {
    weightedTi += bin.ti * bin.count;
    totalWeight += bin.count;
  }
  const meanTi = totalWeight > 0 ? weightedTi / totalWeight : 0;

  // Representative TI at 15 m/s (interpolate)
  const representativeTi = interpolateTi(tiBins, 15);

  const iecClass = classifyTurbulence(representativeTi);

  const classLabel = iecClass === 'exceeds_A' ? 'exceeds IEC Class A' : `IEC Class ${iecClass}`;
  const sourceNote =
    dataSource === 'daily_estimated'
      ? ' (estimated from daily data, lower confidence)'
      : '';

  return {
    meanTi: Math.round(meanTi * 1000) / 1000,
    tiBins,
    iecClass,
    representativeTi: Math.round(representativeTi * 1000) / 1000,
    dataSource,
    summary:
      `Mean TI: ${(meanTi * 100).toFixed(1)}%, ` +
      `representative TI at 15 m/s: ${(representativeTi * 100).toFixed(1)}% (${classLabel})${sourceNote}.`,
  };
}

function emptyResult(dataSource: 'hourly' | 'daily_estimated'): TurbulenceResult {
  return {
    meanTi: 0,
    tiBins: [],
    iecClass: 'C',
    representativeTi: 0,
    dataSource,
    summary: 'Insufficient data for turbulence analysis.',
  };
}

/**
 * Classify turbulence intensity according to IEC 61400-1 Ed. 3.
 * Reference TI at 15 m/s:
 * - Class A: I_ref = 0.16
 * - Class B: I_ref = 0.14
 * - Class C: I_ref = 0.12
 */
export function classifyTurbulence(representativeTi: number): IecTurbulenceClass {
  if (representativeTi > 0.16) return 'exceeds_A';
  if (representativeTi > 0.14) return 'A';
  if (representativeTi > 0.12) return 'B';
  return 'C';
}

function interpolateTi(bins: TurbulenceBin[], targetSpeed: number): number {
  if (bins.length === 0) return 0;

  // Find the two nearest bins
  let lower: TurbulenceBin | undefined;
  let upper: TurbulenceBin | undefined;

  for (const bin of bins) {
    if (bin.speedBinMs <= targetSpeed) {
      if (!lower || bin.speedBinMs > lower.speedBinMs) lower = bin;
    }
    if (bin.speedBinMs >= targetSpeed) {
      if (!upper || bin.speedBinMs < upper.speedBinMs) upper = bin;
    }
  }

  if (!lower && !upper) return 0;
  if (!lower) return upper!.ti;
  if (!upper) return lower.ti;
  if (lower.speedBinMs === upper.speedBinMs) return lower.ti;

  // Linear interpolation
  const frac =
    (targetSpeed - lower.speedBinMs) / (upper.speedBinMs - lower.speedBinMs);
  return lower.ti + frac * (upper.ti - lower.ti);
}
