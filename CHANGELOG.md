# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0] - 2026-03-30

### Added

- **Core Scoring Engine**: 6-factor weighted scoring system (wind resource, terrain suitability, grid proximity, land use compatibility, planning feasibility, access logistics)
- **NASA POWER Integration**: Multi-height wind data (2m, 10m, 50m) with monthly, daily, and hourly temporal resolutions from 1981 to present
- **Wind Shear Extrapolation**: Power law wind profile extrapolation from reference height to configurable hub height (default 80m), using terrain-derived roughness alpha
- **Data Sources**: NASA POWER API, Open-Elevation API, OpenStreetMap Overpass API, OSM Nominatim
- **Wind Analysis Module**: Pure functions for trend analysis (linear regression), seasonal heatmaps, monthly box plots, diurnal profiles, speed distribution (Weibull fit), year-over-year comparison
- **React Components**: WindSiteScorer, SiteMap (Leaflet with heatmap overlay), ScoreCard, WeightSliders, WindRose, WindTrendChart, SeasonalHeatmap, MonthlyBoxPlot, DiurnalProfile, WindSpeedDistribution, ScenarioCompare, ExportButton (PDF)
- **Hooks**: useSiteScore, useMapInteraction, useWindData
- **Demo App**: Next.js 15 App Router with progressive chart loading
- **250 tests** across 16 test files
- **CI/CD**: GitHub Actions workflow for test, build, and npm publish on tag push
