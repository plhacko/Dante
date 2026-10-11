/* Dante – compass / radar screen */
(function () {
  'use strict';
  var D = window.Dante, esc = D.esc, I = D.icon;
  var STEPS = [100, 200, 500, 1000, 2000, 3000, 5000, 10000, 20000, 50000];
  var R = 136; // px of the outer ring
  var C = D.compass = { mode: 'north', zi: null, hidden: {}, focus: null, acc: 0, heading: null, sensor: 'idle', geoErr: false };
  var unwatch = null, tickT = null, noSensorT = null, listeners = [];

  function visiblePlaces() {
    return D.places().filter(function (pl) { return D.statusOf(pl) !== 'hidden' && (!C.focus || pl.id === C.focus); });
  }
  function autoZoom() {
    var far = 0;
    visiblePlaces().forEach(function (pl) { var d = D.distTo(pl.p.at); if (d != null && !C.hidden[pl.id]) far = Math.max(far, d); });
    var i = 2; while (i < STEPS.length - 1 && STEPS[i] < far) i++;
    return i;
  }
  function rangeLabel() { var r = STEPS[C.zi == null ? 2 : C.zi]; return 'OKRUH ' + D.fmtDist(r).toUpperCase(); }

  function markerHtml(pl) {
    var s = D.statusOf(pl), locked = s === 'locked' || s === 'timelocked';
    var L = D.LEATHER[pl.leather];
    var bg = locked ? '#2b2420' : L.bg, rule = locked ? '#4a3d33' : (pl.leather === 'gilt' ? '#3b2615' : '#c9a24a'), ink = locked ? '#a8957f' : (pl.leather === 'gilt' ? '#3b2615' : '#e2c47a');
    var d = D.distTo(pl.p.at), b = D.bearing(D.pos.lat, D.pos.lng, pl.p.at.lat, pl.p.at.lng);
    var range = STEPS[C.zi], r = Math.min(d / range, 1.08) * R, rad = b * Math.PI / 180;
    var x = 160 + r * Math.sin(rad), y = 160 - r * Math.cos(rad);
    var lab = pl.finale ? '★' : pl.n;
    return '<button type="button" class="mk" data-act="open" data-id="' + esc(pl.id) + '" data-testid="marker-' + esc(pl.id) + '" aria-label="' + pl.n + '. ' + esc(pl.card.title) + ', ' + D.fmtDist(d) + '" style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;background:' + bg + ';border-color:' + rule + ';color:' + ink + (d > range ? ';opacity:.6' : '') + '">' +
      '<span class="mk-n">' + (pl.finale ? '&#9830;' : pl.n) + '</span><span class="mk-d">' + D.fmtDist(d) + '</span>' +
      (s === 'done' ? '<span class="mk-done">' + I.check(9, '#f1e6c8', 3.2) + '</span>' : '') + '</button>';
  }
  function markersHtml() {
    if (!D.pos) return '';
    if (C.zi == null) C.zi = autoZoom();
    return visiblePlaces().filter(function (pl) { return pl.p.at && !C.hidden[pl.id]; }).map(markerHtml).join('');
  }
  function chipsHtml() {
    return visiblePlaces().map(function (pl) {
      var off = C.hidden[pl.id], L = D.LEATHER[pl.leather], gilt = pl.leather === 'gilt';
      return '<button type="button" class="chip" data-act="chip" data-id="' + esc(pl.id) + '" data-testid="chip-' + esc(pl.id) + '" aria-pressed="' + (off ? 'false' : 'true') + '" aria-label="Zobrazit ' + pl.n + '. ' + esc(pl.card.title) + '" style="background:' + L.bg + ';border-color:' + (gilt ? '#3b2615' : '#c9a24a') + ';color:' + (gilt ? '#3b2615' : '#e2c47a') + ';opacity:' + (off ? '.35' : '1') + ';text-decoration:' + (off ? 'line-through' : 'none') + '">' + (pl.finale ? '&#9830;' : pl.n) + '</button>';
    }).join('');
  }
  function unknownHtml() {
    var list = visiblePlaces().filter(function (pl) { return !pl.p.at; });
    if (!list.length) return '';
    return '<p class="cp-lab">BEZ URČENÉ POLOHY</p><div class="unk">' + list.map(function (pl) {
      var L = D.LEATHER[pl.leather];
      return '<button type="button" class="unk-c" data-act="open" data-id="' + esc(pl.id) + '" style="background:' + L.bg + '">' + pl.n + '. ' + esc(pl.card.title) + '</button>';
    }).join('') + '</div>';
  }
  function readout() {
    if (C.mode !== 'heading') return C.sensor === 'unavailable' ? 'Tento telefon nedává údaj o směru. Sever zůstává nahoře.' : (C.sensor === 'denied' ? 'Přístup ke kompasu nebyl povolen. Sever zůstává nahoře.' : 'Sever je nahoře');
    if (C.heading == null) return 'Čekám na údaj z kompasu…';
    return 'Díváte se na ' + D.dirAcc(C.heading) + ' · ' + Math.round(C.heading) + '°';
  }
  function statusHtml() {
    if (C.geoErr && !D.pos) return '<span class="dot bad"></span>POLOHA NENÍ DOSTUPNÁ · POVOLTE ZJIŠŤOVÁNÍ POLOHY';
    if (!D.pos) return '<span class="dot wait"></span>ČEKÁM NA POLOHU…';
    var s = Math.max(0, Math.round((Date.now() - D.pos.ts) / 1000));
    return '<span class="dot"></span>POLOHA SE AKTUALIZUJE SAMA · PŘED ' + s + ' S';
  }

  function applyRot() {
    var rd = D.$('#radar'); if (!rd) return;
    var rot = C.mode === 'heading' && C.heading != null ? -C.acc : 0;
    rd.style.setProperty('--rot', rot + 'deg');
    rd.style.setProperty('--ctr', (-rot) + 'deg');
    var w = D.$('#wedge'); if (w) w.style.display = (C.mode === 'heading' && C.heading != null) ? 'block' : 'none';
    var ro = D.$('#cp-readout'); if (ro) ro.textContent = readout();
  }
  function updateLive() {
    var m = D.$('#cp-markers'); if (!m) return;
    m.innerHTML = markersHtml();
    var st = D.$('#cp-status'); if (st) st.innerHTML = statusHtml();
    var z = D.$('#cp-range'); if (z) z.textContent = rangeLabel();
    var h = D.$('#cp-nopos'); if (h) h.style.display = D.pos ? 'none' : 'flex';
    applyRot();
  }

  // ---- heading sensor ----
  function screenAngle() { return (screen.orientation && screen.orientation.angle) || window.orientation || 0; }
  function onOrient(e) {
    var h = null;
    if (typeof e.webkitCompassHeading === 'number' && !isNaN(e.webkitCompassHeading)) h = e.webkitCompassHeading;
    else if (e.type === 'deviceorientationabsolute' || e.absolute === true) { if (e.alpha != null) h = 360 - e.alpha; }
    if (h == null) return;
    h = (h + screenAngle() + 720) % 360;
    clearTimeout(noSensorT); C.sensor = 'ok';
    if (C.heading == null) { C.heading = h; C.acc = h; }
    else {
      var cur = ((C.acc % 360) + 360) % 360;
      var delta = ((h - cur + 540) % 360) - 180;
      C.acc += delta * 0.25;
      C.heading = ((C.acc % 360) + 360) % 360;
    }
    applyRot();
  }
  function listen() {
    stopSensor();
    ['deviceorientationabsolute', 'deviceorientation'].forEach(function (n) { window.addEventListener(n, onOrient, true); listeners.push(n); });
    clearTimeout(noSensorT);
    noSensorT = setTimeout(function () {
      if (C.heading == null) { C.sensor = C.denied ? 'denied' : 'unavailable'; C.mode = 'north'; refreshControls(); applyRot(); }
    }, 2500);
  }
  function stopSensor() { listeners.splice(0).forEach(function (n) { window.removeEventListener(n, onOrient, true); }); clearTimeout(noSensorT); }
  function refreshControls() {
    var n = D.$('#mode-north'), h = D.$('#mode-heading'); if (!n) return;
    n.classList.toggle('on', C.mode === 'north'); h.classList.toggle('on', C.mode === 'heading');
    n.setAttribute('aria-pressed', C.mode === 'north'); h.setAttribute('aria-pressed', C.mode === 'heading');
  }

  D.acts['mode-north'] = function () { C.mode = 'north'; stopSensor(); refreshControls(); applyRot(); };
  D.acts['mode-heading'] = function () {
    C.mode = 'heading'; C.sensor = 'idle'; C.denied = false; C.heading = null; refreshControls(); applyRot();
    var DO = window.DeviceOrientationEvent;
    if (DO && typeof DO.requestPermission === 'function') {
      DO.requestPermission().then(function (r) {
        C.denied = r !== 'granted'; listen();
      }).catch(function () { C.denied = true; listen(); });
    } else listen();
  };
  D.acts.zoomin = function () { if (C.zi > 0) { C.zi--; updateLive(); } };
  D.acts.zoomout = function () { if (C.zi < STEPS.length - 1) { C.zi++; updateLive(); } };
  D.acts.chip = function (el) {
    var id = el.dataset.id; C.hidden[id] = !C.hidden[id];
    D.$('#cp-chips').innerHTML = chipsHtml(); updateLive();
  };

  D.screens.compass = function () {
    C.focus = D.compassFocus || null; D.compassFocus = null;
    C.zi = null; C.mode = 'north'; C.heading = null; C.sensor = 'idle'; C.geoErr = false; C.hidden = {};
    var html = D.header('grid') + D.scoreRow() +
      (C.focus ? '<p class="cp-focus">Na kompasu je jen cíl. <button type="button" class="linkb" data-act="unfocus" data-testid="btn-unfocus">Ukázat všechny karty</button></p>' : '') +
      '<div class="modes" role="group" aria-label="Natočení kompasu">' +
      '<button type="button" id="mode-north" class="on" data-act="mode-north" data-testid="mode-north" aria-pressed="true">' + I.north(16, 'currentColor', 2) + 'SEVER NAHOŘE</button>' +
      '<button type="button" id="mode-heading" data-act="mode-heading" data-testid="mode-heading" aria-pressed="false">' + I.heading(16, 'currentColor', 2) + 'PODLE POHLEDU</button></div>' +
      '<p class="readout" id="cp-readout" data-testid="compass-readout" aria-live="polite">Sever je nahoře</p>' +
      '<div class="radar-wrap"><div class="radar" id="radar" data-testid="radar"><div class="r-bg"></div>' +
      '<div class="r-rot"><div class="ring" style="width:85%;height:85%"></div><div class="ring" style="width:42%;height:42%"></div>' +
      '<svg class="r-lines" width="320" height="320" viewBox="0 0 320 320" fill="none" stroke="rgba(201,162,74,0.16)" stroke-width="1" aria-hidden="true"><path d="M160 22V298M22 160H298M62 62L258 258M258 62L62 258"></path></svg>' +
      '<span class="cd cd-n">S</span><span class="cd cd-s">J</span><span class="cd cd-e">V</span><span class="cd cd-w">Z</span>' +
      '<div id="cp-markers"></div></div>' +
      '<svg id="wedge" class="wedge" width="60" height="70" viewBox="0 0 60 70" aria-hidden="true" style="display:none"><path d="M30 70L4 4Q30 -6 56 4Z" fill="rgba(226,196,122,0.16)" stroke="rgba(226,196,122,0.45)" stroke-width="1"></path></svg>' +
      '<div class="you" aria-label="Vaše poloha"><span></span></div>' +
      '<div class="nopos" id="cp-nopos"><span>Čekám na polohu…</span></div></div></div>' +
      '<div class="zoom"><button type="button" data-act="zoomout" data-testid="zoom-out" aria-label="Oddálit">−</button><span id="cp-range" data-testid="zoom-label">' + rangeLabel() + '</span><button type="button" data-act="zoomin" data-testid="zoom-in" aria-label="Přiblížit">+</button></div>' +
      '<p class="cp-lab">ZOBRAZIT NA KOMPASU</p><div class="chips" id="cp-chips">' + chipsHtml() + '</div>' + unknownHtml() +
      '<div class="stick-space"></div><div class="status" role="status" id="cp-status" data-testid="compass-status">' + statusHtml() + '</div>';
    return {
      html: html,
      mount: function () {
        updateLive();
        unwatch = D.Track.watch(function (kind) { C.geoErr = kind === 'err'; updateLive(); });
        tickT = setInterval(function () { var st = D.$('#cp-status'); if (st) st.innerHTML = statusHtml(); }, 1000);
        D.bindLongPress();
        D.cleanup.push(function () { if (unwatch) unwatch(); unwatch = null; clearInterval(tickT); stopSensor(); });
      }
    };
  };
  D.acts.unfocus = function () { D.nav('#/compass'); };
  var prevOnPos = null;
  D.onPos = (function (orig) {
    return function () {
      if (D.screen === 'compass') { updateLive(); D.$('#cp-chips') && (D.$('#cp-chips').innerHTML = chipsHtml()); }
      else if (orig) orig();
    };
  })(D.onPos);
})();
