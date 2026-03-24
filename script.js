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
        console.log('Loading protected features CSV...');
        // Load protected features
        const featuresResponse = await fetch('protected_features.csv');
        const featuresText = await featuresResponse.text();
        const featuresData = Papa.parse(featuresText, { header: true }).data;
        console.log('Protected features loaded:', featuresData.length, 'items');

        // Add markers for protected features
        featuresData.forEach(feature => {
            if (feature.latitude && feature.longitude) {
                const marker = L.circleMarker([parseFloat(feature.latitude), parseFloat(feature.longitude)], {
                    color: feature.status === 'Designated' ? 'green' : 'orange',
                    fillColor: feature.status === 'Designated' ? 'lightgreen' : 'orange',
                    fillOpacity: 0.7,
                    radius: 8
                });

                marker.addTo(protectedFeaturesLayer).bindPopup(`
                    <b>${feature.name}</b><br>
                    <strong>Type:</strong> ${feature.type}<br>
                    <strong>Status:</strong> ${feature.status}<br>
                    <strong>Description:</strong> ${feature.description}<br>
                    <strong>Protection Reason:</strong> ${feature.protection_reason}<br>
                    <strong>Designation Date:</strong> ${feature.designation_date}
                `);
            }
        });

        console.log('Loading MPA CSV...');
        // Load UK offshore MPA data
        const mpaResponse = await fetch('uk_offshore_mpa.csv');
        const mpaText = await mpaResponse.text();
        const mpaData = Papa.parse(mpaText, { header: true }).data;
        console.log('MPA data loaded:', mpaData.length, 'items');

        // Add markers for MPAs
        let processedCount = 0;
        let skippedCount = 0;

        mpaData.forEach((mpa, index) => {
            let lat, lng, name, type, status, agency, siteName, area, designationDate;

            // Check if this is the new format (starts with UK code)
            if (mpa.name && mpa.name.startsWith('UK')) {
                // New format: UK0030317,Darwin Mounds,SAC,Scotland offshore,Atlantic North-West Approaches & Scottish Continental Shelf,137726,-7.2167,59.7583,01-08-2008,JNCC,555536199
                lng = parseFloat(mpa.longitude); // Column 7: longitude
                lat = parseFloat(mpa.latitude);  // Column 8: latitude
                name = mpa.name; // Column 1: UK code
                siteName = mpa.type; // Column 2: actual site name
                type = mpa.status; // Column 3: SAC/MCZ etc
                status = 'Designated'; // Assume designated
                agency = mpa.agency; // Column 10: JNCC
                area = mpa.area_km2; // Column 6: area
                designationDate = mpa.designation_year; // Column 9: date
            } else {
                // Original format
                lat = parseFloat(mpa.latitude);
                lng = parseFloat(mpa.longitude);
                name = mpa.name;
                type = mpa.type;
                status = mpa.status;
                agency = mpa.agency;
                siteName = mpa.site_name;
                area = mpa.area_km2;
                designationDate = mpa.designation_year;
            }

            if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
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
                    <b>${siteName || name}</b><br>
                    <strong>Site Code:</strong> ${name}<br>
                    <strong>Type:</strong> ${type}<br>
                    <strong>Status:</strong> ${status}<br>
                    <strong>Agency:</strong> ${agency}<br>
                    <strong>Area:</strong> ${area} km²<br>
                    <strong>Designated:</strong> ${designationDate}
                `);
                processedCount++;
            } else {
                console.log(`Skipped row ${index + 1}:`, mpa.name, 'lat:', lat, 'lng:', lng, 'isNaN(lat):', isNaN(lat), 'isNaN(lng):', isNaN(lng));
                skippedCount++;
            }
        });

        console.log(`MPA processing complete: ${processedCount} processed, ${skippedCount} skipped`);

        console.log('CSV data loaded successfully');

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