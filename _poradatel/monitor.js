(function () {
  'use strict';

  var DATA = window.DANTE_DATA || { cards: {}, games: {} };
  var PALETTE = ['#f2c14e', '#e07a5f', '#7fb3d5', '#a8c99a', '#c792ea', '#f4a261', '#7fd1c7', '#e58fb0'];
  var STALE_MS = 10 * 60 * 1000;
  var POLL_MS = 30000;
  var LS_GAME = 'dante:monitorGame';
  var LS_BASEMAP = 'dante:monitorBasemap';

  // ---------- helpers ----------
  // "Mládež 2026 · Praha", but no "… Mnichov · Mnichov" when the title already names the place
  function gameName(g) { return g.title + (g.place && g.title.indexOf(g.place) < 0 ? ' · ' + g.place : ''); }
  function el(tag, attrs, kids) {
    var n = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (attrs[k] == null || attrs[k] === false) continue;
      if (k === 'text') n.textContent = attrs[k];
      else if (k === 'class') n.className = attrs[k];
      else if (k === 'style') n.setAttribute('style', attrs[k]);
      else if (k.indexOf('on') === 0) n.addEventListener(k.slice(2), attrs[k]);
      else n.setAttribute(k, attrs[k] === true ? '' : attrs[k]);
    }
    (kids || []).forEach(function (c) { if (c != null) n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
    return n;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { } }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function hm(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()); }
  function hms(ms) { var d = new Date(ms); return pad(d.getHours()) + ':' + pad(d.getMinutes()) + ':' + pad(d.getSeconds()); }
  function roman(n) {
    var m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], s = '';
    m.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  }
  function plural(n, a, b, c) { // 1 bod, 2-4 body, 5+ bodů
    var abs = Math.abs(n);
    if (abs !== Math.floor(abs)) return b === 'body' ? 'bodu' : c;
    if (abs === 1) return a;
    if (abs >= 2 && abs <= 4) return b;
    return c;
  }
  function pts(n) { n = Math.round(n * 100) / 100; return String(n).replace('.', ',') + ' ' + plural(n, 'bod', 'body', 'bodů'); }
  function hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; }
  function teamColor(name) {
    var known = { 'Poutníci': 0, 'Stopaři': 1, 'Vogoni': 2 };
    if (Object.prototype.hasOwnProperty.call(known, name)) return PALETTE[known[name]];
    return PALETTE[hashStr(name) % PALETTE.length];
  }
  function num(v) { v = Number(v); return isFinite(v) ? v : null; }

  // ---------- state ----------
  var S = {
    gameId: null,
    game: null,
    events: [],          // parsed payloads (with _t ms, _id)
    localGrades: {},     // submission id -> grade payload (posted by this monitor)
    stepVals: {}, notes: {},
    filter: 'all',
    status: { ok: null, text: 'NAČÍTÁM…' },
    fitted: false,
    gradeKey: null,
    posting: {}, postErr: {}
  };
  var polling = false, pollTimer = null;
  var map = null, stationLayer = null, teamLayer = null;

  function games() {
    var g = DATA.games || {};
    return Object.keys(g).map(function (k) { return g[k]; })
      .sort(function (a, b) { return (a.listOrder || 0) - (b.listOrder || 0); });
  }
  function cardOf(id) { return (DATA.cards && DATA.cards[id]) || null; }
  function cardTitle(id, fallback) { var c = cardOf(id); return (c && c.title) || fallback || id || '?'; }
  function numeralOf(id) {
    var cs = (S.game && S.game.cards) || [];
    for (var i = 0; i < cs.length; i++) if (cs[i].card === id) return roman(i + 1);
    return '';
  }
  function isFinale(id) { var c = cardOf(id); return !!(c && c.task && c.task.type === 'finale'); }
  function bonusMax(id) {
    var c = cardOf(id);
    var m = c && c.bonus && num(c.bonus.max);
    return m == null ? 10 : m;
  }
  function topic() { return S.game && S.game.tracking && S.game.tracking.ntfyTopic; }

  // ---------- parsing / model ----------
  function parseStream(text) {
    var out = [], seen = {};
    String(text || '').split('\n').forEach(function (line) {
      line = line.trim();
      if (!line) return;
      try {
        var m = JSON.parse(line);
        if (!m || m.event !== 'message' || typeof m.message !== 'string') return;
        var p = JSON.parse(m.message);
        if (!p || typeof p !== 'object' || p.game !== S.gameId || !p.event) return;
        p.team = typeof p.team === 'string' && p.team ? p.team : '?';
        var t = p.ts ? Date.parse(p.ts) : NaN;
        if (!isFinite(t)) t = (num(m.time) || 0) * 1000;
        p._t = t;
        p._id = m.id || (p.event + '|' + p.team + '|' + p.ts + '|' + (p.submission || p.card || ''));
        if (seen[p._id]) return;
        seen[p._id] = 1;
        out.push(p);
      } catch (e) { /* skip bad line */ }
    });
    return out;
  }

  function allEvents() {
    var list = S.events.slice();
    var have = {};
    list.forEach(function (e) { if (e.event === 'grade') have[e.submission] = 1; });
    Object.keys(S.localGrades).forEach(function (k) { if (!have[k]) list.push(S.localGrades[k]); });
    list.sort(function (a, b) { return a._t - b._t; });
    return list;
  }

  function buildModel() {
    var evs = allEvents();
    var teams = {}, subs = {}, grades = {};
    function team(n) {
      return teams[n] || (teams[n] = { name: n, color: teamColor(n), events: [], done: {}, last: 0, pos: null, subs: [] });
    }
    evs.forEach(function (e) {
      var t = team(e.team);
      t.events.push(e);
      if (e.event !== 'grade' && e._t > t.last) t.last = e._t;
      var lat = num(e.lat), lng = num(e.lng);
      if (lat != null && lng != null && e._t >= (t.posT || 0)) { t.pos = [lat, lng]; t.posT = e._t; }
      if (e.event === 'card_done') {
        t.done[e.card] = { points: num(e.points) || 0, bonus: num(e.bonus) || 0 };
      } else if (e.event === 'card_undone') {
        delete t.done[e.card];
      } else if (e.event === 'submission') {
        var sid = e.submission || e._id;
        var s = { id: sid, team: e.team, card: e.card, title: e.title, fields: e.fields, t: e._t, ev: e };
        subs[sid] = s; t.subs.push(s);
        if (!t.done[e.card]) t.done[e.card] = { points: 0, bonus: bonusMax(e.card), fromSub: true };
      } else if (e.event === 'grade') {
        grades[e.submission] = e;
      }
    });
    var now = Date.now();
    var N = ((S.game && S.game.cards) || []).filter(function (p) { return !isFinale(p.card); }).length;
    var list = Object.keys(teams).map(function (k) {
      var t = teams[k], points = 0, bonus = 0, count = 0;
      Object.keys(t.done).forEach(function (cid) {
        var d = t.done[cid];
        if (!isFinale(cid)) count++;
        var sub = null;
        t.subs.forEach(function (s) { if (s.card === cid) sub = s; });
        var g = sub && grades[sub.id];
        if (g) points += num(g.points) || 0;
        else if (sub) bonus += d.bonus || bonusMax(cid);
        else { points += d.points; bonus += d.bonus; }
      });
      t.points = points; t.bonus = bonus; t.count = count; t.N = N;
      t.stale = t.last && (now - t.last > STALE_MS);
      t.staleMin = Math.floor((now - t.last) / 60000);
      return t;
    }).sort(function (a, b) { return (b.points + b.bonus) - (a.points + a.bonus) || a.name.localeCompare(b.name, 'cs'); });
    var pending = [], graded = [];
    Object.keys(subs).map(function (k) { return subs[k]; }).sort(function (a, b) { return a.t - b.t; })
      .forEach(function (s) { if (grades[s.id]) graded.push({ sub: s, grade: grades[s.id] }); else pending.push(s); });
    graded.reverse();
    return { evs: evs, teams: list, teamMap: teams, pending: pending, graded: graded, subs: subs, grades: grades };
  }

  // ---------- polling ----------
  function setStatus(ok, text) {
    S.status = { ok: ok, text: text };
    var s = document.getElementById('status');
    s.textContent = text;
    s.className = 'chip status' + (ok ? '' : ' err');
  }

  function poll() {
    if (polling || !topic()) return Promise.resolve();
    polling = true;
    var gid = S.gameId;
    var ctl = typeof AbortController === 'function' ? new AbortController() : null;
    var to = setTimeout(function () { if (ctl) ctl.abort(); }, 20000);
    return fetch('https://ntfy.sh/' + encodeURIComponent(topic()) + '/json?poll=1&since=12h', ctl ? { signal: ctl.signal } : {})
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (txt) {
        if (gid !== S.gameId) return;
        S.events = parseStream(txt);
        // drop local grades confirmed by the server
        S.events.forEach(function (e) { if (e.event === 'grade') delete S.localGrades[e.submission]; });
        setStatus(true, 'Aktualizováno ' + hms(Date.now()));
        render();
      })
      .catch(function (err) {
        setStatus(false, 'Chyba načítání · ' + (err && err.name === 'AbortError' ? 'časový limit' : 'bez spojení'));
      })
      .then(function () { clearTimeout(to); polling = false; });
  }

  // ---------- rendering ----------
  function render() {
    try {
      var M = buildModel();
      renderTeams(M); renderEvents(M); renderGrading(M); renderMap(M);
    } catch (e) {
      if (window.console) console.warn('render failed', e);
    }
  }

  function renderTeams(M) {
    var box = document.getElementById('teams');
    box.textContent = '';
    if (!M.teams.length) { box.appendChild(el('div', { class: 'empty', text: 'Zatím žádný tým nic neposlal.' })); return; }
    M.teams.forEach(function (t) {
      var seen = t.stale ? 'bez zprávy ' + t.staleMin + ' min (' + hm(t.last) + ')'
        : 'naposledy ' + hm(t.last) + ' · před ' + Math.max(0, Math.floor((Date.now() - t.last) / 60000)) + ' min';
      var p = pts(t.points).toUpperCase() + (t.bonus ? ' · +' + t.bonus + ' BONUS' : '');
      box.appendChild(el('div', { class: 'team', 'data-testid': 'team', style: '--c:' + t.color, onclick: function () { focusTeam(t); } }, [
        el('span', { class: 'dot', style: t.stale ? 'opacity:.6' : '' }),
        el('div', { class: 'mid' }, [el('span', { class: 'nm', text: t.name }), el('span', { class: 'seen' + (t.stale ? ' stale' : ''), text: seen })]),
        el('div', { class: 'rt' }, [el('span', { class: 'pts', text: p }), el('span', { class: 'dn', text: 'splněno ' + t.count + ' / ' + t.N })])
      ]));
    });
  }

  var KINDS = {
    card_done: ['STANOVIŠTĚ SPLNĚNO', 'done', 'done'],
    card_undone: ['SPLNĚNÍ ZRUŠENO', '', 'done'],
    position: ['POLOHA', '', 'ping'],
    submission: ['ODESLÁNO', 'sent', 'sent'],
    grade: ['OBODOVÁNO', 'grade', 'sent'],
    kronika_done: ['KRONIKA DOKONČENA', 'done', 'other']
  };
  function eventDetail(e) {
    var n = numeralOf(e.card), nm = e.card ? cardTitle(e.card, e.title) : '';
    var head = (n ? n + ' · ' : '') + nm;
    if (e.event === 'card_done') {
      var s = head;
      if (num(e.points) || !num(e.bonus)) s += ' · +' + pts(num(e.points) || 0);
      if (num(e.bonus)) s += ' · bonus až ' + e.bonus;
      return s;
    }
    if (e.event === 'card_undone') return head;
    if (e.event === 'submission') return head + ' · čeká na obodování';
    if (e.event === 'grade') return head + ' · ' + pts(num(e.points) || 0) + (e.note ? ' · ' + e.note : '');
    if (e.event === 'kronika_done') return 'Kvíz ' + e.correct + ' / ' + e.total;
    return '';
  }
  function renderEvents(M) {
    var counts = { all: M.evs.length, done: 0, ping: 0, sent: 0 };
    M.evs.forEach(function (e) { var k = KINDS[e.event]; if (k && counts[k[2]] != null) counts[k[2]]++; });
    var f = document.getElementById('filters');
    f.textContent = '';
    [['all', 'VŠE'], ['done', 'SPLNĚNO'], ['ping', 'POLOHA'], ['sent', 'ODESLÁNO']].forEach(function (c) {
      f.appendChild(el('button', {
        type: 'button', class: 'fchip', 'aria-pressed': String(S.filter === c[0]), 'data-testid': 'filter-' + c[0],
        text: c[1] + ' · ' + counts[c[0]], onclick: function () { S.filter = c[0]; render(); }
      }));
    });
    var box = document.getElementById('events');
    box.textContent = '';
    var shown = M.evs.filter(function (e) {
      var k = KINDS[e.event];
      return S.filter === 'all' || (k && k[2] === S.filter);
    }).reverse().slice(0, 300);
    if (!shown.length) box.appendChild(el('div', { class: 'empty', text: 'Žádné události.' }));
    shown.forEach(function (e) {
      var k = KINDS[e.event] || [String(e.event).toUpperCase().slice(0, 24), '', 'other'];
      var d = eventDetail(e);
      box.appendChild(el('div', { class: 'ev', 'data-testid': 'event', 'data-kind': e.event, style: '--c:' + teamColor(e.team), onclick: function () { focusEvent(e); } }, [
        el('span', { class: 'tm', text: hm(e._t) }),
        el('div', { class: 'body' }, [
          el('div', { class: 'l1' }, [el('span', { class: 'tn', text: e.team }), el('span', { class: 'badge ' + k[1], text: k[0] })]),
          d ? el('span', { class: 'dt', text: d }) : null
        ])
      ]));
    });
  }

  function fieldRows(s) {
    var c = cardOf(s.card), defs = (c && c.task && c.task.fields) || [], labels = {}, multi = {};
    defs.forEach(function (d) { labels[d.id] = d.label; multi[d.id] = !!d.multiline; });
    var f = s.fields, rows = [];
    if (Array.isArray(f)) {
      f.forEach(function (x, i) { if (x && typeof x === 'object') rows.push([x.label || x.id || ('Pole ' + (i + 1)), String(x.value == null ? x.text : x.value)]); else rows.push(['Pole ' + (i + 1), String(x)]); });
    } else if (f && typeof f === 'object') {
      Object.keys(f).forEach(function (k) { rows.push([labels[k] || k, f[k] == null ? '' : (typeof f[k] === 'object' ? JSON.stringify(f[k]) : String(f[k])), multi[k]]); });
    } else if (f != null) rows.push(['Text', String(f)]);
    return rows;
  }

  function renderGrading(M) {
    var key = M.pending.map(function (s) { return s.id; }).join(',');
    document.getElementById('gradeTitle').textContent = 'K OBODOVÁNÍ · ' + M.pending.length;
    if (key !== S.gradeKey) {
      S.gradeKey = key;
      var box = document.getElementById('gradeList');
      box.textContent = '';
      if (!M.pending.length) box.appendChild(el('div', { class: 'empty', text: 'Nic nečeká na obodování.' }));
      M.pending.forEach(function (s) { box.appendChild(gradeCard(s)); });
    }
    var gw = document.getElementById('gradedWrap'), gl = document.getElementById('gradedList');
    gw.hidden = !M.graded.length;
    gl.textContent = '';
    document.getElementById('gradedTitle').textContent = 'OBODOVÁNO · ' + M.graded.length;
    M.graded.forEach(function (x) {
      gl.appendChild(el('div', { class: 'gl', 'data-testid': 'graded', style: '--c:' + teamColor(x.sub.team) }, [
        el('span', { text: x.sub.team + ' · ' + cardTitle(x.sub.card, x.sub.title) + (x.grade.note ? ' · ' + x.grade.note : '') }),
        el('b', { text: pts(num(x.grade.points) || 0) })
      ]));
    });
  }

  function gradeCard(s) {
    var max = bonusMax(s.card);
    if (S.stepVals[s.id] == null) S.stepVals[s.id] = max;
    var n = numeralOf(s.card);
    var input = el('input', { type: 'number', min: 0, max: max, step: 1, id: 'pts-' + s.id, 'data-testid': 'grade-points' });
    input.value = S.stepVals[s.id];
    function set(v) {
      v = Math.round(Number(v));
      if (!isFinite(v)) v = 0;
      v = Math.max(0, Math.min(max, v));
      S.stepVals[s.id] = v; input.value = v;
    }
    input.addEventListener('change', function () { set(input.value); });
    var note = el('input', { type: 'text', id: 'note-' + s.id, 'data-testid': 'grade-note', maxlength: 200 });
    note.value = S.notes[s.id] || '';
    note.addEventListener('input', function () { S.notes[s.id] = note.value; });
    var hint = el('span', { class: 'hint', text: 'Hodnocení odejde zpět týmu. Jeho +' + max + ' bonus se změní na udělené body.' });
    var btn = el('button', { type: 'button', class: 'save', 'data-testid': 'grade-save', text: 'ULOŽIT HODNOCENÍ' });
    btn.addEventListener('click', function () {
      set(input.value);
      btn.disabled = true; hint.className = 'hint'; hint.textContent = 'Odesílám…';
      postGrade(s, S.stepVals[s.id], note.value.trim()).then(function (ok) {
        if (!ok) { btn.disabled = false; hint.className = 'hint err'; hint.textContent = 'Hodnocení se nepodařilo odeslat. Zkuste to znovu.'; }
      });
    });
    var rows = fieldRows(s);
    var kids = [
      el('div', { class: 'r1' }, [
        el('span', { class: 'nm', text: s.team + ' · ' + (n ? n + ' · ' : '') + cardTitle(s.card, s.title) }),
        el('span', { class: 'tm', text: hm(s.t) })
      ])
    ];
    var title = rows.length > 1 && rows[0][1].indexOf('\n') < 0 && rows[0][1].length <= 100 && !rows[0][2] ? rows.shift() : null;
    if (title) kids.push(el('span', { class: 'ft', text: title[1] }));
    rows.forEach(function (r) {
      if (rows.length > 1 || title) kids.push(el('span', { class: 'lab', text: r[0] }));
      kids.push(el('div', { class: 'box', text: r[1] }));
    });
    if (!rows.length && !title) kids.push(el('div', { class: 'box', text: '(bez textu)' }));
    kids.push(
      el('div', { class: 'step' }, [
        el('label', { for: 'pts-' + s.id, text: 'Body (0–' + max + ')' }),
        el('button', { type: 'button', class: 'sbtn', 'aria-label': 'Ubrat bod', 'data-testid': 'grade-minus', text: '−', onclick: function () { set(Number(input.value) - 1); } }),
        input,
        el('button', { type: 'button', class: 'sbtn', 'aria-label': 'Přidat bod', 'data-testid': 'grade-plus', text: '+', onclick: function () { set(Number(input.value) + 1); } })
      ]),
      el('label', { for: 'note-' + s.id, text: 'Poznámka pro tým (nepovinná)' }), note, btn, hint
    );
    return el('div', { class: 'gcard', 'data-testid': 'grade-card', 'data-submission': s.id, style: '--c:' + teamColor(s.team) }, kids);
  }

  function postGrade(s, points, noteText) {
    var payload = { v: 1, game: S.gameId, team: s.team, event: 'grade', card: s.card, submission: s.id, points: points, note: noteText, ts: new Date().toISOString() };
    return fetch('https://ntfy.sh/' + encodeURIComponent(topic()), {
      method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload)
    }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      var g = JSON.parse(JSON.stringify(payload));
      g._t = Date.parse(payload.ts); g._id = 'local-' + s.id;
      S.localGrades[s.id] = g;
      render();
      return true;
    }).catch(function () { return false; });
  }

  // ---------- map ----------
  function initMap() {
    if (typeof L === 'undefined') {
      document.getElementById('map').appendChild(el('div', { class: 'empty', style: 'padding:80px 20px;text-align:center', text: 'Mapu se nepodařilo načíst (Leaflet není dostupný – zkontrolujte připojení).' }));
      return;
    }
    map = L.map('map', { zoomControl: true }).setView([48.137, 11.575], 13);
    setBasemap(lsGet(LS_BASEMAP) || 'topo');
    document.getElementById('basemaps').addEventListener('click', function (e) {
      var b = e.target.closest('[data-bm]'); if (b) setBasemap(b.dataset.bm);
    });
    L.control.scale({ metric: true, imperial: false, position: 'bottomleft' }).addTo(map);
    stationLayer = L.layerGroup().addTo(map);
    teamLayer = L.layerGroup().addTo(map);
  }

  // Esri basemaps: OSM's own tile servers refuse requests without a Referer, and a page opened from disk sends none.
  // [service, deepest zoom the service has tiles for]; the colour tint per basemap lives in monitor.css (.bm-*)
  var ESRI = 'https://server.arcgisonline.com/ArcGIS/rest/services/';
  var BASEMAPS = {
    dark: [['Canvas/World_Dark_Gray_Base', 16], ['Canvas/World_Dark_Gray_Reference', 16]],
    street: [['World_Street_Map', 19]],
    topo: [['World_Topo_Map', 19]],
    sat: [['World_Imagery', 19]]
  };
  var baseLayers = [];
  function setBasemap(key) {
    if (!BASEMAPS[key]) key = 'topo';
    baseLayers.forEach(function (l) { map.removeLayer(l); });
    baseLayers = BASEMAPS[key].map(function (b) {
      return L.tileLayer(ESRI + b[0] + '/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: b[1], className: 'bm-' + key, attribution: 'Tiles &copy; Esri' }).addTo(map);
    });
    baseLayers.forEach(function (l) { l.bringToBack(); });
    [].forEach.call(document.querySelectorAll('#basemaps [data-bm]'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.bm === key));
    });
    lsSet(LS_BASEMAP, key);
  }

  function renderMap(M) {
    if (!map) return;
    stationLayer.clearLayers(); teamLayer.clearLayers();
    var bounds = [], stBounds = [];
    ((S.game && S.game.cards) || []).forEach(function (p, i) {
      if (!p.at || num(p.at.lat) == null) return;
      var fin = isFinale(p.card), size = fin ? 30 : 26, ll = [p.at.lat, p.at.lng];
      var icon = L.divIcon({ className: '', iconSize: [size, size], iconAnchor: [size / 2, size / 2],
        html: '<div class="stn' + (fin ? ' fin' : '') + '" style="width:' + size + 'px;height:' + size + 'px">' + roman(i + 1) + '</div>' });
      var m = L.marker(ll, { icon: icon, title: cardTitle(p.card), zIndexOffset: -100 }).addTo(stationLayer);
      m.bindTooltip(roman(i + 1) + ' · ' + cardTitle(p.card), { direction: 'top', offset: [0, -size / 2] });
      stBounds.push(ll);
    });
    var posBounds = [];
    M.teams.forEach(function (t) {
      var pts_ = t.events.filter(function (e) { return (e.event === 'position' || e.event === 'card_done') && num(e.lat) != null && num(e.lng) != null; });
      if (!pts_.length) return;
      var op = t.stale ? 0.45 : 1, line = pts_.map(function (e) { return [Number(e.lat), Number(e.lng)]; });
      posBounds = posBounds.concat(line);
      if (line.length > 1) L.polyline(line, { color: t.color, weight: 3, dashArray: '8 6', opacity: 0.85 * op }).addTo(teamLayer);
      pts_.forEach(function (e, i) {
        var ll = line[i], last = i === pts_.length - 1;
        if (e.event === 'card_done') {
          L.circleMarker(ll, { radius: 8, color: t.color, weight: 2.5, fillColor: t.color, fillOpacity: 0.55 * op, opacity: op })
            .bindTooltip(numeralOf(e.card) + ' · ' + cardTitle(e.card, e.title) + ' · ' + hm(e._t), { direction: 'top' }).addTo(teamLayer);
        } else if (!last) {
          L.circleMarker(ll, { radius: 4, color: '#15100c', weight: 1, fillColor: t.color, fillOpacity: op, opacity: op })
            .bindTooltip(t.name + ' · ' + hm(e._t), { direction: 'top' }).addTo(teamLayer);
        }
      });
      var cur = L.circleMarker(line[line.length - 1], { radius: 10, color: '#f1e6c8', weight: 2, fillColor: t.color, fillOpacity: t.stale ? 0.6 : 1, opacity: op });
      cur.bindTooltip(el('span', { style: 'color:' + t.color + (t.stale ? ';opacity:.7' : ''), text: t.name + (t.stale ? ' · ' + t.staleMin + ' min bez zprávy' : '') }),
        { permanent: true, direction: 'right', offset: [10, 0], className: 'tt', opacity: 0.95 });
      cur.addTo(teamLayer);
      t._cur = cur;
    });
    if (!S.fitted) {
      var b = stBounds.length ? stBounds : posBounds;
      if (b.length) {
        map.fitBounds(L.latLngBounds(b).pad(0.15), { maxZoom: 17 });
        S.fitted = posBounds.length > 0 || stBounds.length > 0;
        S.fitMode = stBounds.length ? 'st' : 'pos';
      }
    } else if (S.fitMode === 'pos' && stBounds.length) { S.fitted = false; }
  }

  function focusEvent(e) {
    var lat = num(e.lat), lng = num(e.lng);
    if (!map) return;
    if (lat == null || lng == null) {
      var M = buildModel(), t = M.teamMap[e.team];
      if (t && t.pos) { lat = t.pos[0]; lng = t.pos[1]; } else return;
    }
    map.flyTo([lat, lng], Math.max(map.getZoom(), 16), { duration: 0.6 });
  }
  function focusTeam(t) { if (map && t.pos) map.flyTo(t.pos, Math.max(map.getZoom(), 16), { duration: 0.6 }); }

  // ---------- game selection ----------
  function selectGame(id) {
    var g = (DATA.games || {})[id];
    if (!g) return;
    S.gameId = id; S.game = g; S.events = []; S.localGrades = {}; S.gradeKey = null;
    S.stepVals = {}; S.notes = {}; S.fitted = false; S.fitMode = null;
    lsSet(LS_GAME, id);
    document.getElementById('gameSelect').value = id;
    document.getElementById('gameSubtitle').textContent = gameName(g);
    setStatus(true, 'NAČÍTÁM…');
    if (map && stationLayer) {
      render();
      var sb = ((g.cards) || []).filter(function (p) { return p.at && num(p.at.lat) != null; }).map(function (p) { return [p.at.lat, p.at.lng]; });
      if (sb.length) { map.fitBounds(L.latLngBounds(sb).pad(0.15), { maxZoom: 17 }); S.fitted = true; S.fitMode = 'st'; }
      else map.setView([48.137, 11.575], 13);
    } else render();
    polling = false;
    poll();
  }

  function init() {
    var sel = document.getElementById('gameSelect');
    var gs = games();
    gs.forEach(function (g) { sel.appendChild(el('option', { value: g.id, text: gameName(g) })); });
    sel.addEventListener('change', function () { selectGame(sel.value); });
    document.getElementById('refresh').addEventListener('click', function () { poll(); });
    try { initMap(); } catch (e) { map = null; if (window.console) console.warn('map init failed', e); }
    if (!gs.length) { setStatus(false, 'Žádná hra v datech'); return; }
    var saved = lsGet(LS_GAME), start = gs[0].id;
    gs.forEach(function (g) { if (g.id === saved) start = saved; });
    selectGame(start);
    pollTimer = setInterval(function () { poll(); render(); }, POLL_MS);
    setInterval(render, 60000);
    window.addEventListener('resize', function () { if (map) map.invalidateSize(); });
  }

  window.DanteMonitor = { state: S, render: render, poll: poll };
  init();
})();
