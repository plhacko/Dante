/* Dante – app shell: router, game picker, team name, card grid, organizer panel */
(function () {
  'use strict';
  var D = window.Dante, esc = D.esc, I = D.icon, t = D.t;
  D.acts = D.acts || {};   // data-act handlers: function(el, event); i18n.js adds 'lang'
  D.screens = {};       // name -> function(arg) -> html | {html, mount}
  D.cleanup = [];       // functions run when leaving a screen
  D.arg = null;

  var app;

  // ---------- routing ----------
  D.nav = function (hash) {
    if (location.hash === hash) D.render(); else location.hash = hash;
  };
  D.parseHash = function () {
    var h = location.hash.replace(/^#\/?/, '');
    var parts = h ? h.split('/') : [];
    return { name: parts[0] || 'picker', arg: parts[1] ? decodeURIComponent(parts[1]) : null };
  };
  D.loadGame = function (id) {
    var g = D.data.games[id];
    if (!g) return false;
    D.game = g; D.st = D.loadState(id);
    D.lsSet('dante:lastGame', id);
    return true;
  };
  D.render = function () {
    D.cleanup.splice(0).forEach(function (f) { try { f(); } catch (e) {} });
    var r = D.parseHash(), name = r.name, arg = r.arg;
    if (name === 'name') { if (!D.loadGame(arg)) { name = 'picker'; } }
    else if (name !== 'picker') {
      if (!D.game) {
        var last = D.lsGet('dante:lastGame');
        if (last && D.data.games[last]) D.loadGame(last);
      }
      if (!D.game || !D.st.started) name = 'picker';
    }
    if (name === 'picker') { D.Track.stop(); }
    else if (name !== 'name') { D.Track.start(); }
    if (name !== 'picker' && name !== 'name' && D.st.kronika && D.st.kronika.finished && name !== 'end' && name !== 'grid') name = 'end';
    var fn = D.screens[name];
    if (!fn) { name = 'picker'; fn = D.screens.picker; }
    D.screen = name; D.arg = arg;
    var out = fn(arg);
    if (typeof out === 'string') out = { html: out };
    app.innerHTML = '<div class="screen" data-testid="screen-' + name + '" data-screen="' + name + '">' + out.html + '</div>';
    document.body.setAttribute('data-screen', name);
    if (out.mount) out.mount(app);
    if (!out.keepScroll) window.scrollTo(0, 0);
  };
  // re-render keeping scroll position
  D.refresh = function () {
    var y = window.scrollY; var r = D.screens[D.screen];
    if (!r) return;
    D.render(); window.scrollTo(0, y);
  };

  // ---------- helpers ----------
  D.header = function (toggle) {
    var tg = toggle === 'compass'
      ? '<button type="button" class="hbtn" data-act="to-compass" data-testid="btn-compass" aria-label="' + t('toCompass') + '">' + I.compass(22, '#e2c47a', 1.7) + '</button>'
      : '<button type="button" class="hbtn" data-act="to-grid" data-testid="btn-grid" aria-label="' + t('toGrid') + '">' + I.grid(20, '#e2c47a', 1.7) + '</button>';
    return '<header class="hdr"><div class="hdr-l"><button type="button" class="logo" data-act="to-picker" aria-label="' + t('toPicker') + '">D</button><span class="hdr-t">' + esc(D.gameText(D.game, 'title')) + '</span></div>' +
      '<div class="hdr-r">' + D.flag() + tg + '</div></header>';
  };
  D.scoreRow = function () {
    var s = D.score();
    return '<div class="score" id="score-row" data-testid="score-row"><span class="s-pts" data-testid="score-points">' + D.ptsLabel(s.points) + '</span><span class="s-dot">·</span><span class="s-bonus" data-testid="score-bonus">+' + s.bonus + ' BONUS</span></div>' +
      (D.isOver() && D.screen !== 'end' ? '<p class="over-note" data-testid="over-note">' + t('overNote') + '</p>' : '');
  };
  D.back = function (label, act) {
    return '<button type="button" class="back" data-act="' + act + '" data-testid="btn-back">' + I.back(20, '#e2c47a', 1.8) + label + '</button>';
  };
  function leatherOf(i) { return ['red', 'blue', 'green', 'brown'][i % 4]; }

  // ---------- picker ----------
  D.screens.picker = function () {
    var games = Object.keys(D.data.games).map(function (k) { return D.data.games[k]; }).sort(function (a, b) { return (a.listOrder || 0) - (b.listOrder || 0); });
    var items = games.map(function (g, i) {
      var n = g.cards.filter(function (p) { var c = D.cardOf(p.card); return c && c.task.type !== 'finale'; }).length;
      var sub = [D.gameText(g, 'place'), D.gameText(g, 'date'), t('stations', { n: n })].filter(Boolean).join(' · ');
      var L = D.LEATHER[leatherOf(i)];
      return '<button type="button" class="gamecard" data-act="pick-game" data-id="' + esc(g.id) + '" data-testid="game-' + esc(g.id) + '" style="--bg:' + L.bg + '">' +
        '<span class="fr1" style="inset:5px"></span><span class="fr2" style="inset:8px"></span>' +
        '<span class="gc-med">' + I.flower(24, '#c9a24a', 1.2) + '</span>' +
        '<span class="gc-txt"><span class="gc-t">' + esc(D.gameText(g, 'title')) + '</span>' +
        (g.endsAt ? '<span class="gc-e" data-testid="game-ends">' + t('gameEnds', { t: esc(g.endsAt) }) + '</span>' : '') + '<span class="gc-s">' + esc(sub) + '</span></span>' + I.next(20, '#e2c47a', 1.8) + '</button>';
    }).join('');
    return D.flag('corner') + '<div class="picker"><div class="emblem"><span>D</span></div><h1 class="brand">DANTE</h1>' +
      '<div class="orn"><span></span>' + I.diamond(14, '#c9a24a', 1.6) + '<span></span></div>' +
      '<p class="verse">Nel mezzo del cammin di nostra vita</p><p class="verse-s">INFERNO · I · 1</p>' +
      '<div class="sect"><span></span><h2>' + t('chooseGame') + '</h2><span></span></div><div class="games">' + items + '</div></div>';
  };
  D.acts['pick-game'] = function (el) { D.nav('#/name/' + encodeURIComponent(el.dataset.id)); };
  D.acts['to-picker'] = function () { D.nav('#/'); };

  // ---------- team name ----------
  function titleParts(t) {
    var m = /^(.*\S)\s+(\d{4})$/.exec(t);
    return m ? '<span class="gt-a">' + esc(m[1]) + '</span><span class="gt-b">' + m[2] + '</span>' : '<span class="gt-a gt-small">' + esc(t) + '</span>';
  }
  D.screens.name = function () {
    var g = D.game, st = D.st, n = D.regular().length;
    var fl = I.flower(18, '#c9a24a', 1.3);
    var has = st.started;
    return '<div class="namescr">' + D.topRow(t('games'), 'to-picker') +
      '<div class="gamecover"><span class="fr1" style="inset:7px"></span><span class="fr2" style="inset:11px"></span>' +
      '<i class="o tl">' + fl + '</i><i class="o tr">' + fl + '</i><i class="o bl">' + fl + '</i><i class="o br">' + fl + '</i>' +
      '<div class="gc-oval">' + titleParts(D.gameText(g, 'title')) + '</div></div>' +
      '<p class="nm-place">' + esc(D.gameText(g, 'place').toUpperCase()) + '</p>' +
      '<p class="nm-sub">' + t('stationsEnd', { n: n, t: esc(g.endsAt) }) + '</p>' +
      '<div class="sect" style="margin-top:30px"><span></span><h2>' + t('yourTeam') + '</h2><span></span></div>' +
      '<label for="team-name" class="nm-lab">' + t('teamAsk') + '</label>' +
      '<input id="team-name" data-testid="team-name" type="text" placeholder="' + t('teamPh') + '" maxlength="40" autocomplete="off" value="' + esc(st.team) + '">' +
      '<p class="nm-err" id="nm-err" role="alert"></p>' +
      '<div class="nm-btns">' +
      (has ? '<button type="button" class="btn-gold" data-act="continue" data-testid="btn-continue">' + t('cont') + '</button><button type="button" class="btn-ghost" data-act="newgame" data-testid="btn-newgame">' + t('newGame') + '</button>'
        : '<button type="button" class="btn-gold" data-act="start" data-testid="btn-start">' + t('start') + '</button>') +
      '</div></div>';
  };
  function takeName() {
    var v = (D.$('#team-name').value || '').trim();
    if (!v) { D.$('#nm-err').textContent = t('teamEmpty'); D.$('#team-name').focus(); return null; }
    return v;
  }
  function begin() {
    D.st.started = true; D.save();
    D.Track.start();   // first tick sends the starting position
    D.nav('#/grid');
  }
  D.acts.start = function () { var v = takeName(); if (!v) return; D.st.team = v; begin(); };
  D.acts['continue'] = function () { var v = takeName(); if (!v) return; D.st.team = v; begin(); };
  D.acts.newgame = function () {
    if (!window.confirm(t('newGameAsk'))) return;
    var team = (D.$('#team-name').value || '').trim() || D.st.team;
    D.wipeState(D.game.id); D.st = D.loadState(D.game.id); D.st.team = team; D.save();
    D.render();
  };

  // ---------- grid ----------
  function tile(pl) {
    var s = D.statusOf(pl), locked = s === 'locked' || s === 'timelocked', gilt = pl.leather === 'gilt';
    var L = D.LEATHER[locked ? 'brown' : pl.leather];
    var bg = locked ? '#2b2420' : L.bg, rule = locked ? '#4a3d33' : (gilt ? '#3b2615' : '#c9a24a'),
      rule2 = locked ? '#3a302a' : (gilt ? 'rgba(59,38,21,0.55)' : 'rgba(201,162,74,0.5)'), ink = locked ? '#a8957f' : (gilt ? '#3b2615' : '#e2c47a');
    var d = pl.p.at && !pl.finale ? D.distTo(pl.p.at) : null;
    var inner = '';
    if (locked) inner += I.lock(20, ink, 1.7); else inner += I.flower(20, gilt ? '#3b2615' : '#c9a24a', 1.2);
    inner += '<span class="g-title" style="color:' + ink + '">' + esc(pl.card.title) + '</span>';
    if (s === 'timelocked') inner += '<span class="g-tlock">' + I.clock(12, '#d9a35a', 2) + t('atTime', { t: esc(pl.p.from) }) + '</span>';
    else if (pl.finale && !D.isDone(pl.id)) inner += '<span class="g-dist" style="color:' + ink + '">' + t('finale') + '</span>';
    else if (d != null && !locked && s !== 'done') inner += '<span class="g-dist" style="color:' + ink + '">' + D.fmtDist(d) + '</span>';
    else if (d != null && s === 'done') inner += '<span class="g-dist" style="color:' + ink + '">' + D.fmtDist(d) + '</span>';
    var badge = '';
    if (s === 'done') badge = '<span class="badge seal-b">' + I.check(18, '#f1e6c8', 2.4) + '</span>';
    else if (s === 'near') badge = '<span class="badge near-b">' + I.pin(18, '#2a1b10', 2) + '</span>';
    var dbg = D.st.geoSkipped.indexOf(pl.id) >= 0 ? '<span class="dbg-b">DEBUG</span>' : '';
    return '<button type="button" class="gcard' + (pl.finale ? ' gfin' : '') + '" data-act="open" data-id="' + esc(pl.id) + '" data-status="' + s + '" data-testid="card-' + esc(pl.id) + '" aria-label="' + pl.n + '. ' + esc(pl.card.title) + '" style="--bg:' + bg + ';--rule:' + rule + ';--rule2:' + rule2 + ';--ink:' + ink + '">' +
      '<span class="fr1"></span><span class="fr2"></span>' +
      (pl.finale ? '' : '<span class="gn gn-tl">' + pl.n + '</span><span class="gn gn-br">' + pl.n + '</span>') +
      '<span class="g-oval">' + inner + '</span>' + badge + dbg + '</button>';
  }
  D.screens.grid = function () {
    var tiles = D.places().filter(function (pl) { return D.statusOf(pl) !== 'hidden'; }).map(tile).join('');
    var html = D.header('compass') + D.scoreRow() +
      '<div class="grid" data-testid="grid">' + tiles + '</div><div class="stick-space"></div>' +
      '<div class="stick"><button type="button" class="btn-gold big" data-act="check-pos" data-testid="btn-check-pos">' + I.pin(20, '#2a1b10', 1.9) + t('checkPos') + '</button></div>';
    return { html: html, mount: function () { D.bindLongPress(); }, keepScroll: true };
  };
  D.acts.open = function (el) { D.nav('#/card/' + encodeURIComponent(el.dataset.id)); };
  D.acts['to-compass'] = function () { D.nav('#/compass'); };
  D.acts['to-grid'] = function () { D.nav('#/grid'); };
  D.acts['check-pos'] = function (el) {
    el.disabled = true;
    var old = el.innerHTML;
    el.lastChild.textContent = t('locating');
    D.Track.getPos({ timeout: 12000, maxAge: 0 }).then(function () {
      var near = D.places().filter(function (pl) { return !pl.finale && !D.isDone(pl.id) && pl.p.at && D.isNear(pl); });
      D.toast(near.length ? t('nearCards', { n: near.map(function (p) { return p.n; }).join(', ') }) : t('noneNear'));
    }).catch(function () {
      D.toast(t('geoFail'));
    }).then(function () { if (D.screen === 'grid') D.refresh(); });
  };
  D.onPos = function () { if (D.screen === 'grid') D.refresh(); };
  D.onGrade = function () { if (D.screen === 'card' && D.onGradeCard) D.onGradeCard(); else if (D.screen === 'grid') D.refresh(); };

  // ---------- organizer panel (long press on score row) ----------
  D.bindLongPress = function () {
    var row = D.$('#score-row'); if (!row) return;
    var t;
    var clear = function () { clearTimeout(t); };
    row.addEventListener('pointerdown', function () { t = setTimeout(D.openJudge, 500); });
    ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach(function (e) { row.addEventListener(e, clear); });
    row.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  };
  D.openJudge = function () {
    var items = D.places().filter(function (pl) { return pl.card.bonus && D.isDone(pl.id); });
    var body = items.length ? items.map(function (pl) {
      var r = D.st.done[pl.id], b = pl.card.bonus;
      var val = pl.card.task.type === 'submit' ? (r.graded ? r.points : '') : (r.bonusAwarded != null ? r.bonusAwarded : '');
      return '<div class="j-item"><label for="j-' + esc(pl.id) + '">' + pl.n + '. ' + esc(pl.card.title) + '</label><small>' + esc(b.description) + ' (max ' + b.max + ')</small>' +
        '<input type="number" inputmode="numeric" id="j-' + esc(pl.id) + '" data-id="' + esc(pl.id) + '" data-testid="judge-' + esc(pl.id) + '" min="0" max="' + b.max + '" value="' + val + '" placeholder="max ' + b.max + '"></div>';
    }).join('') : '<p class="j-empty">' + t('judgeEmpty') + '</p>';
    var m = D.$('#modal');
    m.innerHTML = '<div class="modal-bg"><div class="modal" role="dialog" aria-label="' + t('judgeTitle') + '" data-testid="judge-panel"><h2>' + t('judgeTitle') + '</h2>' + body +
      '<div class="j-btns"><button type="button" class="btn-gold" data-act="judge-save" data-testid="judge-save">' + t('save') + '</button><button type="button" class="btn-ghost" data-act="judge-close" data-testid="judge-close">' + t('close') + '</button></div></div></div>';
  };
  D.acts['judge-close'] = function () { D.$('#modal').innerHTML = ''; };
  D.acts['judge-save'] = function () {
    D.$$('#modal input[data-id]').forEach(function (inp) {
      var id = inp.dataset.id, pl = D.place(id), r = D.st.done[id]; if (!r || !pl) return;
      var max = pl.card.bonus.max, v = inp.value === '' ? null : Math.max(0, Math.min(max, parseInt(inp.value, 10) || 0));
      var submit = pl.card.task.type === 'submit';
      if (v == null) {
        if (!submit && r.bonusAwarded != null) { delete r.bonusAwarded; r.bonusPending = max; }
        return;
      }
      if (submit) { r.points = v; r.graded = true; } else r.bonusAwarded = v;
      r.bonusPending = 0;
    });
    D.save(); D.acts['judge-close']();
    if (D.screen === 'grid' || D.screen === 'compass' || D.screen === 'card') D.refresh();
  };

  // ---------- init ----------
  document.addEventListener('DOMContentLoaded', function () {
    app = D.$('#app');
    app.addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (!el || !app.contains(el)) return;
      var f = D.acts[el.dataset.act];
      if (f) f(el, e);
    });
    D.$('#modal').addEventListener('click', function (e) {
      var el = e.target.closest('[data-act]');
      if (el && D.acts[el.dataset.act]) D.acts[el.dataset.act](el, e);
    });
    window.addEventListener('hashchange', D.render);
    // resume the last game
    var last = D.lsGet('dante:lastGame');
    if (!location.hash && last && D.data.games[last]) {
      var s = D.loadState(last);
      if (s.started) { D.loadGame(last); location.hash = (s.kronika && s.kronika.finished) ? '#/end' : '#/grid'; return D.render(); }
    }
    D.render();
    setInterval(function () { if (D.screen === 'grid' && !document.hidden && !D.$('#modal').innerHTML) D.refresh(); }, 20000);
  });
})();
