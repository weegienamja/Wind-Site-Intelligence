# Data Sources

All data comes from free, publicly accessible APIs. No paid API keys required.

## NASA POWER API

**Endpoint:** `https://power.larc.nasa.gov/api/temporal/`

Provides historical wind speed and direction data from 1981 to near real-time.

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

## Open-Elevation API

**Endpoint:** `https://api.open-elevation.com/api/v1/lookup`

Provides elevation data for any coordinate.

### What It Returns

- Elevation in metres above sea level
- Slope is calculated from elevation samples at neighboring points
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

Queries OpenStreetMap for infrastructure, land use, and road data.

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
- UI clearly indicates which factors have real data and which are degraded

---

## OSM Nominatim

**Endpoint:** `https://nominatim.openstreetmap.org/reverse`

Reverse geocoding to determine country and region for planning feasibility.

### Rate Limits

- Strict 1 request per second limit (enforced by Nominatim ToS)
- Must include `User-Agent` header identifying the application
- Results cached for 24 hours

### What It Returns

- Country code and name
- Region/county
- Display name

---

## Data Freshness Summary

| Source | Typical Freshness | Cache TTL |
|--------|------------------|-----------|
| NASA POWER climatology | Static (full record average) | 1 hour |
| NASA POWER monthly | ~2 months behind real-time | 7 days |
| NASA POWER daily | ~1 month behind | 24 hours |
| NASA POWER hourly | ~1 month behind | 24 hours |
| Open-Elevation | Static | 24 hours |
| Overpass (infrastructure) | Updated by OSM contributors | 24 hours |
| Nominatim | Updated by OSM contributors | 24 hours |
