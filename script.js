// Initialize the map
const map = L.map('map').setView([54.5, -3.5], 6); // Centered on UK

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Create layer groups for different data types
const protectedFeaturesLayer = L.layerGroup().addTo(map);
const mpaLayer = L.layerGroup().addTo(map);

// Function to load CSV data
async function loadCSVData() {
    try {
        // Load and parse UK offshore MPA CSV first (to get coordinates)
        console.log('Loading MPA CSV...');
        const mpaResponse = await fetch('uk_offshore_mpa.csv');
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
            
            if (parts.length >= 2) {
                try {
                    const name = parts[0];
                    let type = parts[1] || '';
                    let lat = null;
                    let lng = null;
                    
                    // Look for coordinates - search for two consecutive valid numbers
                    // that form a valid lat/lng pair
                    for (let j = 0; j < parts.length - 1; j++) {
                        const val1 = parseFloat(parts[j]);
                        const val2 = parseFloat(parts[j + 1]);
                        
                        if (!isNaN(val1) && !isNaN(val2) &&
                            val1 >= -90 && val1 <= 90 &&
                            val2 >= -180 && val2 <= 180) {
                            lat = val1;
                            lng = val2;
                            break;
                        }
                    }
                    
                    if (lat !== null && lng !== null) {
                        // Store coordinates by site code for later lookup
                        mpaCoordinates[name] = { lat, lng, type };
                        
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
                            <em>UK Offshore MPA</em>
                        `);
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
                        const marker = L.circleMarker([coords.lat, coords.lng], {
                            color: 'green',
                            fillColor: 'lightgreen',
                            fillOpacity: 0.7,
                            radius: 6
                        });

                        marker.addTo(protectedFeaturesLayer).bindPopup(`
                            <b>${siteName}</b><br>
                            <strong>Site Code:</strong> ${siteCode}<br>
                            <strong>Status:</strong> ${status}<br>
                            <strong>Feature:</strong> ${featureName}<br>
                            <em>Protected Feature</em>
                        `);
                        featuresCount++;
                    }
                } catch (e) {
                    // Skip malformed rows
                }
            }
        }
        console.log('Protected features added to map:', featuresCount);
        console.log('All CSV data loaded successfully');

    } catch (error) {
        console.error('Error loading CSV data:', error);
    }
}

// Add layer control
const overlayMaps = {
    "Protected Features": protectedFeaturesLayer,
    "UK Offshore MPAs": mpaLayer
};

L.control.layers(null, overlayMaps).addTo(map);

// Load the data when the page loads
loadCSVData();