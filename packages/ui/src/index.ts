// Public API surface for @jamieblair/wind-site-intelligence

// ─── Components ───

/** All-in-one site scoring widget with map, inputs, score card and sliders. */
export { WindSiteScorer } from './components/index.js';
/** Displays composite score and factor breakdown for a single site analysis. */
export { ScoreCard } from './components/index.js';
export type { ScoreCardProps } from './components/ScoreCard.js';
/** Interactive Leaflet map with click-to-analyse, markers and optional heatmap overlay. */
export { SiteMap } from './components/index.js';
/** Range sliders for adjusting the six scoring factor weights. */
export { WeightSliders } from './components/index.js';
export type { WeightSlidersProps } from './components/WeightSliders.js';
/** Polar radar chart showing wind direction frequency by speed band. */
export { WindRose } from './components/index.js';
export type { WindRoseProps, WindRoseDirectionData, WindSpeedBand, CompassDirection } from './components/WindRose.js';
export { DEFAULT_WIND_BANDS, COMPASS_DIRECTIONS, degreesToCompass, emptyRoseData } from './components/WindRose.js';
/** Line chart showing monthly wind speed trend with linear regression overlay. */
export { WindTrendChart } from './components/index.js';
export type { WindTrendChartProps } from './components/WindTrendChart.js';
/** SVG heatmap of average wind speed by month × hour of day. */
export { SeasonalHeatmap } from './components/index.js';
export type { SeasonalHeatmapProps } from './components/SeasonalHeatmap.js';
/** Box-and-whisker plot of monthly wind speed distributions. */
export { MonthlyBoxPlot } from './components/index.js';
export type { MonthlyBoxPlotProps } from './components/MonthlyBoxPlot.js';
/** Area chart showing mean/min/max wind speed by hour of day. */
export { DiurnalProfile } from './components/index.js';
export type { DiurnalProfileProps } from './components/DiurnalProfile.js';
/** Bar chart of wind speed frequency distribution with Weibull curve fit. */
export { WindSpeedDistribution } from './components/index.js';
export type { WindSpeedDistributionProps } from './components/WindSpeedDistribution.js';
/** Side-by-side comparison table for up to 4 site analyses with optional trend overlay. */
export { ScenarioCompare } from './components/index.js';
export type { ScenarioCompareProps } from './components/ScenarioCompare.js';
/** Button that generates a PDF report from a SiteAnalysis, optionally including chart screenshots. */
export { ExportButton } from './components/index.js';
export type { ExportButtonProps } from './components/ExportButton.js';
export type { HeatmapPoint } from './components/SiteMap.js';

// ─── Hooks ───

/** React hook for running site analysis with loading/error state management. */
export { useSiteScore } from './hooks/index.js';
/** React hook for managing map pin state and click interactions. */
export { useMapInteraction } from './hooks/index.js';
export type { MapPin } from './hooks/index.js';
/** React hook for fetching wind data at multiple temporal resolutions. */
export { useWindData } from './hooks/index.js';

// ─── Theme ───

/** Theme configuration type for customising component colours and fonts. */
export type { WindSiteTheme } from './styles/theme.js';
/** Default theme values and CSS custom property generator. */
export { DEFAULT_THEME, themeToCSS } from './styles/theme.js';
