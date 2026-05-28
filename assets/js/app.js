/* NYC Dog Waste Complaints — map application logic.
 *
 * Flow:
 *   1. Try the live NYC Open Data 311 API (GeoJSON).
 *   2. On any failure, fall back to the bundled sample dataset.
 *   3. Render points as a clustered layer or a heatmap (toggleable).
 *   4. Drive filters (borough, year) and the stats panel off the loaded data.
 */
(function () {
  "use strict";

  const CFG = window.APP_CONFIG;
  const BOROUGH_COLORS = {
    MANHATTAN: "#e6194b",
    BROOKLYN: "#3cb44b",
    QUEENS: "#4363d8",
    BRONX: "#f58231",
    "STATEN ISLAND": "#911eb4",
    UNSPECIFIED: "#808080",
  };

  // ---- State -------------------------------------------------------------
  let allFeatures = []; // every loaded feature
  let map, clusterLayer, heatLayer;
  let mode = "clusters"; // "clusters" | "heat"
  const filters = { borough: "ALL", year: "ALL" };

  // ---- DOM helpers -------------------------------------------------------
  const $ = (sel) => document.querySelector(sel);
  const statusEl = () => $("#status");
  const setStatus = (msg, kind) => {
    const el = statusEl();
    el.textContent = msg;
    el.className = "status" + (kind ? " status--" + kind : "");
  };

  // ---- Data loading ------------------------------------------------------
  function buildApiUrl() {
    const select = [
      "unique_key",
      "created_date",
      "complaint_type",
      "descriptor",
      "borough",
      "status",
      "latitude",
      "longitude",
    ].join(",");
    const where =
      `complaint_type='${CFG.complaintType}'` +
      ` AND created_date >= '${CFG.since}'` +
      " AND latitude IS NOT NULL";
    const params = new URLSearchParams({
      $select: select,
      $where: where,
      $order: "created_date DESC",
      $limit: String(CFG.limit),
    });
    if (CFG.appToken) params.set("$$app_token", CFG.appToken);
    return `${CFG.apiBase}?${params.toString()}`;
  }

  async function loadData() {
    setStatus("Loading live 311 data from NYC Open Data…", "loading");
    try {
      const res = await fetch(buildApiUrl(), { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const geo = await res.json();
      const feats = normalize(geo.features || []);
      if (!feats.length) throw new Error("empty response");
      allFeatures = feats;
      setStatus(`Loaded ${feats.length.toLocaleString()} live complaints.`, "ok");
      return;
    } catch (err) {
      console.warn("Live API failed, using bundled sample:", err);
    }
    // Fallback.
    try {
      const res = await fetch(CFG.sampleUrl);
      const geo = await res.json();
      allFeatures = normalize(geo.features || []);
      setStatus(
        `Live API unavailable — showing ${allFeatures.length.toLocaleString()} sample complaints.`,
        "warn"
      );
    } catch (err) {
      setStatus("Could not load any data.", "error");
      console.error(err);
    }
  }

  // Coerce both the Socrata GeoJSON shape and our sample into one structure.
  function normalize(features) {
    const out = [];
    for (const f of features) {
      let lon, lat;
      if (f.geometry && Array.isArray(f.geometry.coordinates)) {
        [lon, lat] = f.geometry.coordinates;
      } else {
        lon = parseFloat(f.properties && f.properties.longitude);
        lat = parseFloat(f.properties && f.properties.latitude);
      }
      if (!isFinite(lat) || !isFinite(lon)) continue;
      const p = f.properties || {};
      const date = p.created_date ? new Date(p.created_date) : null;
      out.push({
        lat,
        lon,
        borough: (p.borough || "UNSPECIFIED").toUpperCase(),
        descriptor: p.descriptor || "—",
        status: p.status || "—",
        date,
        year: date && !isNaN(date) ? date.getFullYear() : null,
      });
    }
    return out;
  }

  // ---- Filtering ---------------------------------------------------------
  function filtered() {
    return allFeatures.filter((f) => {
      if (filters.borough !== "ALL" && f.borough !== filters.borough) return false;
      if (filters.year !== "ALL" && String(f.year) !== filters.year) return false;
      return true;
    });
  }

  // ---- Rendering ---------------------------------------------------------
  function dotIcon(color) {
    return L.divIcon({
      className: "dot-marker",
      html: `<span style="background:${color}"></span>`,
      iconSize: [14, 14],
    });
  }

  function render() {
    const feats = filtered();
    clusterLayer.clearLayers();
    heatLayer.setLatLngs([]);

    if (mode === "clusters") {
      const markers = feats.map((f) => {
        const color = BOROUGH_COLORS[f.borough] || BOROUGH_COLORS.UNSPECIFIED;
        return L.marker([f.lat, f.lon], { icon: dotIcon(color) }).bindPopup(
          `<strong>${f.descriptor}</strong><br>` +
            `${titleCase(f.borough)}<br>` +
            `<span class="muted">${f.date ? f.date.toLocaleDateString() : "date unknown"} · ${f.status}</span>`
        );
      });
      clusterLayer.addLayers(markers);
    } else {
      heatLayer.setLatLngs(feats.map((f) => [f.lat, f.lon, 0.6]));
    }
    updateStats(feats);
  }

  function updateStats(feats) {
    $("#stat-total").textContent = feats.length.toLocaleString();

    const byBorough = {};
    for (const f of feats) byBorough[f.borough] = (byBorough[f.borough] || 0) + 1;
    const rows = Object.entries(byBorough).sort((a, b) => b[1] - a[1]);
    const max = rows.length ? rows[0][1] : 1;

    $("#borough-bars").innerHTML = rows
      .map(([b, n]) => {
        const color = BOROUGH_COLORS[b] || BOROUGH_COLORS.UNSPECIFIED;
        const pct = Math.round((n / max) * 100);
        return (
          `<div class="bar-row">` +
          `<span class="bar-label">${titleCase(b)}</span>` +
          `<span class="bar-track"><span class="bar-fill" style="width:${pct}%;background:${color}"></span></span>` +
          `<span class="bar-val">${n.toLocaleString()}</span>` +
          `</div>`
        );
      })
      .join("");
  }

  // ---- UI wiring ---------------------------------------------------------
  function populateFilters() {
    const boroughs = [...new Set(allFeatures.map((f) => f.borough))].sort();
    const years = [...new Set(allFeatures.map((f) => f.year).filter(Boolean))].sort(
      (a, b) => b - a
    );
    const bSel = $("#filter-borough");
    const ySel = $("#filter-year");
    boroughs.forEach((b) => bSel.add(new Option(titleCase(b), b)));
    years.forEach((y) => ySel.add(new Option(y, y)));

    bSel.addEventListener("change", (e) => {
      filters.borough = e.target.value;
      render();
    });
    ySel.addEventListener("change", (e) => {
      filters.year = e.target.value;
      render();
    });

    document.querySelectorAll("input[name=mode]").forEach((r) =>
      r.addEventListener("change", (e) => {
        mode = e.target.value;
        map.removeLayer(mode === "heat" ? clusterLayer : heatLayer);
        map.addLayer(mode === "heat" ? heatLayer : clusterLayer);
        render();
      })
    );
  }

  function titleCase(s) {
    return s
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // ---- Init --------------------------------------------------------------
  async function init() {
    map = L.map("map", { zoomControl: true }).setView(CFG.view.center, CFG.view.zoom);
    L.tileLayer(CFG.basemap.url, {
      attribution: CFG.basemap.attribution,
      maxZoom: CFG.basemap.maxZoom,
    }).addTo(map);

    clusterLayer = L.markerClusterGroup({
      chunkedLoading: true,
      maxClusterRadius: 50,
    });
    heatLayer = L.heatLayer([], { radius: 22, blur: 18, maxZoom: 15 });
    map.addLayer(clusterLayer);

    await loadData();
    populateFilters();
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
