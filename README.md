# Gurugram Sectors 1–115 Interactive Map & GIS Dataset

An interactive vector map and standardized GeoJSON dataset of **Gurugram Sectors 1 through 115**, powered by official GMDA (Gurugram Metropolitan Development Authority) & Haryana DTCP GIS data.

![Gurugram Sectors Map](https://raw.githubusercontent.com/XAE-A-Xii/expressway/main/screenshot.png)

## 📌 Features

- **Official GMDA Vector Data**: Cleaned and standardized from GMDA's `Boundary_GMDA` GIS service (Layer 67).
- **Comprehensive Sector Coverage**:
  - All numbered Gurugram Sectors (1–115) including sub-sectors (`3A`, `9A/B`, `10A`, `11A`, `12A`, `23A`, `25A`, `36A/B`, `37A-D`, `52A`, `63A`, `67A`, `70A`, `72A`, `75A`, `79A/B`, `82A`, `88A/B`, `89A/B`, `95A/B`, `99A`, `102A`, `110A`).
  - IMT Manesar Sectors (M1–M15) & Pataudi/Sohna planning sectors.
  - *Note on Sector 8: Sector 8 was historically skipped/unnotified in HUDA master planning; Gurugram sectors transition directly from 7 to 9.*
- **Pre-computed Metrics**: Each sector polygon contains pre-calculated land area (Acres and Sq. Km), perimeter, and GMDA zoning density.
- **Interactive UI**:
  - Live search with instant fly-to and zoom.
  - Quick cluster filter chips (Core Sectors, Dwarka Expressway, Golf Course Road / SPR, Manesar).
  - Floating sector metrics card with direct "Open in Google Maps" centroid navigation.
  - Multi-basemap switcher: High-contrast Dark Gray, Light Canvas, and High-Resolution Satellite imagery.
  - Slide-out Sector Directory drawer.

---

## 📂 Dataset

The official vector polygon dataset is available in:
- [`gurugram_sectors.geojson`](./gurugram_sectors.geojson)

### Attribute Schema
```json
{
  "type": "Feature",
  "properties": {
    "sector": "102",
    "displayName": "Sector 102",
    "region": "Gurugram",
    "isGurugramNumbered": true,
    "density": "250/100",
    "area_sqm": 2420746.6,
    "area_acres": 598.18,
    "area_sqkm": 2.421,
    "perimeter_m": 6391.6
  },
  "geometry": {
    "type": "Polygon",
    "coordinates": [...]
  }
}
```

---

## 🚀 Running Locally

1. Clone the repository:
   ```bash
   git clone https://github.com/XAE-A-Xii/expressway.git
   cd expressway
   ```
2. Start any local static server:
   ```bash
   python3 -m http.server 3000
   ```
3. Open `http://localhost:3000` in your browser.

---

## 📜 Data Source
- **Provider**: Gurugram Metropolitan Development Authority (GMDA) / Department of Town & Country Planning (DTCP) Haryana.
- **GIS Server**: `https://onemapdepts.gmda.gov.in/server/rest/services/onemap/Boundary_GMDA/MapServer/67`
