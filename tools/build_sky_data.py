#!/usr/bin/env python3
"""Sestaví data/sky-data.js z katalogu d3-celestial (BSD licence, (c) Olaf Frohn).

Použití:
    1) stáhni soubory z https://github.com/ofrohn/d3-celestial/tree/master/data
       (stars.6.json, stars.8.json, starnames.json, constellations.json,
        constellations.lines.json, constellations.bounds.json, mw.json)
    2) python3 tools/build_sky_data.py <adresář_se_staženými_soubory> data/sky-data.js
"""
import json
import math
import sys

import numpy as np

src, out = sys.argv[1], sys.argv[2]


def load(name):
    with open(f"{src}/{name}", encoding="utf-8") as f:
        return json.load(f)


def ra360(lon):
    return round(lon % 360, 3)


# ---------------------------------------------------------------- hvězdy
stars = load("stars.6.json")["features"]
names = load("starnames.json")
extra_hip = {10826}  # Mira (ο Ceti) – proměnná, v průměru slabší než 6 mag
stars8 = {f["id"]: f for f in load("stars.8.json")["features"] if f["id"] in extra_hip}
stars += [stars8[h] for h in extra_hip if h in stars8]

flat = []
desig = {}
for f in stars:
    hip = f["id"]
    lon, lat = f["geometry"]["coordinates"]
    mag = f["properties"]["mag"]
    if hip == 10826:
        mag = 3.5  # Mira – zobrazujeme jako v blízkosti maxima
    try:
        bv = float(f["properties"].get("bv") or 0.6)
    except ValueError:
        bv = 0.6
    flat += [ra360(lon), round(lat, 3), round(mag, 2), round(bv, 2), hip]
    n = names.get(str(hip))
    if n and n.get("c"):
        d = n.get("desig") or ""
        desig[hip] = [n["c"], d, n.get("name") or ""]

# ---------------------------------------------------------------- souhvězdí
cons = {}
for f in load("constellations.json")["features"]:
    p = f["properties"]
    lon, lat = f["geometry"]["coordinates"]
    cons[f["id"]] = {"cz": p.get("cz") or p["name"], "la": p["name"], "gen": p["gen"],
                     "c": [ra360(lon), lat], "rank": int(p.get("rank", 3))}

lines = {}
for f in load("constellations.lines.json")["features"]:
    lines[f["id"]] = [[[ra360(a), round(b, 3)] for a, b in seg] for seg in f["geometry"]["coordinates"]]

bounds = {}
for f in load("constellations.bounds.json")["features"]:
    ring = f["geometry"]["coordinates"][0]
    cid = f["id"]
    if cid == "Ser1" or cid == "Ser2":
        bounds.setdefault("Ser", []).append([[ra360(a), round(b, 3)] for a, b in ring])
    else:
        bounds.setdefault(cid, []).append([[ra360(a), round(b, 3)] for a, b in ring])

# ---------------------------------------------------------------- Mléčná dráha
# Vzorkujeme oblohu (Fibonacciho mřížka) a pro každý bod určíme, v kolika
# úrovních obrysu Mléčné dráhy leží (0–5). V prohlížeči se pak vykreslí jako
# rozmazaná záře – je to jednodušší a robustnější než sférické polygony.


def vec(lon, lat):
    lon = np.radians(lon)
    lat = np.radians(lat)
    return np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], axis=-1)


N = 16000
i = np.arange(N) + 0.5
lat_s = np.degrees(np.arcsin(1 - 2 * i / N))
lon_s = np.degrees((np.pi * (1 + 5 ** 0.5) * i) % (2 * np.pi))
P = vec(lon_s, lat_s)

NGP = vec(192.85948, 27.12825)
SGP = -NGP
gb = P @ NGP  # sin galaktické šířky
REF = np.where(gb[:, None] >= 0, NGP, SGP)


def inside(polys):
    A, B = [], []
    for poly in polys:
        for ring in poly:
            r = np.array(ring)
            A.append(vec(r[:-1, 0], r[:-1, 1]))
            B.append(vec(r[1:, 0], r[1:, 1]))
    A = np.concatenate(A)
    B = np.concatenate(B)
    n2 = np.cross(A, B)  # normály hran
    res = np.zeros(N, dtype=bool)
    chunk = 200
    for s in range(0, N, chunk):
        p = P[s:s + chunk][:, None, :]
        q = REF[s:s + chunk][:, None, :]
        n1 = np.cross(p, q)  # normála oblouku bod -> pól
        c1 = np.einsum("ijk,jk->ij", n1, A)
        c2 = np.einsum("ijk,jk->ij", n1, B)
        c3 = np.einsum("jk,ijk->ij", n2, p)
        c4 = np.einsum("jk,ijk->ij", n2, q)
        cand = (c1 * c2 < 0) & (c3 * c4 < 0)
        t = np.cross(n1, n2[None, :, :])
        # průsečík musí ležet na straně bodu (ne na protilehlé polokouli)
        mid_pq = p + q
        mid_ab = A + B
        same = (np.einsum("ijk,ijk->ij", t, mid_pq) * np.einsum("ijk,jk->ij", t, mid_ab)) > 0
        side = np.einsum("ijk,ijk->ij", t, mid_pq)
        ok = cand & same & (np.abs(side) > 0)
        res[s:s + chunk] = (ok.sum(axis=1) % 2) == 1
    return res


mwf = {f["id"]: f["geometry"]["coordinates"] for f in load("mw.json")["features"]}
level = np.zeros(N, dtype=int)
for k in ["ol1", "ol2", "ol3", "ol4", "ol5"]:
    level += inside(mwf[k]).astype(int)
mw = []
for lo, la, lv in zip(lon_s, lat_s, level):
    if lv > 0:
        mw += [round(float(lo) % 360, 2), round(float(la), 2), int(lv)]

data = {
    "source": "d3-celestial (c) Olaf Frohn, BSD-3-Clause; Hipparcos/Yale BSC",
    "stars": flat,
    "desig": desig,
    "cons": cons,
    "lines": lines,
    "bounds": bounds,
    "mw": mw,
    "mwN": N,
}
with open(out, "w", encoding="utf-8") as f:
    f.write("/* Vygenerováno skriptem tools/build_sky_data.py – needitovat ručně. */\n")
    f.write("window.SKY=")
    json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    f.write(";\n")
print("stars", len(flat) // 5, "mw points", len(mw) // 3, "levels", np.bincount(level))
