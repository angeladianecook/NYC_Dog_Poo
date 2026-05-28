# 🐾 NYC Dog Waste Complaints

**An interactive civic open-data map of where New Yorkers report dog waste to 311**

New York City runs on complaints. Every pothole, broken streetlight, and yes,
every pile of unscooped dog waste, can be logged with the city's **311**
service, and every one of those reports becomes a public record. This project
takes one small, very human slice of that record and puts it on a map: *where,
and how often, do New Yorkers pick up the phone (or the app) to report dog
waste?*

It's a small project with a serious premise — that open civic data is more
legible, and more useful, when you can **see** it.

👉 **[Open the live map](https://angeladianecook.github.io/nyc_dog_poo/)**
*(GitHub Pages — see deployment notes below)*

---

## The data

| | |
|---|---|
| **Source** | [NYC Open Data — 311 Service Requests from 2010 to Present](https://data.cityofnewyork.us/Social-Services/311-Service-Requests-from-2010-to-Present/erm2-nwe9) |
| **Dataset ID** | `erm2-nwe9` (Socrata) |
| **API** | Socrata Open Data API (SoQL), queried live as GeoJSON |
| **Filter** | `complaint_type = 'Unsanitary Animal Pvt Property'` (the type NYC 311 files dog-waste reports under) |
| **Fields used** | `unique_key`, `created_date`, `descriptor`, `borough`, `status`, `latitude`, `longitude` |
| **License** | NYC Open Data is published under the public domain / open terms set by the City of New York |

### A note on honesty about the data

311 data is **reported** data, not **observed** data. The map shows where
people *complained*, which is shaped by who calls 311, neighborhood norms, and
reporting habits — not a literal census of where dogs do their business. A
quiet block isn't necessarily clean; it may just be a block that doesn't call.
That caveat is the whole point of looking at civic data carefully, and it's
called out in the UI rather than hidden.

NYC's complaint taxonomy doesn't have a single tidy "dog poop" category, so this
project uses the `Unsanitary Animal Pvt Property` complaint type, which is where
dog-waste reports are recorded. The exact filter lives in
[`assets/js/config.js`](assets/js/config.js) and is easy to adjust if you want
to widen or narrow the query.

---

## What I built

A **dependency-light, single-page web map** — no build step, no backend, no
framework. Open `index.html` and it works.

- **Live querying.** On load, the app hits the Socrata SoQL API directly from
  the browser, requesting only the columns it needs and capping rows with
  `$limit` to keep payloads small and fast.
- **Graceful fallback.** If the live API is unreachable, rate-limited, or
  offline, the map transparently falls back to a bundled sample dataset
  (`data/sample.geojson`) and says so in the status bar — so the project is
  never a blank screen.
- **Two ways to read the data:**
  - *Clusters* — individual, color-coded complaints that group as you zoom out
    and split apart as you zoom in (via Leaflet.markercluster).
  - *Heatmap* — density at a glance, for spotting hotspots.
- **Filters** for borough and year that recompute instantly client-side.
- **A live stats panel** showing the total shown and a per-borough breakdown
  with proportional bars.

## What it shows

- The geographic **distribution** of dog-waste complaints across the five
  boroughs.
- **Hotspots** — the heatmap surfaces where reports concentrate.
- **Relative volume** by borough, normalized so you can compare at a glance.
- How the picture **changes over time** when you filter by year.

---

## Tech

- [**Leaflet**](https://leafletjs.com/) for mapping
- [**Leaflet.markercluster**](https://github.com/Leaflet/Leaflet.markercluster)
  for performant rendering of thousands of points
- [**Leaflet.heat**](https://github.com/Leaflet/Leaflet.heat) for the heatmap
- [**CARTO Positron**](https://carto.com/) basemap (light, low-clutter — good
  for data overlays) over OpenStreetMap tiles
- The **Socrata Open Data API** for live data
- Vanilla HTML/CSS/JS — intentionally no framework or bundler

### Project layout

```
.
├── index.html              # the app shell + layout
├── assets/
│   ├── css/style.css        # dark, responsive UI
│   └── js/
│       ├── config.js        # data source, query, basemap — all settings here
│       └── app.js           # fetch → normalize → filter → render
├── data/
│   └── sample.geojson       # synthetic fallback (NOT real complaints)
└── scripts/
    └── make_sample.py       # regenerates the fallback dataset
```

---

## Run it locally

No build tooling required. Because the app fetches data over HTTP, serve it
from a local web server rather than opening the file directly:

```bash
git clone https://github.com/angeladianecook/nyc_dog_poo.git
cd nyc_dog_poo
python3 -m http.server 8000
# then open http://localhost:8000
```

### Regenerate the fallback sample

```bash
python3 scripts/make_sample.py   # writes data/sample.geojson
```

### Tune the query

Everything you'd want to change — the complaint type, date range, row cap, an
optional Socrata app token (for higher rate limits), and the map's starting
view — lives in [`assets/js/config.js`](assets/js/config.js).

---

## Deploy (GitHub Pages)

This is a static site, so GitHub Pages serves it as-is:

1. **Settings → Pages**
2. Source: **Deploy from a branch**, branch `main` (or `gh-pages`), folder `/`
3. The map will be live at `https://<user>.github.io/nyc_dog_poo/`

---

## Roadmap

- [ ] Time-series chart of complaints per month
- [ ] Normalize by neighborhood population / dog-license counts for fairer
      comparison
- [ ] Choropleth by community district or ZIP
- [ ] Date-range slider instead of a year dropdown
- [ ] Cache live responses in `localStorage` to cut repeat API calls

## License

Code is released under the [MIT License](LICENSE). The underlying 311 data
belongs to the City of New York and is provided through NYC Open Data.
