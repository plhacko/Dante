/* Dante – util: namespace, escaping, markdown, formatting, geo, storage, time */
(function () {
  'use strict';
  var D = window.Dante = window.Dante || {};
  D.data = window.DANTE_DATA || { cards: {}, games: {} };
  D.pos = null;            // { lat, lng, acc, ts }
  D.game = null;           // current game object
  D.st = null;             // current game state
  D.screen = 'picker';

  D.$ = function (sel, root) { return (root || document).querySelector(sel); };
  D.$$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  D.esc = function (s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  };

  // ---- inline markdown -> HTML (escaped) ----
  function parse(str) {
    var out = [], re = /(\*\*[^*]+\*\*|==[^=]+==|\*[^*\n]+\*)/g, last = 0, m;
    function seg(t, k) { return { t: t, k: k }; }
    while ((m = re.exec(str)) !== null) {
      if (m.index > last) out.push(seg(str.slice(last, m.index), 'n'));
      var tok = m[0];
      if (tok.indexOf('**') === 0) out.push(seg(tok.slice(2, -2), 'b'));
      else if (tok.indexOf('==') === 0) out.push(seg(tok.slice(2, -2), 'h'));
      else out.push(seg(tok.slice(1, -1), 'i'));
      last = m.index + tok.length;
    }
    if (last < str.length) out.push(seg(str.slice(last), 'n'));
    return out;
  }
  function spansHtml(spans) {
    return spans.map(function (s) {
      var t = D.esc(s.t);
      if (s.k === 'b') return '<b>' + t + '</b>';
      if (s.k === 'h') return '<b class="hl">' + t + '</b>';
      if (s.k === 'i') return '<i>' + t + '</i>';
      return t;
    }).join('');
  }
  D.md = function (str) { return spansHtml(parse(str || '')); };
  D.mdQuote = function (str, dropcap) {
    var spans = parse(str || ''), drop = '';
    var f = spans[0];
    if (dropcap !== false && f && f.k === 'n' && /^[A-Za-zÀ-žÁ-ž]/.test(f.t)) {
      drop = f.t.charAt(0); f.t = f.t.slice(1);
    }
    return (drop ? '<span class="dropcap">' + D.esc(drop) + '</span>' : '') + spansHtml(spans);
  };

  // ---- czech plurals / numbers ----
  D.plural = function (n) { return n === 1 ? 'BOD' : (n >= 2 && n <= 4 ? 'BODY' : 'BODŮ'); };
  D.pluralLower = function (n) { return n === 1 ? 'bod' : (n >= 2 && n <= 4 ? 'body' : 'bodů'); };
  D.num = function (n) { return String(n).replace('.', ','); };
  D.ptsText = function (n) {   // "3 body", "0,42 bodu"
    if (!Number.isInteger(n)) return D.num(n) + ' bodu';
    return n + ' ' + D.pluralLower(n);
  };
  D.fmtSecs = function (s) { s = Math.max(0, Math.ceil(s)); var m = Math.floor(s / 60), r = s % 60; return m + ':' + (r < 10 ? '0' : '') + r; };
  D.fmtDist = function (m) { return m < 1000 ? Math.round(m) + ' m' : D.num((m / 1000).toFixed(1)) + ' km'; };
  D.roman = function (n) {
    var map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']], s = '';
    map.forEach(function (p) { while (n >= p[0]) { s += p[1]; n -= p[0]; } });
    return s;
  };
  D.pad2 = function (n) { return (n < 10 ? '0' : '') + n; };
  D.hhmm = function (d) { d = d || new Date(D.nowMs()); return D.pad2(d.getHours()) + ':' + D.pad2(d.getMinutes()); };
  D.uuid = function () {
    try { if (crypto.randomUUID) return crypto.randomUUID(); } catch (e) {}
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  };
  D.shuffle = function (a) {
    a = a.slice();
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)); var t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  };

  // ---- time (testing override: ?now=HH:MM shifts the clock) ----
  var offset = 0;
  try {
    var q = new URLSearchParams(location.search).get('now');
    if (q && /^\d{1,2}:\d{2}$/.test(q)) {
      var p = q.split(':'), t = new Date(); t.setHours(+p[0], +p[1], 0, 0);
      offset = t.getTime() - Date.now();
    }
  } catch (e) {}
  D.nowMs = function () { return Date.now() + offset; };
  D.minutesOf = function (hhmm) { var p = String(hhmm).split(':'); return (+p[0]) * 60 + (+p[1]); };
  D.nowMinutes = function () { var d = new Date(D.nowMs()); return d.getHours() * 60 + d.getMinutes(); };

  // ---- geo ----
  D.distM = function (la1, ln1, la2, ln2) {
    var R = 6371000, r = function (d) { return d * Math.PI / 180; };
    var a = Math.pow(Math.sin(r(la2 - la1) / 2), 2) + Math.cos(r(la1)) * Math.cos(r(la2)) * Math.pow(Math.sin(r(ln2 - ln1) / 2), 2);
    return R * 2 * Math.asin(Math.sqrt(a));
  };
  D.bearing = function (la1, ln1, la2, ln2) {
    var r = function (d) { return d * Math.PI / 180; };
    var y = Math.sin(r(ln2 - ln1)) * Math.cos(r(la2));
    var x = Math.cos(r(la1)) * Math.sin(r(la2)) - Math.sin(r(la1)) * Math.cos(r(la2)) * Math.cos(r(ln2 - ln1));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  };
  var DIR_ADV = ['severně', 'severovýchodně', 'východně', 'jihovýchodně', 'jižně', 'jihozápadně', 'západně', 'severozápadně'];
  var DIR_ACC = ['sever', 'severovýchod', 'východ', 'jihovýchod', 'jih', 'jihozápad', 'západ', 'severozápad'];
  D.dirAdv = function (deg) { return DIR_ADV[Math.round(deg / 45) % 8]; };
  D.dirAcc = function (deg) { return DIR_ACC[Math.round(deg / 45) % 8]; };

  // ---- storage (per game, one JSON object) ----
  D.lsGet = function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } };
  D.lsSet = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  D.lsDel = function (k) { try { localStorage.removeItem(k); } catch (e) {} };
  function key(gameId) { return 'dante:' + gameId + ':state'; }
  D.emptyState = function () {
    return { started: false, team: '', done: {}, unlocked: [], geoSkipped: [], quiz: {}, subs: {}, guess: {}, kronika: null, over: false, outbox: [], lastPing: 0 };
  };
  D.loadState = function (gameId) {
    var s = D.emptyState();
    try { var o = JSON.parse(D.lsGet(key(gameId))); if (o && typeof o === 'object') for (var k in o) s[k] = o[k]; } catch (e) {}
    return s;
  };
  D.save = function () { if (D.game && D.st) D.lsSet(key(D.game.id), JSON.stringify(D.st)); };
  D.wipeState = function (gameId) { D.lsDel(key(gameId)); };
})();
