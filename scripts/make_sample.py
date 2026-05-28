#!/usr/bin/env python3
"""Generate a small, realistic fallback dataset of NYC dog-waste 311 complaints.

This is NOT real complaint data. It is a synthetic stand-in shaped to look like
the NYC Open Data 311 feed (same fields, plausible geography) so the map always
renders even when the live Socrata API is unreachable or rate-limited.

Run:  python3 scripts/make_sample.py
Out:  data/sample.geojson
"""
import json
import random
from datetime import datetime, timedelta

random.seed(311)

# Rough lat/lon bounding boxes per borough plus a relative complaint weight.
# Weights loosely mirror the real-world skew (Manhattan/Brooklyn dominate).
BOROUGHS = {
    "MANHATTAN":     {"lat": (40.700, 40.875), "lon": (-74.020, -73.910), "weight": 30},
    "BROOKLYN":      {"lat": (40.570, 40.730), "lon": (-74.040, -73.855), "weight": 34},
    "QUEENS":        {"lat": (40.540, 40.800), "lon": (-73.960, -73.700), "weight": 20},
    "BRONX":         {"lat": (40.785, 40.915), "lon": (-73.930, -73.765), "weight": 11},
    "STATEN ISLAND": {"lat": (40.500, 40.650), "lon": (-74.255, -74.055), "weight": 5},
}

DESCRIPTORS = ["Dog Waste", "Dog Feces", "Pet Waste Not Removed"]
STATUSES = ["Closed", "Closed", "Closed", "Open", "In Progress"]
N = 400

start = datetime(2024, 1, 1)
features = []

# Build a weighted borough picker.
pool = []
for name, b in BOROUGHS.items():
    pool += [name] * b["weight"]

for i in range(N):
    name = random.choice(pool)
    b = BOROUGHS[name]
    lat = round(random.uniform(*b["lat"]), 6)
    lon = round(random.uniform(*b["lon"]), 6)
    created = start + timedelta(
        days=random.randint(0, 480),
        hours=random.randint(0, 23),
        minutes=random.randint(0, 59),
    )
    features.append({
        "type": "Feature",
        "geometry": {"type": "Point", "coordinates": [lon, lat]},
        "properties": {
            "unique_key": f"SAMPLE-{100000 + i}",
            "created_date": created.isoformat(),
            "complaint_type": "Unsanitary Animal Pvt Property",
            "descriptor": random.choice(DESCRIPTORS),
            "borough": name,
            "status": random.choice(STATUSES),
        },
    })

features.sort(key=lambda f: f["properties"]["created_date"], reverse=True)

geojson = {
    "type": "FeatureCollection",
    "metadata": {
        "note": "Synthetic fallback sample. Not real 311 data.",
        "generated": datetime.utcnow().isoformat() + "Z",
        "count": len(features),
    },
    "features": features,
}

with open("data/sample.geojson", "w") as fh:
    json.dump(geojson, fh, indent=1)

print(f"wrote data/sample.geojson with {len(features)} features")
