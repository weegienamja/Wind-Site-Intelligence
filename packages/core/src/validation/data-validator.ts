// Data validation pipeline for incoming wind, elevation, and OSM data.
//
// Validates data at system boundaries, flagging quality issues without
// rejecting data unless critical. Produces cleaned data with a report
// of warnings and errors.

import type { WindDataSummary, MonthlyWindAverage } from '../types/datasources.js';
import type { ElevationData } from '../types/datasources.js';

export interface ValidationResult<T> {
  valid: boolean;
  warnings: string[];
  errors: string[];
  cleanedData: T;
}

/**
 * Validate wind data at system boundary.
 *
 * Checks: speed range (0-100 m/s), direction range (0-360), NaN/null
 * detection, completeness percentage. Cleans data by clamping values
 * and replacing NaN.
 */
export function validateWindData(data: unknown): ValidationResult<WindDataSummary> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Wind data is null, undefined, or not an object'],
      warnings: [],
      cleanedData: emptyWindData(),
    };
  }

  const raw = data as Record<string, unknown>;

  // Validate coordinate
  const coord = validateCoordinate(raw['coordinate']);
  if (!coord.valid) {
    errors.push(...coord.errors);
  }

  // Validate annual average
  const annualSpeed = toFiniteNumber(raw['annualAverageSpeedMs']);
  if (annualSpeed === null) {
    errors.push('annualAverageSpeedMs is missing or NaN');
  } else if (annualSpeed < 0 || annualSpeed > 100) {
    warnings.push(`annualAverageSpeedMs (${annualSpeed}) outside expected range 0-100 m/s`);
  }

  // Validate monthly averages
  const monthlyRaw = raw['monthlyAverages'];
  const cleanedMonthly: MonthlyWindAverage[] = [];

  if (!Array.isArray(monthlyRaw)) {
    errors.push('monthlyAverages is not an array');
  } else {
    for (let i = 0; i < monthlyRaw.length; i++) {
      const m = monthlyRaw[i] as Record<string, unknown>;
      const speed = toFiniteNumber(m['averageSpeedMs']);
      const dir = toFiniteNumber(m['averageDirectionDeg']);

      if (speed === null) {
        warnings.push(`Month ${i + 1}: averageSpeedMs is NaN or missing, using 0`);
      } else if (speed < 0 || speed > 100) {
        warnings.push(`Month ${i + 1}: speed ${speed} m/s outside 0-100 range, clamping`);
      }

      if (dir === null) {
        warnings.push(`Month ${i + 1}: averageDirectionDeg is NaN or missing, using 0`);
      } else if (dir < 0 || dir > 360) {
        warnings.push(`Month ${i + 1}: direction ${dir} outside 0-360 range, wrapping`);
      }

      cleanedMonthly.push({
        month: toFiniteNumber(m['month']) ?? (i + 1),
        averageSpeedMs: clamp(speed ?? 0, 0, 100),
        averageDirectionDeg: wrapDirection(dir ?? 0),
      });
    }

    // Check completeness
    const expectedMonths = 12;
    const actualMonths = cleanedMonthly.length;
    const completeness = actualMonths / expectedMonths;
    if (completeness < 1) {
      warnings.push(`Data completeness: ${(completeness * 100).toFixed(0)}% (${actualMonths}/${expectedMonths} months)`);
    }
  }

  // Validate prevailing direction
  const prevDir = toFiniteNumber(raw['prevailingDirectionDeg']);
  if (prevDir !== null && (prevDir < 0 || prevDir > 360)) {
    warnings.push(`prevailingDirectionDeg (${prevDir}) outside 0-360, wrapping`);
  }

  const cleaned: WindDataSummary = {
    coordinate: coord.valid
      ? { lat: (raw['coordinate'] as { lat: number }).lat, lng: (raw['coordinate'] as { lng: number }).lng }
      : { lat: 0, lng: 0 },
    monthlyAverages: cleanedMonthly,
    annualAverageSpeedMs: clamp(annualSpeed ?? 0, 0, 100),
    speedStdDevMs: clamp(toFiniteNumber(raw['speedStdDevMs']) ?? 0, 0, 50),
    prevailingDirectionDeg: wrapDirection(prevDir ?? 0),
    directionalConsistency: clamp(toFiniteNumber(raw['directionalConsistency']) ?? 0, 0, 1),
    dataYears: Math.max(0, toFiniteNumber(raw['dataYears']) ?? 0),
  };

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    cleanedData: cleaned,
  };
}

/**
 * Validate elevation data at system boundary.
 *
 * Checks: elevation range (-500 to 9000m), slope range (0-100%),
 * aspect range (0-360), roughness class (0-3).
 */
export function validateElevationData(data: unknown): ValidationResult<ElevationData> {
  const warnings: string[] = [];
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return {
      valid: false,
      errors: ['Elevation data is null, undefined, or not an object'],
      warnings: [],
      cleanedData: emptyElevationData(),
    };
  }

  const raw = data as Record<string, unknown>;

  const coord = validateCoordinate(raw['coordinate']);
  if (!coord.valid) errors.push(...coord.errors);

  const elev = toFiniteNumber(raw['elevationM']);
  if (elev === null) {
    errors.push('elevationM is missing or NaN');
  } else if (elev < -500 || elev > 9000) {
    warnings.push(`elevationM (${elev}) outside expected range -500 to 9000m`);
  }

  const slope = toFiniteNumber(raw['slopePercent']);
  if (slope !== null && (slope < 0 || slope > 100)) {
    warnings.push(`slopePercent (${slope}) outside expected range 0-100%`);
  }

  const aspect = toFiniteNumber(raw['aspectDeg']);
  if (aspect !== null && (aspect < 0 || aspect > 360)) {
    warnings.push(`aspectDeg (${aspect}) outside 0-360, wrapping`);
  }

  const roughness = toFiniteNumber(raw['roughnessClass']);
  if (roughness !== null && (roughness < 0 || roughness > 3)) {
    warnings.push(`roughnessClass (${roughness}) outside expected range 0-3`);
  }

  const cleaned: ElevationData = {
    coordinate: coord.valid
      ? { lat: (raw['coordinate'] as { lat: number }).lat, lng: (raw['coordinate'] as { lng: number }).lng }
      : { lat: 0, lng: 0 },
    elevationM: clamp(elev ?? 0, -500, 9000),
    slopePercent: clamp(slope ?? 0, 0, 100),
    aspectDeg: wrapDirection(aspect ?? 0),
    roughnessClass: clamp(roughness ?? 1, 0, 3),
  };

  return {
    valid: errors.length === 0,
    warnings,
    errors,
    cleanedData: cleaned,
  };
}

/**
 * Validate an array of coordinate values for basic geographic sanity.
 */
export function validateCoordinateArray(
  coords: unknown[],
): ValidationResult<Array<{ lat: number; lng: number }>> {
  const warnings: string[] = [];
  const errors: string[] = [];
  const cleaned: Array<{ lat: number; lng: number }> = [];

  for (let i = 0; i < coords.length; i++) {
    const c = coords[i] as Record<string, unknown>;
    const lat = toFiniteNumber(c?.['lat']);
    const lng = toFiniteNumber(c?.['lng']);

    if (lat === null || lng === null) {
      errors.push(`Coordinate ${i}: missing lat or lng`);
      continue;
    }
    if (lat < -90 || lat > 90) {
      errors.push(`Coordinate ${i}: lat ${lat} outside -90 to 90`);
      continue;
    }
    if (lng < -180 || lng > 180) {
      errors.push(`Coordinate ${i}: lng ${lng} outside -180 to 180`);
      continue;
    }
    cleaned.push({ lat, lng });
  }

  return { valid: errors.length === 0, warnings, errors, cleanedData: cleaned };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateCoordinate(coord: unknown): { valid: boolean; errors: string[] } {
  if (!coord || typeof coord !== 'object') {
    return { valid: false, errors: ['coordinate is missing or not an object'] };
  }
  const c = coord as Record<string, unknown>;
  const lat = toFiniteNumber(c['lat']);
  const lng = toFiniteNumber(c['lng']);
  const errs: string[] = [];
  if (lat === null) errs.push('coordinate.lat is missing or NaN');
  else if (lat < -90 || lat > 90) errs.push(`coordinate.lat (${lat}) outside -90 to 90`);
  if (lng === null) errs.push('coordinate.lng is missing or NaN');
  else if (lng < -180 || lng > 180) errs.push(`coordinate.lng (${lng}) outside -180 to 180`);
  return { valid: errs.length === 0, errors: errs };
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number') return null;
  if (!Number.isFinite(value)) return null;
  return value;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function wrapDirection(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function emptyWindData(): WindDataSummary {
  return {
    coordinate: { lat: 0, lng: 0 },
    monthlyAverages: [],
    annualAverageSpeedMs: 0,
    speedStdDevMs: 0,
    prevailingDirectionDeg: 0,
    directionalConsistency: 0,
    dataYears: 0,
  };
}

function emptyElevationData(): ElevationData {
  return {
    coordinate: { lat: 0, lng: 0 },
    elevationM: 0,
    slopePercent: 0,
    aspectDeg: 0,
    roughnessClass: 1,
  };
}
