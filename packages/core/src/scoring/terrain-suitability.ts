import type { FactorScore, Confidence } from '../types/analysis.js';
import { ScoringFactor } from '../types/analysis.js';
import type { ElevationData } from '../types/datasources.js';
import type { ScoringError } from '../types/errors.js';
import type { Result } from '../types/result.js';
import { ok } from '../types/result.js';
import { clamp, linearScale } from '../utils/geo.js';

// Slope thresholds for turbine construction
const IDEAL_MAX_SLOPE_PERCENT = 5;
const PROHIBITIVE_SLOPE_PERCENT = 30;

// Elevation thresholds (higher altitude = denser wind but access challenges)
const IDEAL_MAX_ELEVATION_M = 1000;
const CHALLENGING_ELEVATION_M = 2500;

export function scoreTerrainSuitability(
  elevationData: ElevationData,
  weight: number,
): Result<FactorScore, ScoringError> {
  const slopeScore = computeSlopeScore(elevationData.slopePercent);
  const elevationScore = computeElevationScore(elevationData.elevationM);
  const roughnessScore = computeRoughnessScore(elevationData.roughnessClass);

  // Slope is most critical (50%), elevation (25%), roughness (25%)
  const rawScore = slopeScore * 0.5 + elevationScore * 0.25 + roughnessScore * 0.25;
  const score = Math.round(clamp(rawScore, 0, 100));

  const confidence = determineConfidence(elevationData);
  const detail = buildDetail(elevationData, score);

  return ok({
    factor: ScoringFactor.TerrainSuitability,
    score,
    weight,
    weightedScore: score * weight,
    detail,
    dataSource: 'Open-Elevation API (SRTM 30m resolution)',
    confidence,
  });
}

function computeSlopeScore(slopePercent: number): number {
  if (slopePercent >= PROHIBITIVE_SLOPE_PERCENT) return 0;
  if (slopePercent <= IDEAL_MAX_SLOPE_PERCENT) {
    return linearScale(slopePercent, 0, IDEAL_MAX_SLOPE_PERCENT, 100, 80);
  }
  return linearScale(slopePercent, IDEAL_MAX_SLOPE_PERCENT, PROHIBITIVE_SLOPE_PERCENT, 80, 0);
}

function computeElevationScore(elevationM: number): number {
  if (elevationM < 0) {
    // Below sea level, likely coastal/flood risk
    return linearScale(elevationM, -50, 0, 30, 60);
  }
  if (elevationM <= IDEAL_MAX_ELEVATION_M) {
    // Sweet spot: enough elevation for exposure, not too high for access
    return linearScale(elevationM, 0, IDEAL_MAX_ELEVATION_M, 70, 100);
  }
  return linearScale(elevationM, IDEAL_MAX_ELEVATION_M, CHALLENGING_ELEVATION_M, 80, 20);
}

function computeRoughnessScore(roughnessClass: number): number {
  // Lower roughness = better for wind energy
  // Class 0 (water): great for wind but may indicate offshore
  // Class 1 (open): ideal
  // Class 2 (agricultural): good
  // Class 3 (urban/forest): poor
  switch (roughnessClass) {
    case 0:
      return 85;
    case 1:
      return 100;
    case 2:
      return 65;
    case 3:
      return 30;
    default:
      return 50;
  }
}

function determineConfidence(elevationData: ElevationData): Confidence {
  // SRTM data is generally reliable at ~30m resolution
  // Lower confidence at extreme elevations or very flat areas (may be water)
  if (elevationData.elevationM > 3000 || elevationData.elevationM < -10) return 'low';
  if (elevationData.slopePercent < 0.1 && elevationData.elevationM < 5) return 'medium';
  return 'high';
}

function buildDetail(elevationData: ElevationData, score: number): string {
  const elevation = elevationData.elevationM.toFixed(0);
  const slope = elevationData.slopePercent.toFixed(1);
  const aspect = elevationData.aspectDeg.toFixed(0);
  const roughness = elevationData.roughnessClass;

  let quality: string;
  if (score >= 80) quality = 'Highly suitable terrain';
  else if (score >= 60) quality = 'Suitable terrain';
  else if (score >= 40) quality = 'Challenging terrain';
  else if (score >= 20) quality = 'Difficult terrain';
  else quality = 'Unsuitable terrain';

  return (
    `${quality}. ` +
    `Elevation: ${elevation}m, slope: ${slope}%, aspect: ${aspect} degrees. ` +
    `Surface roughness class: ${roughness}/3.`
  );
}
