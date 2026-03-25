// Initialize the map
const map = L.map('map').setView([54.5, -3.5], 6); // Centered on UK

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Create layer groups for different data types
const protectedFeaturesLayer = L.layerGroup().addTo(map);
const mpaLayer = L.layerGroup().addTo(map);
const windFarmsLayer = L.layerGroup().addTo(map);

// Spinning windmill icon for offshore wind farms
const windmillIcon = L.divIcon({
    className: 'windmill-icon',
    html: '<div class="windmill"><div class="blades"></div></div>',
    iconSize: [34, 34],
    iconAnchor: [17, 17],
    popupAnchor: [0, -20]
});

const WIND_SPEED_CACHE_TTL_MS = 5 * 60 * 1000;
const windSpeedCache = new Map();

// DMS (degrees/minutes/seconds) parser for coordinate text such as "53°59′00″N 3°17′00″W"
function parseDMS(value) {
    if (!value || typeof value !== 'string') return null;
    const m = value.trim().match(/([0-9]+(?:\.[0-9]+)?)°(?:([0-9]+)′(?:([0-9]+(?:\.[0-9]+)?)″)?)?\s*([NSEW])/i);
    if (!m) return null;
    let deg = parseFloat(m[1]);
    const min = m[2] ? parseFloat(m[2]) : 0;
    const sec = m[3] ? parseFloat(m[3]) : 0;
    const dir = m[4].toUpperCase();
    let dec = deg + min / 60 + sec / 3600;
    if (dir === 'S' || dir === 'W') dec *= -1;
    return dec;
}

function parseLocationToLatLng(location) {
    if (!location || typeof location !== 'string') return null;
    // Handle formats like "58.1°N 2.8°W" and "53°59′00″N 3°17′00″W"
    const parts = location.split(/[,;\s]+/).filter(p => p.trim());
    if (parts.length < 2) return null;

    let lat = null;
    let lng = null;

    for (const token of parts) {
        const maybeLat = parseDMS(token);
        if (maybeLat !== null) {
            if (/N|S/i.test(token)) lat = maybeLat;
            if (/E|W/i.test(token)) lng = maybeLat;
        }
    }

    if (lat !== null && lng !== null) return { lat, lng };

    // fallback: if we have two numeric values and no direction
    const maybeNumbers = location.match(/-?\d+(?:\.\d+)?/g);
    if (maybeNumbers && maybeNumbers.length >= 2) {
        const a = parseFloat(maybeNumbers[0]);
        const b = parseFloat(maybeNumbers[1]);
        if (a >= -90 && a <= 90 && b >= -180 && b <= 180) return { lat: a, lng: b };
        if (b >= -90 && b <= 90 && a >= -180 && a <= 180) return { lat: b, lng: a };
    }

    return null;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const ch = line[i];
        if (ch === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (ch === ',' && !inQuotes) {
            result.push(current);
            current = '';
        } else {
            current += ch;
        }
    }
    result.push(current);
    return result.map(cell => cell.trim());
}

// Create approximate circular polygon from area and center coordinates
function createPolygonFromArea(lat, lng, areaHa) {
    if (!areaHa || isNaN(areaHa) || areaHa <= 0) return null;
    
    // Convert hectares to square meters
    const areaM2 = areaHa * 10000;
    
    // Calculate radius in meters: r = sqrt(area / π)
    const radiusM = Math.sqrt(areaM2 / Math.PI);
    
    // Approximate conversion: 1 degree ≈ 111,000 meters at equator
    // This is rough but gives reasonable visual representation
    const radiusDegrees = radiusM / 111000;
    
    // Create circular polygon with 32 points
    const points = [];
    const numPoints = 32;
    
    for (let i = 0; i < numPoints; i++) {
        const angle = (i / numPoints) * 2 * Math.PI;
        const pointLat = lat + radiusDegrees * Math.cos(angle);
        const pointLng = lng + radiusDegrees * Math.sin(angle);
        points.push([pointLat, pointLng]);
    }
    
    return points;
}

// Function to fetch and display live generation data
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
                if (maybeData && maybeData.success && maybeData.result && Array.isArray(maybeData.result.records)) {
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
            ? record.OFFSHORE_WIND ?? record.offshore_wind_power_mw ?? record.WIND ?? record.wind_power_mw
            : null;
        const sourceTimestamp = record && record.DATETIME ? new Date(record.DATETIME) : null;
        const updatedAt = sourceTimestamp && !isNaN(sourceTimestamp.getTime())
            ? sourceTimestamp.toLocaleString()
            : new Date().toLocaleString();

        if (windValueRaw !== null && windValueRaw !== undefined && !isNaN(parseFloat(windValueRaw))) {
            const offshoreWind = parseFloat(windValueRaw);
            if (infoControl) infoControl.update({ offshoreWind: offshoreWind.toFixed(1), updatedAt });
            return;
        }

        if (infoControl) infoControl.update({ offshoreWind: 'Unavailable', updatedAt });
    } catch (error) {
        console.error('Error loading generation data:', error);
        if (infoControl) infoControl.update({ offshoreWind: 'Unavailable', updatedAt: new Date().toLocaleString() });
    }
}

// Function to fetch wind speed for a location
async function fetchWindSpeed(lat, lng) {
    const cacheKey = `${lat.toFixed(3)},${lng.toFixed(3)}`;
    const cached = windSpeedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
        return cached.value;
    }

    try {
        const openMeteoResponse = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=wind_speed_10m`);
        if (openMeteoResponse.ok) {
            const openMeteoData = await openMeteoResponse.json();
            const speed = openMeteoData && openMeteoData.current ? openMeteoData.current.wind_speed_10m : null;
            if (speed !== null && speed !== undefined && !isNaN(parseFloat(speed))) {
                const value = `${parseFloat(speed).toFixed(1)} m/s`;
                windSpeedCache.set(cacheKey, { value, expiresAt: Date.now() + WIND_SPEED_CACHE_TTL_MS });
                return value;
            }
        }

        windSpeedCache.set(cacheKey, { value: 'N/A', expiresAt: Date.now() + 60 * 1000 });
        return 'N/A';
    } catch (error) {
        console.error('Error fetching wind speed:', error);
        return 'Error';
    }
}
async function loadCSVData() {
    try {
        // Load and parse UK offshore MPA CSV first (to get coordinates)
        console.log('Loading MPA CSV...');
        const mpaResponse = await fetch('Uk_offshore_mpa.csv.csv');
        const mpaText = await mpaResponse.text();
        const mpaLines = mpaText.split('\n');
        
        const mpaCoordinates = {}; // Map of site code to coordinates
        let mpaCount = 0;
        
        // Skip header, process all data rows
        for (let i = 1; i < mpaLines.length; i++) {
            const line = mpaLines[i].trim();
            if (!line) continue;
            
            let parts = [];
            
            // Detect delimiter: comma or tab
            if (line.includes('\t')) {
                parts = line.split('\t').map(p => p.trim());
            } else {
                parts = line.split(',').map(p => p.trim());
            }
            
            if (parts.length >= 8) {
                try {
                    const name = parts[0];
                    let type = parts[2] || '';
                    const areaHa = parseFloat(parts[5]); // Area in hectares
                    const lng = parseFloat(parts[6]); // Longitude
                    const lat = parseFloat(parts[7]); // Latitude
                    const agency = parts[9] || ''; // Agency
                    
                    if (!isNaN(lat) && !isNaN(lng) &&
                        lat >= -90 && lat <= 90 &&
                        lng >= -180 && lng <= 180) {
                        
                        // Store coordinates by site code for later lookup
                        mpaCoordinates[name] = { lat, lng, type };
                        
                        // Create polygon from area and center coordinates
                        const polygonPoints = createPolygonFromArea(lat, lng, areaHa);
                        
                        if (polygonPoints) {
                            const polygon = L.polygon(polygonPoints, {
                                color: 'blue',
                                fillColor: '#3388ff',
                                fillOpacity: 0.3,
                                weight: 2
                            });

                            polygon.addTo(mpaLayer).bindPopup(`
                                <b>${name}</b><br>
                                <strong>Type:</strong> ${type}<br>
                                <strong>Area:</strong> ${areaHa ? areaHa.toLocaleString() + ' ha' : 'Unknown'}<br>
                                <strong>Agency:</strong> ${agency}<br>
                                <em>UK Offshore MPA</em>
                            `);
                        } else {
                            // Fallback to marker if polygon creation fails
                            const marker = L.marker([lat, lng], {
                                icon: L.icon({
                                    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
                                    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                                    iconSize: [25, 41],
                                    iconAnchor: [12, 41],
                                    popupAnchor: [1, -34],
                                    shadowSize: [41, 41]
                                })
                            });

                            marker.addTo(mpaLayer).bindPopup(`
                                <b>${name}</b><br>
                                <strong>Type:</strong> ${type}<br>
                                <strong>Area:</strong> ${areaHa ? areaHa.toLocaleString() + ' ha' : 'Unknown'}<br>
                                <strong>Agency:</strong> ${agency}<br>
                                <em>UK Offshore MPA</em>
                            `);
                        }
                        mpaCount++;
                    }
                } catch (e) {
                    // Skip malformed rows
                }
            }
        }
        console.log('MPAs added to map:', mpaCount);

        // Load and parse protected features CSV
        console.log('Loading protected features CSV...');
        const featuresResponse = await fetch('protected_features.csv');
        const featuresText = await featuresResponse.text();
        const featuresLines = featuresText.split('\n');
        
        let featuresCount = 0;
        
        // Skip header, process all data rows
        for (let i = 1; i < featuresLines.length; i++) {
            const line = featuresLines[i].trim();
            if (!line) continue;
            
            let parts = [];
            
            // Parse as comma-separated
            if (line.includes(',')) {
                parts = line.split(',').map(p => p.trim());
            } else if (line.includes('\t')) {
                parts = line.split('\t').map(p => p.trim());
            }
            
            if (parts.length >= 2) {
                try {
                    const siteCode = parts[0]; // e.g., UK0030387
                    const siteName = parts[1]; // e.g., Anton Dohrn Seamount
                    const status = parts[2] || '';
                    const featureType = parts[5] || '';
                    const featureName = parts[8] || '';
                    
                    // Look up coordinates using site code
                    if (mpaCoordinates[siteCode]) {
                        const coords = mpaCoordinates[siteCode];
                        
                        // Add a small random offset so overlapping features are visible
                        const offset = 0.01;
                        const randomLat = coords.lat + (Math.random() - 0.5) * offset;
                        const randomLng = coords.lng + (Math.random() - 0.5) * offset;
                        
                        const marker = L.circleMarker([randomLat, randomLng], {
                            color: 'green',
                            fillColor: 'lightgreen',
                            fillOpacity: 0.7,
                            radius: 5
                        });

                        marker.addTo(protectedFeaturesLayer).bindPopup(`
                            <b>${siteName}</b><br>
                            <strong>Site Code:</strong> ${siteCode}<br>
                            <strong>Status:</strong> ${status}<br>
                            <strong>Feature Type:</strong> ${featureType}<br>
                            <strong>Protected Feature:</strong> ${featureName}
                        `);
                        featuresCount++;
                    }
                } catch (e) {
                    // Skip malformed rows
                }
            }
        }
        console.log('Protected features added to map:', featuresCount);

        // Load and parse offshore wind farm CSV
        console.log('Loading offshore wind farms CSV...');
        const windResponse = await fetch('offshore_wind_farms_uk.csv');
        const windText = await windResponse.text();
        const windLines = windText.split('\n');

        let windCount = 0;
        let apiDelay = 0; // Delay for API calls to avoid rate limits
        const windHeader = windLines[0] ? parseCSVLine(windLines[0]).map(h => h.trim().toLowerCase()) : [];
        const locIdx = windHeader.findIndex(h => h.includes('location'));
        const nameIdx = windHeader.findIndex(h => h.includes('name'));
        const capacityIdx = windHeader.findIndex(h => h.includes('capacity') && !h.includes('factor'));
        const turbineIdx = windHeader.findIndex(h => h.includes('turbine') && !h.includes('model'));
        const buildCostIdx = windHeader.findIndex(h => h === 'build' || h.includes('build') || h.includes('cost'));
        const ownerIdx = windHeader.findIndex(h => h.includes('owner'));

        for (let i = 1; i < windLines.length; i++) {
            const line = windLines[i].trim();
            if (!line) continue;

            const parts = parseCSVLine(line);
            if (locIdx < 0 || parts.length <= locIdx) continue;

            const location = parts[locIdx];
            const coords = parseLocationToLatLng(location);
            if (!coords) continue;

            const name = (nameIdx >= 0 && parts[nameIdx]) ? parts[nameIdx] : `Wind farm #${i}`;
            const capacity = (capacityIdx >= 0 && parts[capacityIdx]) ? parts[capacityIdx] : 'Unknown';
            const turbine = (turbineIdx >= 0 && parts[turbineIdx]) ? parts[turbineIdx] : 'Unknown';
            const buildCost = (buildCostIdx >= 0 && parts[buildCostIdx]) ? parts[buildCostIdx] : 'Unknown';
            const owner = (ownerIdx >= 0 && parts[ownerIdx]) ? parts[ownerIdx] : 'Unknown';

            const windMarker = L.marker([coords.lat, coords.lng], {
                icon: windmillIcon
            });

            // Initial popup content
            windMarker.bindPopup(`
                <b>${name}</b><br>
                <strong>Capacity:</strong> ${capacity} MW<br>
                <strong>Turbine Manufacturer:</strong> ${turbine}<br>
                <strong>Build Cost:</strong> ${buildCost}<br>
                <strong>Owner:</strong> ${owner}<br>
                <strong>Current Wind Speed:</strong> Loading...<br>
                <strong>Location:</strong> ${location}
            `);

            windMarker.addTo(windFarmsLayer);

            // Fetch wind speed with delay to avoid rate limits
            setTimeout(async () => {
                const windSpeed = await fetchWindSpeed(coords.lat, coords.lng);
                windMarker.setPopupContent(`
                    <b>${name}</b><br>
                    <strong>Capacity:</strong> ${capacity} MW<br>
                    <strong>Turbine Manufacturer:</strong> ${turbine}<br>
                    <strong>Build Cost:</strong> ${buildCost}<br>
                    <strong>Owner:</strong> ${owner}<br>
                    <strong>Current Wind Speed:</strong> ${windSpeed}<br>
                    <strong>Location:</strong> ${location}
                `);
            }, apiDelay);

            apiDelay += 300; // Stagger calls to avoid bursts
            windCount++;
        }
        console.log('Offshore wind farms added to map:', windCount);
        console.log('All CSV data loaded successfully');

    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

// Add layer control
const overlayMaps = {
    "Protected Features": protectedFeaturesLayer,
    "UK Offshore MPA Polygons": mpaLayer,
    "Offshore Wind Farms": windFarmsLayer
};

L.control.layers(null, overlayMaps).addTo(map);

// Add legend control
const legend = L.control({ position: 'bottomright' });

legend.onAdd = function (map) {
    const div = L.DomUtil.create('div', 'info legend');
    div.innerHTML = `
        <div style="background: white; padding: 10px; border: 2px solid rgba(0,0,0,0.2); border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Map Legend</h4>
            <div style="display: flex; align-items: center; margin-bottom: 5px;">
                <div style="width: 20px; height: 20px; background: #3388ff; border: 2px solid blue; opacity: 0.7; margin-right: 8px;"></div>
                <span style="font-size: 12px;">UK Offshore MPA Polygons</span>
            </div>
            <div style="display: flex; align-items: center;">
                <div style="width: 12px; height: 12px; border-radius: 50%; background: green; border: 2px solid lightgreen; margin-right: 8px;"></div>
                <span style="font-size: 12px;">Protected Features</span>
            </div>
            <div style="display: flex; align-items: center; margin-top: 5px;">
                <div class="windmill" style="margin-right: 8px;"><div class="blades"></div></div>
                <span style="font-size: 12px;">Offshore Wind Farms</span>
            </div>
        </div>
    `;
    return div;
};

legend.addTo(map);

// Add info control for generation data
const infoControl = L.control({ position: 'topright' });

infoControl.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info');
    this.update();
    return this._div;
};

infoControl.update = function (props) {
    this._div.innerHTML = `
        <div style="background: white; padding: 10px; border: 2px solid rgba(0,0,0,0.2); border-radius: 5px;">
            <h4 style="margin: 0 0 10px 0; font-size: 14px;">Live Generation Data</h4>
            <div style="font-size: 12px;">
                <strong>Wind Generation:</strong> ${props ? (props.offshoreWind || 'Error') : 'Loading...'} MW<br>
                <strong>Last Updated:</strong> ${props ? (props.updatedAt || 'Loading...') : 'Loading...'}<br>
                <em>Data from NESO</em>
            </div>
        </div>
    `;
};

infoControl.addTo(map);

// Load the data when the page loads
loadCSVData();
loadGenerationData();

// Update generation data every 5 minutes
setInterval(loadGenerationData, 5 * 60 * 1000);