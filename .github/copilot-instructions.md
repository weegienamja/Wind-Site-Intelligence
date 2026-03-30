# Wind Site Intelligence - Copilot Workspace Prompt

You are an AI coding assistant working on **Wind Site Intelligence**, a standalone, embeddable module for scoring and visualising wind turbine site suitability. This is NOT an AI replacement tool. It is a decision-support system that surfaces data and insights so human engineers make better-informed placement decisions.

---

## Project Identity

- **Repo name:** `wind-site-intelligence`
- **npm scope:** `@jamieblair/wind-site-intelligence`
- **Author:** Jamie Blair (jamieblair.co.uk)
- **Licence:** MIT
- **Purpose:** Score geographic locations for wind turbine installation by combining meteorological, terrain, infrastructure, and regulatory data into a weighted, human-readable analysis.

---

## Architecture

This project uses a **layered architecture** with a strict separation between the data/scoring core and the UI layer. This is non-negotiable - the package must be consumable both as a drop-in React widget and as a headless SDK.

```
wind-site-intelligence/
├── packages/
│   ├── core/                  # Pure TypeScript - no React, no DOM
│   │   ├── src/
│   │   │   ├── scoring/       # Scoring engine and weighting logic
│   │   │   ├── datasources/   # API clients for wind, terrain, grid data
│   │   │   ├── types/         # Shared TypeScript interfaces and enums
│   │   │   ├── utils/         # Helpers (geo calculations, unit conversion)
│   │   │   └── index.ts       # Public API surface
│   │   ├── tests/
│   │   └── package.json
│   ├── ui/                    # React components consuming core
│   │   ├── src/
│   │   │   ├── components/    # WindSiteScorer, HeatMap, ScoreCard, WeightSliders
│   │   │   ├── hooks/         # useWindData, useSiteScore, useMapInteraction
│   │   │   ├── styles/        # Tailwind config, themeable tokens
│   │   │   └── index.ts       # Component exports
│   │   ├── tests/
│   │   └── package.json
│   └── demo/                  # Standalone Next.js app for dev and showcase
│       ├── src/
│       │   └── app/
│       └── package.json
├── docs/                      # Usage guide, API reference, data source docs
├── turbo.json                 # Turborepo pipeline config
├── package.json               # Root workspace config
├── tsconfig.base.json
└── README.md
```

### Monorepo Tooling

- **Turborepo** for workspace orchestration (consistent with jamieblair.co.uk main site)
- **pnpm** as the package manager
- **TypeScript** everywhere, strict mode enabled
- **Vitest** for unit and integration tests
- **Biome** for linting and formatting (not ESLint/Prettier)

---

## Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Core scoring engine | Pure TypeScript | Zero dependencies on React or DOM APIs |
| UI components | React 18+ | Functional components, hooks only |
| Styling | Tailwind CSS | Themeable via CSS custom properties so consumers can override |
| Maps | Mapbox GL JS or Leaflet | Leaflet preferred for zero-cost default, Mapbox as optional upgrade |
| Charts | Recharts | Lightweight, React-native |
| Demo app | Next.js (App Router) | For development and public showcase |
| Testing | Vitest + Testing Library | Minimum 80% coverage on core |
| Build | tsup | For bundling core and ui packages for npm publish |

---

## Data Sources

All data comes from **free, publicly accessible APIs**. Do not introduce any data source that requires a paid API key for basic functionality.

| Data Layer | Source | What It Provides |
|-----------|--------|-----------------|
| Wind speed/direction | NASA POWER API (power.larc.nasa.gov) | Historical wind data from 1981 to near real-time at multiple heights (2m, 10m, 50m). Hourly, daily, monthly, and climatology temporal resolutions. Max 20 params per daily/monthly request, 15 per hourly. |
| Terrain/elevation | Open-Elevation API or Mapbox Terrain | Elevation, slope, surface roughness |
| Grid infrastructure | OpenStreetMap Overpass API | Proximity to power lines, substations |
| Land use constraints | OpenStreetMap / CORINE Land Cover | Protected areas, residential zones, water bodies |
| Administrative boundaries | Natural Earth / OSM | Country/region for regulatory context |

### Data Fetching Rules

- All API calls live in `packages/core/src/datasources/`
- Each data source has its own client module with a consistent interface
- All clients must implement retry logic with exponential backoff
- Cache responses locally (in-memory or IndexedDB in browser context) to avoid repeat calls
- Never call an external API from the UI layer directly - always go through core

### NASA POWER Extended Parameters

The NASA POWER API provides wind data at multiple heights and temporal resolutions. The project should use the richest available data for scoring and charting.

**Wind parameters to request:**

| Parameter | Description |
|-----------|-------------|
| `WS2M` | Wind speed at 2 metres (m/s) |
| `WS10M` | Wind speed at 10 metres (m/s) |
| `WS50M` | Wind speed at 50 metres (m/s) |
| `WD2M` | Wind direction at 2 metres (degrees) |
| `WD10M` | Wind direction at 10 metres (degrees) |
| `WD50M` | Wind direction at 50 metres (degrees) |

**Key advantage:** with real data at 50m, the power law extrapolation to hub height (80m/120m) only needs to bridge a short gap, making estimates significantly more accurate than extrapolating from 2m.

**Temporal API endpoints:**

| Endpoint | URL pattern | Date range | Use case |
|----------|------------|------------|----------|
| Monthly | `/api/temporal/monthly/point` | `start=1981&end=2025` (year only) | Full historical trend, seasonal analysis, year-over-year comparison. Primary data source for charts. |
| Daily | `/api/temporal/daily/point` | `start=YYYYMMDD&end=YYYYMMDD` | Detailed analysis for user-selected windows (max 5 years per request to keep response size manageable). |
| Hourly | `/api/temporal/hourly/point` | `start=YYYYMMDD&end=YYYYMMDD` | Diurnal wind profile (peak hours). Limit to 1 year max per request. |
| Climatology | `/api/temporal/climatology/point` | No dates needed | Long-term monthly averages across the full record. Fast, single request. |

**API call format:**
```
https://power.larc.nasa.gov/api/temporal/monthly/point?parameters=WS2M,WS10M,WS50M,WD10M,WD50M&community=RE&longitude={lng}&latitude={lat}&start=1981&end=2025&format=JSON
```

**Rate limiting:** the API throttles repeated rapid requests. Space sequential calls by at least 1 second. Cache aggressively - historical data does not change.

**Extrapolation update:** when `WS50M` data is available, use it as the reference height instead of `WS2M`. The extrapolation formula remains the same but `h_ref` becomes 50 and `v_ref` uses the 50m measurement. This produces more accurate hub-height estimates. Fall back to `WS2M` only if 50m data is unavailable for a given location/period.

---

## Scoring Engine

The scoring engine is the heart of the product. It takes a geographic coordinate and returns a composite suitability score with per-factor breakdowns.

### Scoring Factors

| Factor | Weight (default) | Description |
|--------|-----------------|-------------|
| Wind resource | 0.35 | Average wind speed, consistency, directional stability |
| Terrain suitability | 0.20 | Elevation, slope gradient, surface roughness |
| Grid proximity | 0.15 | Distance to nearest transmission infrastructure |
| Land use compatibility | 0.15 | Absence of protected zones, residential buffers |
| Planning feasibility | 0.10 | Historical approval rates, regulatory environment |
| Access logistics | 0.05 | Road access for construction and maintenance |

### Wind Shear Extrapolation (Critical)

NASA POWER returns wind speed at **2m height**. Real turbines operate at 80-120m hub height where wind speeds are significantly higher. Raw 2m data will massively understate site potential and produce misleadingly low scores.

The scoring engine **must** extrapolate wind speed to hub height using the power law wind profile:

```
v_hub = v_ref * (h_hub / h_ref) ^ alpha
```

Where:
- `v_ref` = measured wind speed (from NASA POWER, at 2m)
- `h_ref` = reference height (2m)
- `h_hub` = hub height (configurable, default 80m)
- `alpha` = wind shear exponent (depends on terrain roughness, typically 0.14 for open terrain, 0.25 for suburban, 0.35 for urban)

**Implementation rules:**
- `hubHeightM` must be a configurable parameter on `analyseSite()` and on the `<WindSiteScorer />` component (default: 80)
- `alpha` should be derived from the terrain roughness class already calculated by the terrain scorer - do not hardcode it
- The `FactorScore.detail` string for wind resource must show both the raw 2m speed and the extrapolated hub-height speed, so the user sees the full picture
- The CLI should display both values (e.g. "3.6 m/s at 2m, estimated 7.1 m/s at 80m hub height")
- Add a `windShearAlpha` field to `AnalysisMetadata` so consumers know what exponent was used
- Unit tests must cover: open terrain alpha, suburban alpha, edge case where h_ref equals h_hub (should return v_ref unchanged)

### Scoring Rules

- Each factor produces a normalised score from 0 to 100
- Weights are user-adjustable but must always sum to 1.0
- Composite score = weighted sum of factor scores
- Any factor scoring below 20 triggers a **hard constraint flag** (e.g. site is in a protected habitat), surfaced prominently in the UI regardless of composite score
- The engine NEVER outputs a binary "yes/no" recommendation. It always presents a scored breakdown with trade-offs for the human to interpret.

### Key Types

```typescript
interface SiteAnalysis {
  coordinate: LatLng;
  compositeScore: number;          // 0-100
  factors: FactorScore[];
  hardConstraints: Constraint[];   // Blocking issues
  warnings: Warning[];             // Non-blocking risks
  metadata: AnalysisMetadata;      // Data freshness, sources used
}

interface FactorScore {
  factor: ScoringFactor;
  score: number;                   // 0-100
  weight: number;                  // 0-1
  weightedScore: number;
  detail: string;                  // Human-readable explanation
  dataSource: string;
  confidence: 'high' | 'medium' | 'low';
}

interface ScoringWeights {
  windResource: number;
  terrainSuitability: number;
  gridProximity: number;
  landUseCompatibility: number;
  planningFeasibility: number;
  accessLogistics: number;
}
```

---

## UI Components

All components must be exportable and independently usable. They accept data via props, not internal fetching.

### Primary Components

| Component | Purpose |
|-----------|---------|
| `<WindSiteScorer />` | Top-level orchestrator. Renders map, controls, and results. This is the "drop it in and it works" component. |
| `<SiteMap />` | Interactive map with click-to-analyse and heatmap overlay |
| `<ScoreCard />` | Displays composite score and per-factor breakdown |
| `<WeightSliders />` | Lets users adjust scoring weights with real-time recalculation |
| `<ScenarioCompare />` | Side-by-side comparison of two or more analysed sites |
| `<WindRose />` | Directional wind frequency visualisation (16-point compass, Recharts RadarChart) |
| `<WindTrendChart />` | Line chart of monthly average wind speed from 1981 to present. Shows long-term trend with optional linear regression overlay. |
| `<SeasonalHeatmap />` | Month (x-axis) vs year (y-axis) heatmap colour-coded by average wind speed. Instantly reveals seasonal patterns and multi-year shifts. |
| `<MonthlyBoxPlot />` | Box plot for each calendar month showing min, Q1, median, Q3, max wind speed across all years. Shows intra-month variability. |
| `<DiurnalProfile />` | 24-hour line chart showing average wind speed by hour of day. Requires hourly data for a user-selected period. |
| `<WindSpeedDistribution />` | Histogram of wind speed frequency (Weibull distribution fit). Critical for energy yield estimation. |
| `<ExportButton />` | Generates a PDF summary of the analysis including all charts |

### Component Rules

- Every component must accept a `className` prop for external styling
- Every component must accept a `theme` prop that overrides CSS custom properties
- No component may call an external API directly - all data flows through hooks that call core
- All components must be accessible (proper ARIA labels, keyboard navigation)
- Loading and error states are mandatory, not optional

---

## Consumption Modes

### 1. Drop-in Widget

```tsx
import { WindSiteScorer } from '@jamieblair/wind-site-intelligence';

<WindSiteScorer
  defaultCenter={{ lat: 55.86, lng: -4.25 }}
  defaultZoom={8}
  weights={{ windResource: 0.4, terrainSuitability: 0.2 }}
  theme={{ primary: '#0f172a', accent: '#22c55e' }}
  onAnalysisComplete={(analysis) => console.log(analysis)}
/>
```

### 2. Headless SDK

```typescript
import { analyseSite, fetchWindData } from '@jamieblair/wind-site-intelligence/core';

const windData = await fetchWindData({ lat: 55.86, lng: -4.25 });
const analysis = await analyseSite({
  coordinate: { lat: 55.86, lng: -4.25 },
  weights: defaultWeights,
});
```

---

## Coding Standards

- **No `any` types.** Ever. Use `unknown` and narrow with type guards if needed.
- **No default exports.** Named exports only across the entire codebase.
- **No barrel file re-exports** beyond the package entry points (`core/index.ts`, `ui/index.ts`).
- **Functions over classes** unless there is a clear lifecycle reason.
- **Errors are explicit.** Scoring functions return `Result<T, ScoringError>` types, not thrown exceptions.
- **No em dashes in comments, docs, or UI copy.** Use commas, colons, or parentheses instead.
- **All numbers include units in variable names** (e.g. `distanceKm`, `speedMs`, `elevationM`).
- **Test every scoring function.** If it affects the score, it has a test.

---

## Implementation Phases

Build in this order. Each phase must be testable and demonstrable before moving to the next.

### Phase 1: Core Scoring Engine
- Set up monorepo with Turborepo + pnpm
- Implement NASA POWER API client with caching
- Build wind resource scoring factor
- Build terrain scoring factor using elevation data
- Create composite scoring engine with adjustable weights
- Write unit tests for all scoring logic
- **Milestone:** CLI or script that takes a lat/lng and prints a scored breakdown

### Phase 2: Map UI
- **Before building UI:** Implement wind shear extrapolation in core (see "Wind Shear Extrapolation" section). This changes the wind resource scores and must be in place before users see results on a map.
- Implement `<SiteMap />` with Leaflet
- Click-to-analyse interaction
- Basic `<ScoreCard />` display
- `<WeightSliders />` with real-time recalculation
- **Performance requirement:** Live API calls take ~5 seconds. The UI must not block during analysis. Show terrain score instantly (elevation data is fast), then stream in wind data. Display a loading indicator on the map pin itself (not a global spinner) so the user knows which location is being scored. Consider pre-fetching a coarse grid for the visible map area to reduce perceived latency on click.
- **Milestone:** Demo app where you click a map location and see scores with extrapolated hub-height wind speeds

### Phase 3: Data Enrichment

Phase 1 and 2 are complete. The core scoring engine works with wind shear extrapolation, terrain analysis, and a Leaflet map UI with click-to-analyse. Four scoring factors are still placeholders at a neutral 50: Grid Proximity, Land Use Compatibility, Planning Feasibility, and Access Logistics. This phase replaces those placeholders with real data.

**Current state of the codebase:**
- `packages/core/src/datasources/` contains `nasa-power.ts` and `open-elevation.ts` - follow the same patterns for new data source clients
- `packages/core/src/scoring/` contains `wind-resource.ts` and `terrain.ts` - follow the same patterns for new scorers
- `packages/core/src/scoring/engine.ts` calls scorers in parallel and assembles `SiteAnalysis` - new scorers plug into this
- 73 tests passing across core - maintain or exceed this count
- All data source clients use retry with exponential backoff and in-memory caching - new clients must do the same

#### Step 1: Grid Proximity Scorer

**Data source:** OpenStreetMap Overpass API (https://overpass-api.de/api/interpreter)

Create `packages/core/src/datasources/osm-overpass.ts`:
- Query for power infrastructure within a search radius of the target coordinate
- Fetch two categories separately:
  - **Transmission lines:** `power=line` with `voltage >= 132000` (132kV+ is grid-scale)
  - **Substations:** `power=substation`
- Use a bounding box query, not a radius query (Overpass is faster with bbox)
- Default search radius: 50km. If nothing found, expand to 100km and set confidence to 'medium'
- Return structured results: `{ nearestLineDistanceKm: number, nearestSubstationDistanceKm: number, lineCount: number, substationCount: number, searchRadiusKm: number }`

**Overpass API specifics:**
- Endpoint: `https://overpass-api.de/api/interpreter` (POST with `data=` form body)
- The API is **rate-limited and slow** (2-15 seconds typical). Set a timeout of 20 seconds.
- If the query times out, return a graceful failure, not a thrown error. Use the existing `Result<T, ScoringError>` pattern.
- Cache Overpass results aggressively (TTL: 24 hours minimum). Grid infrastructure doesn't change daily.
- Example Overpass QL for transmission lines within a bbox:
  ```
  [out:json][timeout:20];
  (
    way["power"="line"]["voltage"~"^[1-9][0-9]{5,}$"](south,west,north,east);
  );
  out center;
  ```
- Example for substations:
  ```
  [out:json][timeout:20];
  (
    node["power"="substation"](south,west,north,east);
    way["power"="substation"](south,west,north,east);
  );
  out center;
  ```

Create `packages/core/src/scoring/grid-proximity.ts`:
- Score based on distance to nearest transmission line AND nearest substation
- Scoring thresholds:
  - < 5km to both: 90-100 (excellent, minimal connection cost)
  - 5-15km: 70-89 (good, reasonable connection)
  - 15-30km: 40-69 (moderate, significant cable run)
  - 30-50km: 20-39 (poor, major infrastructure investment)
  - > 50km or no infrastructure found: 0-19 (hard constraint territory)
- Weight substations slightly higher than lines (a nearby substation matters more than a passing line)
- Detail string must include: distance to nearest line, distance to nearest substation, count of infrastructure within radius
- If Overpass timed out, score 50 with confidence 'low' and a detail string saying "Grid data unavailable (API timeout), using neutral score"

#### Step 2: Land Use Compatibility Scorer

**Data source:** OpenStreetMap Overpass API (same endpoint, different queries)

Add land use queries to `osm-overpass.ts` (or create a separate `osm-landuse.ts` if the file gets too large):
- Query for land use designations at and around the target coordinate
- Fetch these categories:
  - **Hard constraints (score 0, flag immediately):**
    - `leisure=nature_reserve`
    - `boundary=protected_area`
    - `landuse=military`
    - `aeroway=*` (airports, runways, helipads)
    - `landuse=cemetery`
  - **Soft constraints (reduce score):**
    - `landuse=residential` within 500m (noise buffer)
    - `natural=water` or `waterway=*` (complicates foundation work)
    - `landuse=forest` (tree clearing required)
  - **Positive indicators (increase score):**
    - `landuse=farmland` (ideal for turbines, dual use)
    - `landuse=meadow` or `landuse=grass`
    - `natural=heath` or `natural=scrub`

Create `packages/core/src/scoring/land-use.ts`:
- If any hard constraint is present at the coordinate: score 0, add to `hardConstraints[]` array with a clear explanation
- For soft constraints within the search area: deduct points proportionally
- For positive indicators: boost score
- Default (no OSM data): score 50, confidence 'low'
- Detail string must list what was found: "Farmland (positive), residential area 380m away (noise buffer concern), no protected areas detected"
- Search radius for land use: 2km around the coordinate

#### Step 3: Planning Feasibility Scorer

This factor cannot be fully automated with free APIs, but we can provide a useful estimate.

Create `packages/core/src/scoring/planning.ts`:
- This scorer uses a **heuristic approach** combining signals from the other data sources:
  - Country/region context: use reverse geocoding from OSM Nominatim (`https://nominatim.openstreetmap.org/reverse`) to determine the country. Some countries have more favourable wind energy planning frameworks.
  - Proximity to existing wind farms: query Overpass for `generator:source=wind` within 20km. If existing turbines are nearby, planning precedent exists (boost score).
  - Population density proxy: count residential and commercial land use tags within 5km. Higher density = harder planning.
- Scoring:
  - Existing wind farms nearby + low density + favourable country: 70-90
  - Some positive signals: 50-69
  - High density or restrictive indicators: 20-49
  - Cannot determine: 50 with confidence 'low'
- Detail string must be honest about what this is: "Estimated planning feasibility based on proximity to existing wind installations, population density, and regional context. This is not a substitute for formal planning assessment."
- **Nominatim usage rule:** respect the 1 request/second rate limit. Add a minimum 1-second delay between Nominatim calls. Include a `User-Agent` header identifying the application (required by Nominatim ToS).

#### Step 4: Access Logistics Scorer

Create `packages/core/src/scoring/access.ts`:
- Query Overpass for roads within 5km of the coordinate:
  - `highway=motorway|trunk|primary` (excellent access)
  - `highway=secondary|tertiary` (good access)
  - `highway=unclassified|track` (poor access, may need upgrades)
- Score based on the best road category within proximity:
  - Primary/trunk road within 2km: 80-100
  - Secondary road within 5km: 60-79
  - Only tracks or unclassified: 30-59
  - No roads found within 5km: 0-29 (hard constraint for construction vehicle access)
- Detail string: "Nearest major road: A838 (primary), 1.2km away. 3 secondary roads within 5km."

#### Step 5: Wire New Scorers into Engine

Update `packages/core/src/scoring/engine.ts`:
- Replace all four placeholder scorers with the real implementations
- **All new data fetches must run in parallel** with existing wind and terrain fetches. Do not make them sequential. Use `Promise.allSettled()` so one failing source doesn't block the others.
- If any data source fails or times out: use neutral score (50) with confidence 'low' and a clear detail string explaining the failure. Never let a single API failure break the entire analysis.
- Update `AnalysisMetadata` to include which sources succeeded and which failed

#### Step 6: Update CLI Output

- The CLI should show the new real scores and detail strings
- Add a summary line at the bottom if any hard constraints were flagged: "⚠ HARD CONSTRAINTS DETECTED: [list]"
- Add a summary of data source health: "Data sources: 5/6 succeeded, 1 timed out (Overpass grid query)"

#### Step 7: `<WindRose />` Component

Create `packages/ui/src/components/WindRose.tsx`:
- Polar chart showing wind direction frequency distribution
- Use Recharts `RadarChart` or a custom SVG (Recharts preferred for consistency)
- Data comes from NASA POWER directional data (already available from the wind data fetch, may need to extend the API client to request directional breakdown by month)
- 16-point compass rose (N, NNE, NE, ENE, E, etc.)
- Colour-coded by wind speed bands at each direction
- Must accept `className` and `theme` props
- Include it in the `<ScoreCard />` display, below the wind resource factor

#### Step 8: Tests

New tests required (add to existing test files or create new ones as appropriate):
- `osm-overpass.test.ts`: mock Overpass responses, test bbox calculation, test timeout handling, test empty results, test malformed responses
- `grid-proximity.test.ts`: test all distance thresholds, test when no infrastructure found, test when only lines found (no substations), test Overpass timeout fallback
- `land-use.test.ts`: test hard constraint detection (each type), test soft constraint scoring, test positive indicator boosting, test mixed results, test empty area
- `planning.test.ts`: test with existing wind farms nearby, test high density area, test unknown region fallback
- `access.test.ts`: test each road category, test no roads found, test multiple road types present
- `wind-rose` related: test directional data parsing, test 16-point bucketing

All existing 73 tests must continue to pass. Target: 120+ total tests after Phase 3.

#### Overpass API Resilience (Critical)

The Overpass API is the biggest risk in this phase. It is free, public, and unreliable under load. Implement these safeguards:
- **Batch queries:** combine grid, land use, and road queries into a single Overpass request where possible (one large query is better than three small ones for rate limiting)
- **Timeout handling:** 20-second timeout per query. On timeout, degrade gracefully to neutral scores.
- **Retry:** maximum 1 retry on failure (not 3, because Overpass rate limits aggressively). Wait 5 seconds before retry.
- **Caching:** cache all Overpass results for 24 hours minimum. Infrastructure and land use data does not change frequently.
- **Fallback messaging:** if all Overpass queries fail, the analysis must still complete with wind and terrain scores. The UI must clearly indicate which factors have real data and which are degraded.

**Milestone:** CLI returns a full 6-factor analysis with real data for all factors. Running Glasgow (55.86, -4.25) vs Durness (58.21, -5.03) shows meaningful differentiation across all factors, not just wind and terrain. Hard constraints are flagged when present. WindRose renders in the demo app.

### Phase 4: Historical Data Expansion and Charts

Phase 3 is complete. All 6 scoring factors return real data, 204 tests pass, WindRose renders in the demo app. This phase expands the NASA POWER integration to pull the full historical record (1981-present) and builds chart components to visualise that data.

**Current state of the codebase:**
- `packages/core/src/datasources/nasa-power.ts` fetches 10-year monthly averages for WS2M and WD2M
- `packages/core/src/scoring/wind-resource.ts` uses wind shear extrapolation from 2m to hub height
- `packages/ui/src/components/WindRose.tsx` renders a 16-point compass rose with Recharts
- 204 tests passing across core and UI

#### Step 1: Expand NASA POWER Client

Update `packages/core/src/datasources/nasa-power.ts`:

**Add new fetch functions (do not break existing ones):**

```typescript
// Full monthly history from 1981 to present
export async function fetchMonthlyWindHistory(
  coord: LatLng,
  options?: { startYear?: number; endYear?: number }
): Promise<Result<MonthlyWindHistory, DataSourceError>>

// Daily data for a user-selected window (max 5 years)
export async function fetchDailyWindData(
  coord: LatLng,
  startDate: string,  // YYYYMMDD
  endDate: string      // YYYYMMDD
): Promise<Result<DailyWindData, DataSourceError>>

// Hourly data for diurnal profile (max 1 year)
export async function fetchHourlyWindData(
  coord: LatLng,
  startDate: string,
  endDate: string
): Promise<Result<HourlyWindData, DataSourceError>>
```

**Parameters to request in all new functions:** `WS2M,WS10M,WS50M,WD10M,WD50M`

**New types** (add to `packages/core/src/types/`):

```typescript
interface MonthlyWindRecord {
  year: number;
  month: number;                // 1-12
  ws2m: number;                 // m/s at 2m
  ws10m: number;                // m/s at 10m
  ws50m: number;                // m/s at 50m
  wd10m: number;                // degrees
  wd50m: number;                // degrees
  wsHubHeight: number;          // extrapolated to configured hub height
}

interface MonthlyWindHistory {
  coordinate: LatLng;
  records: MonthlyWindRecord[];
  startYear: number;
  endYear: number;
  hubHeightM: number;
  windShearAlpha: number;
  totalMonths: number;
}

interface DailyWindRecord {
  date: string;                 // YYYY-MM-DD
  ws2m: number;
  ws10m: number;
  ws50m: number;
  wd10m: number;
  wsHubHeight: number;
}

interface DailyWindData {
  coordinate: LatLng;
  records: DailyWindRecord[];
  hubHeightM: number;
}

interface HourlyWindRecord {
  datetime: string;             // ISO 8601
  hour: number;                 // 0-23
  ws2m: number;
  ws10m: number;
  ws50m: number;
  wd10m: number;
  wsHubHeight: number;
}

interface HourlyWindData {
  coordinate: LatLng;
  records: HourlyWindRecord[];
  hubHeightM: number;
}
```

**Extrapolation update:** when `WS50M` data is present and non-zero, use 50m as the reference height for power law extrapolation instead of 2m. Update `wind-shear.ts` to accept a `referenceHeightM` parameter (default 2, override to 50 when available). This produces significantly more accurate hub-height estimates. Every `MonthlyWindRecord`, `DailyWindRecord`, and `HourlyWindRecord` must include the pre-calculated `wsHubHeight` field.

**Caching strategy for historical data:**
- Monthly history (1981-present): cache for 7 days. This data is static except for the most recent months.
- Daily data: cache for 24 hours.
- Hourly data: cache for 24 hours.
- Use a separate cache namespace per temporal resolution to avoid key collisions.

**Large response handling:** the monthly endpoint for 1981-present returns ~500 months of data per parameter. This is a large JSON response. Ensure the client handles it without blocking the UI thread. If running in a browser context, consider processing in chunks or using a web worker (optional optimisation, not required for Phase 4).

#### Step 2: Wind Analysis Module

Create `packages/core/src/analysis/wind-analysis.ts`:

This module takes raw historical data and computes derived statistics for charting. It does NOT render charts - it produces chart-ready data structures.

```typescript
// Long-term trend analysis
export function computeWindTrend(
  history: MonthlyWindHistory
): WindTrendData

// Seasonal pattern analysis
export function computeSeasonalHeatmap(
  history: MonthlyWindHistory
): SeasonalHeatmapData

// Monthly variability statistics
export function computeMonthlyBoxPlots(
  history: MonthlyWindHistory
): MonthlyBoxPlotData

// Diurnal (hourly) profile
export function computeDiurnalProfile(
  hourlyData: HourlyWindData
): DiurnalProfileData

// Wind speed frequency distribution (Weibull fit)
export function computeSpeedDistribution(
  dailyData: DailyWindData
): WindSpeedDistributionData

// Year-over-year comparison
export function computeYearOverYear(
  history: MonthlyWindHistory
): YearOverYearData
```

**WindTrendData type:**
```typescript
interface WindTrendData {
  monthly: Array<{ year: number; month: number; wsHubHeight: number }>;
  annualAverages: Array<{ year: number; wsHubHeight: number }>;
  linearRegression: { slope: number; intercept: number; rSquared: number };
  trendDirection: 'increasing' | 'decreasing' | 'stable';
  trendMagnitude: number;       // m/s per decade
  summary: string;              // "Wind speed at this site has increased by 0.3 m/s per decade since 1981"
}
```

**SeasonalHeatmapData type:**
```typescript
interface SeasonalHeatmapData {
  cells: Array<{ year: number; month: number; wsHubHeight: number }>;
  minSpeed: number;
  maxSpeed: number;
  bestSeason: string;           // "Winter (Dec-Feb)"
  worstSeason: string;          // "Summer (Jun-Aug)"
}
```

**MonthlyBoxPlotData type:**
```typescript
interface MonthlyBoxPlotData {
  months: Array<{
    month: number;              // 1-12
    label: string;              // "Jan", "Feb", etc.
    min: number;
    q1: number;
    median: number;
    q3: number;
    max: number;
    mean: number;
    outliers: number[];
  }>;
}
```

**DiurnalProfileData type:**
```typescript
interface DiurnalProfileData {
  hours: Array<{
    hour: number;               // 0-23
    avgSpeed: number;
    minSpeed: number;
    maxSpeed: number;
  }>;
  peakHour: number;
  troughHour: number;
  summary: string;              // "Wind peaks at 14:00 (8.2 m/s) and is weakest at 06:00 (4.1 m/s)"
}
```

**WindSpeedDistributionData type:**
```typescript
interface WindSpeedDistributionData {
  bins: Array<{ speedMin: number; speedMax: number; frequency: number }>;
  weibullK: number;             // shape parameter
  weibullC: number;             // scale parameter
  meanSpeed: number;
  medianSpeed: number;
  summary: string;              // "Weibull distribution: k=2.1, c=7.8 m/s. Good consistency."
}
```

All analysis functions must be **pure functions** - take data in, return results out, no side effects, no API calls. This makes them trivially testable.

#### Step 3: Chart Components

All chart components use **Recharts** for consistency with the existing WindRose. All must accept `className`, `theme`, `width`, and `height` props. All must handle empty data gracefully (show a "No data available" state, never crash).

Create in `packages/ui/src/components/`:

**`WindTrendChart.tsx`**
- Recharts `LineChart` with monthly data points
- X-axis: time (year/month). Y-axis: wind speed at hub height (m/s)
- Annual average overlay as a thicker line
- Optional linear regression trend line (dashed)
- Tooltip showing exact values on hover
- Props: `data: WindTrendData`, `showRegression?: boolean`, `showAnnualAverage?: boolean`

**`SeasonalHeatmap.tsx`**
- Grid of coloured cells: months (Jan-Dec) on x-axis, years on y-axis
- Colour scale from blue (low wind) to red (high wind)
- Custom implementation using SVG rectangles (Recharts doesn't have a native heatmap)
- Tooltip on cell hover showing year, month, and exact speed
- Props: `data: SeasonalHeatmapData`, `colorScale?: [string, string]`

**`MonthlyBoxPlot.tsx`**
- Recharts `ComposedChart` with custom box plot rendering
- One box per calendar month (12 boxes total)
- Show median line, Q1-Q3 box, whiskers to min/max, outlier dots
- Props: `data: MonthlyBoxPlotData`

**`DiurnalProfile.tsx`**
- Recharts `AreaChart` showing average wind speed by hour
- Shaded band between min and max
- Highlight peak and trough hours
- Props: `data: DiurnalProfileData`

**`WindSpeedDistribution.tsx`**
- Recharts `BarChart` showing frequency histogram
- Weibull curve overlay as a smooth line
- Annotate mean and median
- Props: `data: WindSpeedDistributionData`, `showWeibullFit?: boolean`

#### Step 4: Integrate Charts into Demo App

- Add a new "Analysis" tab/section in the demo app below the ScoreCard
- When a site is analysed, automatically fetch the full monthly history (1981-present)
- Render `<WindTrendChart />`, `<SeasonalHeatmap />`, `<MonthlyBoxPlot />`, and `<WindSpeedDistribution />` using the monthly data
- Add a "Detailed Analysis" button that fetches daily data for the last 5 years and hourly data for the last year, then renders `<DiurnalProfile />` and updates the distribution chart with daily granularity
- Charts should load progressively - show the ones that have data as soon as it arrives, don't wait for all fetches to complete
- Each chart must have a loading skeleton while its data is being fetched

#### Step 5: Update Scoring Engine to Use 50m Data

- Update `analyseSite()` to request `WS50M` in addition to `WS2M`
- When `WS50M` is available, pass `referenceHeightM: 50` to the wind shear extrapolation
- Update the `FactorScore.detail` string to show all three heights: "4.3 m/s at 2m, 7.2 m/s at 50m, estimated 9.0 m/s at 80m hub height"
- Update CLI to display all three heights

#### Step 6: Tests

New tests required:
- `nasa-power-extended.test.ts`: mock monthly/daily/hourly responses, test date range validation, test 50m fallback to 2m, test large response parsing
- `wind-analysis.test.ts`: test each analysis function with known data, test edge cases (single month, single year, missing months), test linear regression calculation, test Weibull parameter estimation, test diurnal peak/trough detection
- `chart-components.test.ts`: test rendering with valid data, test empty data handling, test prop variations (with/without regression line, etc.)

All existing 204 tests must continue to pass. Target: 260+ total tests after Phase 4.

**Milestone:** Clicking a location in the demo app shows the full scorecard PLUS 5 historical charts loaded progressively. The WindTrendChart for Durness shows 44 years of wind data. The SeasonalHeatmap clearly shows winter is windier than summer. The CLI displays 2m, 50m, and hub-height speeds. Scoring accuracy improves from using 50m reference data.

### Phase 5: Comparison, Export, and Publish

#### Step 1: `<ScenarioCompare />` Component

Create `packages/ui/src/components/ScenarioCompare.tsx`:
- Side-by-side comparison of 2-4 analysed sites
- Each site shows: composite score, per-factor breakdown bars, key metrics (hub-height wind speed, terrain score, grid distance)
- Highlight which site wins on each factor (green) and which loses (amber/red)
- Include a "Winner" summary based on current weights
- Charts comparison: overlay WindTrendCharts for multiple sites on the same axes
- Props: `sites: SiteAnalysis[]`, `histories?: MonthlyWindHistory[]`

#### Step 2: Heatmap Overlay

Update `<SiteMap />`:
- Add a heatmap layer showing regional suitability
- Pre-calculate scores on a coarse grid (e.g. every 0.25 degrees) for the visible map area
- Colour-code from red (poor) to green (excellent)
- This runs in the background and does NOT block click-to-analyse
- Toggle on/off via a map control button
- Performance: limit to ~100 grid points visible at once, debounce on pan/zoom

#### Step 3: PDF Export

Update `<ExportButton />`:
- Generate a comprehensive PDF report using a client-side PDF library (jsPDF + html2canvas, or react-pdf)
- Report contents:
  - Header with site coordinates, analysis date, hub height configuration
  - Composite score and per-factor breakdown table
  - Hard constraints and warnings section
  - WindRose chart
  - WindTrendChart
  - SeasonalHeatmap
  - MonthlyBoxPlot
  - Wind speed distribution
  - Data sources and confidence levels
  - Footer with disclaimer: "This analysis is for informational purposes only and does not constitute engineering advice. On-site measurement campaigns are required for formal site assessment."
- Props: `analysis: SiteAnalysis`, `history?: MonthlyWindHistory`, `charts?: RenderedChartImages`
- Charts must be rendered to canvas images before PDF insertion

#### Step 4: npm Publish Pipeline

- Configure `tsup` build for both `core` and `ui` packages
- Ensure `package.json` for each package has correct `main`, `module`, `types`, `exports` fields
- Add `files` whitelist to avoid publishing test files and dev dependencies
- Add `prepublishOnly` script that runs tests and build
- Add a `CHANGELOG.md` at root
- Add GitHub Actions workflow: test → build → publish on tag push
- Publish scope: `@jamieblair/wind-site-intelligence-core` and `@jamieblair/wind-site-intelligence-ui`

#### Step 5: Documentation

Create/update `docs/`:
- `README.md` at root: project overview, quick start, installation
- `docs/API.md`: full API reference for core (every exported function, type, and interface)
- `docs/COMPONENTS.md`: every UI component with props table and usage examples
- `docs/DATA-SOURCES.md`: list of all APIs used, their limitations, rate limits, and data freshness
- `docs/ARCHITECTURE.md`: package structure, data flow diagram, design decisions
- Add inline JSDoc comments to all public exports in core and ui

#### Step 6: Demo Site Deployment

- Configure the demo app for deployment to `wind.jamieblair.co.uk` (or a path on the main site)
- Add meta tags, OpenGraph tags, and a favicon
- Add a landing section above the map explaining what the tool does and who it's for
- Add a "Built by Jamie Blair" footer linking to jamieblair.co.uk
- Ensure the demo works on mobile (responsive map and charts)

#### Step 7: MCP Server Wrapper (Optional Extension)

Create `packages/mcp/` (optional, if time permits):
- Wrap `analyseSite()`, `fetchWindData()`, and `fetchMonthlyWindHistory()` as MCP tools
- Use the MCP SDK (`@modelcontextprotocol/sdk`)
- This allows any LLM (including Claude) to call the scoring engine as a tool
- Minimal implementation: 3 tools, stdio transport, no auth required

**Milestone:** Two sites can be compared side-by-side with chart overlays. A PDF report exports with all charts and scores. The npm packages are published and installable. The demo site is live and responsive. Documentation covers the full API surface.

---

## What NOT To Build

- Do not build user authentication. This is a tool, not a platform.
- Do not build a database layer. All analysis is ephemeral unless the consumer persists it.
- Do not build a backend API. The core runs entirely client-side (or in any JS runtime).
- Do not make placement decisions. The tool scores and informs. Humans decide.

---

## Key Reminders for Copilot

- When generating code, always check which package you are in. Core must never import from ui. UI may import from core.
- When writing UI components, always include loading and error states.
- When writing data-fetching logic, always include retry logic and caching.
- When writing scoring logic, always return confidence levels alongside scores.
- When writing tests, cover edge cases: missing data, API timeouts, extreme coordinates, zero-weight factors.
- Prefer composition over configuration. Small, focused functions composed together beat large configurable ones.
