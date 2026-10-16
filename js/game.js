/* Dante – game logic: placements, status, score, done/undone */
(function () {
  'use strict';
  var D = window.Dante;
  var LEATHER = {
    red: { bg: '#6a1e22', sh: '#3d1013' }, blue: { bg: '#1c2a47', sh: '#0e1628' },
    green: { bg: '#1e3b2c', sh: '#0e1f16' }, brown: { bg: '#5b3720', sh: '#33200f' },
    gilt: { bg: '#b8913f', sh: '#1c120a' }
  };
  D.LEATHER = LEATHER;
  var ORDER = ['red', 'blue', 'green', 'brown'];

  D.places = function () {
    if (!D.game) return [];
    return D.game.cards.map(function (p, i) {
      var card = D.cardOf(p.card);   // in the current language
      var fin = !!(card && card.task && card.task.type === 'finale');
      return { idx: i, id: p.card, p: p, card: card, n: D.roman(i + 1), leather: fin ? 'gilt' : ORDER[i % 4], finale: fin };
    }).filter(function (x) { return x.card; });
  };
  D.place = function (id) { return D.places().filter(function (x) { return x.id === id; })[0] || null; };
  D.regular = function () { return D.places().filter(function (x) { return !x.finale; }); };

  D.isOver = function () {
    if (!D.game) return false;
    if (D.st.over) return true;
    return D.nowMinutes() >= D.minutesOf(D.game.endsAt);
  };
  D.isDone = function (id) { return !!D.st.done[id]; };
  D.allOthersDone = function () { return D.regular().every(function (x) { return D.isDone(x.id); }); };
  D.finaleVisible = function (pl) {
    var f = pl.p.from;
    if (D.isDone(pl.id)) return true;
    if (!f || D.nowMinutes() >= D.minutesOf(f)) return true;
    return D.allOthersDone() || D.isOver();
  };
  D.distTo = function (loc) {
    if (!D.pos || !loc) return null;
    return D.distM(D.pos.lat, D.pos.lng, loc.lat, loc.lng);
  };
  D.isNear = function (pl) {
    var d = D.distTo(pl.p.at);
    return d != null && d <= D.game.radius;
  };
  // 'done' | 'near' | 'open' | 'locked' | 'timelocked' | 'hidden'
  D.statusOf = function (pl) {
    if (D.isDone(pl.id)) return 'done';
    if (pl.finale) return D.finaleVisible(pl) ? 'open' : 'hidden';
    var un = D.st.unlocked.indexOf(pl.id) >= 0 || D.st.geoSkipped.indexOf(pl.id) >= 0;
    if (D.timeLocked(pl)) return 'timelocked';
    if (!pl.p.at) return 'open';
    if (D.isNear(pl)) return 'near';
    return un ? 'open' : 'locked';
  };
  // time-lock blocks until `from`; only the debug unlock bypasses it
  D.timeLocked = function (pl) {
    return !!(pl.p.from && D.nowMinutes() < D.minutesOf(pl.p.from) && D.st.geoSkipped.indexOf(pl.id) < 0);
  };
  D.isPlayable = function (pl) { var s = D.statusOf(pl); return s === 'open' || s === 'near'; };

  D.setPos = function (p) {
    D.pos = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, ts: Date.now() };
    var ch = false;
    D.places().forEach(function (pl) {
      if (pl.p.at && !pl.finale && !D.isDone(pl.id) && D.st.unlocked.indexOf(pl.id) < 0 && !D.timeLocked(pl) && D.isNear(pl)) { D.st.unlocked.push(pl.id); ch = true; }
    });
    if (ch) D.save();
    if (D.onPos) D.onPos();
  };

  // ---- score ----
  D.score = function () {
    var pts = 0, bonus = 0;
    Object.keys(D.st.done).forEach(function (id) {
      var r = D.st.done[id];
      pts += (r.points || 0) + (r.bonusAwarded || 0);
      bonus += r.bonusPending || 0;
    });
    return { points: Math.round(pts * 100) / 100, bonus: bonus };
  };

  D.markDone = function (id, points, bonusPending, extra) {
    var pl = D.place(id); if (!pl) return;
    var rec = { points: points || 0, bonusPending: bonusPending || 0, ts: D.nowMs() };
    if (extra) for (var k in extra) rec[k] = extra[k];
    D.st.done[id] = rec;
    D.save();
    D.Track.send('card_done', { card: id, title: pl.card.title, points: rec.points, bonus: rec.bonusPending });
  };
  D.undone = function (id) {
    delete D.st.done[id];
    D.save();
    D.Track.send('card_undone', { card: id });
  };
  D.unlock = function (id, skipped) {
    if (D.st.unlocked.indexOf(id) < 0) D.st.unlocked.push(id);
    if (skipped && D.st.geoSkipped.indexOf(id) < 0) D.st.geoSkipped.push(id);
    D.save();
  };
})();
