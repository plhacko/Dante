/* Dante – card detail screens and task types (confirm, quiz, submit, find, guess, finale) */
(function () {
  'use strict';
  var D = window.Dante, esc = D.esc, I = D.icon, tr = D.t;

  function cur() { var pl = D.place(D.arg); return pl; }
  function over() { var pl = cur(); return D.isOver() && !(pl && D.debugged(pl.id)); }   // a debug-unlocked card stays playable
  function rec(id) { return D.st.done[id]; }


  function doneBlock(pl, r) {
    var total = (r.points || 0) + (r.bonusAwarded || 0);
    var bonus = r.bonusPending ? '<p class="bonus-line" data-testid="bonus-line">' + tr('bonusWaits', { n: r.bonusPending }) + '</p>' : '';
    var aw = r.bonusAwarded ? '<p class="bonus-line ok">' + tr('bonusIncl', { n: r.bonusAwarded }) + '</p>' : '';
    return D.seal(52) + '<h2 class="done-h" data-testid="done-title">' + tr('done') + '</h2>' +
      '<div class="pts-pill" data-testid="done-points">' + D.ptsLabel(total) + '</div>' + bonus + aw;
  }
  function fromChip(pl) {
    if (!pl.p.from || pl.finale) return '';
    return '<span class="chip-time">' + I.clock(14, '#8a4a16', 2) + tr('takesPlace', { t: esc(pl.p.from) }) + '</span>';
  }
  function backBtns(extra) {
    return (extra || '') + '<button type="button" class="btn-line" data-act="to-grid" data-testid="btn-back-cards">' + I.back(18, '#6a1e22', 1.9) + tr('backToCards') + '</button>';
  }

  // ---------- screen: card ----------
  D.screens.card = function (id) {
    var pl = D.place(id);
    if (!pl || D.statusOf(pl) === 'hidden') { location.hash = '#/grid'; return D.screens.grid(); }
    var s = D.statusOf(pl), r = rec(id), t = pl.card.task, type = t.type, inner;
    var backTo = D.topRow(tr('back'), 'to-grid');
    if (!r && (s === 'locked' || s === 'timelocked')) return { html: backTo + lockedView(pl, s) };
    if (r && type === 'submit') inner = submitState(pl, r);
    else {
      inner = D.pageHead(pl, pl.finale ? tr('finale') : '') + fromChip(pl) + D.blocksHtml(pl.card);
      inner += r ? doneView(pl, r) : activeView(pl);
    }
    var html = backTo + D.cover(pl, inner, { debug: !r });
    return {
      html: html,
      mount: function () {
        var inputs = D.$$('[data-draft]');
        inputs.forEach(function (el) {
          el.addEventListener('input', function () {
            D.st.drafts = D.st.drafts || {}; var d = D.st.drafts[id] = D.st.drafts[id] || {};
            d[el.dataset.draft] = el.value; D.save();
          });
        });
        if (type === 'finale' && !r) mountFinale(pl);
      }
    };
  };
  D.onGradeCard = function () { D.render(); };

  function lockedView(pl, s) {
    var msg = s === 'timelocked' ? tr('timeLocked', { t: esc(pl.p.from) }) : tr('locked', { r: D.radiusOf(pl) });
    var d = D.distTo(pl.p.at);
    var inner = I.flower(24, '#8c6b2c', 1.2) + '<h1 class="page-title" data-testid="card-title">' + esc(pl.card.title) + '</h1>' + D.divider() +
      '<div class="lockbox" data-testid="locked-view">' + I.lock(30, '#5a4632', 1.7) + '<p>' + msg + '</p>' +
      (d != null && s === 'locked' ? '<p class="lk-d">' + tr('lockedDist', { d: D.fmtDist(d) }) + '</p>' : '') + '</div>' +
      (s === 'locked' ? D.btn(tr('checkPos'), 'check-here', { icon: I.pin(20, '#e2c47a', 1.9), id: 'btn-check-here', cls: 'btn-leather' }) : '');
    return D.cover(pl, inner, { debug: true });
  }
  D.acts['check-here'] = function (el) {
    el.disabled = true;
    D.Track.getPos({ timeout: 12000, maxAge: 0 }).then(function () {
      var pl = cur();
      if (pl && D.isPlayable(pl)) D.toast(tr('atPlace')); else D.toast(tr('notNear'));
    }).catch(function () { D.toast(tr('geoFailShort')); }).then(function () { if (D.screen === 'card') D.render(); });
  };

  D.acts.debug = function () {
    var pl = cur(); if (!pl) return;
    if (pl.finale) {
      if (!window.confirm(tr('debugFinale'))) return;
      D.unlock(pl.id, true); D.nav('#/kronika'); return;
    }
    if (!window.confirm(tr('debugCard'))) return;
    D.unlock(pl.id, true);
    D.render();
    D.toast(tr('debugDone'));
  };

  // ---------- active views ----------
  function actionNote() { return '<p class="over-card" data-testid="over-card">' + tr('overCard') + '</p>'; }

  function activeView(pl) {
    var t = pl.card.task, type = t.type, h = '', ov = over() && type !== 'finale';
    if (type === 'quiz') return quizView(pl, ov);
    if (type === 'submit') return '';
    h += D.cartHtml(pl.card);
    if (ov) return h + actionNote();
    if (type === 'confirm') {
      if (t.choices && t.choices.length) {
        h += '<fieldset class="opts"><legend>' + tr('howMany') + '</legend>' + t.choices.map(function (v) {
          return '<label class="opt"><input type="radio" name="point-pick" value="' + v + '" data-testid="choice-' + v + '"><span>' + v + ' ' + D.pluralLower(v) + '</span></label>';
        }).join('') + '</fieldset>';
      }
      if (t.counter) {
        var c = t.counter;
        h += '<div class="counter"><label for="pts-counter">' + esc(c.label || tr('howMany')) + '</label><div class="cnt-row">' +
          '<button type="button" data-act="cnt-dec" data-testid="cnt-dec" aria-label="' + tr('pointLess') + '">−</button>' +
          '<input id="pts-counter" data-testid="counter" type="number" min="' + (c.min || 0) + '" max="' + c.max + '" value="' + (c.min || 0) + '" readonly>' +
          '<button type="button" data-act="cnt-inc" data-testid="cnt-inc" aria-label="' + tr('pointMore') + '">+</button></div></div>';
      }
      h += D.btn(tr('doneBtn'), 'confirm', { icon: I.check(20, '#e2c47a', 2.2), id: 'btn-confirm', cls: 'btn-leather' });
    } else if (type === 'find') {
      h += D.btn(tr('here'), 'find', { icon: I.pin(20, '#e2c47a', 1.9), id: 'btn-find', cls: 'btn-leather' }) + '<p class="find-msg" id="find-msg" role="status" data-testid="find-msg"></p>';
    } else if (type === 'guess') {
      var g = D.st.guess[pl.id], running = g && g.phase === 'running';
      h += D.btn(running ? tr('guessCont') : tr('guessStart', { t: D.fmtSecs(t.seconds) }), 'guess-start', { icon: I.timer(20, '#e2c47a', 1.9), id: 'btn-guess-start', cls: 'btn-leather' }) +
        '<p class="hint-i">' + tr('refereeOnly') + '</p>';
    } else if (type === 'finale') {
      h = finaleView(pl);
    }
    return h;
  }

  function doneView(pl, r) {
    var t = pl.card.task, h = '';
    if (t.type === 'quiz') h += quizView(pl, false, true);
    h += doneBlock(pl, r);
    if (t.type === 'guess' && r.guess) h += '<p class="hint-i">' + tr('guessedSkipped', { g: r.guess.guessed, s: r.guess.skipped }) + '</p>';
    var extra = t.type === 'confirm' ? '<button type="button" class="btn-line" data-act="undo" data-testid="btn-undo">' + tr('undo') + '</button>' : '';
    return h + backBtns(extra);
  }

  // ---------- confirm ----------
  D.acts['cnt-dec'] = function () { var i = D.$('#pts-counter'); var c = cur().card.task.counter; i.value = Math.max(c.min || 0, (+i.value) - 1); };
  D.acts['cnt-inc'] = function () { var i = D.$('#pts-counter'); var c = cur().card.task.counter; i.value = Math.min(c.max, (+i.value) + 1); };
  D.acts.confirm = function () {
    var pl = cur(), t = pl.card.task;
    if (over()) return D.toast(tr('over'));
    var pts = pl.card.points || 0;
    if (t.choices && t.choices.length) {
      var sel = D.$('input[name="point-pick"]:checked');
      if (!sel) return D.toast(tr('pickFirst'));
      pts = +sel.value;
    } else if (t.counter) pts = +D.$('#pts-counter').value || 0;
    D.markDone(pl.id, pts, pl.card.bonus ? pl.card.bonus.max : 0);
    D.render();
  };
  D.acts.undo = function () { var pl = cur(); D.undone(pl.id); D.render(); };

  // ---------- quiz ----------
  // task.shuffle: each team gets its own option order, kept across reloads; answers stay original indices
  function quizOrder(pl) {
    var t = pl.card.task, all = D.st.quizOrder || (D.st.quizOrder = {}), o = all[pl.id];
    if (!o || o.length !== t.questions.length) {
      o = all[pl.id] = t.questions.map(function (qq) { return D.shuffle(qq.options.map(function (_, i) { return i; })); });
      D.save();
    }
    return o;
  }
  function quizView(pl, ov, isDone) {
    var t = pl.card.task, q = D.st.quiz[pl.id], checked = !!q, h = D.cartHtml(pl.card);
    var order = t.shuffle ? quizOrder(pl) : null;
    h += '<div class="quiz">' + t.questions.map(function (qq, qi) {
      var ans = checked ? q.answers[qi] : null;
      var idx = order ? order[qi] : qq.options.map(function (_, i) { return i; });
      var opts = idx.map(function (oi) {
        var o = qq.options[oi], cls = 'opt';
        if (checked) { if (oi === qq.correct) cls += ' right'; else if (oi === ans) cls += ' wrong'; }
        return '<label class="' + cls + '"><input type="radio" name="q' + qi + '" value="' + oi + '"' + (checked ? ' disabled' : '') + (ans === oi ? ' checked' : '') + ' data-testid="q' + qi + '-o' + oi + '"><span>' + esc(o) + '</span></label>';
      }).join('');
      return '<fieldset class="opts"><legend>' + (qi + 1) + '. ' + esc(qq.q) + '</legend>' + opts +
        (checked && qq.explain ? '<p class="explain" data-testid="explain-' + qi + '">' + esc(qq.explain) + '</p>' : '') + '</fieldset>';
    }).join('') + '</div>';
    if (checked) {
      var n = t.questions.length, ok = q.answers.filter(function (a, i) { return a === t.questions[i].correct; }).length, pts = ok * (t.pointsPerCorrect || 1);
      h += '<div class="cart" data-testid="quiz-result"><div class="cart-t">' + tr('quizResult', { ok: ok, n: n, pts: D.ptsLabel(pts) }) + '</div></div>';
      if (!isDone) h += D.btn(tr('doneBtn'), 'quiz-done', { icon: I.check(20, '#e2c47a', 2.2), id: 'btn-quiz-done', cls: 'btn-leather' });
    } else if (ov) h += actionNote();
    else h += D.btn(tr('quizSend'), 'quiz-submit', { id: 'btn-quiz-submit', cls: 'btn-leather' });
    return h;
  }
  D.acts['quiz-submit'] = function () {
    var pl = cur(), t = pl.card.task, answers = [];
    for (var i = 0; i < t.questions.length; i++) {
      var sel = D.$('input[name="q' + i + '"]:checked');
      if (!sel) return D.toast(tr('quizAll'));
      answers.push(+sel.value);
    }
    if (over()) return D.toast(tr('over'));
    D.st.quiz[pl.id] = { answers: answers }; D.save(); D.render();
  };
  D.acts['quiz-done'] = function () {
    var pl = cur(), t = pl.card.task, q = D.st.quiz[pl.id]; if (!q) return;
    if (over()) return D.toast(tr('over'));
    var ok = q.answers.filter(function (a, i) { return a === t.questions[i].correct; }).length;
    D.markDone(pl.id, ok * (t.pointsPerCorrect || 1), pl.card.bonus ? pl.card.bonus.max : 0, { quiz: { correct: ok, total: t.questions.length } });
    D.render();
  };

  // ---------- submit ----------
  function submitState(pl, r) {
    var sub = D.st.subs[pl.id] || {}, t = pl.card.task, max = pl.card.bonus ? pl.card.bonus.max : 0;
    
    if (sub.grade) {
      return D.pageHead(pl, '') + D.seal(52) + '<h2 class="done-h" data-testid="graded-title">' + tr('graded') + '</h2>' +
        '<div class="swap" role="img" aria-label="' + tr('gradedSwap') + '"><span class="was">+' + max + ' BONUS</span>' + I.arrow(22, '#8c6b2c', 2) + '<span class="now" data-testid="graded-points">' + D.ptsLabel(sub.grade.points) + '</span></div>' +
        '<p class="graded-p">' + tr('gradedBy', { pts: D.ptsText(sub.grade.points), max: max }) + '</p>' +
        (sub.grade.note ? '<div class="note-box"><div class="nb-l">' + tr('gradeNote') + '</div><div class="nb-t" data-testid="grade-note">' + esc(sub.grade.note) + '</div></div>' : '') +
        '<button type="button" class="btn-line" data-act="to-grid">' + I.back(18, '#6a1e22', 1.9) + tr('backToCards') + '</button>';
    }
    var first = sub.fields && sub.fields[t.fields[0].id];
    var chk = sub.checkedAt ? '<p class="chk" role="status" data-testid="grade-status">' + tr('checkedAt', { t: esc(sub.checkedAt) }) + ' · <strong>' + tr(sub.checkFail ? 'checkFail' : 'notGraded') + '</strong></p>' : '';
    return D.pageHead(pl, '') +
      '<div class="sentbox" data-testid="submit-sent">' + I.send(28, '#5a4632', 1.7) + '<span class="sb-t">' + tr('sentAt', { t: esc(D.hhmm(new Date(sub.ts || r.ts))) }) + '</span>' +
      (first ? '<span class="sb-song">' + esc(first) + '</span>' : '') + '<span class="sb-s">' + tr('sentWait') + '</span></div>' +
      '<div class="cart pending" data-testid="bonus-pending"><div class="cart-t">' + I.clock(16, '#7a5f00', 2) + ' ' + tr('bonusPts', { n: max }) + '</div><div class="cart-s">' + tr('bonusPotential') + '</div></div>' +
      D.btn(tr('checkPoints'), 'check-grade', { icon: I.refresh(20, '#e2c47a', 2), id: 'btn-check-grade', cls: 'btn-leather' }) + chk +
      '<p class="hint-i">' + tr('autoCheck', { n: D.game.tracking.positionEveryMinutes }) + '</p>';
  }
  function submitForm(pl) {
    var t = pl.card.task, dr = (D.st.drafts && D.st.drafts[pl.id]) || {};
    var fields = t.fields.map(function (f) {
      var v = esc(dr[f.id] || ''), ph = esc(f.placeholder || '');
      return '<div class="fld"><label for="f-' + f.id + '">' + esc(f.label) + '</label>' + (f.multiline
        ? '<textarea id="f-' + f.id + '" data-draft="' + f.id + '" data-testid="field-' + f.id + '" rows="9" placeholder="' + ph + '">' + v + '</textarea>'
        : '<input id="f-' + f.id + '" data-draft="' + f.id + '" data-testid="field-' + f.id + '" type="text" placeholder="' + ph + '" value="' + v + '">') + '</div>';
    }).join('');
    return '<div class="team-line"><span>' + tr('sender') + '</span><b data-testid="submit-team">' + esc(D.st.team || tr('yourTeamFallback')) + '</b></div>' + fields;
  }
  // submit active view is built here (activeView returns '' for submit to keep layout tidy)
  var baseActive = activeView;
  activeView = function (pl) {
    if (pl.card.task.type !== 'submit') return baseActive(pl);
    var h = submitForm(pl) + D.cartHtml(pl.card);
    h += over() ? actionNote() : D.btn(tr('send'), 'submit', { icon: I.send(20, '#e2c47a', 1.8), id: 'btn-submit', cls: 'btn-leather' }) + '<p class="find-msg" id="sub-msg" role="status"></p>';
    return h;
  };
  D.acts.submit = function () {
    var pl = cur(), t = pl.card.task;
    if (over()) return D.toast(tr('over'));
    var fields = {}, bad = false;
    t.fields.forEach(function (f) {
      var v = (D.$('#f-' + f.id).value || '').trim();
      if (!v) bad = true; fields[f.id] = v;
    });
    if (bad) { D.$('#sub-msg').textContent = tr('fillAll'); return; }
    var id = D.uuid();
    D.st.subs[pl.id] = { id: id, ts: D.nowMs(), fields: fields };
    if (D.st.drafts) delete D.st.drafts[pl.id];
    D.markDone(pl.id, 0, pl.card.bonus ? pl.card.bonus.max : 0, { submission: id });
    D.Track.send('submission', { card: pl.id, title: pl.card.title, submission: id, fields: fields });
    D.render();
  };
  D.acts['check-grade'] = function (el) {
    var pl = cur(), sub = D.st.subs[pl.id];
    el.disabled = true;
    D.Track.checkGrades().then(function (res) {
      sub.checkedAt = D.hhmm(); sub.checkFail = !res.ok; D.save();
      D.render();
    });
  };

  // ---------- find ----------
  D.acts.find = function (el) {
    var pl = cur(); if (over()) return D.toast(tr('over'));
    var tg = pl.p.target, msg = D.$('#find-msg');
    function ok() { D.markDone(pl.id, pl.card.points || 0, pl.card.bonus ? pl.card.bonus.max : 0); D.render(); }
    if (!tg || D.debugged(pl.id)) return ok();
    el.disabled = true; msg.textContent = tr('locatingLow');
    D.Track.getPos({ timeout: 12000, maxAge: 0 }).then(function () {
      var d = D.distTo(tg);
      if (d <= D.radiusOf(pl)) return ok();
      var dy = (tg.lat - D.pos.lat) * 111320, dx = (tg.lng - D.pos.lng) * 111320 * Math.cos(D.pos.lat * Math.PI / 180);
      var dir = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 'n' : 's') : (dx > 0 ? 'e' : 'w');
      msg.textContent = tr('moreTo', { dir: D.tv('dir4')[dir] }); msg.dataset.dir = dir; el.disabled = false;
    }).catch(function () { msg.textContent = tr('geoFail'); el.disabled = false; });
  };

  // ---------- guess (Žlutý) ----------
  D.acts['guess-start'] = function () {
    var pl = cur(), t = pl.card.task, g = D.st.guess[pl.id];
    if (!g || g.phase !== 'running') {
      if (g && g.phase === 'finished') return D.nav('#/guess/' + encodeURIComponent(pl.id));
      if (over()) return D.toast(tr('over'));
      var order = D.shuffle(t.words.map(function (w, i) { return i; }));
      D.st.guess[pl.id] = { phase: 'running', startedAt: Date.now(), order: order, idx: 0, guessed: 0, skipped: 0 };
      D.save();
    }
    D.nav('#/guess/' + encodeURIComponent(pl.id));
  };
  var guessTimer = null;
  function gTotalMs(t, g) { return (t.seconds + g.guessed * (t.bonusSecondsPerCorrect || 0)) * 1000; }
  function gRemain(t, g) { return g.startedAt + gTotalMs(t, g) - Date.now(); }
  function gFinish(pl, why) {
    var t = pl.card.task, g = D.st.guess[pl.id];
    if (g.phase === 'finished') return;
    g.phase = 'finished'; g.why = why; g.points = Math.round(g.guessed * (t.pointsPerCorrect || 1));
    D.save();
    if (!rec(pl.id)) D.markDone(pl.id, g.points, 0, { guess: { guessed: g.guessed, skipped: g.skipped } });
  }
  D.screens.guess = function (id) {
    var pl = D.place(id), g = pl && D.st.guess[id];
    if (!pl || !g) { location.hash = '#/card/' + encodeURIComponent(id || ''); return D.screens.card(id); }
    var t = pl.card.task;
    if (g.phase === 'running' && (gRemain(t, g) <= 0 || g.idx >= t.words.length)) gFinish(pl, gRemain(t, g) <= 0 ? 'time' : 'words');
    var head = '<div class="g-top"><span class="g-top-l">' + pl.n + ' · ' + esc(pl.card.title.toUpperCase()) + '</span><span class="g-top-r">' + tr('referee') + '</span>' + D.flag() + '</div>';
    if (g.phase === 'finished') {
      var r = rec(id) || {};
      var inner = D.pageHead(pl, '') + D.seal(52) + '<h2 class="done-h" data-testid="guess-end">' + tr(g.why === 'words' ? 'allWords' : 'timeUp') + '</h2>' +
        '<div class="pts-pill" data-testid="guess-points">' + D.ptsLabel(g.points) + '</div>' +
        '<p class="hint-i">' + tr('guessSummary', { g: g.guessed, s: g.skipped, p: D.ptsText(t.pointsPerCorrect) }) + '</p>' +
        '<button type="button" class="btn-line" data-act="to-grid" data-testid="btn-back-cards">' + I.back(18, '#6a1e22', 1.9) + tr('backToCards') + '</button>';
      return head + D.cover(pl, inner);
    }
    var w = t.words[g.order[g.idx]];
    var html = '<div class="guess">' + head +
      '<div class="g-timer"><span id="g-time" class="g-time" role="timer" data-testid="guess-timer">0:00</span>' +
      '<div class="g-bar"><div id="g-barin"></div></div>' +
      '<span class="g-counts" id="g-counts" data-testid="guess-counts"></span></div>' +
      D.cover(pl, '<span class="page-label">' + tr('wordOf', { i: g.idx + 1, n: t.words.length }) + '</span><span class="g-warn">' + tr('dontSay') + '</span>' +
        '<span class="g-word" data-testid="guess-word">' + esc(w.word) + '</span>' + D.divider() +
        '<span class="g-warn" style="color:#6b5640">' + tr('readAloud') + '</span><p class="g-def" data-testid="guess-def">' + esc(w.definition) + '</p>') +
      '<div class="g-btns"><button type="button" class="btn-gold big2" data-act="g-ok" data-testid="btn-guessed">' + I.check(24, '#2a1b10', 2.4) + tr('guessedBtn', { s: D.num(t.bonusSecondsPerCorrect || 0) }) + '</button>' +
      '<button type="button" class="btn-ghost" data-act="g-skip" data-testid="btn-skip">' + tr('skip') + I.arrow(20, '#e2c47a', 1.9) + '</button></div></div>';
    return {
      html: html,
      mount: function () {
        function tick() {
          var gg = D.st.guess[id], rem = gRemain(t, gg);
          if (rem <= 0) { gFinish(pl, 'time'); clearInterval(guessTimer); D.render(); return; }
          D.$('#g-time').textContent = D.fmtSecs(rem / 1000);
          D.$('#g-time').setAttribute('aria-label', tr('secsLeft', { n: Math.ceil(rem / 1000) }));
          D.$('#g-barin').style.width = Math.max(0, Math.min(100, rem / gTotalMs(t, gg) * 100)) + '%';
          D.$('#g-counts').textContent = tr('guessCounts', { g: gg.guessed, s: gg.skipped });
        }
        tick(); guessTimer = setInterval(tick, 200);
        D.cleanup.push(function () { clearInterval(guessTimer); });
      }
    };
  };
  function gNext(kind) {
    var pl = D.place(D.arg), t = pl.card.task, g = D.st.guess[pl.id];
    if (!g || g.phase !== 'running') return D.render();
    if (gRemain(t, g) <= 0) { gFinish(pl, 'time'); return D.render(); }
    if (kind === 'ok') g.guessed++; else g.skipped++;
    g.idx++;
    if (g.idx >= t.words.length) gFinish(pl, 'words');
    D.save(); D.render();
  }
  D.acts['g-ok'] = function () { gNext('ok'); };
  D.acts['g-skip'] = function () { gNext('skip'); };

  // ---------- finale ----------
  function targetText() {
    var at = cur().p.at; if (!at) return '';
    if (!D.pos) return tr('locatingTarget');
    var d = D.distTo(at), b = D.bearing(D.pos.lat, D.pos.lng, at.lat, at.lng);
    return d <= D.radiusOf(cur()) ? tr('atFinish') : D.fmtDist(d) + ' ' + D.dirAdv(b);
  }
  function finaleView(pl) {
    var k = D.st.kronika, h = '';
    if (pl.p.at) h += '<div class="target"><span>' + I.flag(20, '#2a1b10', 1.8) + '</span><b id="fin-target" data-testid="finale-target">' + esc(tr('target', { x: targetText() })) + '</b></div>';
    if (pl.p.at) h += D.btn(tr('showOnCompass'), 'fin-compass', { icon: I.compass(20, '#3b2615', 1.8), id: 'btn-fin-compass', cls: 'btn-outline' });
    var started = k && k.started;
    h += D.btn(tr(started ? 'quizCont' : (pl.p.at ? 'quizStartHere' : 'quizStart')), 'fin-start', { icon: I.pin(20, '#e2c47a', 1.9), id: 'btn-fin-start', cls: 'btn-leather' });
    h += '<p class="find-msg" id="fin-msg" role="status" data-testid="fin-msg"></p>';
    if (!over()) h += '<button type="button" class="btn-line" data-act="fin-now" data-testid="btn-fin-now">' + tr('chronicleNow') + '</button>';
    else h += '<p class="hint-i">' + tr('overGoFinish') + '</p>';
    return h;
  }
  function mountFinale(pl) {
    if (!pl.p.at) return;
    var un = D.Track.watch(function () { var el = D.$('#fin-target'); if (el) el.textContent = tr('target', { x: targetText() }); });
    D.cleanup.push(un);
    D.Track.getPos({ timeout: 8000 }).then(function () { var el = D.$('#fin-target'); if (el) el.textContent = tr('target', { x: targetText() }); }).catch(function () {
      var el = D.$('#fin-target'); if (el && !D.pos) el.textContent = tr('target', { x: tr('noLocation') });
    });
  }
  D.acts['fin-compass'] = function () { D.compassFocus = cur().id; D.nav('#/compass'); };
  D.acts['fin-start'] = function (el) {
    var pl = cur(), k = D.st.kronika, msg = D.$('#fin-msg');
    if (!pl.p.at || (k && k.started) || D.debugged(pl.id)) return D.nav('#/kronika');
    el.disabled = true; msg.textContent = tr('locatingLow');
    D.Track.getPos({ timeout: 12000, maxAge: 0 }).then(function () {
      var d = D.distTo(pl.p.at);
      if (d <= D.radiusOf(pl)) return D.nav('#/kronika');
      msg.textContent = tr('notAtFinish', { d: D.fmtDist(d), dir: D.dirAdv(D.bearing(D.pos.lat, D.pos.lng, pl.p.at.lat, pl.p.at.lng)) }); el.disabled = false;
    }).catch(function () { msg.textContent = tr('geoFail'); el.disabled = false; });
  };
  D.acts['fin-now'] = function () {
    if (!window.confirm(tr('chronicleAsk'))) return;
    D.st.over = true; D.save(); D.render();
  };
})();
