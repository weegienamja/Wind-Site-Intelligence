# API Reference

Full reference for `@jamieblair/windforge-core`.

---

## Site Scoring

### `analyseSite(options: AnalysisOptions): Promise<Result<SiteAnalysis, ScoringError>>`

Run a full 6-factor site suitability analysis for a geographic coordinate.

```typescript
import { analyseSite } from '@jamieblair/windforge-core';

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
- `weights` (optional): Partial `ScoringWeights`. Missing weights get defaults. Always normalised to sum to 1.0.
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

### Optional: ERA5 Reanalysis

#### `fetchEra5WindData(coord: LatLng, apiKey: string, options?: Era5Options): Promise<Result<WindDataSummary, DataSourceError>>`

Fetch wind data from the Copernicus ERA5 reanalysis dataset (31km global, 1940-present). Requires a free CDS API key.

### Optional: CERRA Reanalysis

#### `fetchCerraWindData(coord: LatLng, apiKey: string, options?: CerraOptions): Promise<Result<WindDataSummary, DataSourceError>>`

High-resolution European reanalysis (5.5km, 1984-2021). Only works for coordinates within the CERRA domain.

#### `isInCerraDomain(coord: LatLng): boolean`

Check whether a coordinate falls within the CERRA coverage area (Europe).

### Elevation Data

#### `fetchElevationData(coord: LatLng): Promise<Result<ElevationData, ScoringError>>`

Fetch elevation, slope, aspect, and roughness class from Open-Elevation API.

### OpenStreetMap Data (Overpass API)

#### `fetchGridInfrastructure(coord: LatLng, radiusKm?: number): Promise<Result<GridInfrastructure, ScoringError>>`

Fetch nearby transmission lines (132kV+) and substations.

#### `fetchLandUse(coord: LatLng, radiusKm?: number): Promise<Result<LandUseResult, ScoringError>>`

Fetch land use designations (hard constraints, soft constraints, positive indicators).

#### `fetchRoadAccess(coord: LatLng, radiusKm?: number): Promise<Result<RoadAccess, ScoringError>>`

Fetch nearby roads categorised by type (primary, secondary, track).

#### `fetchNearbyWindFarms(coord: LatLng, radiusKm?: number): Promise<Result<NearbyWindFarm[], ScoringError>>`

Find existing wind turbines and farms within a radius.

### Reverse Geocoding (Nominatim)

#### `reverseGeocode(coord: LatLng): Promise<Result<ReverseGeocodeResult, ScoringError>>`

Get country, region, and display name for a coordinate.

---

## Noise Modelling

### `calculateNoiseAtReceptor(turbines, receptor, soundPowerLevels, hubHeightM, options?, elevationProfiles?): NoiseResult`

ISO 9613-2 sound propagation model. Calculates predicted noise level from multiple turbines at a receptor location, accounting for atmospheric absorption, ground effect, and terrain barrier screening.

### `assessNoiseCompliance(receptors, noiseResults, options): EtsuAssessment`

ETSU-R-97 compliance check against daytime and nighttime noise limits.

### `computeNoiseContours(turbines, bounds, resolution, soundPowerLevels, hubHeightM): NoiseContourGrid`

Generate a noise contour grid for mapping.

---

## Shadow Flicker

### `calculateShadowFlicker(turbines, receptors, options): ShadowFlickerResult`

Calculate annual shadow flicker hours at receptor locations using full solar ephemeris (Meeus algorithm).

### `assessShadowCompliance(result, options): ShadowComplianceResult`

Assess results against typical compliance thresholds (e.g. 30 hours/year).

### `generateShadowCalendar(turbine, receptor, year): ShadowCalendar`

Monthly calendar showing shadow occurrence patterns.

---

## Wake Modelling

### `calculateDirectionalWakeLoss(positions, windRose, turbine, options): WakeLossResult`

Directional wake loss calculation using Jensen or Bastankhah wake models with 36-sector wind rose integration.

### `buildWindRose(windData): WindRoseData`

Build a 36-sector wind rose from historical wind data.

### `layoutToTurbinePositions(layout, turbine): TurbinePosition[]`

Convert layout coordinates to TurbinePosition format for wake analysis.

---

## Energy Yield

### `calculateAep(windData, turbine, options): Promise<Result<EnergyYieldResult, ScoringError>>`

Annual energy production with Weibull distribution, power curve integration, air density correction, 7-category loss stack, and P50/P75/P90 confidence scenarios.

### `optimiseLayout(positions, turbine, windRose, boundary?, exclusions?, options?): OptimisedLayoutResult`

Greedy hill-climbing layout optimiser that maximises AEP while respecting spacing and boundary constraints.

---

## Terrain Flow

### `computeTerrainSpeedUp(elevationGrid, coord): SpeedUpResult`

Simplified Jackson-Hunt terrain speed-up estimation.

### `calculateRix(elevationGrid, coord, options?): RixResult`

Ruggedness Index calculation for terrain complexity assessment.

### `fetchElevationGrid(center, radiusKm, resolution): Promise<Result<ElevationGrid, ScoringError>>`

Build an elevation grid from sampled points.

---

## Financial Modelling

### `calculateLcoe(params): LcoeResult`

Levelised Cost of Energy calculation.

### `calculateIrr(params): IrrResult`

Internal Rate of Return using Newton-Raphson with bisection fallback.

### `calculatePayback(params): PaybackResult`

Simple and discounted payback period.

### `generateCashflow(params): CashflowProjection`

25-year annual cashflow projection.

### `runSensitivityAnalysis(baseParams, variations?): SensitivityResult[]`

Sensitivity analysis across key financial parameters.

---

## Turbulence and Extreme Wind

### `estimateTurbulenceIntensity(windData, hubHeightM): TurbulenceResult`

Estimate turbulence intensity and classify against IEC 61400-1 categories.

### `estimateExtremeWind(windData, returnPeriods?): ExtremeWindResult`

Gumbel Type I extreme value analysis for specified return periods.

---

## On-Site Data

### `parseMetMastCSV(csvContent, config): MetMastDataset`

Parse met mast CSV data with configurable column mapping.

### `performMcpAnalysis(onSite, reference): McpResult`

Measure-Correlate-Predict analysis for extending short on-site records.

### `assessDataQuality(dataset): DataQualityReport`

Automated data quality assessment with gap detection and completeness reporting.

---

## Visual Impact

### `computeViewshed(turbines, elevationGrid, radiusKm?, sampleInterval?): ViewshedResult`

Zone of Theoretical Visibility with earth curvature correction and terrain screening.

---

## Cumulative Impact

### `assessCumulativeImpact(proposedTurbines, existingTurbines, receptors, options?): CumulativeImpactResult`

Combined noise, shadow, and visibility from proposed and existing turbines at shared receptors.

---

## IEC Reporting

### `generateIecSiteReport(assessment, turbulence, extremeWind, aep): IecSiteReport`

IEC 61400-1 aligned site conditions report.

---

## Data Validation

### `validateWindData(data: unknown): ValidationResult<WindDataSummary>`

Validate wind data at system boundaries. Range checks, NaN detection, direction wrapping.

### `validateElevationData(data: unknown): ValidationResult<ElevationData>`

Validate elevation data. Range checks for elevation (-500 to 9000m), slope, aspect.

### `validateCoordinateArray(coords: unknown[]): ValidationResult<LatLng[]>`

Validate coordinate arrays. Lat -90/90, lng -180/180, NaN rejection.

---

## Spatial Cache

### `createSpatialCache(maxEntries?: number): SpatialCache`

Tile-keyed in-memory cache with LRU eviction and per-data-type TTLs.

### `tileKey(lat, lng, zoom?): string`

Generate a tile key for a geographic coordinate at a given zoom level.

---

## Wind Analysis

All analysis functions are **pure functions** with no side effects.

### `computeWindTrend(history: MonthlyWindHistory): WindTrendResult`

Linear regression trend from monthly wind history.

### `computeSeasonalHeatmap(hourly: HourlyWindData): SeasonalHeatmapCell[]`

Month-by-hour heatmap cells from hourly data.

### `computeMonthlyBoxPlots(history: MonthlyWindHistory): BoxPlotData[]`

Box plot statistics for each calendar month.

### `computeDiurnalProfile(hourly: HourlyWindData): DiurnalPoint[]`

24-hour diurnal profile with mean, min, and max.

### `computeSpeedDistribution(daily: DailyWindData, binWidth?: number): SpeedDistributionResult`

Wind speed frequency histogram with Weibull fit.

### `computeYearOverYear(history: MonthlyWindHistory): YearOverYearEntry[]`

Annual and monthly means grouped by year.

---

## Utilities

### `extrapolateWindSpeed(vRef, hRef, hHub, alpha): number`

Power law wind profile extrapolation.

### `roughnessClassToAlpha(roughnessClass): number`

Convert terrain roughness class (0-4) to wind shear exponent.

### `distanceKm(a: LatLng, b: LatLng): number`

Haversine distance between two coordinates in kilometres.

### `isValidCoordinate(coord): boolean`

Validate lat/lng ranges.

### `createCache<T>(ttlMs: number): Cache<T>`

Create an in-memory cache with configurable TTL.

---

## Turbine Library

### `getTurbineById(id: string): TurbineModel | undefined`

Look up a built-in turbine model by ID.

### `listTurbines(): TurbineModel[]`

List all built-in turbine models.

### `parsePowerCurveCSV(csvContent: string): PowerCurveEntry[]`

Parse a CSV power curve for custom turbine import.

---

## Types

### Core Types

```typescript
interface LatLng { lat: number; lng: number }
type Confidence = 'high' | 'medium' | 'low'
interface SiteAnalysis { coordinate, compositeScore, factors, hardConstraints, warnings, metadata }
interface FactorScore { factor, score, weight, weightedScore, detail, dataSource, confidence }
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E }
```

### Wind Data Types

```typescript
interface WindDataSummary { coordinate, monthlyAverages, annualAverageSpeedMs, speedStdDevMs, prevailingDirectionDeg, directionalConsistency, dataYears, referenceHeightM? }
interface MonthlyWindHistory { coordinate, records, startYear, endYear }
interface MonthlyWindRecord { year, month, ws2m, ws10m, ws50m, wd10m, wd50m }
```

### Analysis Output Types

```typescript
interface NoiseResult { predictedLevelDba, contributions[], distanceM, attenuations }
interface ShadowFlickerResult { receptors[], totalAnnualHours, maxReceptorHours }
interface WakeLossResult { totalWakeLoss, turbineResults[], sectorResults[] }
interface EnergyYieldResult { grossAepMwh, netAepMwh, capacityFactorNet, losses, p50/p75/p90 }
interface LcoeResult { lcoePoundsMwh, totalLifetimeCostPounds, totalLifetimeEnergyMwh }
interface ViewshedResult { visibleCells, totalCells, visiblePercent, maxVisibilityDistanceKm }
interface CumulativeImpactResult { cumulativeNoise, proposedNoise, cumulativeFlicker, proposedFlicker }
interface IecSiteReport { metadata, windConditions, turbulence, extremeWind, energyYield, suitability }
```
