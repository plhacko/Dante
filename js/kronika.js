/* Dante – Zápis do kroniky: final quiz and end screen */
(function () {
  'use strict';
  var D = window.Dante, esc = D.esc, I = D.icon;
  var LETTERS = ['A', 'B', 'C'];

  function finalePl() { return D.places().filter(function (p) { return p.finale; })[0]; }
  function ppc() { var f = finalePl(); return (f && f.card.task.pointsPerCorrect) || 1; }

  function build() {
    var withWork = D.places().filter(function (pl) { return pl.card.kronika && pl.card.kronika.work; });
    var pool = [];
    withWork.forEach(function (pl) {
      pool.push(pl.card.kronika.work);
      (pl.card.kronika.decoys || []).forEach(function (d) { pool.push(d); });
    });
    var qs = D.shuffle(withWork.filter(function (pl) { return !pl.finale; })).map(function (pl) {
      var right = pl.card.kronika.work, seen = {}, cands = [];
      pool.forEach(function (w) { if (w !== right && !seen[w]) { seen[w] = 1; cands.push(w); } });
      var opts = D.shuffle([right].concat(D.shuffle(cands).slice(0, 2)));
      return { card: pl.id, options: opts, correct: opts.indexOf(right) };
    });
    return { started: true, qs: qs, answers: [], shown: 0, finished: false };
  }
  function correctCount(k) { return k.answers.filter(function (a, i) { return k.qs[i] && a === k.qs[i].correct; }).length; }

  D.kronikaScore = function () { var k = D.st.kronika; return k ? correctCount(k) * ppc() : 0; };

  D.screens.kronika = function () {
    if (!D.st.kronika) { D.st.kronika = build(); D.save(); }
    var k = D.st.kronika;
    if (k.finished) { location.hash = '#/end'; return D.screens.end(); }
    if (!k.qs.length) return finish();
    var i = Math.min(k.shown, k.qs.length - 1), q = k.qs[i], pl = D.place(q.card);
    var picked = k.answers[i], answered = picked != null, right = answered && picked === q.correct;
    var sc = correctCount(k) * ppc();
    var steps = k.qs.map(function (_, s) {
      var st = s < i || (s === i && answered) ? (k.answers[s] === k.qs[s].correct ? 'ok' : 'bad') : (s === i ? 'now' : 'todo');
      return '<span class="seg ' + st + '"></span>';
    }).join('');
    var L = D.LEATHER[pl.leather];
    var opts = q.options.map(function (o, oi) {
      var cls = 'kopt';
      if (answered && oi === q.correct) cls += ' ok'; else if (answered && oi === picked) cls += ' bad';
      return '<button type="button" class="' + cls + '" data-act="k-pick" data-i="' + oi + '" data-testid="kopt-' + oi + '" aria-pressed="' + (picked === oi) + '"' + (answered ? ' disabled' : '') + '>' +
        '<span class="kl">' + LETTERS[oi] + '</span><span class="kt">' + esc(o) + '</span></button>';
    }).join('');
    var fb = answered ? '<p class="kfb ' + (right ? 'ok' : 'bad') + '" role="status" data-testid="kfeedback">' + (right ? 'Správně! +' + ppc() + ' ' + D.pluralLower(ppc()) : 'Bohužel. Správně je: ' + esc(q.options[q.correct])) + '</p>' : '';
    var last = i === k.qs.length - 1;
    var html = '<div class="kq"><div class="k-top"><span class="k-top-l">ZÁPIS DO KRONIKY</span><span class="k-top-r" data-testid="kronika-progress">' + (i + 1) + ' / ' + k.qs.length + ' · ' + sc + ' ' + D.plural(sc) + '</span></div>' +
      '<div class="segs" aria-hidden="true" style="grid-template-columns:repeat(' + k.qs.length + ',minmax(0,1fr))">' + steps + '</div>' +
      '<div class="kcard" style="' + D.coverVars(pl.leather) + '"><span class="fr1"></span><span class="fr2"></span><span class="gn gn-tl">' + pl.n + '</span><span class="gn gn-br">' + pl.n + '</span>' +
      '<span class="g-oval">' + I.flower(22, '#c9a24a', 1.2) + '<span class="kc-t">' + esc(pl.card.title) + '</span></span></div>' +
      '<h1 class="k-q">Z jakého díla pochází ukázka na této kartě?</h1>' +
      '<div class="kopts" role="radiogroup" aria-label="Možnosti">' + opts + '</div>' + fb +
      (answered ? '<button type="button" class="btn-gold k-next" data-act="k-next" data-testid="btn-next">' + (last ? 'ZOBRAZIT VÝSLEDEK' : 'DALŠÍ OTÁZKA') + I.arrow(20, '#2a1b10', 2) + '</button>'
        : '<p class="hint-i k-hint">Vyberte jednu možnost. Odpověď už nejde vzít zpět.</p>') + '</div>';
    return html;
  };
  D.acts['k-pick'] = function (el) {
    var k = D.st.kronika, i = Math.min(k.shown, k.qs.length - 1);
    if (k.answers[i] != null) return;
    k.answers[i] = +el.dataset.i; D.save(); D.render();
  };
  D.acts['k-next'] = function () {
    var k = D.st.kronika;
    if (k.shown >= k.qs.length - 1) { finish(); D.nav('#/end'); return; }
    k.shown++; D.save(); D.render();
  };
  function finish() {
    var k = D.st.kronika;
    k.finished = true; D.st.over = true;
    if (!k.sent) { k.sent = true; D.Track.send('kronika_done', { correct: correctCount(k), total: k.qs.length }); }
    D.save();
    return D.screens.end();
  }

  D.screens.end = function () {
    var k = D.st.kronika || { qs: [], answers: [] }, s = D.score();
    var qp = correctCount(k) * ppc(), total = Math.round((s.points + qp) * 100) / 100;
    var rows = '<div class="row"><dt>Body ze stanovišť</dt><dd data-testid="end-points">' + D.num(s.points) + '</dd></div>' +
      '<div class="row"><dt>Kvíz · ' + correctCount(k) + ' / ' + k.qs.length + ' správně</dt><dd data-testid="end-quiz">' + D.num(qp) + '</dd></div>' +
      (s.bonus ? '<div class="row bonus"><dt>Bonus, čeká na obodování</dt><dd data-testid="end-bonus">+' + s.bonus + '</dd></div>' : '') +
      '<div class="row tot"><dt>Celkem</dt><dd data-testid="end-total">' + D.ptsLabel(total) + '</dd></div>';
    var inner = '<span class="bigD">D</span><h1 class="page-title" style="font-size:28px">Zapsáno do kroniky</h1>' +
      '<span class="page-label" data-testid="end-team">' + esc(D.st.team || '') + '</span>' + D.divider() +
      '<dl class="rows">' + rows + '</dl><p class="end-fin" data-testid="finish-text">' + esc(D.game.finishText || '') + '</p>' +
      '<p class="hint-i">A odtud jsme vyšli znovu uzřít hvězdy.</p>';
    return '<div class="endscr">' + D.cover({ leather: 'gilt', n: '' }, inner) + '<button type="button" class="linkb endback" data-act="to-grid" data-testid="btn-end-cards">Zpět na karty</button></div>';
  };
})();
