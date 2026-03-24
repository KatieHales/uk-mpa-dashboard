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
        mpaData.forEach(mpa => {
            if (mpa.latitude && mpa.longitude) {
                const marker = L.marker([parseFloat(mpa.latitude), parseFloat(mpa.longitude)], {
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
                    <b>${mpa.name}</b><br>
                    <strong>Site Name:</strong> ${mpa.site_name || mpa.name}<br>
                    <strong>Type:</strong> ${mpa.type}<br>
                    <strong>Status:</strong> ${mpa.status}<br>
                    <strong>Agency:</strong> ${mpa.agency}<br>
                    <strong>Area:</strong> ${mpa.area_km2} km²<br>
                    <strong>Designated:</strong> ${mpa.designation_year}
                `);
            }
        });

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