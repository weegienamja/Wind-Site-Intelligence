# Wind Site Intelligence

Score and visualise wind turbine site suitability. A decision-support system that surfaces data and insights so human engineers make better-informed placement decisions.

**This is not an AI replacement tool.** It scores geographic locations by combining meteorological, terrain, infrastructure, and regulatory data into a weighted, human-readable analysis.

## Quick Start

### Drop-in React Widget

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

### Headless SDK

```typescript
import { analyseSite, fetchWindData } from '@jamieblair/wind-site-intelligence-core';

const analysis = await analyseSite({
  coordinate: { lat: 55.86, lng: -4.25 },
});

if (analysis.ok) {
  console.log(`Score: ${analysis.value.compositeScore}/100`);
  for (const factor of analysis.value.factors) {
    console.log(`  ${factor.factor}: ${factor.score}/100`);
  }
}
```

### CLI

```bash
npx tsx packages/core/src/cli.ts 55.86 -4.25
```

## Architecture

```
packages/
  core/     Pure TypeScript scoring engine, no React or DOM dependencies
  ui/       React components consuming core
  demo/     Next.js app for development and showcase
```

### Packages

| Package | Description |
|---------|-------------|
| `@jamieblair/wind-site-intelligence-core` | Scoring engine, data source clients, types |
| `@jamieblair/wind-site-intelligence` | React components, charts, PDF export |

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full data flow and design decisions.

## Scoring Factors

| Factor | Default Weight | Description |
|--------|---------------|-------------|
| Wind Resource | 0.35 | Average wind speed, consistency, directional stability |
| Terrain Suitability | 0.20 | Elevation, slope gradient, surface roughness |
| Grid Proximity | 0.15 | Distance to nearest transmission infrastructure |
| Land Use Compatibility | 0.15 | Absence of protected zones, residential buffers |
| Planning Feasibility | 0.10 | Historical approval rates, regulatory environment |
| Access Logistics | 0.05 | Road access for construction and maintenance |

Each factor produces a normalised score from 0 to 100. Weights are user-adjustable and always normalised to sum to 1.0. Any factor scoring below 20 triggers a hard constraint flag.

The engine never outputs a binary "yes/no" recommendation. It always presents a scored breakdown with trade-offs for the human to interpret.

## Data Sources

All data comes from free, publicly accessible APIs. See [docs/DATA-SOURCES.md](docs/DATA-SOURCES.md) for full details on endpoints, rate limits, and caching.

| Data Layer | Source | Provides |
|-----------|--------|----------|
| Wind speed/direction | NASA POWER API | Historical monthly wind data at any lat/lng |
| Terrain/elevation | Open-Elevation API | Elevation, slope, surface roughness |
| Grid infrastructure | OpenStreetMap Overpass API | Proximity to power lines, substations |
| Land use constraints | OpenStreetMap / CORINE | Protected areas, residential zones |

## Development

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Development mode
pnpm dev
```

### Monorepo Tooling

- **Turborepo** for workspace orchestration
- **pnpm** as the package manager
- **TypeScript** everywhere, strict mode
- **Vitest** for unit and integration tests
- **Biome** for linting and formatting

## Components

| Component | Purpose |
|-----------|---------|
| `<WindSiteScorer />` | Top-level orchestrator with coordinate input and results |
| `<SiteMap />` | Leaflet map with click-to-analyse and heatmap overlay |
| `<ScoreCard />` | Composite score and per-factor breakdown display |
| `<WeightSliders />` | Adjustable scoring weights with real-time recalculation |
| `<ScenarioCompare />` | Side-by-side comparison of 2–4 analysed sites |
| `<ExportButton />` | PDF report generation with chart capture |
| `<WindRose />` | Wind direction frequency/speed polar chart |
| `<WindTrendChart />` | Multi-year annual mean wind speed trend line |
| `<SeasonalHeatmap />` | Month × hour heatmap of average wind speed |
| `<MonthlyBoxPlot />` | Monthly wind speed distribution box-and-whisker chart |
| `<DiurnalProfile />` | Average hourly wind speed curve |
| `<WindSpeedDistribution />` | Wind speed frequency histogram with Weibull overlay |

All components accept `className` and `theme` props for styling customisation. See [docs/COMPONENTS.md](docs/COMPONENTS.md) for full props reference and usage examples.

## API Reference

See [docs/API.md](docs/API.md) for the complete core SDK reference covering scoring, data fetching, wind analysis, and type definitions.

## Licence

MIT. Author: Jamie Blair ([jamieblair.co.uk](https://jamieblair.co.uk))
