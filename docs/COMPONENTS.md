# Components

UI components from `@jamieblair/windforge`.

All components accept `className` for external styling. Chart components accept `width` and `height` props. All handle empty/missing data gracefully.

---

## WindSiteScorer

Top-level orchestrator. Renders map, coordinate inputs, weight sliders, and score card.

```tsx
import { WindSiteScorer } from '@jamieblair/windforge';

<WindSiteScorer
  defaultCenter={{ lat: 55.86, lng: -4.25 }}
  defaultZoom={8}
  hubHeightM={80}
  weights={{ windResource: 0.4, terrainSuitability: 0.2 }}
  theme={{ primary: '#0f172a', accent: '#22c55e' }}
  onAnalysisComplete={(analysis) => console.log(analysis)}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `defaultCenter` | `LatLng` | `{ lat: 55.86, lng: -4.25 }` | Initial map center |
| `defaultZoom` | `number` | `8` | Initial zoom level |
| `hubHeightM` | `number` | `80` | Hub height for wind shear extrapolation |
| `weights` | `Partial<ScoringWeights>` | Default weights | Initial scoring weights |
| `theme` | `Partial<WindSiteTheme>` | Default theme | Theme overrides |
| `onAnalysisComplete` | `(analysis: SiteAnalysis) => void` | - | Callback after analysis |
| `className` | `string` | - | CSS class |

---

## SiteMap

Interactive Leaflet map with click-to-analyse and optional heatmap overlay.

```tsx
import { SiteMap } from '@jamieblair/windforge';

<SiteMap
  center={{ lat: 55.86, lng: -4.25 }}
  zoom={8}
  pin={pin}
  onMapClick={handleClick}
  heatmapPoints={points}
  showHeatmap={true}
  onBoundsChange={handleBoundsChange}
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `center` | `LatLng` | required | Map center |
| `zoom` | `number` | `8` | Zoom level |
| `pin` | `MapPin \| null` | - | Current pin with loading state |
| `onMapClick` | `(coord: LatLng) => void` | required | Click handler |
| `popupContent` | `ReactNode` | - | Popup content for the pin |
| `heatmapPoints` | `HeatmapPoint[]` | - | Grid points for heatmap overlay |
| `showHeatmap` | `boolean` | `true` | Toggle heatmap visibility |
| `onBoundsChange` | `(bounds) => void` | - | Called on pan/zoom (debounced 500ms) |
| `className` | `string` | - | CSS class |
| `style` | `CSSProperties` | - | Inline styles |

---

## ScoreCard

Displays composite score, per-factor breakdown with bars, hard constraints, and warnings.

| Prop | Type | Description |
|------|------|-------------|
| `analysis` | `SiteAnalysis` | The analysis result to display |
| `className` | `string` | CSS class |

---

## WeightSliders

Adjustable sliders for scoring weights with real-time normalisation.

| Prop | Type | Description |
|------|------|-------------|
| `weights` | `ScoringWeights` | Current weights |
| `onChange` | `(weights: ScoringWeights) => void` | Called when weights change |
| `className` | `string` | CSS class |

---

## ScenarioCompare

Side-by-side comparison of 2-4 analysed sites with per-factor breakdown.

```tsx
import { ScenarioCompare } from '@jamieblair/windforge';

<ScenarioCompare sites={[analysis1, analysis2]} />
```

| Prop | Type | Description |
|------|------|-------------|
| `sites` | `SiteAnalysis[]` | Array of 2-4 site analyses to compare |
| `className` | `string` | CSS class |
| `theme` | `Partial<WindSiteTheme>` | Theme overrides |

---

## ExportButton

Generates a PDF report of the analysis with optional chart capture.

```tsx
import { ExportButton } from '@jamieblair/windforge';

<ExportButton
  analysis={analysis}
  chartsContainerRef={chartsRef}
  label="Download Report"
/>
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `analysis` | `SiteAnalysis` | required | Analysis data for the report |
| `chartsContainerRef` | `RefObject<HTMLDivElement>` | - | Ref to DOM element containing charts to capture |
| `label` | `string` | `"Export PDF"` | Button label |
| `className` | `string` | - | CSS class |

---

## WindRose

16-point compass rose showing wind direction frequency distribution.

| Prop | Type | Description |
|------|------|-------------|
| `data` | `WindRoseDirectionData[]` | 16 compass directions with speed band frequencies |
| `bands` | `WindSpeedBand[]` | Speed bands with colors and labels |
| `width` | `number` | Chart width |
| `height` | `number` | Chart height |
| `className` | `string` | CSS class |

---

## WindTrendChart

Line chart showing monthly wind speed trend with linear regression overlay.

```tsx
import { WindTrendChart } from '@jamieblair/windforge';

<WindTrendChart data={trendData} height={300} />
```

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `WindTrendResult` | required | Trend data with points and regression |
| `width` | `number` | `'100%'` | Chart width |
| `height` | `number` | `300` | Chart height |
| `className` | `string` | - | CSS class |

---

## SeasonalHeatmap

Month-by-hour heatmap (SVG) showing wind speed patterns.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SeasonalHeatmapCell[]` | required | 288 cells (12 months x 24 hours) |
| `width` | `number` | `600` | Chart width |
| `height` | `number` | `400` | Chart height |
| `className` | `string` | - | CSS class |

---

## MonthlyBoxPlot

Box-and-whisker plot for each calendar month.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `BoxPlotData[]` | required | 12 box plot entries |
| `width` | `number` | `'100%'` | Chart width |
| `height` | `number` | `300` | Chart height |
| `className` | `string` | - | CSS class |

---

## DiurnalProfile

24-hour area chart showing mean/min/max wind speed by hour.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `DiurnalPoint[]` | required | 24 hourly data points |
| `width` | `number` | `'100%'` | Chart width |
| `height` | `number` | `300` | Chart height |
| `className` | `string` | - | CSS class |

---

## WindSpeedDistribution

Histogram with Weibull distribution curve overlay.

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `data` | `SpeedDistributionResult` | required | Bins and Weibull parameters |
| `width` | `number` | `'100%'` | Chart width |
| `height` | `number` | `300` | Chart height |
| `className` | `string` | - | CSS class |

---

## Hooks

### `useSiteScore()`

```typescript
const { analysis, loading, error, analyse } = useSiteScore();
```

Returns state and an `analyse(options: AnalysisOptions)` function.

### `useMapInteraction()`

```typescript
const { pin, setSelectedCoordinate, setLoading, clearPin } = useMapInteraction();
```

Manages map pin state (coordinate + loading indicator).

### `useWindData()`

```typescript
const { data, loading, error, fetch } = useWindData();
```

Fetches wind data for a coordinate.

---

## Theming

All components accept a `theme` prop of type `Partial<WindSiteTheme>`:

```typescript
interface WindSiteTheme {
  primary: string;      // '#0f172a'
  accent: string;       // '#22c55e'
  background: string;   // '#ffffff'
  surface: string;      // '#f8fafc'
  text: string;         // '#0f172a'
  textSecondary: string; // '#64748b'
  border: string;       // '#e2e8f0'
  error: string;        // '#ef4444'
  warning: string;      // '#f59e0b'
  success: string;      // '#22c55e'
}
```

Theme values map to CSS custom properties (`--wsi-primary`, `--wsi-accent`, etc.) which all components reference.
