/*
 * SkyView – jednoduché „planetárium“ na <canvas>.
 * Stereografická projekce, pohled zevnitř nebeské sféry (východ vlevo).
 * Dva režimy: 'eq' – mapa v rovníkových souřadnicích (sever nahoře),
 *             'hor' – obloha nad obzorem pro dané místo a čas.
 */
(function () {
  'use strict';

  const D2R = Math.PI / 180;
  const R2D = 180 / Math.PI;
  const SKY = window.SKY;
  const COURSE = window.COURSE;

  // ------------------------------------------------------------ katalog
  const N = SKY.stars.length / 5;
  const S = {
    ra: new Float64Array(N), dec: new Float64Array(N), mag: new Float32Array(N),
    bv: new Float32Array(N), hip: new Int32Array(N),
    x: new Float64Array(N), y: new Float64Array(N), z: new Float64Array(N),
  };
  const hipIndex = new Map();
  for (let i = 0; i < N; i++) {
    const o = i * 5;
    S.ra[i] = SKY.stars[o]; S.dec[i] = SKY.stars[o + 1]; S.mag[i] = SKY.stars[o + 2];
    S.bv[i] = SKY.stars[o + 3]; S.hip[i] = SKY.stars[o + 4];
    const r = S.ra[i] * D2R, d = S.dec[i] * D2R;
    S.x[i] = Math.cos(d) * Math.cos(r); S.y[i] = Math.cos(d) * Math.sin(r); S.z[i] = Math.sin(d);
    hipIndex.set(S.hip[i], i);
  }
  // pořadí od nejslabších, aby jasné hvězdy byly kresleny navrch
  const order = Array.from({ length: N }, (_, i) => i).sort((a, b) => S.mag[b] - S.mag[a]);

  // Pojmenované hvězdy (kurz + orientační)
  const named = new Map(); // hip -> {name, key?, course:boolean}
  for (const [key, st] of Object.entries(COURSE.stars)) named.set(st.hip, { name: st.name, key, course: true });
  for (const [hip, name] of Object.entries(COURSE.extraStars)) if (!named.has(+hip)) named.set(+hip, { name, course: false });

  const courseCons = new Set(COURSE.constellations.map(c => c.id));

  function bvColor(bv) {
    // přibližná barva hvězdy podle indexu B−V
    const t = Math.max(-0.4, Math.min(2.0, bv));
    let r, g, b;
    if (t < 0) { r = 0.62 + 0.38 * (t + 0.4) / 0.4; g = 0.72 + 0.26 * (t + 0.4) / 0.4; b = 1; }
    else if (t < 0.4) { r = 1; g = 0.98 - 0.04 * t / 0.4; b = 1 - 0.18 * t / 0.4; }
    else if (t < 1.0) { r = 1; g = 0.94 - 0.2 * (t - 0.4) / 0.6; b = 0.82 - 0.38 * (t - 0.4) / 0.6; }
    else { r = 1; g = 0.74 - 0.22 * (t - 1.0); b = 0.44 - 0.26 * (t - 1.0); }
    return [r, g, Math.max(0.2, b)];
  }
  const starColor = new Array(N);
  for (let i = 0; i < N; i++) {
    // oko vnímá barvu jen u jasných hvězd → slabší míchat do bílé
    const m = S.mag[i] < 1.5 ? 0.15 : S.mag[i] < 3 ? 0.35 : 0.6;
    const c = bvColor(S.bv[i]).map(v => Math.round((v * (1 - m) + m) * 255));
    starColor[i] = `rgb(${c[0]},${c[1]},${c[2]})`;
  }

  // ------------------------------------------------------------ čas a místo
  function julianDate(date) { return date.getTime() / 86400000 + 2440587.5; }
  function lstDeg(date, lonDeg) {
    const jd = julianDate(date);
    const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
    return ((gmst + lonDeg) % 360 + 360) % 360;
  }

  function angDist(ra1, dec1, ra2, dec2) {
    const a = Math.sin(dec1 * D2R) * Math.sin(dec2 * D2R) +
      Math.cos(dec1 * D2R) * Math.cos(dec2 * D2R) * Math.cos((ra1 - ra2) * D2R);
    return Math.acos(Math.max(-1, Math.min(1, a))) * R2D;
  }

  // Ekliptika (J2000)
  const ECL = [];
  { const eps = 23.4393 * D2R;
    for (let l = 0; l <= 360; l += 2) {
      const L = l * D2R;
      ECL.push([((Math.atan2(Math.sin(L) * Math.cos(eps), Math.cos(L)) * R2D) + 360) % 360, Math.asin(Math.sin(eps) * Math.sin(L)) * R2D]);
    } }

  // ------------------------------------------------------------ SkyView
  class SkyView {
    constructor(canvas, opts = {}) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.center = { lon: 90, lat: 10 }; // ra/dec (eq) nebo -az/alt (hor)
      this.fov = 100;
      this.rotation = 0;
      this.mode = 'eq';
      this.lat = 50.08; this.lon = 14.42; // Praha
      this.lst = 0;
      this.opts = Object.assign({
        lines: true, allLines: true, bounds: false, starLabels: true, extraLabels: true,
        conLabels: true, objects: true, asterisms: true, ecliptic: false, equator: false,
        circumpolar: false, milkyway: true, magLimit: 6.0, bayer: false, focusCon: null,
        interactive: true, starScale: 1, compass: true,
      }, opts);
      this.highlights = [];
      this.marks = [];
      this.onClick = null;
      this.onHover = null;
      this.onViewChange = null;
      this._mw = document.createElement('canvas');
      this._raf = 0;
      this._resize();
      this._ro = new ResizeObserver(() => { this._resize(); this.draw(); });
      this._ro.observe(canvas);
      if (this.opts.interactive) this._bind();
    }

    // ---------------------------------------------------- souřadnice
    setView(ra, dec, fov) {
      if (this.mode === 'eq') { this.center.lon = ra; this.center.lat = dec; }
      else { const h = this.toHor(ra, dec); this.center.lon = -h.az; this.center.lat = Math.max(-5, h.alt); }
      if (fov) this.fov = fov;
      this.requestDraw();
    }

    setTime(date) { this.date = date; this.lst = lstDeg(date, this.lon); this.requestDraw(); }

    toHor(ra, dec) {
      const H = (this.lst - ra) * D2R, d = dec * D2R, p = this.lat * D2R;
      const sinAlt = Math.sin(d) * Math.sin(p) + Math.cos(d) * Math.cos(p) * Math.cos(H);
      const alt = Math.asin(Math.max(-1, Math.min(1, sinAlt)));
      const az = Math.atan2(-Math.sin(H) * Math.cos(d), Math.cos(p) * Math.sin(d) - Math.sin(p) * Math.cos(d) * Math.cos(H));
      return { az: ((az * R2D) + 360) % 360, alt: alt * R2D };
    }

    fromHor(az, alt) {
      const A = az * D2R, h = alt * D2R, p = this.lat * D2R;
      const sinDec = Math.sin(h) * Math.sin(p) + Math.cos(h) * Math.cos(p) * Math.cos(A);
      const dec = Math.asin(Math.max(-1, Math.min(1, sinDec)));
      const H = Math.atan2(-Math.sin(A) * Math.cos(h), Math.cos(p) * Math.sin(h) - Math.sin(p) * Math.cos(h) * Math.cos(A));
      return { ra: ((this.lst - H * R2D) % 360 + 360) % 360, dec: dec * R2D };
    }

    _prep() {
      const w = this.w, h = this.h;
      this.cx = w / 2; this.cy = h / 2;
      this.scale = (Math.min(w, h) / 2) / (2 * Math.tan(this.fov * D2R / 4));
      const l0 = this.center.lon * D2R, p0 = this.center.lat * D2R;
      this.sl0 = Math.sin(l0); this.cl0 = Math.cos(l0); this.sp0 = Math.sin(p0); this.cp0 = Math.cos(p0);
      this.cr = Math.cos(this.rotation * D2R); this.sr = Math.sin(this.rotation * D2R);
      // rovníkové -> horizontální: předpočítat matici pro rychlost
      if (this.mode === 'hor') {
        const p = this.lat * D2R, L = this.lst * D2R;
        this._hm = { sp: Math.sin(p), cp: Math.cos(p), sL: Math.sin(L), cL: Math.cos(L) };
      }
    }

    // vstup: jednotkový vektor v „pracovním“ systému (lon, lat) → obrazovka
    _projVec(x, y, z, out) {
      // x = cos(lat)cos(lon) ...
      const cosl = x * this.cl0 + y * this.sl0;       // cos(lat)·cos(lon−lon0)
      const sinl = y * this.cl0 - x * this.sl0;       // cos(lat)·sin(lon−lon0)
      const cosc = this.sp0 * z + this.cp0 * cosl;
      const k = 2 / Math.max(1e-6, 1 + cosc);
      const px = k * sinl;
      const py = k * (this.cp0 * z - this.sp0 * cosl);
      const X = -px * this.scale, Y = -py * this.scale;
      out.x = this.cx + X * this.cr - Y * this.sr;
      out.y = this.cy + X * this.sr + Y * this.cr;
      out.c = cosc;
      return out;
    }

    // rovníkový jednotkový vektor -> pracovní (eq: totéž; hor: (−az, alt))
    _eqToWork(x, y, z, out) {
      if (this.mode === 'eq') { out.x = x; out.y = y; out.z = z; return out; }
      const m = this._hm;
      // hodinový úhel: H = LST − RA → vektor v systému (H, dec)
      const xh = x * m.cL + y * m.sL;      // cos d cos H
      const yh = x * m.sL - y * m.cL;      // cos d sin H
      // horizont: az od severu k východu
      const north = m.cp * z - m.sp * xh;  // cos h cos A
      const east = -yh;                    // cos h sin A
      const up = m.sp * z + m.cp * xh;     // sin h
      // pracovní lon = −az → (cos(−A), sin(−A))
      out.x = north; out.y = -east; out.z = up;
      return out;
    }

    project(ra, dec, out = {}) {
      const r = ra * D2R, d = dec * D2R;
      const v = this._eqToWork(Math.cos(d) * Math.cos(r), Math.cos(d) * Math.sin(r), Math.sin(d), {});
      this._projVec(v.x, v.y, v.z, out);
      out.alt = this.mode === 'hor' ? Math.asin(Math.max(-1, Math.min(1, v.z))) * R2D : 90;
      return out;
    }

    unproject(sx, sy) {
      const dx = sx - this.cx, dy = sy - this.cy;
      const X = dx * this.cr + dy * this.sr, Y = -dx * this.sr + dy * this.cr;
      const px = -X / this.scale, py = -Y / this.scale;
      const rho = Math.hypot(px, py);
      const c = 2 * Math.atan(rho / 2);
      const l0 = this.center.lon * D2R, p0 = this.center.lat * D2R;
      let lat, lon;
      if (rho < 1e-9) { lat = p0; lon = l0; } else {
        lat = Math.asin(Math.cos(c) * Math.sin(p0) + py * Math.sin(c) * Math.cos(p0) / rho);
        lon = l0 + Math.atan2(px * Math.sin(c), rho * Math.cos(p0) * Math.cos(c) - py * Math.sin(p0) * Math.sin(c));
      }
      if (this.mode === 'eq') return { ra: ((lon * R2D) % 360 + 360) % 360, dec: lat * R2D };
      return this.fromHor(((-lon * R2D) % 360 + 360) % 360, lat * R2D);
    }

    isVisible(ra, dec, margin = 20) {
      const p = this.project(ra, dec);
      return p.c > -0.2 && p.x > margin && p.y > margin && p.x < this.w - margin && p.y < this.h - margin && (this.mode === 'eq' || p.alt > 0);
    }

    // ---------------------------------------------------- velikost
    _resize() {
      const r = this.canvas.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.w = Math.max(50, r.width); this.h = Math.max(50, r.height);
      this.dpr = dpr;
      this.canvas.width = Math.round(this.w * dpr);
      this.canvas.height = Math.round(this.h * dpr);
    }

    requestDraw() {
      if (this._raf) return;
      this._raf = requestAnimationFrame(() => { this._raf = 0; this.draw(); });
    }

    starRadius(mag) {
      const zoom = Math.max(0.8, Math.min(1.8, Math.sqrt(100 / this.fov)));
      const r = Math.max(0.55, (6.4 - mag) * 0.62) * zoom * this.opts.starScale;
      return Math.min(r, 7.5 * zoom);
    }

    // ---------------------------------------------------- kreslení
    draw() {
      const ctx = this.ctx;
      this._prep();
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      const w = this.w, h = this.h;
      const bg = ctx.createRadialGradient(w / 2, h * 0.55, 0, w / 2, h * 0.55, Math.max(w, h) * 0.8);
      bg.addColorStop(0, '#0d1834'); bg.addColorStop(1, '#040814');
      ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);

      if (this.opts.milkyway) this._drawMilkyWay();
      if (this.opts.equator) this._drawCurve(this._circleDec(0), 'rgba(110,170,255,0.55)', [6, 6], 'světový rovník');
      if (this.opts.ecliptic) this._drawCurve(ECL, 'rgba(255,120,120,0.6)', [8, 5], 'ekliptika');
      if (this.opts.circumpolar) this._drawCurve(this._circleDec(90 - this.lat), 'rgba(120,150,255,0.45)', [2, 5], 'hranice cirkumpolárních hvězd');
      if (this.opts.bounds) this._drawBounds();
      for (const hl of this.highlights) if (hl.type === 'con') this._drawConArea(hl.id, hl.color || 'rgba(255,90,90,0.16)', hl.stroke || 'rgba(255,120,120,0.8)');
      if (this.opts.lines) this._drawLines();
      for (const hl of this.highlights) if (hl.type === 'conLines') this._drawConLines(hl.id, hl.color || '#ff6b6b', 2.2);
      if (this.opts.asterisms) this._drawAsterisms();
      for (const hl of this.highlights) if (hl.type === 'asterism') this._drawAsterism(COURSE.asterisms.find(a => a.id === hl.id), true);
      this._drawObjects();
      this._drawStars();
      this._drawLabels();
      if (this.mode === 'hor') this._drawGround();
      for (const hl of this.highlights) this._drawHighlight(hl);
      for (const m of this.marks) this._drawMark(m);
      if (this.opts.compass && this.mode === 'eq') this._drawCompass();
      if (this.onViewChange) this.onViewChange(this);
    }

    _circleDec(dec) { const a = []; for (let r = 0; r <= 360; r += 3) a.push([r, dec]); return a; }

    _drawCurve(pts, color, dash, label) {
      const ctx = this.ctx; const p = {};
      ctx.save(); ctx.strokeStyle = color; ctx.lineWidth = 1.2; ctx.setLineDash(dash);
      ctx.beginPath(); let pen = false; let best = null;
      for (const [ra, dec] of pts) {
        this.project(ra, dec, p);
        if (p.c < -0.1 || Math.abs(p.x) > 5000 || Math.abs(p.y) > 5000) { pen = false; continue; }
        if (pen) ctx.lineTo(p.x, p.y); else ctx.moveTo(p.x, p.y);
        pen = true;
        if (label && p.x > 40 && p.x < this.w - 140 && p.y > 30 && p.y < this.h - 20) {
          const score = Math.abs(p.x - this.w * 0.82);
          if (!best || score < best.s) best = { x: p.x, y: p.y, s: score };
        }
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (label && best) { ctx.fillStyle = color; ctx.font = '11px system-ui, sans-serif'; ctx.fillText(label, best.x + 4, best.y - 5); }
      ctx.restore();
    }

    _drawMilkyWay() {
      const mw = SKY.mw; const n = mw.length / 3;
      const f = 6; // nízké rozlišení → přirozené rozmazání
      const c = this._mw; const W = Math.ceil(this.w / f), H = Math.ceil(this.h / f);
      if (c.width !== W || c.height !== H) { c.width = W; c.height = H; }
      const g = c.getContext('2d');
      g.clearRect(0, 0, W, H);
      const spacing = Math.sqrt(41253 / SKY.mwN) * D2R; // průměrná vzdálenost bodů (rad)
      const p = {}; const v = {};
      if (!SkyView._mwSprite) {
        const sp = document.createElement('canvas'); sp.width = sp.height = 64;
        const sg = sp.getContext('2d');
        const gr = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
        gr.addColorStop(0, 'rgba(175,195,255,1)'); gr.addColorStop(0.5, 'rgba(175,195,255,0.45)'); gr.addColorStop(1, 'rgba(175,195,255,0)');
        sg.fillStyle = gr; sg.fillRect(0, 0, 64, 64);
        SkyView._mwSprite = sp;
      }
      const sprite = SkyView._mwSprite;
      for (let i = 0; i < n; i++) {
        const ra = mw[i * 3] * D2R, dec = mw[i * 3 + 1] * D2R, lv = mw[i * 3 + 2];
        this._eqToWork(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec), v);
        this._projVec(v.x, v.y, v.z, p);
        if (p.c < -0.3) continue;
        const k = 2 / (1 + p.c);
        const rad = Math.max(1.2, spacing * this.scale * k / f * 1.9);
        const x = p.x / f, y = p.y / f;
        if (x < -rad || y < -rad || x > W + rad || y > H + rad) continue;
        g.globalAlpha = Math.min(0.6, 0.05 + 0.06 * lv);
        g.drawImage(sprite, x - rad, y - rad, 2 * rad, 2 * rad);
      }
      const ctx = this.ctx;
      ctx.save(); ctx.globalAlpha = 0.5; ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(c, 0, 0, W * f, H * f);
      ctx.restore();
    }

    _seg(ctx, a, b, p, q) {
      this.project(a[0], a[1], p); this.project(b[0], b[1], q);
      if (p.c < -0.15 || q.c < -0.15) return false;
      ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); return true;
    }

    _drawLines() {
      const ctx = this.ctx; const p = {}, q = {};
      const focus = this.opts.focusCon;
      for (const [id, segs] of Object.entries(SKY.lines)) {
        const course = courseCons.has(id);
        if (!this.opts.allLines && !course && id !== focus) continue;
        const hl = focus && id === focus;
        ctx.beginPath();
        for (const seg of segs) for (let i = 0; i < seg.length - 1; i++) this._seg(ctx, seg[i], seg[i + 1], p, q);
        ctx.strokeStyle = hl ? 'rgba(140,200,255,0.95)' : (course ? 'rgba(110,160,230,0.62)' : 'rgba(110,140,190,0.28)');
        ctx.lineWidth = hl ? 1.8 : (course ? 1.1 : 0.8);
        ctx.stroke();
      }
    }

    _drawConLines(id, color, width) {
      const ctx = this.ctx; const p = {}, q = {};
      const segs = SKY.lines[id]; if (!segs) return;
      ctx.save(); ctx.beginPath();
      for (const seg of segs) for (let i = 0; i < seg.length - 1; i++) this._seg(ctx, seg[i], seg[i + 1], p, q);
      ctx.strokeStyle = color; ctx.lineWidth = width; ctx.shadowColor = color; ctx.shadowBlur = 6; ctx.stroke();
      ctx.restore();
    }

    // obrys souhvězdí jako lomená čára v obrazovce (zhuštěná po 1°)
    _conPolys(id) {
      const rings = SKY.bounds[id]; if (!rings) return [];
      const out = []; const p = {};
      for (const ring of rings) {
        const pts = []; let bad = false;
        for (let i = 0; i < ring.length - 1; i++) {
          const a = ring[i], b = ring[i + 1];
          let dra = b[0] - a[0]; if (dra > 180) dra -= 360; if (dra < -180) dra += 360;
          const ddec = b[1] - a[1];
          const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dra) * Math.cos(a[1] * D2R), Math.abs(ddec)) / 1));
          for (let s = 0; s < steps; s++) {
            this.project(a[0] + dra * s / steps, a[1] + ddec * s / steps, p);
            if (p.c < -0.3) bad = true;
            pts.push([p.x, p.y]);
          }
        }
        if (!bad) out.push(pts);
      }
      return out;
    }

    _drawConArea(id, fill, stroke) {
      const ctx = this.ctx;
      ctx.save();
      for (const pts of this._conPolys(id)) {
        ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
        ctx.fillStyle = fill; ctx.fill();
        ctx.setLineDash([5, 4]); ctx.strokeStyle = stroke; ctx.lineWidth = 1.3; ctx.stroke();
      }
      ctx.restore();
    }

    hitCon(id, sx, sy) {
      this._prep();
      for (const pts of this._conPolys(id)) {
        let inside = false;
        for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
          const [xi, yi] = pts[i], [xj, yj] = pts[j];
          if (((yi > sy) !== (yj > sy)) && (sx < (xj - xi) * (sy - yi) / (yj - yi) + xi)) inside = !inside;
        }
        if (inside) return true;
      }
      return false;
    }

    conAt(sx, sy) {
      for (const id of Object.keys(SKY.bounds)) if (this.hitCon(id, sx, sy)) return id;
      return null;
    }

    _drawBounds() {
      const ctx = this.ctx;
      ctx.save(); ctx.setLineDash([2, 4]); ctx.strokeStyle = 'rgba(150,150,210,0.28)'; ctx.lineWidth = 0.8;
      for (const id of Object.keys(SKY.bounds)) {
        for (const pts of this._conPolys(id)) {
          ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke();
        }
      }
      ctx.restore();
    }

    _drawAsterisms() {
      for (const a of COURSE.asterisms) this._drawAsterism(a, false);
    }

    _drawAsterism(a, strong) {
      if (!a) return;
      const ctx = this.ctx; const p = {}, q = {};
      const pos = hip => { const i = hipIndex.get(hip); return [S.ra[i], S.dec[i]]; };
      ctx.save(); ctx.beginPath();
      if (a.path) for (let i = 0; i < a.path.length - 1; i++) this._seg(ctx, pos(a.path[i]), pos(a.path[i + 1]), p, q);
      if (a.segments) for (const [u, v] of a.segments) this._seg(ctx, pos(u), pos(v), p, q);
      ctx.setLineDash(strong ? [] : [7, 5]);
      ctx.strokeStyle = a.color; ctx.globalAlpha = strong ? 0.95 : 0.5; ctx.lineWidth = strong ? 2.4 : 1.3;
      if (strong) { ctx.shadowColor = a.color; ctx.shadowBlur = 8; }
      ctx.stroke();
      ctx.restore();
    }

    _drawObjects() {
      const ctx = this.ctx; const p = {};
      for (const [key, o] of Object.entries(COURSE.objects)) {
        if (o.type === 'ast') continue;
        if (o.type === 'bod' && !this.opts.objects) continue;
        this.project(o.ra, o.dec, p);
        if (!(p.c >= 0) || !isFinite(p.x) || !isFinite(p.y)) continue;
        if (p.x < -100 || p.y < -100 || p.x > this.w + 100 || p.y > this.h + 100) continue;
        const k = 2 / (1 + p.c);
        const pr = Math.max(3, o.r * D2R * this.scale * k);
        ctx.save();
        // „skutečný“ vzhled: slabá záře
        if (o.type === 'G' || o.type === 'EM' || (o.type === 'KH')) {
          const rr = o.type === 'KH' ? Math.max(2, pr * 0.5) : pr;
          const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, rr);
          const col = o.type === 'EM' ? '170,230,200' : '220,215,200';
          glow.addColorStop(0, `rgba(${col},${o.type === 'KH' ? 0.55 : 0.32})`);
          glow.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = glow;
          ctx.translate(p.x, p.y);
          if (o.ell) { ctx.rotate(-(o.ell[2]) * D2R + this.rotation * D2R); ctx.scale(o.ell[1] / o.ell[0], 1); }
          ctx.translate(-p.x, -p.y);
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, 2 * Math.PI); ctx.fill();
          ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        }
        if (this.opts.objects) {
          ctx.lineWidth = 1.1;
          ctx.strokeStyle = { G: 'rgba(255,140,140,0.85)', OH: 'rgba(255,220,120,0.8)', KH: 'rgba(255,190,110,0.85)', EM: 'rgba(120,230,160,0.85)', bod: 'rgba(255,150,150,0.95)' }[o.type];
          if (o.type === 'G') {
            const [a, b, pa] = o.ell; const s = pr / (a / 2);
            ctx.beginPath(); ctx.ellipse(p.x, p.y, Math.max(4, b / 2 * s), Math.max(6, a / 2 * s), (-pa + this.rotation) * D2R, 0, 2 * Math.PI); ctx.stroke();
          } else if (o.type === 'OH') {
            ctx.setLineDash([3, 3]);
            if (o.double) { const d = Math.max(4, pr * 0.45); [[-d, 0], [d, 0]].forEach(([dx]) => { ctx.beginPath(); ctx.arc(p.x + dx * this.cr, p.y + dx * this.sr, Math.max(4, pr * 0.42), 0, 2 * Math.PI); ctx.stroke(); }); }
            else { ctx.beginPath(); ctx.arc(p.x, p.y, pr, 0, 2 * Math.PI); ctx.stroke(); }
          } else if (o.type === 'KH') {
            const r = Math.max(5, pr);
            ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 2 * Math.PI);
            ctx.moveTo(p.x - r, p.y); ctx.lineTo(p.x + r, p.y); ctx.moveTo(p.x, p.y - r); ctx.lineTo(p.x, p.y + r); ctx.stroke();
          } else if (o.type === 'EM') {
            const r = Math.max(5, pr); ctx.strokeRect(p.x - r, p.y - r, 2 * r, 2 * r);
          } else if (o.type === 'bod') {
            ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI); ctx.stroke();
            ctx.fillStyle = 'rgba(255,170,170,0.95)'; ctx.font = 'bold 13px system-ui, sans-serif'; ctx.fillText('♈', p.x + 6, p.y - 6);
          }
        }
        ctx.restore();
      }
    }

    _drawStars() {
      const ctx = this.ctx; const p = {}; const v = {};
      const lim = this.opts.magLimit;
      const hor = this.mode === 'hor';
      this._screen = [];
      for (const i of order) {
        const mag = S.mag[i]; if (mag > lim) continue;
        this._eqToWork(S.x[i], S.y[i], S.z[i], v);
        if (hor && v.z < -0.02) continue;
        this._projVec(v.x, v.y, v.z, p);
        if (p.c < -0.2) continue;
        if (p.x < -10 || p.y < -10 || p.x > this.w + 10 || p.y > this.h + 10) continue;
        let r = this.starRadius(mag);
        let alpha = 1;
        if (hor) { const alt = Math.asin(Math.max(-1, Math.min(1, v.z))) * R2D; if (alt < 8) alpha = Math.max(0.15, alt / 8); }
        ctx.globalAlpha = alpha;
        if (mag < 1.6) {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r * 3.2);
          g.addColorStop(0, starColor[i]); g.addColorStop(0.3, starColor[i].replace('rgb', 'rgba').replace(')', ',0.35)')); g.addColorStop(1, 'rgba(0,0,0,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, r * 3.2, 0, 2 * Math.PI); ctx.fill();
        }
        ctx.fillStyle = starColor[i];
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 2 * Math.PI); ctx.fill();
        if (mag < 4.6) this._screen.push({ i, x: p.x, y: p.y, r, mag });
      }
      ctx.globalAlpha = 1;
    }

    _drawLabels() {
      const ctx = this.ctx; const p = {};
      ctx.save();
      ctx.textBaseline = 'middle';
      const placed = [];
      const free = (x, y, w, h) => {
        for (const b of placed) if (x < b.x + b.w && x + w > b.x && y < b.y + b.h && y + h > b.y) return false;
        return true;
      };
      const jobs = [];
      // hvězdy
      for (const s of this._screen || []) {
        const hip = S.hip[s.i];
        const nm = named.get(hip);
        if (this.opts.starLabels && nm && (nm.course || this.opts.extraLabels)) {
          jobs.push({ prio: (nm.course ? 0 : 2) + s.mag * 0.01, text: nm.name, star: s,
            style: nm.course ? 'rgba(255,255,255,0.95)' : 'rgba(200,205,220,0.6)',
            font: nm.course ? '600 12.5px system-ui, sans-serif' : '11px system-ui, sans-serif' });
        } else if (this.opts.bayer) {
          const d = SKY.desig[hip];
          if (d && d[1] && (!this.opts.focusCon || d[0] === this.opts.focusCon) && s.mag < 4.8 && /[α-ω]/.test(d[1])) {
            jobs.push({ prio: 3 + s.mag * 0.01, text: d[1], star: s, style: 'rgba(170,190,230,0.75)', font: '11px system-ui, serif' });
          }
        }
      }
      // souhvězdí
      if (this.opts.conLabels) {
        for (const [id, c] of Object.entries(SKY.cons)) {
          const course = courseCons.has(id);
          if (!course && !this.opts.allLines) continue;
          const cc = this._conCenter(id);
          this.project(cc[0], cc[1], p);
          if (p.c < 0.1 || (this.mode === 'hor' && p.alt < 2)) continue;
          const name = course ? COURSE.constellations.find(x => x.id === id).cz : c.cz;
          jobs.push({ prio: course ? 1 : 2.8, text: course ? name.toUpperCase() : name, center: [p.x, p.y + 14],
            style: course ? 'rgba(150,195,255,0.85)' : 'rgba(140,160,200,0.5)',
            font: course ? '600 12px system-ui, sans-serif' : '11px system-ui, sans-serif' });
        }
      }
      // objekty
      if (this.opts.objects && this.opts.starLabels) {
        for (const o of Object.values(COURSE.objects)) {
          if (o.type === 'ast' || o.type === 'bod') continue;
          this.project(o.ra, o.dec, p); if (p.c < 0.1 || (this.mode === 'hor' && p.alt < 0)) continue;
          const k = 2 / (1 + p.c); const pr = Math.max(5, o.r * D2R * this.scale * k);
          jobs.push({ prio: 1.5, text: o.short.split(' – ')[0], at: [p.x + pr * 0.7 + 3, p.y + pr * 0.7 + 6], style: 'rgba(255,200,140,0.85)', font: '11px system-ui, sans-serif' });
        }
      }
      jobs.sort((a, b) => a.prio - b.prio);
      for (const j of jobs) {
        ctx.font = j.font;
        const tw = ctx.measureText(j.text).width;
        let cands;
        if (j.star) {
          const s = j.star;
          cands = [[s.x + s.r + 4, s.y - s.r - 3], [s.x + s.r + 4, s.y + s.r + 8], [s.x - s.r - 4 - tw, s.y - s.r - 3], [s.x - s.r - 4 - tw, s.y + s.r + 8]];
        } else if (j.center) cands = [[j.center[0] - tw / 2, j.center[1]], [j.center[0] - tw / 2, j.center[1] - 28]];
        else cands = [j.at];
        for (const [x, y] of cands) {
          if (x < 2 || x + tw > this.w - 2 || y < 8 || y > this.h - 6) continue;
          if (!free(x - 1, y - 7, tw + 2, 14)) continue;
          placed.push({ x: x - 1, y: y - 7, w: tw + 2, h: 14 });
          ctx.fillStyle = j.style; ctx.fillText(j.text, x, y);
          break;
        }
      }
      ctx.restore();
    }

    _conCenter(id) {
      if (!this._cc) this._cc = {};
      if (this._cc[id]) return this._cc[id];
      // střed podle čar souhvězdí (lepší pro popisek), jinak podle katalogu
      const segs = SKY.lines[id];
      let c = SKY.cons[id].c;
      if (segs) {
        let x = 0, y = 0, z = 0;
        for (const seg of segs) for (const [ra, dec] of seg) { const r = ra * D2R, d = dec * D2R; x += Math.cos(d) * Math.cos(r); y += Math.cos(d) * Math.sin(r); z += Math.sin(d); }
        const n = Math.hypot(x, y, z);
        c = [((Math.atan2(y, x) * R2D) + 360) % 360, Math.asin(z / n) * R2D];
      }
      this._cc[id] = c; return c;
    }

    conExtent(id) {
      const c = this._conCenter(id); let m = 0;
      for (const seg of SKY.lines[id] || []) for (const [ra, dec] of seg) m = Math.max(m, angDist(c[0], c[1], ra, dec));
      return { ra: c[0], dec: c[1], r: m };
    }

    _drawGround() {
      const ctx = this.ctx; const p = {};
      // horizont = kružnice v projekci (nebo přímka). Body na horizontu:
      const pts = [];
      for (let a = 0; a <= 360; a += 2) {
        const work = { x: Math.cos(-a * D2R), y: Math.sin(-a * D2R), z: 0 };
        this._projVec(work.x, work.y, work.z, p);
        pts.push([p.x, p.y, p.c]);
      }
      ctx.save();
      ctx.beginPath();
      // velký obdélník + horizont (evenodd) → země je vně kružnice, pokud se díváme nad obzor
      const W = this.w, H = this.h;
      ctx.rect(-W * 4, -H * 4, W * 9, H * 9);
      let first = true;
      for (const [x, y, c] of pts) {
        const X = Math.max(-1e5, Math.min(1e5, x)), Y = Math.max(-1e5, Math.min(1e5, y));
        if (first) { ctx.moveTo(X, Y); first = false; } else ctx.lineTo(X, Y);
      }
      ctx.closePath();
      ctx.fillStyle = 'rgba(14,24,18,0.96)';
      if (this.center.lat >= 0) ctx.fill('evenodd');
      else { ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); }
      // linie horizontu
      ctx.beginPath(); let pen = false;
      for (const [x, y, c] of pts) { if (c < -0.5) { pen = false; continue; } if (pen) ctx.lineTo(x, y); else ctx.moveTo(x, y); pen = true; }
      ctx.strokeStyle = 'rgba(120,170,120,0.7)'; ctx.lineWidth = 1.5; ctx.stroke();
      // světové strany
      const dirs = [['S', 0], ['SV', 45], ['V', 90], ['JV', 135], ['J', 180], ['JZ', 225], ['Z', 270], ['SZ', 315]];
      ctx.font = '600 13px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      for (const [t, a] of dirs) {
        this._projVec(Math.cos(-a * D2R), Math.sin(-a * D2R), 0, p);
        if (p.c < 0 || p.x < 0 || p.x > this.w || p.y < 0 || p.y > this.h) continue;
        ctx.fillStyle = t.length === 1 ? 'rgba(200,240,190,0.95)' : 'rgba(170,210,160,0.7)';
        ctx.fillText(t, p.x, Math.min(this.h - 18, p.y + 6));
      }
      ctx.restore();
    }

    _drawCompass() {
      // šipky S (sever) a V (východ) v rohu – v rovníkové mapě
      const ctx = this.ctx; const x = this.w - 34, y = this.h - 34, L = 20;
      const c = this.center; const p = {}, q = {};
      this.project(c.lon, Math.min(89, c.lat + 1), p); this.project(c.lon, c.lat, q);
      const nx = p.x - q.x, ny = p.y - q.y, nl = Math.hypot(nx, ny) || 1;
      this.project(c.lon + 1 / Math.max(0.05, Math.cos(c.lat * D2R)), c.lat, p);
      const ex = p.x - q.x, ey = p.y - q.y, el = Math.hypot(ex, ey) || 1;
      ctx.save(); ctx.strokeStyle = 'rgba(180,200,240,0.6)'; ctx.fillStyle = 'rgba(180,200,240,0.8)'; ctx.lineWidth = 1.2;
      ctx.font = '11px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + nx / nl * L, y + ny / nl * L); ctx.moveTo(x, y); ctx.lineTo(x + ex / el * L, y + ey / el * L); ctx.stroke();
      ctx.fillText('S', x + nx / nl * (L + 8), y + ny / nl * (L + 8));
      ctx.fillText('V', x + ex / el * (L + 8), y + ey / el * (L + 8));
      ctx.restore();
    }

    _drawHighlight(hl) {
      const ctx = this.ctx; const p = {};
      if (hl.type === 'ring' || hl.type === 'pointer') {
        this.project(hl.ra, hl.dec, p);
        if (!(p.c >= -0.1) || !isFinite(p.x)) return;
        const k = 2 / (1 + p.c);
        const r = Math.max(hl.minPx || 13, (hl.r || 0) * D2R * this.scale * k + 6);
        ctx.save();
        ctx.strokeStyle = hl.color || '#ff4d4d'; ctx.lineWidth = 2.4; ctx.shadowColor = hl.color || '#ff4d4d'; ctx.shadowBlur = 10;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, 2 * Math.PI); ctx.stroke();
        if (hl.type === 'pointer') {
          // „laserové ukazovátko“ – šipka mířící na cíl
          const ang = -Math.PI / 4; const L = 46;
          const sx = p.x + Math.cos(ang) * (r + L), sy = p.y + Math.sin(ang) * (r + L);
          const ex = p.x + Math.cos(ang) * (r + 3), ey = p.y + Math.sin(ang) * (r + 3);
          ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke();
          ctx.beginPath(); ctx.moveTo(ex, ey);
          ctx.lineTo(ex + 10 * Math.cos(ang + 0.45), ey + 10 * Math.sin(ang + 0.45));
          ctx.lineTo(ex + 10 * Math.cos(ang - 0.45), ey + 10 * Math.sin(ang - 0.45));
          ctx.closePath(); ctx.fillStyle = hl.color || '#ff4d4d'; ctx.fill();
        }
        if (hl.label) {
          ctx.shadowBlur = 0; ctx.font = '600 13px system-ui, sans-serif'; ctx.fillStyle = '#fff';
          ctx.textBaseline = 'middle';
          const tw = ctx.measureText(hl.label).width;
          let x = p.x + r + 6; if (x + tw > this.w - 4) x = p.x - r - 6 - tw;
          ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(x - 4, p.y - 10, tw + 8, 20);
          ctx.fillStyle = hl.textColor || '#fff'; ctx.fillText(hl.label, x, p.y);
        }
        ctx.restore();
      } else if (hl.type === 'conLabel') {
        const c = this._conCenter(hl.id); this.project(c[0], c[1], p);
        ctx.save(); ctx.font = '700 15px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(hl.label).width;
        ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(p.x - tw / 2 - 6, p.y - 12, tw + 12, 24);
        ctx.fillStyle = hl.textColor || '#fff'; ctx.fillText(hl.label, p.x, p.y);
        ctx.restore();
      }
    }

    _drawMark(m) {
      const ctx = this.ctx;
      ctx.save(); ctx.strokeStyle = m.color || '#fff'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(m.x - 7, m.y - 7); ctx.lineTo(m.x + 7, m.y + 7); ctx.moveTo(m.x + 7, m.y - 7); ctx.lineTo(m.x - 7, m.y + 7); ctx.stroke();
      ctx.restore();
    }

    // ---------------------------------------------------- vyhledání
    starAt(sx, sy, maxPx = 14) {
      let best = null, bd = Infinity;
      for (const s of this._screen || []) {
        const d = Math.hypot(s.x - sx, s.y - sy) - s.r * 0.6 + s.mag * 0.8;
        if (Math.hypot(s.x - sx, s.y - sy) <= maxPx + s.r && d < bd) { bd = d; best = s; }
      }
      if (!best) return null;
      const i = best.i, hip = S.hip[i];
      return { hip, ra: S.ra[i], dec: S.dec[i], mag: S.mag[i], x: best.x, y: best.y, desig: SKY.desig[hip], named: named.get(hip) };
    }

    objectAt(sx, sy) {
      const p = {}; let best = null, bd = Infinity;
      for (const [key, o] of Object.entries(COURSE.objects)) {
        if (o.type === 'ast') continue;
        this.project(o.ra, o.dec, p); if (p.c < 0) continue;
        const k = 2 / (1 + p.c); const pr = Math.max(10, o.r * D2R * this.scale * k);
        const d = Math.hypot(p.x - sx, p.y - sy);
        if (d < pr && d < bd) { bd = d; best = key; }
      }
      return best;
    }

    // ---------------------------------------------------- ovládání
    _bind() {
      const c = this.canvas;
      const pointers = new Map();
      let last = null, moved = 0, pinch = null;
      c.style.touchAction = 'none';
      c.addEventListener('pointerdown', e => {
        c.setPointerCapture(e.pointerId);
        pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (pointers.size === 1) { last = { x: e.offsetX, y: e.offsetY }; moved = 0; }
        if (pointers.size === 2) { const [a, b] = [...pointers.values()]; pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), fov: this.fov }; }
      });
      c.addEventListener('pointermove', e => {
        if (!pointers.has(e.pointerId)) {
          if (this.onHover && e.pointerType === 'mouse') this.onHover(e.offsetX, e.offsetY);
          return;
        }
        pointers.set(e.pointerId, { x: e.offsetX, y: e.offsetY });
        if (pointers.size === 2 && pinch) {
          const [a, b] = [...pointers.values()];
          const d = Math.hypot(a.x - b.x, a.y - b.y);
          this.zoomTo(pinch.fov * pinch.d / Math.max(10, d));
          moved += 10; return;
        }
        if (!last) return;
        const dx = e.offsetX - last.x, dy = e.offsetY - last.y;
        moved += Math.abs(dx) + Math.abs(dy);
        last = { x: e.offsetX, y: e.offsetY };
        this.panBy(dx, dy);
      });
      const up = e => {
        const wasClick = pointers.size === 1 && moved < 6;
        pointers.delete(e.pointerId);
        if (pointers.size < 2) pinch = null;
        if (pointers.size === 0) {
          last = null;
          if (wasClick && this.onClick) this.onClick(e.offsetX, e.offsetY);
        } else { const v = [...pointers.values()][0]; last = { x: v.x, y: v.y }; }
      };
      c.addEventListener('pointerup', up);
      c.addEventListener('pointercancel', e => { pointers.delete(e.pointerId); last = null; pinch = null; });
      c.addEventListener('wheel', e => {
        e.preventDefault();
        this.zoomTo(this.fov * Math.exp(e.deltaY * 0.0012));
      }, { passive: false });
    }

    panBy(dx, dy) {
      this._prep();
      // posun v natočeném systému
      const X = dx * this.cr + dy * this.sr, Y = -dx * this.sr + dy * this.cr;
      const k = 1 / this.scale * R2D;
      let lat = this.center.lat + Y * k;
      lat = Math.max(this.mode === 'hor' ? -10 : -89.5, Math.min(89.5, lat));
      this.center.lat = lat;
      this.center.lon += X * k / Math.max(0.08, Math.cos(lat * D2R));
      this.center.lon = ((this.center.lon % 360) + 360) % 360;
      this.requestDraw();
    }

    zoomTo(fov) { this.fov = Math.max(12, Math.min(this.mode === 'hor' ? 190 : 160, fov)); this.requestDraw(); }
  }

  SkyView.S = S;
  SkyView.hipIndex = hipIndex;
  SkyView.named = named;
  SkyView.angDist = angDist;
  SkyView.lstDeg = lstDeg;
  window.SkyView = SkyView;
})();
