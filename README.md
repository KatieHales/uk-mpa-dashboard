# uk-mpa-dashboard
Marine Protected Area Dashboard - For consenting decisions

## Features
- Interactive map displaying UK Marine Protected Areas (MPAs)
- Protected features visualization with status indicators
- Layer controls to toggle different data types
- CSV-driven data loading for easy updates

## Data Sources
- `protected_features.csv`: Point data for protected marine features
- `uk_offshore_mpa.csv`: UK offshore Marine Protected Area locations

## Usage
1. Open `index.html` in a web browser
2. Use the layer control in the top-right to toggle data layers
3. Click on markers to view detailed information

## Data Format
### Protected Features CSV
- name: Feature name
- latitude/longitude: Geographic coordinates
- type: Protection type (SAC, MCZ, etc.)
- description: Feature description
- status: Designated/Proposed
- designation_date: Date when protection was designated
- protection_reason: Detailed reason for protection

### UK Offshore MPA CSV
- name: MPA name
- type: Protection type
- status: Current status
- latitude/longitude: Representative coordinates
- area_km2: Area in square kilometers
- designation_year: Year designated
- agency: Responsible agency (JNCC, Natural England, etc.)
- site_name: Official site name
- latitude/longitude: Representative coordinates
- area_km2: Area in square kilometers
- designation_year: Year designated
