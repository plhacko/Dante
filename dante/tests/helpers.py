"""Shared helpers for the Dante test suite (Playwright, sync API)."""
import base64, functools, http.server, json, os, threading
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]          # repo root (serves /dante/...)
DANTE = ROOT / 'dante'
SHOTS = Path(os.environ.get('DANTE_SHOTS') or (DANTE / 'tests' / '_shots'))
PNG1 = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==')


# ---------------- game data (read straight from the JSON sources) ----------------
def _load(p):
    return json.loads(Path(p).read_text(encoding='utf-8'))


CARDS = {}
for _p in (DANTE / 'data' / 'cards').glob('*.json'):
    _c = _load(_p)
    CARDS[_c['id']] = _c
GAMES = {_p.stem: _load(_p) for _p in (DANTE / 'data' / 'games').glob('*.json')}


def at(game, card, key='at'):
    for p in GAMES[game]['cards']:
        if p['card'] == card:
            return p[key]['lat'], p[key]['lng']
    raise KeyError(card)


def regular(game):
    return [p['card'] for p in GAMES[game]['cards'] if CARDS[p['card']]['task']['type'] != 'finale']


def finale(game):
    return [p['card'] for p in GAMES[game]['cards'] if CARDS[p['card']]['task']['type'] == 'finale'][0]


def kronika_count(game):
    return len([c for c in regular(game) if (CARDS[c].get('kronika') or {}).get('work')])


FAR = (50.20, 14.60)          # ~ 20 km from everything in Prague


# ---------------- local static server ----------------
class _Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class _Srv(http.server.ThreadingHTTPServer):
    request_queue_size = 128          # pages fetch ~12 scripts at once; default backlog (5) refuses connections


def start_server():
    handler = functools.partial(_Quiet, directory=str(ROOT))
    srv = _Srv(('127.0.0.1', 0), handler)
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    return srv, 'http://localhost:%d' % srv.server_address[1]


# ---------------- ntfy mock ----------------
class Ntfy:
    def __init__(self):
        self.posts = []        # parsed JSON payloads sent by the app / monitor
        self.poll = []         # payload dicts served on GET ?poll=1

    def handle(self, route):
        req = route.request
        if req.method == 'POST':
            try:
                self.posts.append(json.loads(req.post_data))
            except Exception:
                self.posts.append({'_raw': req.post_data})
            return route.fulfill(status=200, body='{}', content_type='application/json',
                                 headers={'access-control-allow-origin': '*'})
        lines = [json.dumps({'id': 'i%d' % i, 'time': 1, 'event': 'message', 'topic': 't', 'message': json.dumps(m)})
                 for i, m in enumerate(self.poll)]
        route.fulfill(status=200, body='\n'.join(lines) + ('\n' if lines else ''), content_type='application/x-ndjson',
                      headers={'access-control-allow-origin': '*'})

    def events(self, name=None):
        return [p for p in self.posts if name is None or p.get('event') == name]

    def grade(self, game, card, submission, points, note=''):
        self.poll.append({'v': 1, 'game': game, 'team': 'x', 'event': 'grade', 'ts': '2026-01-01T00:00:00Z',
                          'card': card, 'submission': submission, 'points': points, 'note': note})


# ---------------- per-test harness ----------------
class H:
    """One browser context + page + ntfy mock + error collection."""

    def __init__(self, pw, browser, base, device, name, geo=None, viewport=None, mobile=True, clock=False):
        self.base, self.name, self.device = base, name, device
        self.errors, self.dialogs = [], []
        self.ntfy = Ntfy()
        kw = dict(pw.devices[device]) if mobile else {}
        if viewport:
            kw['viewport'] = viewport
        kw.update(locale='cs-CZ', timezone_id='Europe/Prague', permissions=['geolocation'])
        if geo:
            kw['geolocation'] = {'latitude': geo[0], 'longitude': geo[1], 'accuracy': 10}
        self.ctx = browser.new_context(**kw)
        self.ctx.route('https://ntfy.sh/**', self.ntfy.handle)
        self.ctx.route('**/*googleapis.com/**', lambda r: r.fulfill(status=200, body='', content_type='text/css'))
        self.ctx.route('**/*gstatic.com/**', lambda r: r.fulfill(status=200, body='', content_type='font/woff2'))
        self.ctx.route('**/*youtube*/**', lambda r: r.fulfill(status=200, body='<html></html>', content_type='text/html'))
        self.ctx.route('**/*tile.openstreetmap.org/**', lambda r: r.fulfill(status=200, body=PNG1, content_type='image/png'))
        self.page = self.ctx.new_page()
        self.page.on('console', lambda m: self.errors.append('console: ' + m.text) if m.type == 'error' else None)
        self.page.on('pageerror', lambda e: self.errors.append('pageerror: %s' % e))
        self.page.on('dialog', self._dialog)
        self.dialog_accept = True
        if clock:
            self.page.clock.install()

    def _dialog(self, d):
        self.dialogs.append(d.message)
        d.accept() if self.dialog_accept else d.dismiss()

    # --- navigation / state
    def open(self, now='19:00', hash='', extra=''):
        q = ('?now=%s' % now if now else '?x=1') + extra
        self.page.goto('%s/dante/%s%s' % (self.base, q, hash))
        self.page.wait_for_selector('[data-testid^=screen-]')

    def geo(self, ll, acc=10):
        self.ctx.set_geolocation({'latitude': ll[0], 'longitude': ll[1], 'accuracy': acc})

    def pos_wait(self, timeout=8000):
        self.page.wait_for_function('Dante.pos != null', timeout=timeout)

    def start(self, game='praha-2026', team='Testeři', now='19:00', wait_pos=True):
        self.open(now)
        self.page.click('[data-testid=game-%s]' % game)
        self.page.fill('[data-testid=team-name]', team)
        self.page.click('[data-testid=btn-start]')
        self.page.wait_for_selector('[data-testid=screen-grid]')
        if wait_pos:
            self.pos_wait()

    def go(self, hash, screen=None):
        self.page.evaluate('h => { location.hash = h }', hash)
        self.page.wait_for_selector('[data-testid=screen-%s]' % (screen or hash.strip('#/').split('/')[0]))

    def card(self, cid):
        self.go('#/card/' + cid, 'card')

    def t(self, tid):
        return self.page.locator('[data-testid="%s"]' % tid)

    def text(self, tid):
        return self.t(tid).first.inner_text()

    def click(self, tid):
        self.page.click('[data-testid="%s"]' % tid)

    def pick(self, tid):
        self.page.locator('label:has([data-testid="%s"])' % tid).click()

    def js(self, expr, arg=None):
        return self.page.evaluate(expr, arg)

    def done_all(self, game, ids=None, pts=1):
        self.js('([ids,p]) => { ids.forEach(id => Dante.markDone(id, p, 0)); Dante.render(); }', [ids or regular(game), pts])

    def unlock(self, *ids):
        self.js('ids => ids.forEach(id => Dante.unlock(id))', list(ids))

    def shot(self, label):
        SHOTS.mkdir(parents=True, exist_ok=True)
        self.page.screenshot(path=str(SHOTS / ('%s_%s.png' % (self.name, label))), full_page=True)

    def overflow(self):
        """(scrollWidth, clientWidth, offenders) for horizontal-scroll checks."""
        return self.js('''() => { const de = document.documentElement, w = de.clientWidth, bad = [];
            document.querySelectorAll('body *').forEach(e => { const r = e.getBoundingClientRect();
              if (r.width && (r.right > w + 1 || r.left < -1)) bad.push((e.className && e.className.baseVal === undefined ? e.className : e.tagName) + ':' + Math.round(r.left) + '..' + Math.round(r.right)); });
            return [de.scrollWidth, w, bad.slice(0, 5)]; }''')

    def close(self):
        try:
            self.ctx.close()
        except Exception:
            pass


def check(cond, msg='assertion failed'):
    if not cond:
        raise AssertionError(msg)


def eq(a, b, msg=''):
    if a != b:
        raise AssertionError('%s expected %r, got %r' % (msg, b, a))
