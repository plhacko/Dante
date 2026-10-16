/* Dante – render helpers: icons, card cover/page, content blocks, cartouche */
(function () {
  'use strict';
  var D = window.Dante, esc = D.esc, t = D.t;

  function svg(w, path, stroke, sw, extra) {
    return '<svg width="' + w + '" height="' + w + '" viewBox="0 0 24 24" fill="none" stroke="' + stroke + '" stroke-width="' + sw + '" ' + (extra == null ? 'stroke-linecap="round" stroke-linejoin="round"' : extra) + ' aria-hidden="true">' + path + '</svg>';
  }
  var I = D.icon = {
    flower: function (w, c, sw) { return svg(w, '<ellipse cx="12" cy="6.5" rx="2.6" ry="4.5"></ellipse><ellipse cx="12" cy="17.5" rx="2.6" ry="4.5"></ellipse><ellipse cx="6.5" cy="12" rx="4.5" ry="2.6"></ellipse><ellipse cx="17.5" cy="12" rx="4.5" ry="2.6"></ellipse><circle cx="12" cy="12" r="1.6"></circle>', c, sw || 1.2, ''); },
    check: function (w, c, sw) { return svg(w, '<path d="M5 12.5l4.5 4.5L19 7.5"></path>', c, sw || 2.2); },
    pin: function (w, c, sw) { return svg(w, '<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"></path><circle cx="12" cy="10" r="2.3"></circle>', c, sw || 1.9); },
    lock: function (w, c, sw) { return svg(w, '<rect x="5" y="11" width="14" height="9" rx="1.5"></rect><path d="M8 11V8a4 4 0 0 1 8 0v3"></path>', c, sw || 1.7); },
    clock: function (w, c, sw) { return svg(w, '<circle cx="12" cy="12" r="8.5"></circle><path d="M12 7.5V12l3 2"></path>', c, sw || 2); },
    compass: function (w, c, sw) { return svg(w, '<circle cx="12" cy="12" r="9"></circle><path d="M15.5 8.5l-2 5-5 2 2-5z"></path>', c, sw || 1.7); },
    grid: function (w, c, sw) { return svg(w, '<rect x="4" y="4" width="7" height="7"></rect><rect x="13" y="4" width="7" height="7"></rect><rect x="4" y="13" width="7" height="7"></rect><rect x="13" y="13" width="7" height="7"></rect>', c, sw || 1.7); },
    back: function (w, c, sw) { return svg(w, '<path d="M14.5 6l-6 6 6 6"></path>', c, sw || 1.8); },
    next: function (w, c, sw) { return svg(w, '<path d="M9.5 6l6 6-6 6"></path>', c, sw || 1.8); },
    arrow: function (w, c, sw) { return svg(w, '<path d="M5 12h14M13 6l6 6-6 6"></path>', c, sw || 2); },
    send: function (w, c, sw) { return svg(w, '<path d="M22 2L11 13"></path><path d="M22 2l-7 20-4-9-9-4z"></path>', c, sw || 1.8); },
    refresh: function (w, c, sw) { return svg(w, '<path d="M20 12a8 8 0 1 1-2.3-5.6"></path><path d="M20 4v5h-5"></path>', c, sw || 2); },
    flag: function (w, c, sw) { return svg(w, '<path d="M5 21V4M5 4h11l-2 4 2 4H5"></path>', c, sw || 1.8); },
    play: function (w, c, sw) { return svg(w, '<path d="M9 7.5v9l7.5-4.5z"></path>', c, sw || 1.8); },
    timer: function (w, c, sw) { return svg(w, '<circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l2.5 1.5M9.5 2.5h5"></path>', c, sw || 1.9); },
    north: function (w, c, sw) { return svg(w, '<path d="M12 20V4M6 10l6-6 6 6"></path>', c, sw || 2); },
    heading: function (w, c, sw) { return svg(w, '<path d="M12 3l7 18-7-4-7 4z"></path>', c, sw || 2); },
    diamond: function (w, c, sw) { return svg(w, '<path d="M12 3l9 9-9 9-9-9z"></path>', c, sw || 2, ''); }
  };

  D.divider = function () {
    return '<div class="divider"><span></span>' + I.diamond(10, '#8c6b2c', 2) + '<span></span></div>';
  };

  D.coverVars = function (leather) {
    var L = D.LEATHER[leather] || D.LEATHER.red, gilt = leather === 'gilt';
    return '--bg:' + L.bg + ';--sh:' + L.sh +
      ';--vig:' + (gilt ? 'rgba(94,69,25,0.55)' : 'rgba(0,0,0,0.55)') +
      ';--rule:' + (gilt ? '#3b2615' : '#c9a24a') +
      ';--rule2:' + (gilt ? 'rgba(59,38,21,0.55)' : 'rgba(201,162,74,0.5)') +
      ';--cink:' + (gilt ? '#3b2615' : '#e2c47a') +
      ';--btn:' + (gilt ? '#3b2615' : L.bg);
  };

  // cover with parchment page. opts.debug makes the bottom-right mark a debug-unlock button
  D.cover = function (pl, inner, opts) {
    opts = opts || {};
    var gilt = pl.leather === 'gilt', num;
    if (gilt) {
      var fl = I.flower(18, '#3b2615', 1.4);
      num = '<span class="fl fl-tl">' + fl + '</span>' +
        (opts.debug ? '<button type="button" class="fl fl-br num-br" data-act="debug" data-testid="debug-unlock" aria-label="' + t('debugUnlock') + '">' + fl + '</button>' : '<span class="fl fl-br">' + fl + '</span>');
    } else {
      num = '<span class="num num-tl">' + pl.n + '</span>' +
        (opts.debug ? '<button type="button" class="num num-br" data-act="debug" data-testid="debug-unlock" aria-label="' + t('debugUnlock') + '">' + pl.n + '</button>' : '<span class="num num-br">' + pl.n + '</span>');
    }
    return '<div class="cover" style="' + D.coverVars(pl.leather) + '"><span class="fr1"></span><span class="fr2"></span>' + num +
      '<div class="page">' + inner + '</div></div>';
  };
  D.pageHead = function (pl, label) {
    return I.flower(24, '#8c6b2c', 1.2) +
      (label ? '<p class="page-label">' + esc(label) + '</p>' : '') +
      '<h1 class="page-title" data-testid="card-title">' + esc(pl.card.title) + '</h1>' + D.divider();
  };

  D.blocksHtml = function (card) {
    return (card.content || []).map(function (b) {
      if (b.type === 'quote') {
        return '<blockquote class="q">' + D.mdQuote(b.text, b.dropcap) + '</blockquote>' +
          (b.source ? '<p class="q-src">— ' + esc(b.source) + '</p>' : '');
      }
      if (b.type === 'text') {
        return (b.text || '').split(/\n\s*\n/).map(function (p) { return '<p class="txt">' + D.md(p) + '</p>'; }).join('');
      }
      if (b.type === 'image') return '<img class="pic" src="' + esc(b.src) + '" alt="' + esc(b.alt || '') + '">';
      if (b.type === 'video') return '<div class="vid"><iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(b.youtube) + '" title="Video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>';
      return '';
    }).join('');
  };

  // points cartouche (port of Karta.dc.html renderVals)
  D.cartHtml = function (card) {
    var task = card.task || {}, type = task.type, bonus = card.bonus, cart = null;
    var plural = D.plural, pl = D.pluralLower;
    if (type === 'quiz') {
      var ppc = task.pointsPerCorrect || 1, max = ppc * (task.questions || []).length;
      cart = { title: t('cartQuiz', { n: ppc, pts: plural(ppc) }), sub: t('cartQuizSub', { max: max, pts: pl(max) }) };
    } else if (type === 'guess') {
      var gp = task.pointsPerCorrect || 1, words = task.words || [], secs = task.seconds || 0;
      var gmax = Math.round(gp * words.length);
      var tt = (secs < 60 ? secs + ' s' : (secs % 60 ? D.fmtSecs(secs) : D.minutesText(secs / 60))) +
        (task.bonusSecondsPerCorrect ? t('perWord', { s: D.num(task.bonusSecondsPerCorrect) }) : '');
      cart = { title: t('cartGuess', { n: D.num(gp), pts: plural(gp) }), sub: t('upTo', { max: gmax, pts: pl(gmax) }) + ' · ' + tt + (Number.isInteger(gp) ? '' : t('rounded')) };
    } else if (task.choices && task.choices.length) {
      cart = { title: task.choices.join(' / ') + ' ' + plural(task.choices[task.choices.length - 1]), sub: t('cartChoices') };
    } else if (task.counter) {
      cart = { title: t('cartUpTo', { max: task.counter.max, pts: plural(task.counter.max) }), sub: task.counter.hint || '' };
    } else if (card.points) {
      cart = { title: card.points + ' ' + plural(card.points), sub: bonus ? t('cartBonus', { max: bonus.max, desc: bonus.description }) : (type === 'find' ? t('cartFind') : '') };
    } else if (bonus) {
      cart = { title: t('cartUpTo', { max: bonus.max, pts: plural(bonus.max) }), sub: bonus.description };
    }
    if (!cart) return '';
    return '<div class="cart" data-testid="cartouche"><div class="cart-t">' + esc(cart.title) + '</div>' +
      (cart.sub ? '<div class="cart-s">' + esc(cart.sub) + '</div>' : '') + '</div>';
  };

  D.btn = function (label, act, opts) {
    opts = opts || {};
    return '<button type="button" class="btn ' + (opts.cls || '') + '" data-act="' + act + '"' + (opts.id ? ' data-testid="' + opts.id + '"' : '') + (opts.attrs || '') + '>' + (opts.icon || '') + label + '</button>';
  };

  D.toast = function (msg) {
    var el = D.$('#toast'); if (!el) return;
    el.textContent = msg; el.classList.add('show');
    clearTimeout(D._toastT); D._toastT = setTimeout(function () { el.classList.remove('show'); }, 3200);
  };
  D.seal = function (sz) {
    return '<span class="seal" aria-hidden="true" style="width:' + sz + 'px;height:' + sz + 'px">' + I.check(Math.round(sz * 0.5), '#f1e6c8', 2.4) + '</span>';
  };
})();
