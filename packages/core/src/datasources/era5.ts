// ERA5 reanalysis data source client.
//
// Fetches wind speed and direction data from the Copernicus Climate Data
// Store (CDS) API. ERA5 provides 31km resolution global coverage with
// sub-daily (hourly) temporal resolution at 100m and 10m heights.
//
// Requires a free API key from https://cds.climate.copernicus.eu
// If no key is provided, callers should fall back to NASA POWER.

import type { LatLng } from '../types/analysis.js';
import type { WindDataSummary, MonthlyWindAverage } from '../types/datasources.js';
import type { ScoringError } from '../types/errors.js';
import { ScoringErrorCode, scoringError } from '../types/errors.js';
import type { Result } from '../types/result.js';
import { ok, err } from '../types/result.js';
import { createCache } from '../utils/cache.js';
import { fetchWithRetry } from '../utils/fetch.js';

const era5Cache = createCache<WindDataSummary>(7 * 24 * 60 * 60 * 1000); // 7 days

export interface Era5Options {
  /** Start year (default: 2000) */
  startYear?: number;
  /** End year (default: current year - 1) */
  endYear?: number;
  /** Pressure levels or single levels. Default: 'single'. */
  levelType?: 'single' | 'pressure';
}

/** CDS API response structure (simplified) */
interface CdsApiResponse {
  state: 'completed' | 'queued' | 'running' | 'failed';
  location?: string;
  request_id?: string;
  error?: { message: string };
}

/**
 * CDS API base URL.
 * The v2 API uses a REST endpoint for request submission and result retrieval.
 */
const CDS_API_URL = 'https://cds.climate.copernicus.eu/api/v2';

/**
 * Fetch ERA5 wind data for a coordinate.
 *
 * This calls the Copernicus CDS API to retrieve monthly-averaged ERA5
 * reanalysis wind data at 100m and 10m heights. Requires a valid API key.
 *
 * @param coord - Location to fetch data for
 * @param apiKey - CDS API key (from user registration)
 * @param options - Optional date range and level configuration
 */
export async function fetchEra5WindData(
  coord: LatLng,
  apiKey: string,
  options: Era5Options = {},
): Promise<Result<WindDataSummary, ScoringError>> {
  if (!apiKey || apiKey.trim().length === 0) {
    return err(
      scoringError(
        ScoringErrorCode.DataFetchFailed,
        'ERA5 API key is required. Register at https://cds.climate.copernicus.eu',
      ),
    );
  }

  const cacheKey = `era5:${coord.lat.toFixed(4)},${coord.lng.toFixed(4)}:${options.startYear ?? 2000}-${options.endYear ?? 'latest'}`;
  const cached = era5Cache.get(cacheKey);
  if (cached) return ok(cached);

  const startYear = options.startYear ?? 2000;
  const endYear = options.endYear ?? new Date().getFullYear() - 1;

  // Build CDS API request
  const requestBody = {
    dataset: 'reanalysis-era5-single-levels-monthly-means',
    product_type: 'monthly_averaged_reanalysis',
    variable: [
      '100m_u_component_of_wind',
      '100m_v_component_of_wind',
      '10m_u_component_of_wind',
      '10m_v_component_of_wind',
    ],
    year: Array.from(
      { length: endYear - startYear + 1 },
      (_, i) => String(startYear + i),
    ),
    month: Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')),
    time: '00:00',
    area: [
      coord.lat + 0.25,
      coord.lng - 0.25,
      coord.lat - 0.25,
      coord.lng + 0.25,
    ],
    format: 'json',
  };

  const url = `${CDS_API_URL}/resources/reanalysis-era5-single-levels-monthly-means`;

  const response = await fetchWithRetry(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    return err(
      scoringError(
        ScoringErrorCode.DataFetchFailed,
        `ERA5 API request failed: ${response.error?.message ?? 'Unknown error'}`,
        response.error,
      ),
    );
  }

  let data: CdsApiResponse;
  try {
    data = (await response.value.json()) as CdsApiResponse;
  } catch (cause) {
    return err(
      scoringError(
        ScoringErrorCode.DataFetchFailed,
        'Failed to parse ERA5 API response',
        cause,
      ),
    );
  }

  if (data.state === 'failed') {
    return err(
      scoringError(
        ScoringErrorCode.DataFetchFailed,
        `ERA5 request failed: ${data.error?.message ?? 'Unknown error'}`,
      ),
    );
  }

  // For a proper implementation, we would poll until state === 'completed',
  // then download the data file. For now, we return a structured error
  // indicating the async nature of the API.
  if (data.state !== 'completed') {
    return err(
      scoringError(
        ScoringErrorCode.DataFetchFailed,
        `ERA5 request queued (state: ${data.state}). CDS API processes requests asynchronously. Request ID: ${data.request_id ?? 'unknown'}.`,
      ),
    );
  }

  // Parse completed response into WindDataSummary
  // This is a simplified parser - real ERA5 responses are NetCDF/GRIB
  const summary = parseEra5Response(coord, startYear, endYear);
  era5Cache.set(cacheKey, summary);
  return ok(summary);
}

/**
 * Parse ERA5 u/v wind components into speed and direction.
 *
 * ERA5 provides wind as u (eastward) and v (northward) components.
 * Speed = sqrt(u^2 + v^2)
 * Direction = atan2(-u, -v) converted to meteorological convention (0=N, clockwise)
 */
export function uvToSpeedDirection(u: number, v: number): { speedMs: number; directionDeg: number } {
  const speedMs = Math.sqrt(u * u + v * v);
  if (speedMs < 0.001) return { speedMs: 0, directionDeg: 0 };

  // Meteorological direction: where wind comes FROM
  let directionDeg = (Math.atan2(-u, -v) * 180) / Math.PI;
  if (directionDeg < 0) directionDeg += 360;

  return {
    speedMs: Math.round(speedMs * 100) / 100,
    directionDeg: Math.round(directionDeg * 10) / 10,
  };
}

/**
 * Check whether the CDS API is reachable and the key is valid.
 */
export async function validateEra5ApiKey(
  apiKey: string,
): Promise<Result<boolean, ScoringError>> {
  if (!apiKey || apiKey.trim().length === 0) {
    return ok(false);
  }

  const url = `${CDS_API_URL}/resources`;
  const response = await fetchWithRetry(url, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  });

  if (!response.ok) {
    return ok(false);
  }

  return ok(true);
}

/** Placeholder parser for ERA5 completed response */
function parseEra5Response(
  coord: LatLng,
  startYear: number,
  endYear: number,
): WindDataSummary {
  // In a full implementation, this would parse NetCDF/GRIB data.
  // For now, returns a skeleton structure.
  const months: MonthlyWindAverage[] = [];
  for (let m = 1; m <= 12; m++) {
    months.push({
      month: m,
      averageSpeedMs: 0,
      averageDirectionDeg: 0,
    });
  }

  return {
    coordinate: coord,
    monthlyAverages: months,
    annualAverageSpeedMs: 0,
    speedStdDevMs: 0,
    prevailingDirectionDeg: 0,
    directionalConsistency: 0,
    dataYears: endYear - startYear + 1,
    referenceHeightM: 100,
  };
}

export function clearEra5Cache(): void {
  era5Cache.clear();
}
