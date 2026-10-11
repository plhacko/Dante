/* Dante – tracking: ntfy events, position pings, grade polling, geolocation */
(function () {
  'use strict';
  var D = window.Dante;
  var T = D.Track = {};
  var timer = null, watchId = null, watchListeners = [];
  T.sent = [];   // debug log of events (testing)

  function topic() { return D.game && D.game.tracking && D.game.tracking.ntfyTopic; }

  T.post = function (payload) {
    var tp = topic();
    if (!tp) return Promise.resolve(false);
    try {
      return fetch('https://ntfy.sh/' + tp, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) })
        .then(function (r) { return !!(r && r.ok); }).catch(function () { return false; });
    } catch (e) { return Promise.resolve(false); }
  };

  // event: name, extra: object. Important events are queued for retry when offline.
  T.send = function (event, extra) {
    if (!D.game || !D.st) return;
    var p = { v: 1, game: D.game.id, team: D.st.team, event: event, ts: new Date(D.nowMs()).toISOString() };
    if (D.pos && event !== 'position') { p.lat = D.pos.lat; p.lng = D.pos.lng; }
    if (extra) for (var k in extra) p[k] = extra[k];
    T.sent.push(p);
    T.post(p).then(function (ok) {
      if (!ok && event !== 'position') { D.st.outbox.push(p); D.save(); }
    });
  };
  T.flush = function () {
    if (!D.st || !D.st.outbox.length) return;
    var q = D.st.outbox; D.st.outbox = []; D.save();
    q.forEach(function (p) {
      T.post(p).then(function (ok) { if (!ok) { D.st.outbox.push(p); D.save(); } });
    });
  };

  // ---- geolocation ----
  T.getPos = function (opts) {
    opts = opts || {};
    // an active watch keeps D.pos fresh; use it instead of asking again
    if (watchId != null && D.pos && Date.now() - D.pos.ts < 30000) return Promise.resolve(D.pos);
    var geo = new Promise(function (resolve, reject) {
      if (!navigator.geolocation) { reject(new Error('no-geo')); return; }
      navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: opts.timeout || 12000, maximumAge: opts.maxAge == null ? 5000 : opts.maxAge });
    });
    var deadline = new Promise(function (_, rej) { setTimeout(function () { rej(new Error('timeout')); }, (opts.timeout || 12000) + 2000); });
    var racers = [geo.then(function (p) { D.setPos(p); return D.pos; }), deadline];
    if (watchId != null) {   // an active watch may deliver a fix sooner than a one-shot request
      racers.push(new Promise(function (res) {
        var l = function (k) { if (k === 'ok') { var i = watchListeners.indexOf(l); if (i >= 0) watchListeners.splice(i, 1); res(D.pos); } };
        watchListeners.push(l);
      }));
    }
    return Promise.race(racers);
  };

  T.watch = function (listener) {   // returns unsubscribe
    watchListeners.push(listener);
    if (watchId == null && navigator.geolocation) {
      try {
        watchId = navigator.geolocation.watchPosition(function (p) {
          D.setPos(p);
          watchListeners.slice().forEach(function (l) { l('ok'); });
        }, function (err) {
          watchListeners.slice().forEach(function (l) { l('err', err); });
        }, { enableHighAccuracy: true, maximumAge: 2000, timeout: 20000 });
      } catch (e) {}
    }
    return function () {
      var i = watchListeners.indexOf(listener); if (i >= 0) watchListeners.splice(i, 1);
      if (!watchListeners.length && watchId != null) { try { navigator.geolocation.clearWatch(watchId); } catch (e) {} watchId = null; }
    };
  };

  // ---- pings ----
  T.intervalMs = function () {
    var q = null;
    try { q = new URLSearchParams(location.search).get('pingSec'); } catch (e) {}
    if (q && +q > 0) return +q * 1000;
    return ((D.game.tracking && D.game.tracking.positionEveryMinutes) || 5) * 60000;
  };
  T.ping = function () {
    if (!D.game || !D.st || !D.st.started) return;
    D.st.lastPing = Date.now(); D.save();
    T.flush();
    T.getPos({ timeout: 10000, maxAge: 5000 }).then(function () {
      T.send('position', { lat: D.pos.lat, lng: D.pos.lng, acc: Math.round(D.pos.acc || 0) });
    }).catch(function () {}).then(function () { T.checkGrades(); });
  };
  function tick() {
    if (!D.game || !D.st || !D.st.started || document.hidden) return;
    if (Date.now() - (D.st.lastPing || 0) >= T.intervalMs()) T.ping();
  }
  T.start = function () {
    T.stop();
    timer = setInterval(tick, Math.min(30000, Math.max(1000, T.intervalMs() / 2)));
    tick();
  };
  T.stop = function () { if (timer) clearInterval(timer); timer = null; };
  document.addEventListener('visibilitychange', function () { if (!document.hidden) tick(); });
  window.addEventListener('online', function () { T.flush(); });

  // ---- grades ----
  // returns Promise<{ok:boolean, found:number}>
  T.checkGrades = function () {
    var subs = (D.st && D.st.subs) || {};
    var pending = Object.keys(subs).filter(function (c) { return !subs[c].grade; });
    var tp = topic();
    if (!pending.length || !tp) return Promise.resolve({ ok: true, found: 0 });
    var url = 'https://ntfy.sh/' + tp + '/json?poll=1&since=12h';
    return fetch(url).then(function (r) { if (!r.ok) throw new Error('http'); return r.text(); }).then(function (txt) {
      var found = 0;
      txt.split('\n').forEach(function (line) {
        line = line.trim(); if (!line) return;
        var msg; try { msg = JSON.parse(JSON.parse(line).message); } catch (e) { return; }
        if (!msg || msg.event !== 'grade' || msg.game !== D.game.id) return;
        pending.forEach(function (c) {
          var s = subs[c];
          if (s.grade || msg.card !== c || msg.submission !== s.id) return;
          s.grade = { points: +msg.points || 0, note: msg.note || '' };
          var rec = D.st.done[c];
          if (rec) { rec.points = s.grade.points; rec.bonusPending = 0; rec.graded = true; }
          found++;
        });
      });
      if (found) { D.save(); if (D.onGrade) D.onGrade(); }
      return { ok: true, found: found };
    }).catch(function () { return { ok: false, found: 0 }; });
  };
})();
