# Architecture

Wind Site Intelligence uses a **layered architecture** with strict separation between the data/scoring core and the UI layer.

## Package Structure

```
wind-site-intelligence/
├── packages/
│   ├── core/     Pure TypeScript, no React or DOM dependencies
│   ├── ui/       React components consuming core
│   └── demo/     Next.js app for development and showcase
├── docs/         Documentation
├── .github/      CI/CD and Copilot instructions
└── turbo.json    Turborepo pipeline config
```

## Data Flow

```
User clicks map
    │
    ▼
SiteMap ──► useMapInteraction (pin state)
    │
    ▼
useSiteScore ──► analyseSite() [core]
    │
    ├──► fetchWindData()        ──► NASA POWER API
    ├──► fetchElevationData()   ──► Open-Elevation API
    ├──► fetchGridInfra()       ──► Overpass API
    ├──► fetchLandUse()         ──► Overpass API
    ├──► fetchRoadAccess()      ──► Overpass API
    ├──► fetchNearbyWindFarms() ──► Overpass API
    └──► reverseGeocode()       ──► Nominatim API
    │
    ▼ (Promise.allSettled, parallel)
    │
    ├──► windResourceScorer()
    ├──► terrainScorer()
    ├──► gridProximityScorer()
    ├──► landUseScorer()
    ├──► planningScorer()
    └──► accessScorer()
    │
    ▼
SiteAnalysis ──► ScoreCard (display)
    │
    ▼ (optional, triggered after scoring)
    │
    ├──► fetchMonthlyWindHistory() ──► computeWindTrend()
    ├──► fetchDailyWindData()      ──► computeSpeedDistribution()
    └──► fetchHourlyWindData()     ──► computeDiurnalProfile()
    │
    ▼
Chart components (WindTrendChart, SeasonalHeatmap, etc.)
```

## Design Decisions

### Functions over classes

All scoring logic and data fetching uses plain functions. This keeps the code composable and trivially testable without lifecycle management.

### Result types over exceptions

All scoring and data-fetching functions return `Result<T, ScoringError>` instead of throwing exceptions. This forces callers to handle failures explicitly and enables graceful degradation when individual data sources fail.

### Pure analysis functions

The wind analysis module (`computeWindTrend`, `computeMonthlyBoxPlots`, etc.) contains pure functions with no side effects. They take data in and return chart-ready structures, making them independently testable and reusable.

### In-memory caching

Each data source client maintains its own in-memory cache with configurable TTL. Historical data caches longer (7 days for monthly) while volatile data caches shorter (24 hours for daily/hourly). All caches can be cleared programmatically.

### Parallel data fetching

The scoring engine uses `Promise.allSettled()` to fetch from all data sources simultaneously. If any source fails or times out, the analysis still completes with degraded scores (neutral 50, confidence 'low') rather than failing entirely.

## Monorepo Tooling

| Tool | Purpose |
|------|---------|
| Turborepo | Task orchestration, build caching |
| pnpm | Package management with workspaces |
| TypeScript | Type safety, strict mode |
| Vitest | Unit testing |
| Biome | Linting and formatting |
| tsup | Bundling (ESM + CJS + DTS) |
| Next.js | Demo app |
