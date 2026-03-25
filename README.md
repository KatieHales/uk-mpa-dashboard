# uk-mpa-dashboard
Marine Protected Area Dashboard - For consenting decisions

## Live Dashboard
Share this URL:
https://katiehales.github.io/uk-mpa-dashboard/

## Features
- Interactive map displaying UK Marine Protected Areas (MPAs)
- Protected features visualization with status indicators
- Layer controls to toggle different data types
- CSV-driven data loading for easy updates
- **92+ UK offshore MPAs** with detailed site information
- Agency information (JNCC, Natural England)
- Designation dates and protection reasons

## Data Sources
- `protected_features.csv`: Point data for protected marine features
- `uk_offshore_mpa.csv`: UK offshore Marine Protected Area locations

## Usage
1. Open the live dashboard URL above, or run locally by opening `index.html` in a web browser
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
- name: MPA name or site code (UK0030317 format)
- type: Protection type (SAC, MCZ, NCMPA)
- status: Current status
- latitude/longitude: Geographic coordinates (note: some entries have lng/lat swapped)
- area_km2: Area in square kilometers
- designation_year/date: When designated
- agency: Responsible agency (JNCC, Natural England, etc.)
- site_name: Official site name (when available)
- latitude/longitude: Representative coordinates
- area_km2: Area in square kilometers
- designation_year: Year designated
