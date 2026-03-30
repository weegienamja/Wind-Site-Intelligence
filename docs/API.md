# API Reference

Full reference for `@jamieblair/wind-site-intelligence-core`.

## Scoring

### `analyseSite(options: AnalysisOptions): Promise<Result<SiteAnalysis, ScoringError>>`

Run a full 6-factor site suitability analysis for a geographic coordinate.

```typescript
import { analyseSite } from '@jamieblair/wind-site-intelligence-core';

const result = await analyseSite({
  coordinate: { lat: 55.86, lng: -4.25 },
  weights: { windResource: 0.4, terrainSuitability: 0.2 },
  hubHeightM: 80,
});

if (result.ok) {
  console.log(result.value.compositeScore); // 0-100
}
```

**Parameters:**
- `coordinate` (required): `{ lat: number, lng: number }`
- `weights` (optional): Partial `ScoringWeights`. Missing weights use defaults. Always normalised to sum to 1.0.
- `hubHeightM` (optional): Hub height in metres for wind shear extrapolation. Default: 80.

**Returns:** `Result<SiteAnalysis, ScoringError>`

### `normaliseWeights(weights: Partial<ScoringWeights>): ScoringWeights`

Normalise partial weights so they sum to 1.0, filling in defaults for missing factors.

### `computeCompositeScore(factors: FactorScore[]): number`

Calculate the weighted composite score (0-100) from an array of factor scores.

### `DEFAULT_WEIGHTS: ScoringWeights`

Default scoring weights:
| Factor | Weight |
|--------|--------|
| windResource | 0.35 |
| terrainSuitability | 0.20 |
| gridProximity | 0.15 |
| landUseCompatibility | 0.15 |
| planningFeasibility | 0.10 |
| accessLogistics | 0.05 |

---

## Data Sources

### Wind Data (NASA POWER)

#### `fetchWindData(coord: LatLng): Promise<Result<WindDataSummary, ScoringError>>`

Fetch climatology wind summary. Returns monthly averages, annual speed, directional consistency, and standard deviation. Uses `WS50M` when available (sets `referenceHeightM: 50`), falls back to `WS2M`.

#### `fetchMonthlyWindHistory(coord: LatLng, yearsBack?: number): Promise<Result<MonthlyWindHistory, ScoringError>>`

Fetch full monthly history from 1981 to present. Each record contains `ws2m`, `ws10m`, `ws50m`, `wd10m`, `wd50m`. Cache TTL: 7 days.

#### `fetchDailyWindData(coord: LatLng, startDate: string, endDate: string): Promise<Result<DailyWindData, ScoringError>>`

Fetch daily multi-height wind data for a date range. Date format: `YYYY-MM-DD`. Cache TTL: 24 hours.

#### `fetchHourlyWindData(coord: LatLng, startDate: string, endDate: string): Promise<Result<HourlyWindData, ScoringError>>`

Fetch hourly wind data for a date range (max 1 year recommended). Cache TTL: 24 hours.

#### `clearWindDataCache(): void`

Clear all wind data caches.

### Elevation Data

#### `fetchElevationData(coord: LatLng): Promise<Result<ElevationData, ScoringError>>`

Fetch elevation, slope, aspect, and roughness class from Open-Elevation API.

#### `clearElevationCache(): void`

Clear the elevation data cache.

### OpenStreetMap Data (Overpass API)

#### `fetchGridInfrastructure(coord: LatLng, radiusKm?: number): Promise<Result<GridInfrastructure, ScoringError>>`

Fetch nearby transmission lines (132kV+) and substations.

#### `fetchLandUse(coord: LatLng, radiusKm?: number): Promise<Result<LandUseResult, ScoringError>>`

Fetch land use designations (hard constraints, soft constraints, positive indicators).

#### `fetchRoadAccess(coord: LatLng, radiusKm?: number): Promise<Result<RoadAccess, ScoringError>>`

Fetch nearby roads categorised by type (primary, secondary, track).

#### `fetchNearbyWindFarms(coord: LatLng, radiusKm?: number): Promise<Result<NearbyWindFarm[], ScoringError>>`

Find existing wind turbines/farms within a radius.

#### `clearOverpassCaches(): void`

Clear all Overpass API caches.

### Reverse Geocoding (Nominatim)

#### `reverseGeocode(coord: LatLng): Promise<Result<ReverseGeocodeResult, ScoringError>>`

Get country, region, and display name for a coordinate.

#### `clearGeocodeCache(): void`

Clear the geocoding cache.

---

## Wind Analysis

All analysis functions are **pure functions** with no side effects.

### `computeWindTrend(history: MonthlyWindHistory): WindTrendResult`

Compute linear regression trend from monthly wind history. Returns trend points with `speedMs` and `trendMs`, plus `slopePerYear` and `rSquared`.

### `computeSeasonalHeatmap(hourly: HourlyWindData): SeasonalHeatmapCell[]`

Compute month-by-hour heatmap cells (288 cells: 12 months x 24 hours) from hourly data.

### `computeMonthlyBoxPlots(history: MonthlyWindHistory): BoxPlotData[]`

Compute box plot statistics (min, q1, median, q3, max, mean) for each calendar month.

### `computeDiurnalProfile(hourly: HourlyWindData): DiurnalPoint[]`

Compute 24-hour diurnal profile with mean, min, and max speed per hour.

### `computeSpeedDistribution(daily: DailyWindData, binWidth?: number): SpeedDistributionResult`

Compute wind speed frequency histogram with Weibull distribution fit (shape k, scale c).

### `computeYearOverYear(history: MonthlyWindHistory): YearOverYearEntry[]`

Compute annual and monthly means grouped by year.

---

## Utilities

### `extrapolateWindSpeed(vRef: number, hRef: number, hHub: number, alpha: number): number`

Power law wind profile extrapolation: `v_hub = v_ref * (h_hub / h_ref) ^ alpha`

### `roughnessClassToAlpha(roughnessClass: number): number`

Convert terrain roughness class (0-4) to wind shear exponent alpha (0.10-0.35).

### `distanceKm(a: LatLng, b: LatLng): number`

Haversine distance between two coordinates in kilometres.

### `isValidCoordinate(coord: { lat: number; lng: number }): boolean`

Validate that latitude is -90 to 90 and longitude is -180 to 180.

### `createCache<T>(ttlMs: number): Cache<T>`

Create an in-memory cache with configurable TTL.

---

## Types

### Core Types

```typescript
interface LatLng { lat: number; lng: number }
type Confidence = 'high' | 'medium' | 'low'
enum ScoringFactor { WindResource, TerrainSuitability, GridProximity, LandUseCompatibility, PlanningFeasibility, AccessLogistics }
interface SiteAnalysis { coordinate, compositeScore, factors, hardConstraints, warnings, metadata }
interface FactorScore { factor, score, weight, weightedScore, detail, dataSource, confidence }
interface ScoringWeights { windResource, terrainSuitability, gridProximity, landUseCompatibility, planningFeasibility, accessLogistics }
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

### Wind Data Types

```typescript
interface WindDataSummary { coordinate, monthlyAverages, annualAverageSpeedMs, speedStdDevMs, prevailingDirectionDeg, directionalConsistency, dataYears, referenceHeightM? }
interface MonthlyWindHistory { coordinate, records, startYear, endYear }
interface MonthlyWindRecord { year, month, ws2m, ws10m, ws50m, wd10m, wd50m }
interface DailyWindData { coordinate, records, startDate, endDate }
interface DailyWindRecord { date, ws2m, ws10m, ws50m, wd10m, wd50m }
interface HourlyWindData { coordinate, records, startDate, endDate }
interface HourlyWindRecord { datetime, ws2m, ws10m, ws50m, wd10m, wd50m }
```

### Analysis Output Types

```typescript
interface WindTrendResult { points, slopePerYear, rSquared }
interface TrendPoint { year, month, speedMs, trendMs }
interface BoxPlotData { month, min, q1, median, q3, max, mean }
interface DiurnalPoint { hour, meanSpeedMs, minSpeedMs, maxSpeedMs }
interface SpeedDistributionResult { bins, weibullK, weibullC }
interface SpeedDistributionBin { binStart, binEnd, frequency, weibullFrequency }
interface SeasonalHeatmapCell { month, hour, speedMs }
```
