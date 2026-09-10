// Gurugram Sector 1-115 Interactive Map Controller
document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Map
  const GURUGRAM_CENTER = [28.4595, 77.0266];
  const DEFAULT_ZOOM = 12;

  const map = L.map('map', {
    center: GURUGRAM_CENTER,
    zoom: DEFAULT_ZOOM,
    zoomControl: false,
    attributionControl: false
  });

  // Custom Zoom Control position
  L.control.zoom({ position: 'bottomright' }).addTo(map);

  // 2. Basemap Providers (Clean, high-performance, no watermarks)
  const basemaps = {
    dark: L.layerGroup([
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        attribution: 'Esri, HERE, Garmin, © OpenStreetMap'
      }),
      L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 18,
        pane: 'shadowPane' // Keeps labels visible above tiles
      })
    ]),
    light: L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 18,
      attribution: 'Esri, HERE, Garmin'
    }),
    sat: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
      maxZoom: 19,
      attribution: 'Esri, Maxar, Earthstar Geographics'
    })
  };

  // Add default dark basemap
  basemaps.dark.addTo(map);

  // Basemap switcher buttons
  const basemapButtons = {
    dark: document.getElementById('btn-basemap-dark'),
    light: document.getElementById('btn-basemap-light'),
    sat: document.getElementById('btn-basemap-sat')
  };

  Object.entries(basemapButtons).forEach(([key, btn]) => {
    btn.addEventListener('click', () => {
      Object.values(basemaps).forEach(layer => map.removeLayer(layer));
      basemaps[key].addTo(map);
      Object.values(basemapButtons).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // 3. State & Layer Storage
  let geojsonData = null;
  let geojsonLayer = null;
  let labelMarkers = [];
  const sectorLayerMap = new Map(); // sectorName -> Leaflet Layer
  let selectedSectorLayer = null;
  let activeFilter = 'all';

  // Sector Color Palette Generator based on sector ID
  function getSectorColor(props) {
    const sec = props.sector;
    if (props.region === 'IMT Manesar') {
      return '#f59e0b'; // Amber
    }
    if (props.region === 'Sohna / Pataudi') {
      return '#10b981'; // Emerald
    }
    
    // Gurugram numbered sectors: Color clusters
    const match = sec.match(/^(\d+)/);
    if (!match) return '#3b82f6';
    const num = parseInt(match[1], 10);

    if (num >= 99 && num <= 115) {
      return '#06b6d4'; // Cyan for Dwarka Expressway
    } else if (num >= 58 && num <= 75) {
      return '#8b5cf6'; // Violet for Golf Course Ext / Southern Peripheral
    } else if (num >= 42 && num <= 57) {
      return '#3b82f6'; // Royal Blue for Golf Course / Central
    } else if (num >= 1 && num <= 23) {
      return '#ec4899'; // Pink/Rose for Old Gurugram
    } else if (num >= 76 && num <= 95) {
      return '#14b8a6'; // Teal for New Gurugram / CPR
    } else {
      return '#6366f1'; // Indigo default
    }
  }

  // Polygon Style
  function getFeatureStyle(feature) {
    const color = getSectorColor(feature.properties);
    return {
      color: color,
      weight: 1.5,
      opacity: 0.85,
      fillColor: color,
      fillOpacity: 0.22,
      smoothFactor: 1.0
    };
  }

  // Hover & Click Interactions
  function onEachFeature(feature, layer) {
    const props = feature.properties;
    const sectorName = props.sector;
    sectorLayerMap.set(sectorName.toLowerCase(), layer);

    // Dynamic Tooltip
    layer.bindTooltip(`
      <div style="font-weight:700; font-size:13px; color:#38bdf8;">Sector ${sectorName}</div>
      <div style="font-size:11px; opacity:0.8;">${props.region} • ${props.area_acres} Acres</div>
    `, {
      className: 'leaflet-tooltip-sector',
      sticky: true,
      direction: 'top',
      offset: [0, -10]
    });

    layer.on({
      mouseover: (e) => {
        const target = e.target;
        if (target !== selectedSectorLayer) {
          target.setStyle({
            weight: 2.5,
            fillOpacity: 0.5,
            color: '#ffffff'
          });
          target.bringToFront();
        }
      },
      mouseout: (e) => {
        const target = e.target;
        if (target !== selectedSectorLayer) {
          geojsonLayer.resetStyle(target);
        }
      },
      click: (e) => {
        selectSector(props.sector, layer);
      }
    });

    // Compute polygon centroid for text label
    try {
      const bounds = layer.getBounds();
      const center = bounds.getCenter();
      const labelIcon = L.divIcon({
        className: 'sector-center-label',
        html: `<div>${sectorName}</div>`,
        iconSize: [40, 16],
        iconAnchor: [20, 8]
      });
      const marker = L.marker(center, { icon: labelIcon, interactive: false });
      labelMarkers.push(marker);
    } catch (err) {
      // Ignore if centroid cannot be computed
    }
  }

  // 4. Sector Card Presentation
  const sectorCard = document.getElementById('sector-card');
  const cardSectorName = document.getElementById('card-sector-name');
  const cardRegion = document.getElementById('card-region');
  const cardDensity = document.getElementById('card-density');
  const cardAreaAcres = document.getElementById('card-area-acres');
  const cardAreaSqkm = document.getElementById('card-area-sqkm');
  const cardPerimeter = document.getElementById('card-perimeter');
  const btnZoomSector = document.getElementById('btn-zoom-sector');
  const btnGoogleMaps = document.getElementById('btn-google-maps');
  const cardCloseBtn = document.getElementById('card-close-btn');

  function selectSector(sectorName, layer) {
    if (!layer) {
      layer = sectorLayerMap.get(sectorName.toLowerCase());
    }
    if (!layer) return;

    // Reset previous selected
    if (selectedSectorLayer && selectedSectorLayer !== layer) {
      geojsonLayer.resetStyle(selectedSectorLayer);
    }

    selectedSectorLayer = layer;
    layer.setStyle({
      weight: 3.5,
      color: '#38bdf8',
      fillColor: '#38bdf8',
      fillOpacity: 0.6
    });
    layer.bringToFront();

    const props = layer.feature.properties;
    cardSectorName.textContent = `Sector ${props.sector}`;
    cardRegion.textContent = props.region;
    cardDensity.textContent = props.density ? `Density: ${props.density}` : 'Master Plan Sector';
    cardAreaAcres.textContent = `${props.area_acres.toLocaleString()}`;
    cardAreaSqkm.textContent = `${props.area_sqkm} km²`;
    cardPerimeter.textContent = `${(props.perimeter_m / 1000).toFixed(2)} km`;

    // Centroid for Google Maps
    const center = layer.getBounds().getCenter();
    btnGoogleMaps.href = `https://www.google.com/maps?q=${center.lat},${center.lng}`;

    btnZoomSector.onclick = () => {
      map.fitBounds(layer.getBounds(), { maxZoom: 15, padding: [80, 80] });
    };

    sectorCard.classList.add('visible');

    // Highlight in directory
    highlightDirectoryItem(props.sector);
  }

  cardCloseBtn.addEventListener('click', () => {
    sectorCard.classList.remove('visible');
    if (selectedSectorLayer) {
      geojsonLayer.resetStyle(selectedSectorLayer);
      selectedSectorLayer = null;
    }
  });

  // 5. Fetch and Render GeoJSON
  fetch('gurugram_sectors.geojson')
    .then(r => r.json())
    .then(data => {
      geojsonData = data;

      geojsonLayer = L.geoJSON(data, {
        style: getFeatureStyle,
        onEachFeature: onEachFeature
      }).addTo(map);

      // Fit map bounds to Gurugram sectors
      map.fitBounds(geojsonLayer.getBounds(), { padding: [40, 40] });

      // Add center labels if zoom >= 13
      updateLabelsVisibility();
      map.on('zoomend', updateLabelsVisibility);

      // Update statistics
      if (document.getElementById('stat-total-polygons')) {
        document.getElementById('stat-total-polygons').textContent = data.features.length;
      }
      if (document.getElementById('stat-visible-sectors')) {
        const coreCount = data.features.filter(f => f.properties.isGurugramNumbered).length;
        document.getElementById('stat-visible-sectors').textContent = coreCount;
      }

      // Populate directory list
      populateDirectory(data.features);
    })
    .catch(err => {
      console.error('Error loading Gurugram GeoJSON:', err);
    });

  // Zoom-dependent label management
  function updateLabelsVisibility() {
    const zoom = map.getZoom();
    if (zoom >= 13) {
      labelMarkers.forEach(m => {
        if (!map.hasLayer(m)) map.addLayer(m);
      });
    } else {
      labelMarkers.forEach(m => {
        if (map.hasLayer(m)) map.removeLayer(m);
      });
    }
  }

  // 6. Directory List Component
  const directoryContainer = document.getElementById('directory-list-container');
  const directoryCount = document.getElementById('directory-count');
  const directoryFilterInput = document.getElementById('directory-filter-input');

  function populateDirectory(features) {
    directoryContainer.innerHTML = '';
    directoryCount.textContent = features.length;

    features.forEach(feat => {
      const p = feat.properties;
      const item = document.createElement('div');
      item.className = 'directory-item';
      item.dataset.sector = p.sector.toLowerCase();

      item.innerHTML = `
        <div class="di-left">
          <span class="di-name">Sec ${p.sector}</span>
          <span class="di-region">${p.region}</span>
        </div>
        <span class="di-acres">${p.area_acres} ac</span>
      `;

      item.addEventListener('click', () => {
        const layer = sectorLayerMap.get(p.sector.toLowerCase());
        if (layer) {
          selectSector(p.sector, layer);
          map.fitBounds(layer.getBounds(), { maxZoom: 15, padding: [60, 60] });
          if (window.innerWidth <= 640) {
            closeSidebar();
          }
        }
      });

      directoryContainer.appendChild(item);
    });
  }

  function highlightDirectoryItem(sectorName) {
    const items = directoryContainer.querySelectorAll('.directory-item');
    items.forEach(it => {
      if (it.dataset.sector === sectorName.toLowerCase()) {
        it.classList.add('active');
        it.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } else {
        it.classList.remove('active');
      }
    });
  }

  directoryFilterInput.addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase().trim();
    const items = directoryContainer.querySelectorAll('.directory-item');
    let visible = 0;
    items.forEach(it => {
      const match = it.dataset.sector.includes(q);
      it.style.display = match ? 'flex' : 'none';
      if (match) visible++;
    });
    directoryCount.textContent = visible;
  });

  // 7. Search Bar Implementation
  const searchInput = document.getElementById('sector-search');
  const clearSearchBtn = document.getElementById('clear-search');

  searchInput.addEventListener('input', (e) => {
    const val = e.target.value.trim().toLowerCase();
    clearSearchBtn.style.display = val ? 'block' : 'none';

    if (!val) return;

    // Direct sector match
    const cleanSec = val.replace(/^sec(tor)?\s*/i, '');
    const layer = sectorLayerMap.get(cleanSec);
    if (layer) {
      selectSector(layer.feature.properties.sector, layer);
      map.fitBounds(layer.getBounds(), { maxZoom: 15, padding: [80, 80] });
    }
  });

  clearSearchBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearSearchBtn.style.display = 'none';
  });

  // 8. Quick Filter Chips
  const filterChips = document.querySelectorAll('.filter-chips .chip');
  filterChips.forEach(chip => {
    chip.addEventListener('click', () => {
      filterChips.forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const filter = chip.dataset.filter;
      applyFilter(filter);
    });
  });

  function applyFilter(filter) {
    activeFilter = filter;
    if (!geojsonLayer) return;

    let matchedCount = 0;

    geojsonLayer.eachLayer(layer => {
      const p = layer.feature.properties;
      const sec = p.sector;
      const matchNum = sec.match(/^(\d+)/);
      const num = matchNum ? parseInt(matchNum[1], 10) : null;
      let show = false;

      if (filter === 'all') {
        show = true;
      } else if (filter === 'core') {
        show = p.isGurugramNumbered;
      } else if (filter === 'dwarka') {
        show = num !== null && num >= 99 && num <= 115;
      } else if (filter === 'golf') {
        show = num !== null && num >= 42 && num <= 72;
      } else if (filter === 'manesar') {
        show = p.region === 'IMT Manesar';
      }

      if (show) {
        matchedCount++;
        layer.setStyle({ opacity: 0.85, fillOpacity: 0.22 });
      } else {
        layer.setStyle({ opacity: 0.08, fillOpacity: 0.02 });
      }
    });

    document.getElementById('stat-visible-sectors').textContent = matchedCount;
  }

  // 9. Reset View & Sidebar Toggle
  document.getElementById('btn-reset-view').addEventListener('click', () => {
    if (geojsonLayer) {
      map.fitBounds(geojsonLayer.getBounds(), { padding: [40, 40] });
    }
  });

  const sidebar = document.getElementById('sidebar-directory');
  const backdrop = document.getElementById('sidebar-backdrop');

  function openSidebar() {
    sectorCard.classList.remove('visible');
    sidebar.classList.add('open');
    if (backdrop) backdrop.classList.add('open');
  }

  function closeSidebar() {
    sidebar.classList.remove('open');
    if (backdrop) backdrop.classList.remove('open');
  }

  document.getElementById('btn-toggle-sidebar').addEventListener('click', () => {
    if (sidebar.classList.contains('open')) {
      closeSidebar();
    } else {
      openSidebar();
    }
  });

  document.getElementById('btn-close-sidebar').addEventListener('click', closeSidebar);
  if (backdrop) {
    backdrop.addEventListener('click', closeSidebar);
  }
});
