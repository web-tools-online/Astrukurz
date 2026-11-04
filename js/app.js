(function () {
  'use strict';

  const C = window.COURSE;
  const SKY = window.SKY;
  const SV = window.SkyView;

  // ------------------------------------------------------------ pomocné
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  function h(tag, attrs = {}, ...kids) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const kid of kids.flat()) if (kid !== null && kid !== undefined && kid !== false) el.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
    return el;
  }
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = arr => arr[Math.floor(Math.random() * arr.length)];
  const shuffle = arr => { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function norm(s) {
    return String(s).toLowerCase()
      .replace(/χ/g, 'chi').replace(/ο/g, 'o').replace(/α/g, 'alfa').replace(/β/g, 'beta').replace(/γ/g, 'gama')
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '');
  }
  function lev(a, b) {
    const m = a.length, n = b.length; if (!m) return n; if (!n) return m;
    let prev = Array.from({ length: n + 1 }, (_, j) => j);
    for (let i = 1; i <= m; i++) {
      const cur = [i];
      for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = cur;
    }
    return prev[n];
  }

  const conById = Object.fromEntries(C.constellations.map(c => [c.id, c]));
  const TYPE_NAMES = { G: 'galaxie', OH: 'otevřená hvězdokupa', KH: 'kulová hvězdokupa', EM: 'emisní mlhovina', PM: 'planetární mlhovina', bod: 'význačný bod oblohy', ast: 'asterismus (útvar z hvězd)' };
  const starPos = hip => { const i = SV.hipIndex.get(hip); return { ra: SV.S.ra[i], dec: SV.S.dec[i], mag: SV.S.mag[i] }; };
  const conClass = c => c.ecl ? 'ecl' : (c.circ ? 'circ' : '');
  const conNameFull = id => conById[id] ? `${conById[id].cz} (${conById[id].la})` : (SKY.cons[id] ? `${SKY.cons[id].cz} (${SKY.cons[id].la})` : id);

  // Položky kurzu (hvězdy, souhvězdí, objekty, asterismy)
  const ITEMS = {};
  for (const [key, s] of Object.entries(C.stars)) {
    const p = starPos(s.hip);
    ITEMS['star:' + key] = { kind: 'star', key, id: 'star:' + key, name: s.name, con: s.con, season: conById[s.con].season, ra: p.ra, dec: p.dec, hip: s.hip, accept: [s.name, ...(s.alt || [])], data: s, course: true };
  }
  for (const [hip, name] of Object.entries(C.extraStars)) {
    const d = SKY.desig[hip]; if (!d || !conById[d[0]]) continue;
    const p = starPos(+hip);
    const key = 'x' + hip;
    ITEMS['star:' + key] = { kind: 'star', key, id: 'star:' + key, name, con: d[0], season: conById[d[0]].season, ra: p.ra, dec: p.dec, hip: +hip, accept: [name], data: { name, bayer: `${d[1]} ${conById[d[0]].gen}`, info: 'Není v tabulkách – jen pro orientaci.' }, course: false };
  }
  for (const c of C.constellations) {
    ITEMS['con:' + c.id] = { kind: 'con', key: c.id, id: 'con:' + c.id, name: c.cz, con: c.id, season: c.season, accept: [c.cz, c.la, c.abbr], data: c, course: true };
  }
  for (const [key, o] of Object.entries(C.objects)) {
    if (o.type === 'ast') continue;
    ITEMS['obj:' + key] = { kind: 'obj', key, id: 'obj:' + key, name: o.name, con: o.con, season: conById[o.con].season, ra: o.ra, dec: o.dec, accept: [o.name, o.short, ...(o.alt || [])], data: o, course: true };
  }
  for (const a of C.asterisms) {
    const obj = C.objects[a.id];
    const pts = (a.path || a.segments.flat()).map(starPos);
    const c = centroid(pts);
    ITEMS['ast:' + a.id] = { kind: 'ast', key: a.id, id: 'ast:' + a.id, name: a.name, con: obj ? obj.con : null, season: a.season, ra: c.ra, dec: c.dec, accept: [a.name, ...(obj ? obj.alt : []), ...(a.id === 'polygon' ? ['zimni sestiuhelnik', 'zimni mnohouhelnik', 'sestiuhelnik', 'mnohouhelnik'] : []), ...(a.id === 'square' ? ['pegasuv ctverec', 'ctverec pegasu', 'velky ctverec'] : [])], data: a, course: true };
  }

  function centroid(pts) {
    let x = 0, y = 0, z = 0; const D = Math.PI / 180;
    for (const p of pts) { x += Math.cos(p.dec * D) * Math.cos(p.ra * D); y += Math.cos(p.dec * D) * Math.sin(p.ra * D); z += Math.sin(p.dec * D); }
    const n = Math.hypot(x, y, z);
    return { ra: ((Math.atan2(y, x) / D) + 360) % 360, dec: Math.asin(z / n) / D };
  }

  // ------------------------------------------------------------ záložky
  const pages = ['atlas', 'mapa', 'kviz', 'tabulka'];
  let mapView = null;
  function showTab(name, push = true) {
    if (!pages.includes(name)) name = 'atlas';
    for (const p of pages) $('#tab-' + p).hidden = p !== name;
    $$('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === name));
    if (push && location.hash.slice(1).split('?')[0] !== name) history.replaceState(null, '', '#' + name);
    if (name === 'mapa') { ensureMap(); requestAnimationFrame(() => { mapView._resize(); mapView.draw(); }); }
    window.scrollTo({ top: 0 });
  }
  $$('.tab').forEach(b => b.addEventListener('click', () => showTab(b.dataset.tab)));
  window.addEventListener('hashchange', () => showTab(location.hash.slice(1).split('?')[0], false));

  // ============================================================ ATLAS
  function buildAtlas() {
    const root = $('#atlas-root');
    for (const season of ['zima', 'podzim']) {
      const g = h('div', { class: 'season-group', 'data-season': season }, h('h2', {}, C.seasons[season].name));
      const cards = h('div', { class: 'cards' });
      for (const a of C.asterisms.filter(a => a.season === season)) cards.append(asterismCard(a));
      for (const c of C.constellations.filter(c => c.season === season)) cards.append(conCard(c));
      g.append(cards);
      root.append(g);
    }
    $$('#atlas-filter .pill').forEach(b => b.addEventListener('click', () => {
      $$('#atlas-filter .pill').forEach(x => x.classList.toggle('active', x === b));
      $$('.season-group').forEach(g => { g.hidden = b.dataset.season !== 'all' && g.dataset.season !== b.dataset.season; });
    }));
  }

  const lazy = new IntersectionObserver(entries => {
    for (const e of entries) if (e.isIntersecting) { lazy.unobserve(e.target); e.target._init(); }
  }, { rootMargin: '300px' });

  function miniMap(canvas, setup) {
    canvas._init = () => {
      const v = new SV(canvas, { interactive: false, starLabels: true, extraLabels: true, conLabels: true, objects: true, asterisms: false, compass: false, starScale: 1.05 });
      setup(v);
      v.draw();
    };
    lazy.observe(canvas);
  }

  function conCard(c) {
    const canvas = h('canvas', { class: 'mini', title: 'Otevřít v mapě oblohy' });
    miniMap(canvas, v => {
      v.opts.focusCon = c.id; v.opts.bayer = true; v.opts.ecliptic = !!c.ecl; v.opts.circumpolar = !!c.circ;
      if (c.id === 'Psc') v.opts.equator = true;
      if (c.id === 'Peg' || c.id === 'Aqr' || c.season === 'zima') v.opts.asterisms = true;
      const e = v.conExtent(c.id);
      v.setView(e.ra, e.dec, clamp(e.r * 2.5 + 12, 30, 95));
    });
    canvas.addEventListener('click', () => openMapAt({ con: c.id }));

    const stars = c.stars.map(k => C.stars[k]);
    const objs = c.objects.map(k => C.objects[k]);
    const cls = conClass(c);
    return h('article', { class: 'card', id: 'con-' + c.id },
      canvas,
      h('div', { class: 'card-body' },
        h('div', { class: 'card-title' },
          h('h3', { class: cls }, c.cz),
          c.ecl ? h('span', { class: 'badge ecl' }, 'ekliptikální') : null,
          c.circ ? h('span', { class: 'badge circ' }, 'cirkumpolární') : null,
          c.note ? h('span', { class: 'badge' }, c.note) : null),
        h('dl', { class: 'facts' },
          h('dt', {}, 'latinsky'), h('dd', {}, c.la),
          h('dt', {}, 'genitiv'), h('dd', {}, c.gen),
          h('dt', {}, 'zkratka'), h('dd', {}, c.abbr)),
        stars.length ? h('div', { class: 'section-label' }, 'Hvězdy') : null,
        stars.length ? h('ul', { class: 'list' }, stars.map(s => h('li', {},
          h('b', { class: s.circ ? 'circ' : '' }, s.name), s.polygon ? h('span', { class: 'poly', title: 'součást zimního mnohoúhelníku' }, ' ★') : null,
          ' ', h('span', { class: 'bayer' }, `(${s.bayer})`), s.pdf ? h('span', { class: 'note' }, ` – v tabulce „${s.pdf}“`) : null,
          h('br'), h('span', { class: 'note' }, s.info)))) : null,
        objs.length ? h('div', { class: 'section-label' }, 'Objekty') : null,
        objs.length ? h('ul', { class: 'list' }, objs.map(o => h('li', {},
          h('b', {}, o.short), ' ', h('span', { class: 'note' }, `– ${TYPE_NAMES[o.type]}`), h('br'), h('span', { class: 'note' }, o.info)))) : null,
        h('div', { class: 'section-label' }, 'Jak najít'),
        h('div', { class: 'tip' }, c.tip),
        h('div', { class: 'card-actions' },
          h('button', { class: 'pill', onclick: () => openMapAt({ con: c.id }) }, 'Na mapě oblohy'),
          h('button', { class: 'pill', onclick: () => startQuiz({ only: [`con:${c.id}`, ...c.stars.map(k => 'star:' + k), ...c.objects.map(k => (C.objects[k].type === 'ast' ? 'ast:' : 'obj:') + k)] }) }, 'Procvičit toto souhvězdí'))));
  }

  function asterismCard(a) {
    const canvas = h('canvas', { class: 'mini', title: 'Otevřít v mapě oblohy' });
    const it = ITEMS['ast:' + a.id];
    const pts = (a.path || a.segments.flat()).map(starPos);
    let r = 0; for (const p of pts) r = Math.max(r, SV.angDist(it.ra, it.dec, p.ra, p.dec));
    miniMap(canvas, v => {
      v.highlights = [{ type: 'asterism', id: a.id }];
      v.opts.allLines = true;
      v.setView(it.ra, it.dec, clamp(r * 2.6 + 14, 28, 100));
    });
    canvas.addEventListener('click', () => openMapAt({ ast: a.id }));
    return h('article', { class: 'card ast' },
      canvas,
      h('div', { class: 'card-body' },
        h('div', { class: 'card-title' }, h('h3', { class: 'poly' }, a.name), h('span', { class: 'badge' }, 'asterismus')),
        h('div', { class: 'tip' }, a.info)));
  }

  // ============================================================ MAPA
  const LAYERS = [
    ['lines', 'Čáry souhvězdí', true], ['allLines', 'I ostatní souhvězdí', true],
    ['starLabels', 'Názvy hvězd', true], ['extraLabels', 'Další názvy (Markab…)', true],
    ['conLabels', 'Názvy souhvězdí', true], ['objects', 'Objekty (M31, M42…)', true],
    ['asterisms', 'Asterismy', true], ['bounds', 'Hranice souhvězdí', false],
    ['ecliptic', 'Ekliptika', false], ['equator', 'Světový rovník', false],
    ['circumpolar', 'Hranice cirkumpolárních', false], ['milkyway', 'Mléčná dráha', true],
  ];

  function ensureMap() {
    if (mapView) return;
    const canvas = $('#map-canvas');
    mapView = new SV(canvas, Object.fromEntries(LAYERS.map(([k, , v]) => [k, v])));
    const v = mapView;
    v.setTime(new Date());
    applyPreset('zima');

    const list = $('#layer-list');
    for (const [k, label] of LAYERS) {
      const cb = h('input', { type: 'checkbox', 'data-layer': k });
      cb.checked = !!v.opts[k];
      cb.addEventListener('change', () => { v.opts[k] = cb.checked; v.requestDraw(); });
      list.append(h('label', {}, cb, label));
    }
    $$('[data-preset]').forEach(b => b.addEventListener('click', () => applyPreset(b.dataset.preset)));
    $$('[data-mode]').forEach(b => b.addEventListener('click', () => setMode(b.dataset.mode)));
    $('#zoom-in').onclick = () => v.zoomTo(v.fov / 1.3);
    $('#zoom-out').onclick = () => v.zoomTo(v.fov * 1.3);
    $('#rot-left').onclick = () => { v.rotation -= 15; v.requestDraw(); };
    $('#rot-right').onclick = () => { v.rotation += 15; v.requestDraw(); };

    // čas
    const d = new Date();
    $('#map-date').value = isoDate(d);
    $('#map-time').value = d.getHours() * 60 + Math.round(d.getMinutes() / 10) * 10;
    const updTime = () => {
      const m = +$('#map-time').value;
      $('#map-time-out').textContent = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
      const [Y, M, D] = ($('#map-date').value || isoDate(new Date())).split('-').map(Number);
      const dt = new Date(Y, M - 1, D, Math.floor(m / 60), m % 60);
      const before = v.mode === 'hor' ? { az: -v.center.lon, alt: v.center.lat } : null;
      v.setTime(dt);
      if (before) { v.center.lon = -before.az; v.center.lat = before.alt; }
    };
    $('#map-time').addEventListener('input', updTime);
    $('#map-date').addEventListener('change', updTime);
    $('#map-now').onclick = () => { const n = new Date(); $('#map-date').value = isoDate(n); $('#map-time').value = n.getHours() * 60 + n.getMinutes() - n.getMinutes() % 10; updTime(); };
    v._updTime = updTime;
    updTime();

    // hledání
    const dl = $('#search-list');
    const entries = [];
    for (const it of Object.values(ITEMS)) entries.push([it.kind === 'con' ? `${it.name} (${it.data.la})` : it.name, it]);
    entries.sort((a, b) => a[0].localeCompare(b[0], 'cs'));
    for (const [label] of entries) dl.append(h('option', { value: label }));
    $('#map-search').addEventListener('change', e => {
      const q = norm(e.target.value); if (!q) return;
      let hit = entries.find(([l]) => norm(l) === q);
      if (!hit) hit = entries.find(([, it]) => it.accept.some(a => norm(a) === q));
      if (!hit) hit = entries.find(([l]) => norm(l).startsWith(q));
      if (hit) { const it = hit[1]; openMapAt(it.kind === 'con' ? { con: it.key } : it.kind === 'ast' ? { ast: it.key } : { item: it.id }, false); e.target.blur(); }
    });

    // klik a hover
    v.onClick = (x, y) => {
      const s = v.starAt(x, y, 10);
      const o = v.objectAt(x, y);
      if (s && (s.named || !o)) return showStarInfo(s);
      if (o) return showItemInfo(ITEMS['obj:' + o]);
      const c = v.conAt(x, y);
      if (c) return showConInfo(c);
      hideInfo();
    };
    const tip = $('#map-tip');
    v.onHover = (x, y) => {
      const s = v.starAt(x, y, 8);
      let text = null;
      if (s) text = s.named ? s.named.name : (s.desig && s.desig[1] ? `${s.desig[1]} ${SKY.cons[s.desig[0]] ? SKY.cons[s.desig[0]].gen : ''}` : null);
      if (!text) { const o = v.objectAt(x, y); if (o) text = C.objects[o].short; }
      if (text) { tip.hidden = false; tip.textContent = text; tip.style.left = x + 'px'; tip.style.top = y + 'px'; canvas.style.cursor = 'pointer'; }
      else { tip.hidden = true; canvas.style.cursor = ''; }
    };
    canvas.addEventListener('pointerleave', () => { tip.hidden = true; });
  }

  function isoDate(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

  function applyPreset(p) {
    const v = mapView;
    v.rotation = 0;
    if (v.mode === 'hor') {
      if (p === 'sever') { v.center = { lon: 0, lat: 45 }; v.fov = 120; }
      else {
        const dt = new Date(C.seasons[p].evening);
        $('#map-date').value = isoDate(dt);
        $('#map-time').value = dt.getHours() * 60 + dt.getMinutes();
        v._updTime();
        v.center = { lon: -180, lat: 42 }; v.fov = 125;
      }
    } else {
      if (p === 'sever') v.setView(30, 80, 110);
      else { const s = C.seasons[p].view; v.setView(s.ra, s.dec, s.fov); }
    }
    v.requestDraw();
  }

  function setMode(mode) {
    const v = mapView;
    $$('[data-mode]').forEach(b => b.classList.toggle('active', b.dataset.mode === mode));
    $('#time-group').hidden = mode !== 'hor';
    if (v.mode === mode) return;
    v.mode = mode; v.rotation = 0;
    if (mode === 'hor') { v._updTime(); v.center = { lon: -180, lat: 40 }; v.fov = 125; }
    else applyPreset('zima');
    v.requestDraw();
  }

  function openMapAt(target, switchTab = true) {
    if (switchTab) showTab('mapa');
    ensureMap();
    const v = mapView;
    requestAnimationFrame(() => {
      v._resize();
      if (target.con) {
        const e = v.conExtent(target.con);
        v.setView(e.ra, e.dec, clamp(e.r * 2.8 + 20, 40, 120));
        showConInfo(target.con);
      } else if (target.ast) {
        const it = ITEMS['ast:' + target.ast];
        v.setView(it.ra, it.dec, 75);
        v.highlights = [{ type: 'asterism', id: target.ast }];
        showItemInfo(it, false);
      } else if (target.item) {
        const it = ITEMS[target.item];
        v.setView(it.ra, it.dec, 70);
        showItemInfo(it);
      }
      v.draw();
    });
  }

  function infoBox(html) {
    const box = $('#map-info');
    box.innerHTML = `<button class="close" aria-label="Zavřít">×</button>` + html;
    box.hidden = false;
    $('.close', box).onclick = hideInfo;
  }
  function hideInfo() { $('#map-info').hidden = true; mapView.highlights = []; mapView.opts.focusCon = null; mapView.requestDraw(); }

  function showStarInfo(s) {
    const v = mapView;
    const nm = s.named;
    const conId = s.desig ? s.desig[0] : null;
    const course = nm && nm.course ? C.stars[nm.key] : null;
    const title = nm ? nm.name : (s.desig && s.desig[1] ? `${s.desig[1]} ${SKY.cons[conId].gen}` : `HIP ${s.hip}`);
    const bayer = course ? course.bayer : (s.desig && s.desig[1] ? `${s.desig[1]} ${SKY.cons[conId] ? SKY.cons[conId].gen : ''}` : '');
    v.highlights = [{ type: 'ring', ra: s.ra, dec: s.dec, color: '#ffd166' }];
    v.opts.focusCon = conId; v.requestDraw();
    infoBox(`<h3 class="${course && course.circ ? 'circ' : ''}">${esc(title)}</h3>
      <div class="sub">${bayer ? esc(bayer) + ' · ' : ''}souhvězdí ${esc(conId ? conNameFull(conId) : '?')} · ${s.mag.toFixed(1).replace('.', ',')} mag</div>
      ${course ? `<p>${esc(course.info)}</p>${course.polygon ? '<p class="poly">★ součást zimního mnohoúhelníku</p>' : ''}` : (nm ? '<p class="sub">Není v tabulkách – jen pro orientaci.</p>' : '')}
      ${conId && conById[conId] ? `<p class="sub">Je v tabulkách (${esc(C.seasons[conById[conId].season].name.toLowerCase())}).</p>` : ''}`);
  }

  function showConInfo(id) {
    const v = mapView; const c = conById[id]; const sc = SKY.cons[id];
    v.highlights = [{ type: 'con', id, color: 'rgba(123,223,242,0.10)', stroke: 'rgba(123,223,242,0.7)' }];
    v.opts.focusCon = id; v.requestDraw();
    if (!c) { infoBox(`<h3>${esc(sc.cz)}</h3><div class="sub">${esc(sc.la)} · genitiv ${esc(sc.gen)} · ${esc(id)}</div><p class="sub">Toto souhvězdí není v tabulkách.</p>`); return; }
    infoBox(`<h3 class="${conClass(c)}">${esc(c.cz)}</h3>
      <div class="sub">${esc(c.la)} · genitiv <b>${esc(c.gen)}</b> · zkratka <b>${esc(c.abbr)}</b>${c.ecl ? ' · <span class="ecl">ekliptikální</span>' : ''}${c.circ ? ' · <span class="circ">cirkumpolární</span>' : ''}</div>
      ${c.stars.length ? `<p><b>Hvězdy:</b> ${c.stars.map(k => esc(C.stars[k].name)).join(', ')}</p>` : ''}
      ${c.objects.length ? `<p><b>Objekty:</b> ${c.objects.map(k => esc(C.objects[k].short)).join(', ')}</p>` : ''}
      <p>${esc(c.tip)}</p>`);
  }

  function showItemInfo(it, ring = true) {
    const v = mapView;
    if (it.kind === 'con') return showConInfo(it.key);
    if (ring) v.highlights = [{ type: 'ring', ra: it.ra, dec: it.dec, r: it.data.r || 0, color: '#ffd166' }];
    v.opts.focusCon = it.con; v.requestDraw();
    const d = it.data;
    let sub = '';
    if (it.kind === 'star') sub = `${esc(d.bayer || '')} · souhvězdí ${esc(conNameFull(it.con))}`;
    else if (it.kind === 'obj') sub = `${esc(TYPE_NAMES[d.type])} · souhvězdí ${esc(conNameFull(it.con))}`;
    else sub = 'asterismus';
    infoBox(`<h3>${esc(it.name)}</h3><div class="sub">${sub}</div><p>${esc(d.info || '')}</p>`);
  }

  // ============================================================ KVÍZ
  const STATS_KEY = 'astrokurz-stats-v1';
  let stats = {};
  try { stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}') || {}; } catch (e) { stats = {}; }
  function saveStats() { try { localStorage.setItem(STATS_KEY, JSON.stringify(stats)); } catch (e) { /* nevadí */ } }
  function record(id, ok) {
    const s = stats[id] || (stats[id] = { ok: 0, bad: 0 });
    if (ok) s.ok++; else s.bad++;
    s.t = Date.now();
    saveStats();
  }

  const Q = { settings: null, view: null, n: 0, total: 0, score: 0, max: 0, recent: [], mistakes: [], queue: null, cur: null };

  function readSettings() {
    const f = $('#quiz-setup');
    const vals = name => $$(`[name=${name}]`, f).filter(i => i.checked).map(i => i.value);
    const on = name => $(`[name=${name}]`, f).checked;
    const s = {
      seasons: new Set(vals('season')),
      types: vals('qtype'),
      answer: vals('answer')[0],
      count: +vals('count')[0],
      lines: on('lines'), rotate: on('rotate'), horizon: on('horizon'), milkyway: on('milkyway'), extra: on('extra'),
    };
    if (!s.seasons.size) s.seasons = new Set(['zima', 'podzim']);
    if (!s.types.length) s.types = ['pointStar'];
    return s;
  }

  function pool(kinds, s) {
    return Object.values(ITEMS).filter(it => kinds.includes(it.kind) && s.seasons.has(it.season) && (it.course || (s.extra && it.kind === 'star')));
  }

  function weightOf(it) {
    const st = stats[it.id];
    let w = 1;
    if (st) w = clamp(1 + 1.6 * st.bad - 0.45 * st.ok, 0.25, 6);
    if (Q.recent.includes(it.id)) w *= 0.02;
    return w;
  }
  function weightedPick(items) {
    const ws = items.map(weightOf); const tot = ws.reduce((a, b) => a + b, 0);
    let r = Math.random() * tot;
    for (let i = 0; i < items.length; i++) { r -= ws[i]; if (r <= 0) return items[i]; }
    return items[items.length - 1];
  }

  function options(correct, candidates, n = 4) {
    const others = shuffle(candidates.filter(x => x !== correct));
    return shuffle([correct, ...others.slice(0, n - 1)]);
  }

  // --- části otázek
  function partFromItem(label, it, kinds, sameSeason = true) {
    const s = Q.settings;
    let cands = Object.values(ITEMS).filter(x => kinds.includes(x.kind) && (x.course || (s.extra && x.kind === 'star')));
    const near = cands.filter(x => s.seasons.has(x.season));
    if (sameSeason && near.length >= 4) cands = near;
    return {
      label, correct: it.name, accept: it.accept, targetId: it.id,
      candidates: cands.map(x => ({ id: x.id, accept: x.accept })),
      options: options(it, cands).map(x => ({ text: x.name, ok: x === it })),
    };
  }
  function partCon(conId) { return partFromItem('Souhvězdí', ITEMS['con:' + conId], ['con']); }
  function partText(label, correct, all, accept) {
    const uniq = [...new Set(all)];
    return { label, correct, accept: accept || [correct], options: options(correct, uniq).map(t => ({ text: t, ok: t === correct })), exactOnly: true };
  }

  // --- generátory otázek
  const GEN = {
    pointStar(it) {
      return {
        type: 'pointStar', item: it,
        prompt: 'Učitel ukazuje na hvězdu. Jak se jmenuje a v jakém souhvězdí leží?',
        parts: [partFromItem('Hvězda', it, ['star']), partCon(it.con)],
        setup: v => { aim(v, it.ra, it.dec, {}); v.highlights = [{ type: 'pointer', ra: it.ra, dec: it.dec }]; },
        reveal: v => { v.highlights = [{ type: 'conLines', id: it.con, color: '#ffd166' }, { type: 'pointer', ra: it.ra, dec: it.dec, color: '#4ade80', label: `${it.name} · ${conById[it.con].cz}` }]; },
        answerText: `${it.name} (${it.data.bayer}) – souhvězdí ${conById[it.con].cz}`,
      };
    },
    pointCon(it) {
      const c = it.data;
      return {
        type: 'pointCon', item: it,
        prompt: 'Učitel ukazuje na vyznačenou oblast. Které je to souhvězdí?',
        parts: [partFromItem('Souhvězdí', it, ['con'])],
        setup: v => {
          const e = v.conExtent(c.id);
          aim(v, e.ra, e.dec, { fov: Math.max(rand(80, 110), e.r * 3 + 20), off: 0.12 });
          v.highlights = [{ type: 'con', id: c.id }];
          if (Q.settings.lines) v.highlights.push({ type: 'conLines', id: c.id, color: 'rgba(255,140,140,0.95)' });
        },
        reveal: v => { v.highlights = [{ type: 'con', id: c.id, color: 'rgba(74,222,128,0.12)', stroke: 'rgba(74,222,128,0.8)' }, { type: 'conLines', id: c.id, color: '#4ade80' }, { type: 'conLabel', id: c.id, label: c.cz, textColor: '#b9f5cf' }]; },
        answerText: `${c.cz} (${c.la})`,
      };
    },
    pointObj(it) {
      const o = it.data;
      const parts = [partFromItem(it.kind === 'ast' ? 'Útvar' : 'Objekt', it, ['obj', 'ast'])];
      if (it.kind === 'obj' && TYPE_NAMES[o.type] && o.type !== 'bod') {
        parts.push(partText('Typ objektu', TYPE_NAMES[o.type], ['galaxie', 'otevřená hvězdokupa', 'kulová hvězdokupa', 'emisní mlhovina']));
      }
      return {
        type: 'pointObj', item: it,
        prompt: it.kind === 'ast' ? 'Učitel ukazuje na útvar z hvězd. Jak se jmenuje?' : 'Učitel ukazuje na objekt. Co to je?',
        parts,
        setup: v => {
          aim(v, it.ra, it.dec, { fov: it.key === 'polygon' ? rand(95, 115) : undefined });
          if (it.kind === 'ast') {
            v.highlights = [{ type: 'asterism', id: it.key }];
            if (it.key === 'skopicek') v.highlights.push({ type: 'ring', ra: it.ra, dec: it.dec, r: 2.4 });
          } else {
            v.highlights = [{ type: o.r > 1.2 ? 'ring' : 'pointer', ra: it.ra, dec: it.dec, r: o.r }];
            if (it.key === 'jarnibod') { v.opts.ecliptic = true; v.opts.equator = true; }
          }
        },
        reveal: v => {
          const hl = v.highlights.filter(x => x.type === 'asterism');
          hl.push({ type: 'ring', ra: it.ra, dec: it.dec, r: it.kind === 'ast' ? 0 : o.r, color: '#4ade80', label: it.name, minPx: it.kind === 'ast' ? 4 : 13 });
          v.highlights = hl;
        },
        answerText: it.kind === 'obj' ? `${o.name} – ${TYPE_NAMES[o.type]}, souhvězdí ${conById[o.con].cz}` : it.name,
      };
    },
    find(it) {
      const what = { star: 'hvězdu ', con: 'souhvězdí ', obj: it.data && it.data.type === 'bod' ? '' : 'objekt ' }[it.kind];
      return {
        type: 'find', item: it, click: true,
        prompt: `Najdi na mapě a klikni na ${what}<b>${esc(it.kind === 'con' ? it.data.cz : it.name)}</b>.`,
        parts: [],
        setup: v => {
          const s = C.seasons[it.season].view;
          const t = it.kind === 'con' ? v.conExtent(it.key) : it;
          if (Q.settings.horizon) aim(v, t.ra, t.dec, { fov: rand(110, 130), off: 0.3 });
          else {
            v.mode = 'eq'; v.rotation = Q.settings.rotate ? rand(-40, 40) : 0;
            v.center = { lon: s.ra + rand(-12, 12), lat: s.dec + rand(-8, 8) }; v.fov = s.fov + rand(-5, 10);
            v._resize(); v._prep();
            if (!v.isVisible(t.ra, t.dec, 50)) aim(v, t.ra, t.dec, { fov: s.fov, off: 0.3 });
          }
          v.highlights = [];
        },
        reveal: v => {
          if (it.kind === 'con') v.highlights = [{ type: 'con', id: it.key, color: 'rgba(74,222,128,0.12)', stroke: 'rgba(74,222,128,0.8)' }, { type: 'conLines', id: it.key, color: '#4ade80' }, { type: 'conLabel', id: it.key, label: it.data.cz, textColor: '#b9f5cf' }];
          else v.highlights = [{ type: 'ring', ra: it.ra, dec: it.dec, r: it.kind === 'obj' ? it.data.r : 0, color: '#4ade80', label: it.name }];
        },
        answerText: it.kind === 'con' ? it.data.cz : it.name,
      };
    },
    table(it) {
      const s = Q.settings;
      const cons = C.constellations.filter(c => s.seasons.has(c.season));
      let q;
      if (it.kind === 'con') {
        const c = it.data;
        const kind = pick(['la', 'gen', 'abbr', 'fromLa', 'fromAbbr', 'class']);
        if (kind === 'la') q = { text: `Latinský název souhvězdí <b>${esc(c.cz)}</b>?`, part: partText('Latinsky', c.la, cons.map(x => x.la)) };
        if (kind === 'gen') q = { text: `Genitiv souhvězdí <b>${esc(c.cz)}</b> (${esc(c.la)})?`, part: partText('Genitiv', c.gen, cons.map(x => x.gen)) };
        if (kind === 'abbr') q = { text: `Zkratka souhvězdí <b>${esc(c.cz)}</b>?`, part: partText('Zkratka', c.abbr, cons.map(x => x.abbr)) };
        if (kind === 'fromLa') q = { text: `Které souhvězdí se latinsky jmenuje <b>${esc(c.la)}</b>?`, part: partText('Česky', c.cz, cons.map(x => x.cz)) };
        if (kind === 'fromAbbr') q = { text: `Které souhvězdí má zkratku <b>${esc(c.abbr)}</b>?`, part: partText('Česky', c.cz, cons.map(x => x.cz)) };
        if (kind === 'class') {
          const val = c.ecl ? 'ekliptikální (červeně)' : c.circ ? 'cirkumpolární (modře)' : 'ani jedno';
          q = { text: `Jak je v tabulce označeno souhvězdí <b>${esc(c.cz)}</b>?`, part: partText('Označení', val, ['ekliptikální (červeně)', 'cirkumpolární (modře)', 'ani jedno']), choiceOnly: true };
        }
      } else if (it.kind === 'star') {
        q = { text: `V jakém souhvězdí je hvězda <b>${esc(it.name)}</b>?`, part: partCon(it.con) };
      } else {
        if (it.kind === 'obj' && it.data.type !== 'bod' && Math.random() < 0.5) {
          q = { text: `Jaký typ objektu je <b>${esc(it.data.short)}</b>?`, part: partText('Typ', TYPE_NAMES[it.data.type], ['galaxie', 'otevřená hvězdokupa', 'kulová hvězdokupa', 'emisní mlhovina']), choiceOnly: true };
        } else {
          q = { text: `V jakém souhvězdí je <b>${esc(it.kind === 'obj' ? it.data.short : it.name)}</b>?`, part: partCon(it.con) };
        }
      }
      return {
        type: 'table', item: it, noMap: true, choiceOnly: q.choiceOnly,
        prompt: q.text, parts: [q.part],
        setup: () => {}, reveal: () => {},
        answerText: q.part.correct,
      };
    },
  };

  const TYPE_KINDS = { pointStar: ['star'], pointCon: ['con'], pointObj: ['obj', 'ast'], find: ['star', 'con', 'obj'], table: ['con', 'star', 'obj'] };

  // namíření pohledu: cíl je vidět, ale ne přesně uprostřed
  function aim(v, ra, dec, o) {
    const s = Q.settings;
    v._resize();
    v.rotation = s.rotate ? rand(-45, 45) : 0;
    const fov = o.fov || rand(75, 105);
    const off = (o.off !== undefined ? o.off : 0.22) * fov;
    if (s.horizon) {
      v.mode = 'hor';
      v.lst = (ra + rand(-50, 50) + 360) % 360;
      let hh = v.toHor(ra, dec);
      if (hh.alt < 12) { v.lst = ra; hh = v.toHor(ra, dec); }
      v.rotation = 0;
      v.center = { lon: -(hh.az + rand(-off, off)), lat: clamp(hh.alt + rand(-off, off) * 0.5, 22, 70) };
      v.fov = Math.max(fov, 100);
    } else {
      v.mode = 'eq';
      const a = rand(0, 2 * Math.PI), r = rand(0.3, 1) * off;
      const cdec = clamp(dec + r * Math.cos(a), -75, 88);
      v.center = { lon: ra + r * Math.sin(a) / Math.max(0.25, Math.cos(dec * Math.PI / 180)), lat: cdec };
      v.fov = fov;
    }
    v._prep();
    if (!v.isVisible(ra, dec, 60)) {
      if (v.mode === 'eq') v.center = { lon: ra, lat: dec };
      else { const hh = v.toHor(ra, dec); v.center = { lon: -hh.az, lat: Math.max(10, hh.alt) }; }
    }
  }

  // --- průběh kvízu
  function startQuiz(opt = {}) {
    showTab('kviz');
    Q.settings = readSettings();
    if (opt.only) {
      // procvičení konkrétních položek (z atlasu nebo chyb)
      const items = opt.only.map(id => ITEMS[id]).filter(Boolean);
      Q.settings.seasons = new Set(items.map(i => i.season));
    }
    Q.only = opt.only || null;
    Q.queue = opt.queue ? opt.queue.slice() : null;
    Q.n = 0; Q.score = 0; Q.max = 0; Q.recent = []; Q.mistakes = [];
    Q.total = Q.queue ? Q.queue.length : (Q.settings.count || Infinity);
    $('#quiz-setup').hidden = true; $('#quiz-end').hidden = true; $('#quiz-run').hidden = false;
    if (!Q.view) {
      Q.view = new SV($('#quiz-canvas'), { starLabels: false, conLabels: false, objects: false, asterisms: false, extraLabels: false, bayer: false, compass: true });
      Q.view.onClick = onQuizClick;
      $('#q-lines').addEventListener('change', e => { Q.view.opts.lines = e.target.checked; Q.view.requestDraw(); });
      $('#q-labels').addEventListener('change', e => { setLabels(e.target.checked); });
    }
    const v = Q.view;
    v.opts.lines = Q.settings.lines; v.opts.milkyway = Q.settings.milkyway;
    $('#q-lines').checked = Q.settings.lines;
    nextQuestion();
  }

  function setLabels(on) {
    const v = Q.view;
    Object.assign(v.opts, { starLabels: on, conLabels: on, objects: on, asterisms: on, extraLabels: on });
    $('#q-labels').checked = on;
    v.requestDraw();
  }

  function nextQuestion() {
    if (Q.n >= Q.total) return endQuiz();
    const s = Q.settings;
    let q = null;
    for (let tries = 0; tries < 30 && !q; tries++) {
      let type, it;
      if (Q.queue) { const e = Q.queue[Q.n]; type = e.type; it = ITEMS[e.id]; }
      else {
        type = pick(s.types);
        let items = pool(TYPE_KINDS[type], s);
        if (Q.only) items = items.filter(i => Q.only.includes(i.id));
        if (!items.length) continue;
        it = weightedPick(items);
      }
      q = GEN[type](it);
    }
    if (!q) { alert('Pro zvolené nastavení nejsou žádné otázky.'); return quitQuiz(); }
    Q.cur = q; Q.n++;
    Q.recent.push(q.item.id); if (Q.recent.length > 4) Q.recent.shift();
    q.typed = s.answer === 'typed' && !q.choiceOnly;
    q.done = false; q.points = 0;

    const v = Q.view;
    setLabels(false);
    v.opts.ecliptic = false; v.opts.equator = false; v.opts.focusCon = null;
    v.marks = [];
    $('#q-bigcard').hidden = !q.noMap; $('.quiz-map-ctrl').hidden = !!q.noMap;
    if (q.noMap) $('#q-bigcard').innerHTML = `<div>${q.prompt}<small>Otázka z tabulky</small></div>`;
    try { q.setup(v); v.draw(); } catch (err) { console.error(err); }

    $('#q-progress').textContent = `Otázka ${Q.n}${Q.total === Infinity ? '' : ' / ' + Q.total}`;
    $('#q-score').textContent = `Body: ${Q.score} / ${Q.max}`;
    $('#q-prompt').innerHTML = q.prompt + (q.click ? '<div class="muted small" style="font-weight:400;margin-top:.3rem">Mapou můžeš posouvat a přibližovat. Klik = odpověď.</div>' : '');
    $('#q-feedback').innerHTML = '';
    $('#q-next').hidden = true; $('#q-check').hidden = !q.typed || !q.parts.length; $('#q-dunno').hidden = false;

    const box = $('#q-parts'); box.innerHTML = '';
    q.parts.forEach((p, pi) => {
      const el = h('div', { class: 'part' }, h('div', { class: 'part-label' }, p.label));
      if (q.typed) {
        const inp = h('input', { class: 'typed', type: 'text', placeholder: p.label + '…', autocomplete: 'off', autocapitalize: 'off', spellcheck: 'false' });
        inp.addEventListener('keydown', e => {
          if (e.key === 'Enter') { e.preventDefault(); e.stopPropagation(); const ins = $$('.typed', box); if (pi < ins.length - 1 && !ins[pi + 1].value) ins[pi + 1].focus(); else checkTyped(); }
        });
        p.input = inp; el.append(inp);
      } else {
        const ch = h('div', { class: 'choices' });
        p.options.forEach(o => {
          const b = h('button', { class: 'choice' }, o.text);
          b.addEventListener('click', () => choose(p, o, b, ch));
          ch.append(b);
        });
        el.append(ch);
      }
      box.append(el);
    });
    Q.max += q.parts.length || 1;
    if (q.typed && q.parts.length) setTimeout(() => q.parts[0].input && q.parts[0].input.focus({ preventScroll: true }), 30);
  }

  function choose(p, o, btn, wrap) {
    if (p.answered) return;
    p.answered = true; p.ok = o.ok;
    $$('.choice', wrap).forEach((b, i) => {
      b.disabled = true;
      if (p.options[i].ok) b.classList.add('right');
    });
    if (!o.ok) btn.classList.add('wrong');
    p.given = o.text;
    if (Q.cur.parts.every(x => x.answered)) finish();
  }

  function matchTyped(p, value) {
    const v = norm(value);
    if (!v) return { ok: false };
    if (p.accept.some(a => norm(a) === v)) return { ok: true };
    if (p.exactOnly && !p.candidates) {
      const d = Math.min(...p.accept.map(a => lev(norm(a), v)));
      const n = norm(p.correct).length;
      return { ok: n >= 5 && d <= (n >= 9 ? 2 : 1), typo: true };
    }
    // nejbližší kandidát (ať se „Ryba“ nezamění s „Ryby“ apod.)
    let best = null, bd = Infinity;
    for (const c of p.candidates || []) for (const a of c.accept) {
      const na = norm(a); if (na.length < 4) continue;
      const d = lev(na, v);
      const lim = na.length >= 9 ? 2 : na.length >= 5 ? 1 : 0;
      if (d <= lim && d < bd) { bd = d; best = c.id; }
    }
    if (best && best === p.targetId) return { ok: true, typo: true };
    return { ok: false };
  }

  function checkTyped() {
    const q = Q.cur; if (q.done) return;
    for (const p of q.parts) {
      const r = matchTyped(p, p.input.value);
      p.answered = true; p.ok = r.ok; p.typo = r.typo; p.given = p.input.value;
      p.input.classList.add(r.ok ? 'right' : 'wrong'); p.input.disabled = true;
    }
    finish();
  }

  function onQuizClick(x, y) {
    const q = Q.cur;
    if (!q || q.done || !q.click) return;
    const v = Q.view; const it = q.item;
    let ok = false, clicked = '';
    if (it.kind === 'con') {
      ok = v.hitCon(it.key, x, y);
      if (!ok) { const c = v.conAt(x, y); clicked = c ? (conById[c] ? conById[c].cz : SKY.cons[c].cz) : ''; }
    } else {
      const p = v.project(it.ra, it.dec);
      const k = 2 / (1 + p.c);
      const tol = it.kind === 'obj' ? Math.max(22, it.data.r * Math.PI / 180 * v.scale * k + 6) : 16;
      ok = Math.hypot(p.x - x, p.y - y) <= tol;
      if (!ok && it.kind === 'star') { const s = v.starAt(x, y, 14); if (s && s.hip === it.hip) ok = true; }
      if (!ok) {
        const s = v.starAt(x, y, 12);
        if (s) clicked = s.named ? s.named.name : (s.desig && s.desig[1] ? `${s.desig[1]} ${SKY.cons[s.desig[0]].gen}` : 'neznámou hvězdu');
        else { const c = v.conAt(x, y); if (c) clicked = 'oblast souhvězdí ' + (conById[c] ? conById[c].cz : SKY.cons[c].cz); }
      }
    }
    v.marks = [{ x, y, color: ok ? '#4ade80' : '#f87171' }];
    q.clickOk = ok; q.clicked = clicked;
    finish();
  }

  function finish(dunno = false) {
    const q = Q.cur; if (q.done) return;
    q.done = true;
    let pts = 0;
    if (q.click) pts = q.clickOk ? 1 : 0;
    else pts = q.parts.filter(p => p.ok).length;
    if (dunno) pts = 0;
    Q.score += pts;
    const all = q.click ? 1 : q.parts.length;
    const okAll = pts === all;
    record(q.item.id, okAll);
    if (!okAll) Q.mistakes.push({ type: q.type, id: q.item.id, prompt: q.prompt, answer: q.answerText, given: q.click ? q.clicked : q.parts.map(p => p.given || '—').join(', ') });

    // odhalení na mapě
    const v = Q.view;
    q.reveal(v);
    v.opts.focusCon = q.item.con || null;
    v.requestDraw();

    const fact = factFor(q.item);
    let msg = okAll ? '<span class="ok">Správně!</span>' : (pts > 0 ? '<span class="bad">Částečně.</span>' : '<span class="bad">Špatně.</span>');
    if (!okAll || q.parts.some(p => p.typo)) msg += ` Správně je: <b>${esc(q.answerText)}</b>.`;
    if (q.parts.some(p => p.typo && p.ok)) msg += ' <span class="muted">(uznáno, ale pozor na pravopis)</span>';
    if (q.click && !q.clickOk && q.clicked) msg += ` <span class="muted">Tvoje kliknutí: ${esc(q.clicked)}.</span>`;
    if (dunno) msg = `Správná odpověď: <b>${esc(q.answerText)}</b>.`;
    if (fact) msg += `<span class="fact">${esc(fact)}</span>`;
    $('#q-feedback').innerHTML = msg;
    if (q.noMap) $('#q-bigcard').innerHTML = `<div>${q.prompt}<small>${okAll ? '✔ správně' : '✘ správně je'}: ${esc(q.answerText)}</small></div>`;

    // u výběru ukaž správné odpovědi i v nezodpovězených částech
    $$('.choice').forEach(b => b.disabled = true);
    q.parts.forEach(p => { if (p.input && !p.answered) { p.input.disabled = true; } });

    $('#q-score').textContent = `Body: ${Q.score} / ${Q.max}`;
    $('#q-check').hidden = true; $('#q-dunno').hidden = true; $('#q-next').hidden = false;
    $('#q-next').focus({ preventScroll: true });
  }

  function factFor(it) {
    if (it.kind === 'star' || it.kind === 'obj') return it.data.info;
    if (it.kind === 'con') return it.data.tip;
    if (it.kind === 'ast') return it.data.info;
    return '';
  }

  function endQuiz() {
    $('#quiz-run').hidden = true;
    const end = $('#quiz-end'); end.hidden = false;
    const pct = Q.max ? Math.round(100 * Q.score / Q.max) : 0;
    const grade = pct >= 90 ? 'Výborně! ✨' : pct >= 75 ? 'Chvalitebně – ještě kousek.' : pct >= 50 ? 'Dobrý základ, procvič chyby.' : 'Projdi si atlas a zkus to znovu.';
    end.innerHTML = '';
    end.append(
      h('h1', {}, 'Hotovo'),
      h('div', { class: 'score-big' }, `${pct} %`),
      h('p', { class: 'lead' }, `${Q.score} bodů z ${Q.max}. ${grade}`),
      h('div', { class: 'setup-actions' },
        Q.mistakes.length ? h('button', { class: 'btn primary', onclick: () => startQuiz({ queue: shuffle(Q.mistakes.map(m => ({ type: m.type, id: m.id }))) }) }, `Procvičit chyby (${Q.mistakes.length})`) : null,
        h('button', { class: Q.mistakes.length ? 'btn' : 'btn primary', onclick: () => startQuiz() }, 'Nové kolo'),
        h('button', { class: 'btn', onclick: quitQuiz }, 'Nastavení')),
      Q.mistakes.length ? h('h2', { style: 'margin-top:1.5rem' }, 'Chyby') : null,
      Q.mistakes.length ? h('ul', { class: 'mistakes' }, Q.mistakes.map(m => h('li', {},
        h('div', { class: 'q', html: m.prompt }),
        h('div', {}, 'Správně: ', h('b', {}, m.answer), m.given ? h('span', { class: 'muted' }, ` · tvoje odpověď: ${m.given}`) : null)))) : null);
    try { localStorage.setItem('astrokurz-last-mistakes', JSON.stringify(Q.mistakes.map(m => ({ type: m.type, id: m.id })))); } catch (e) { /* */ }
    renderMastery();
  }

  function quitQuiz() {
    $('#quiz-run').hidden = true; $('#quiz-end').hidden = true; $('#quiz-setup').hidden = false;
    renderMastery();
  }

  function renderMastery() {
    const root = $('#mastery'); root.innerHTML = '';
    const groups = [['Souhvězdí', 'con'], ['Hvězdy', 'star'], ['Objekty a útvary', 'obj', 'ast']];
    for (const [title, ...kinds] of groups) {
      const items = Object.values(ITEMS).filter(it => kinds.includes(it.kind) && it.course);
      const chips = h('div', { class: 'chips' });
      for (const it of items) {
        const st = stats[it.id];
        let cls = 'chip';
        if (st) { const r = st.ok / (st.ok + st.bad); cls += r >= 0.8 && st.ok >= 2 ? ' good' : r >= 0.5 ? ' mid' : ' weak'; }
        chips.append(h('span', { class: cls, title: st ? `správně ${st.ok}×, špatně ${st.bad}×` : 'zatím nezkoušeno' }, it.kind === 'obj' ? it.data.short : it.name));
      }
      root.append(h('div', { class: 'mastery-group' }, h('h3', {}, title), chips));
    }
    let last = [];
    try { last = JSON.parse(localStorage.getItem('astrokurz-last-mistakes') || '[]'); } catch (e) { last = []; }
    const btn = $('#quiz-retry');
    btn.hidden = !last.length;
    btn.textContent = `Opakovat chyby z minula (${last.length})`;
    btn.onclick = () => startQuiz({ queue: shuffle(last) });
  }

  $('#quiz-start').addEventListener('click', () => startQuiz());
  $('#q-next').addEventListener('click', nextQuestion);
  $('#q-check').addEventListener('click', checkTyped);
  $('#q-dunno').addEventListener('click', () => {
    const q = Q.cur; if (!q || q.done) return;
    q.parts.forEach(p => { p.answered = true; p.ok = false; p.given = 'nevím'; });
    q.clicked = '';
    // zvýrazni správné možnosti
    $$('.part').forEach((el, i) => { const p = q.parts[i]; if (!p || !p.options) return; $$('.choice', el).forEach((b, j) => { if (p.options[j].ok) b.classList.add('right'); }); });
    finish(true);
  });
  $('#q-quit').addEventListener('click', () => { if (Q.n > 1 || (Q.cur && Q.cur.done)) endQuiz(); else quitQuiz(); });
  $('#stats-reset').addEventListener('click', () => {
    if (!confirm('Opravdu vymazat statistiku?')) return;
    stats = {}; saveStats();
    try { localStorage.removeItem('astrokurz-last-mistakes'); } catch (e) { /* */ }
    renderMastery();
  });
  document.addEventListener('keydown', e => {
    if ($('#tab-kviz').hidden || $('#quiz-run').hidden) return;
    if (e.key === 'Enter') {
      const q = Q.cur; if (!q) return;
      const ae = document.activeElement;
      if (ae && ae.tagName === 'BUTTON') return; // tlačítko si Enter obslouží samo
      if (q.done) { e.preventDefault(); nextQuestion(); }
      else if (q.typed && document.activeElement && !document.activeElement.classList.contains('typed')) { e.preventDefault(); checkTyped(); }
    }
  });

  // ============================================================ TABULKY
  const COLS = [['cz', 'český název'], ['la', 'latinský název'], ['gen', 'genitiv'], ['abbr', 'zkratka'], ['stars', 'hvězdy'], ['objs', 'objekty'], ['note', 'poznámka']];
  function buildTables() {
    const cover = $('#cover');
    cover.append(h('span', {}, 'Zakrýt:'));
    for (const [k, label] of COLS) {
      const cb = h('input', { type: 'checkbox', 'data-col': k });
      cb.addEventListener('change', () => $$(`td.c-${k}`).forEach(td => td.classList.toggle('covered', cb.checked)));
      cover.append(h('label', {}, cb, label));
    }
    const root = $('#tables');
    for (const season of ['zima', 'podzim']) {
      const rows = C.constellations.filter(c => c.season === season).map(c => {
        const stars = c.stars.map(k => C.stars[k]);
        const starHtml = stars.map(s => `<span class="${s.circ ? 'st-circ' : ''}">${esc(s.table || s.name)}${s.polygon ? ' *' : ''}</span>`).join(', ');
        const objs = c.objects.map(k => C.objects[k]).filter(o => o.table).map(o => o.table);
        const tr = h('tr', { class: conClass(c) ? 'row-' + conClass(c) : '' },
          h('td', { class: 'c-cz' }, h('span', {}, h('a', { href: '#atlas', onclick: e => { e.preventDefault(); showTab('atlas'); setTimeout(() => $('#con-' + c.id).scrollIntoView({ behavior: 'smooth', block: 'center' }), 50); } }, c.cz))),
          h('td', { class: 'c-la' }, h('span', {}, c.la)),
          h('td', { class: 'c-gen' }, h('span', {}, c.gen)),
          h('td', { class: 'c-abbr' }, h('span', {}, c.abbr)),
          h('td', { class: 'c-stars' }, h('span', { html: starHtml || '&nbsp;' })),
          h('td', { class: 'c-objs' }, h('span', {}, objs.join(', '))),
          h('td', { class: 'c-note' }, h('span', {}, c.note)));
        return tr;
      });
      const table = h('table', { class: 'course' },
        h('caption', {}, `Souhvězdí ${season === 'zima' ? 'zimní' : 'podzimní'} oblohy (výběr pro AK I)`),
        h('thead', {}, h('tr', {}, COLS.map(([, l]) => h('th', {}, l)))),
        h('tbody', {}, rows));
      root.append(h('div', { class: 'table-wrap' }, table));
      root.append(h('p', { class: 'legend', html: `zkratky: G – galaxie, OH – otevřená hvězdokupa, KH – kulová hvězdokupa, EM – emisní mlhovina, PM – planetární mlhovina<br>značení: <span class="ecl">ekliptikální červeně</span>, <span class="circ">cirkumpolární modře</span>${season === 'zima' ? ', * = součást zimního mnohoúhelníku' : ''}. Pravopis v původní tabulce: Pollux = „Poux“, Mirach = „Mirrah“, Almach = „Alamak“.` }));
    }
    root.addEventListener('click', e => {
      const td = e.target.closest('td.covered');
      if (td) { td.classList.remove('covered'); e.preventDefault(); e.stopPropagation(); }
    }, true);
  }

  // ============================================================ start
  buildAtlas();
  buildTables();
  renderMastery();
  showTab(location.hash.slice(1).split('?')[0] || 'atlas', false);
})();
