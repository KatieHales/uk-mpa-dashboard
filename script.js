// Initialize the map
const map = L.map('map').setView([54.5, -3.5], 6); // Centered on UK

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

// Example: Add a marker for a sample MPA
const sampleMPA = L.marker([55.0, -2.0]).addTo(map)
    .bindPopup('Sample Marine Protected Area<br>Click for more info.');

// Example: Add a polygon for a sample MPA boundary
const sampleBoundary = L.polygon([
    [55.0, -2.0],
    [55.1, -1.9],
    [54.9, -1.8],
    [54.8, -2.1]
], {
    color: 'blue',
    fillColor: 'lightblue',
    fillOpacity: 0.5
}).addTo(map).bindPopup('Sample MPA Boundary');

// Add a control for layers (future use)
const baseLayers = {
    "OpenStreetMap": L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    })
};

L.control.layers(baseLayers).addTo(map);