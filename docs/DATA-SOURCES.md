# Data Sources

All default data comes from free, publicly accessible APIs. No paid API keys required for basic operation. Optional higher-resolution sources (ERA5, CERRA) are available with free registration.

---

## NASA POWER API (Default)

**Endpoint:** `https://power.larc.nasa.gov/api/temporal/`

The primary wind data source. Provides historical wind speed and direction data from 1981 to near real-time at a global scale.

### Parameters Used

| Parameter | Description |
|-----------|-------------|
| `WS2M` | Wind speed at 2 metres (m/s) |
| `WS10M` | Wind speed at 10 metres (m/s) |
| `WS50M` | Wind speed at 50 metres (m/s) |
| `WD10M` | Wind direction at 10 metres (degrees) |
| `WD50M` | Wind direction at 50 metres (degrees) |

### Temporal Resolutions

| Resolution | URL Pattern | Date Range | Cache TTL |
|------------|------------|------------|-----------|
| Climatology | `/api/temporal/climatology/point` | Full record | 1 hour |
| Monthly | `/api/temporal/monthly/point` | `start=1981&end=2025` (year) | 7 days |
| Daily | `/api/temporal/daily/point` | `start=YYYYMMDD&end=YYYYMMDD` | 24 hours |
| Hourly | `/api/temporal/hourly/point` | `start=YYYYMMDD&end=YYYYMMDD` | 24 hours |

### Rate Limits

- No formal rate limit published, but throttles rapid sequential requests
- Implementation spaces sequential calls by at least 1 second
- Cache aggressively: historical data does not change

### Data Quality

- Missing values indicated by negative numbers (e.g. -999)
- Data coverage from 1981 to approximately 2 months ago
- Spatial resolution: 0.5 x 0.625 degrees (approximately 50km)

---

## ERA5 Reanalysis (Optional)

**API:** Copernicus Climate Data Store (CDS) API
**Resolution:** 31km global grid
**Coverage:** 1940 to present (hourly)

ERA5 provides higher-resolution and more recent wind data than NASA POWER. It requires a free CDS API key (registration at [cds.climate.copernicus.eu](https://cds.climate.copernicus.eu)).

### What It Provides

- Wind speed at 100m and 10m height levels
- Hourly temporal resolution
- Global coverage at 0.25-degree (~31km) grid spacing

### Usage

Pass your CDS API key to `fetchEra5WindData()`. If no key is provided, WindForge falls back to NASA POWER automatically.

### Rate Limits

- CDS API uses an asynchronous queue system (submit request, poll for completion, download)
- Requests can take seconds to minutes depending on queue load
- Cache results for 7 days minimum

---

## CERRA Reanalysis (Optional, Europe Only)

**API:** Copernicus Climate Data Store (CDS) API
**Resolution:** 5.5km grid (European domain only)
**Coverage:** 1984 to 2021

CERRA (Copernicus European Regional ReAnalysis) provides significantly higher resolution than both NASA POWER and ERA5, but only covers Europe.

### Domain

Covers Europe roughly from Iceland (72N) to the Mediterranean (20N), and from the mid-Atlantic (-32W) to the Urals (45E). Use `isInCerraDomain(coord)` to check coverage.

### Usage

Pass your CDS API key to `fetchCerraWindData()`. Coordinates outside Europe are automatically rejected with a clear error message.

---

## Open-Elevation API

**Endpoint:** `https://api.open-elevation.com/api/v1/lookup`

Provides elevation data for any coordinate worldwide.

### What It Returns

- Elevation in metres above sea level
- Slope is calculated from elevation samples at neighbouring points
- Roughness class is derived from elevation variance in the surrounding area

### Limitations

- Free tier, no API key required
- Occasional downtime
- Resolution varies by region (depends on the underlying SRTM/ASTER data)

### Cache

- TTL: 24 hours (terrain does not change)

---

## OpenStreetMap Overpass API

**Endpoint:** `https://overpass-api.de/api/interpreter`

Queries OpenStreetMap for infrastructure, land use, and road data. This is the most heavily used external API and also the most unreliable, so WindForge has extensive resilience measures around it.

### Queries Used

| Query Type | OSM Tags | Purpose |
|-----------|----------|---------|
| Transmission lines | `power=line`, `voltage >= 132000` | Grid proximity scoring |
| Substations | `power=substation` | Grid proximity scoring |
| Nature reserves | `leisure=nature_reserve` | Hard constraint detection |
| Protected areas | `boundary=protected_area` | Hard constraint detection |
| Military zones | `landuse=military` | Hard constraint detection |
| Airports | `aeroway=*` | Hard constraint detection |
| Cemeteries | `landuse=cemetery` | Hard constraint detection |
| Residential areas | `landuse=residential` | Noise buffer (soft constraint) |
| Water bodies | `natural=water`, `waterway=*` | Foundation concern (soft) |
| Forests | `landuse=forest` | Clearing required (soft) |
| Farmland | `landuse=farmland` | Positive indicator |
| Roads | `highway=*` (by category) | Access logistics scoring |
| Wind turbines | `generator:source=wind` | Planning precedent |

### Rate Limits

- Heavily rate-limited public infrastructure
- 20-second timeout per query
- Maximum 1 retry on failure (5-second wait)
- All results cached for 24 hours minimum

### Resilience

- Queries batched where possible to reduce separate requests
- On timeout: graceful degradation to neutral score (50) with confidence 'low'
- On total failure: analysis completes with wind and terrain scores only
- The UI clearly shows which factors have real data vs. fallbacks

---

## OSM Nominatim

**Endpoint:** `https://nominatim.openstreetmap.org/reverse`

Reverse geocoding to determine country and region for the planning feasibility scorer.

### Rate Limits

- Strict 1 request per second limit (enforced by Nominatim Terms of Service)
- Must include `User-Agent` header identifying the application
- Results cached for 24 hours

### What It Returns

- Country code and name
- Region/county
- Display name

---

## Data Freshness Summary

| Source | Freshness | Cache TTL | Key Required |
|--------|----------|-----------|--------------|
| NASA POWER climatology | Static (full record avg) | 1 hour | No |
| NASA POWER monthly | ~2 months behind | 7 days | No |
| NASA POWER daily | ~1 month behind | 24 hours | No |
| NASA POWER hourly | ~1 month behind | 24 hours | No |
| ERA5 | ~5 days behind | 7 days | Yes (free) |
| CERRA | Fixed (ends 2021) | 7 days | Yes (free) |
| Open-Elevation | Static | 24 hours | No |
| Overpass | Contributed data | 24 hours | No |
| Nominatim | Contributed data | 24 hours | No |
