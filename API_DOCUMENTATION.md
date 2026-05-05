# API Documentation

## Overview
The UK MPA Dashboard integrates with external APIs to provide real-time wind speed data and GB offshore wind generation data. This document describes all external API integrations used by the application.

## 1. Open-Meteo Weather API

### Purpose
Fetches current wind speed data at specific geographic coordinates for each offshore wind farm location.

### Endpoint
```
GET https://api.open-meteo.com/v1/forecast
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `latitude` | float | Yes | Latitude of the location (-90 to 90) |
| `longitude` | float | Yes | Longitude of the location (-180 to 180) |
| `current` | string | Yes | Weather variable to fetch (e.g., `wind_speed_10m`) |

### Request Example
```
https://api.open-meteo.com/v1/forecast?latitude=53.5&longitude=-3.5&current=wind_speed_10m
```

### Response Example
```json
{
  "latitude": 53.5,
  "longitude": -3.5,
  "generationtime_ms": 0.5,
  "utc_offset_seconds": 0,
  "timezone": "GMT",
  "timezone_abbreviation": "GMT",
  "elevation": 25.0,
  "current": {
    "time": "2026-05-05T14:30",
    "interval": 900,
    "wind_speed_10m": 12.5
  }
}
```

### Response Fields
- `current.wind_speed_10m` (float): Wind speed at 10 meters above ground in m/s

### Implementation in Code
**File:** `script.js`  
**Function:** `fetchWindSpeed(lat, lng)`

```javascript
async function fetchWindSpeed(lat, lng) {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = windSpeedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    try {
        const openMeteoResponse = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m`
        );
        if (openMeteoResponse.ok) {
            const openMeteoData = await openMeteoResponse.json();
            const speed = openMeteoData && openMeteoData.current 
                ? openMeteoData.current.wind_speed_10m 
                : null;
            if (speed !== null && speed !== undefined && !isNaN(parseFloat(speed))) {
                const value = `${parseFloat(speed).toFixed(1)} m/s`;
                windSpeedCache.set(cacheKey, { 
                    value, 
                    expiresAt: Date.now() + WIND_SPEED_CACHE_TTL_MS 
                });
                return value;
            }
        }
        windSpeedCache.set(cacheKey, { 
            value: 'N/A', 
            expiresAt: Date.now() + 60 * 1000 
        });
        return 'N/A';
    } catch (error) {
        console.error('Error fetching wind speed:', error);
        return 'Error';
    }
}
```

### Caching Strategy
- **Cache TTL:** 5 minutes (300,000 ms) - defined by `WIND_SPEED_CACHE_TTL_MS`
- **Cache Key:** Rounded latitude and longitude coordinates (`lat.toFixed(3),lng.toFixed(3)`)
- **Purpose:** Prevents duplicate API calls for the same location within 5 minutes
- **Fallback:** If API fails or data is unavailable, returns 'N/A' with 60-second cache

### Rate Limiting
- Open-Meteo offers free tier with generous rate limits
- The application staggers API calls by 300ms intervals to avoid bursts
- Maximum requests: Practical limits are very high for free tier

### Documentation
- [Open-Meteo API Docs](https://open-meteo.com/en/docs)
- License: Free and open source
- No API key required

---

## 2. NESO (National Electricity System Operator) API

### Purpose
Fetches live GB offshore wind generation data to display current generation statistics.

### Endpoints
The application tries multiple endpoints for redundancy:

#### Primary Endpoint
```
GET https://api.neso.energy/api/3/action/datastore_search
```

#### Fallback Endpoint
```
GET https://api.nationalgrideso.com/api/3/action/datastore_search
```

### Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `resource_id` | string | Yes | Dataset identifier: `f93d1835-75bc-43e5-84ad-12472b180a98` |
| `limit` | integer | No | Number of records to return (default: 100, we use 1) |
| `sort` | string | No | Sort order (we use `_id desc` for latest record) |

### Request Example
```
https://api.neso.energy/api/3/action/datastore_search?resource_id=f93d1835-75bc-43e5-84ad-12472b180a98&limit=1&sort=_id%20desc
```

### Response Example
```json
{
  "success": true,
  "result": {
    "resource_id": "f93d1835-75bc-43e5-84ad-12472b180a98",
    "records": [
      {
        "_id": 123456,
        "DATETIME": "2026-05-05T14:30:00",
        "OFFSHORE_WIND": 5234.5
      }
    ],
    "total": 50000
  }
}
```

### Response Fields
The API may return wind generation data under different field names (checked in order):
- `OFFSHORE_WIND` - Offshore wind generation in MW
- `offshore_wind_power_mw` - Alternative field name
- `WIND` - General wind generation in MW
- `wind_power_mw` - Alternative field name
- `DATETIME` - ISO 8601 timestamp of the data point

### Implementation in Code
**File:** `script.js`  
**Function:** `loadGenerationData()`

```javascript
async function loadGenerationData() {
    const generationUrls = [
        'https://api.neso.energy/api/3/action/datastore_search?resource_id=f93d1835-75bc-43e5-84ad-12472b180a98&limit=1&sort=_id%20desc',
        'https://api.nationalgrideso.com/api/3/action/datastore_search?resource_id=f93d1835-75bc-43e5-84ad-12472b180a98&limit=1&sort=_id%20desc'
    ];

    try {
        console.log('Fetching generation data...');
        let data = null;

        for (const url of generationUrls) {
            try {
                const response = await fetch(url);
                if (!response.ok) continue;
                const maybeData = await response.json();
                if (maybeData && maybeData.success && maybeData.result && 
                    Array.isArray(maybeData.result.records)) {
                    data = maybeData;
                    break;
                }
            } catch (e) {
                // Try next endpoint
            }
        }

        const records = data && data.result ? data.result.records : [];
        const record = records.length ? records[0] : null;
        const windValueRaw = record
            ? record.OFFSHORE_WIND ?? record.offshore_wind_power_mw ?? 
              record.WIND ?? record.wind_power_mw
            : null;
        const sourceTimestamp = record && record.DATETIME 
            ? new Date(record.DATETIME) 
            : null;
        const updatedAt = sourceTimestamp && !isNaN(sourceTimestamp.getTime())
            ? sourceTimestamp.toLocaleString()
            : new Date().toLocaleString();

        if (windValueRaw !== null && windValueRaw !== undefined && 
            !isNaN(parseFloat(windValueRaw))) {
            const offshoreWind = parseFloat(windValueRaw);
            if (infoControl) infoControl.update({ 
                offshoreWind: offshoreWind.toFixed(1), 
                updatedAt 
            });
            return;
        }

        if (infoControl) infoControl.update({ 
            offshoreWind: 'Unavailable', 
            updatedAt 
        });
    } catch (error) {
        console.error('Error loading generation data:', error);
        if (infoControl) infoControl.update({ 
            offshoreWind: 'Unavailable', 
            updatedAt: new Date().toLocaleString() 
        });
    }
}
```

### Update Frequency
- Called every 5 minutes via: `setInterval(loadGenerationData, 5 * 60 * 1000)`
- Initial call on page load: `loadGenerationData()`

### Error Handling
- **Redundant Endpoints:** Application tries primary endpoint first, falls back to secondary
- **Graceful Degradation:** If API unavailable, displays "Unavailable" in UI
- **Timestamp Handling:** Uses API timestamp if available, falls back to client time

### Rate Limiting
- No documented rate limits for public NESO API
- Requests made every 5 minutes (12 requests/hour)
- Well within typical public API rate limits

### Documentation
- [NESO API Documentation](https://api.neso.energy/documentation)
- [National Grid ESO Open Data](https://data.nationalgrideso.com/)
- Public API - no authentication required

---

## Data Flow

### Wind Speed Data Flow
```
1. CSV loaded (offshore_wind_farms_uk.csv)
2. For each wind farm in CSV:
   - Parse location coordinates (latitude, longitude)
   - Create map marker
   - Schedule fetchWindSpeed() call with 300ms delay
3. fetchWindSpeed():
   - Check local cache for coordinates
   - If cached & fresh: return cached value
   - If expired/missing: 
     - Call Open-Meteo API
     - Parse wind_speed_10m from response
     - Cache result for 5 minutes
4. Update marker popup with wind speed

```

### Generation Data Flow
```
1. Page loads
2. Call loadGenerationData()
3. Try NESO API endpoints in sequence
4. Parse offshore wind value from response
5. Update info control box with generation data & timestamp
6. Schedule refresh every 5 minutes
```

---

## Configuration

### Cache Settings
```javascript
const WIND_SPEED_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const windSpeedCache = new Map(); // In-memory cache
```

### API Retry Strategy
- Open-Meteo: Silent fail, returns 'N/A' on error
- NESO: Tries two endpoints sequentially

### API Call Delays
- Staggered 300ms delays between fetchWindSpeed calls to avoid burst rate limiting

---

## Dependencies

### No External Libraries Required
Both APIs are called using native JavaScript:
- `fetch()` - Native Fetch API
- `JSON.parse()` - Native JSON parsing
- No npm packages required for API integration

---

## Future Considerations

### Potential Improvements
1. **Local proxy server:** Implement backend proxy to manage API calls and caching centrally
2. **Additional weather data:** Temperature, precipitation, air pressure
3. **Historical data:** Store wind speed/generation data over time for analysis
4. **Advanced caching:** Redis or similar for distributed caching
5. **API monitoring:** Log failed API calls and monitor availability

### API Alternatives
- **Wind Data:** 
  - Windy API (paid)
  - Dark Sky API (requires key)
  - ECMWF public forecasts
  
- **Generation Data:**
  - Elexon API (UK generation data)
  - IEA global renewable data

---

## Troubleshooting

### Open-Meteo API Issues
- **Wind speed showing "N/A":** Check browser console for network errors, verify lat/lng coordinates are valid
- **Slow updates:** May be rate limited; check if too many simultaneous requests

### NESO API Issues
- **Generation data "Unavailable":** Check both endpoints are accessible
- **Stale data:** Wait for next 5-minute refresh interval
- **Timestamp off:** Verify system clock is correct

### General
- **CORS errors:** Both APIs support CORS; if blocked, implement backend proxy
- **Network errors:** Check firewall/proxy settings allow external HTTPS requests
