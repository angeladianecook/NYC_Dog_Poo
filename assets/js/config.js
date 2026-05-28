/* Data source configuration for the NYC Dog Waste Complaints map.
 *
 * Live data comes from NYC Open Data's "311 Service Requests from 2010 to
 * Present" dataset (Socrata resource erm2-nwe9) via the SoQL API. We narrow it
 * to the complaint type the city files dog-waste reports under and only pull
 * the columns the map needs, capped with $limit to keep the payload small.
 */
window.APP_CONFIG = {
  // Socrata GeoJSON endpoint for the 311 dataset.
  apiBase: "https://data.cityofnewyork.us/resource/erm2-nwe9.geojson",

  // Dog waste on public/private property is logged under this complaint type.
  complaintType: "Unsanitary Animal Pvt Property",

  // Earliest created_date to request (ISO floating timestamp, no "Z").
  since: "2023-01-01T00:00:00",

  // Max rows to pull from the live API. The map clusters, so this can be large,
  // but we cap it to stay responsive and within Socrata's app-token-free quota.
  limit: 5000,

  // Fallback dataset shipped with the repo, used if the live API fails.
  sampleUrl: "data/sample.geojson",

  // Optional Socrata app token raises rate limits. Safe to leave blank.
  appToken: "",

  // CARTO Positron basemap — light, low-clutter, good for data overlays.
  basemap: {
    url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> ' +
      'contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
    maxZoom: 19,
  },

  // Initial map view (centered on NYC).
  view: { center: [40.7128, -73.98], zoom: 11 },
};
