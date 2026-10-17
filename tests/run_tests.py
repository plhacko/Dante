"""Dante test suite. Run:  python run_tests.py [filter ...]   (see README.md)"""
import datetime, json, re, sys, time, traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from helpers import *            # noqa: E402,F401
from playwright.sync_api import sync_playwright   # noqa: E402

IPHONE, PIXEL = 'iPhone 13', 'Pixel 7'
BOTH = (IPHONE, PIXEL)
P, M = 'praha-2026', 'mnichov-2026'
REG = []


def scenario(group, name, devices=(IPHONE,), geo=None, clock=False, **kw):
    def deco(fn):
        REG.append(dict(group=group, name=name, fn=fn, devices=devices, geo=geo, clock=clock, kw=kw))
        return fn
    return deco


def bodu(n):
    return '%d %s' % (n, 'BOD' if n == 1 else ('BODY' if 2 <= n <= 4 else 'BODŮ'))


def near(game, card):
    return at(game, card)


# ============================================================ 1-2 picker / team name
@scenario('1-2 picker+name', 'picker lists games', BOTH)
def t_picker(h):
    h.open()
    eq(h.text('game-' + P).count('Mládež 2026'), 1)
    check('Praha' in h.text('game-' + P) and '%d stanovišť' % len(regular(P)) in h.text('game-' + P), h.text('game-' + P))
    check('YMCA Prameny 2026 - Mnichov' in h.text('game-' + M), h.text('game-' + M))
    check('Mnichov' in h.text('game-' + M))
    ids = h.js('Array.from(document.querySelectorAll("[data-testid^=game-]")).map(e => e.dataset.testid)')
    eq(ids, ['game-' + P, 'game-' + M], 'order')
    h.shot('picker')
    h.click('game-' + M)
    h.page.wait_for_selector('[data-testid=screen-name]')
    h.shot('name')


@scenario('1-2 picker+name', 'team name: empty blocked, saved, continue / new game', BOTH)
def t_name(h):
    h.open()
    h.click('game-' + P)
    h.click('btn-start')                       # empty name
    check(h.t('screen-name').count() == 1 and h.text('screen-name') != '', 'still on name screen')
    check('název' in h.page.inner_text('#nm-err').lower(), 'error message')
    h.page.fill('[data-testid=team-name]', 'Zlatí Orli')
    h.click('btn-start')
    h.page.wait_for_selector('[data-testid=screen-grid]')
    eq(h.js('Dante.st.team'), 'Zlatí Orli')
    h.page.reload()
    h.page.wait_for_selector('[data-testid=screen-grid]')           # resumes
    h.click('btn-grid') if h.t('btn-grid').count() else None
    h.js('Dante.nav("#/name/%s")' % P)
    h.page.wait_for_selector('[data-testid=screen-name]')
    eq(h.t('team-name').input_value(), 'Zlatí Orli')
    check(h.t('btn-continue').count() == 1 and h.t('btn-newgame').count() == 1, 'continue/new buttons')
    check('POKRAČOVAT' in h.text('btn-continue').upper() and 'NOVÁ HRA' in h.text('btn-newgame').upper())
    h.done_all(P, ids=[regular(P)[0]])
    h.go('#/name/' + P, 'name')
    h.dialog_accept = False
    h.click('btn-newgame')                                           # dismissed -> nothing wiped
    check(len(h.js('Object.keys(Dante.st.done)')) == 1, 'cancelled confirm keeps progress')
    h.dialog_accept = True
    h.click('btn-newgame')
    check(any('znovu' in d for d in h.dialogs), 'confirm dialog shown')
    check(h.js('Dante.st.started') is False and len(h.js('Object.keys(Dante.st.done)')) == 0, 'wiped')
    check(h.t('btn-start').count() == 1, 'start button again')
    h.click('btn-continue') if h.t('btn-continue').count() else None
    h.click('btn-start')
    h.page.wait_for_selector('[data-testid=screen-grid]')


# ============================================================ 3 grid
@scenario('3 grid', 'grid states, progress, score, finale visibility', BOTH, geo=near(P, 'chvilka-filosofie'))
def t_grid(h):
    h.start(P)
    st = lambda c: h.t('card-' + c).get_attribute('data-status')
    eq(h.page.locator('.gcard').count(), 10, 'tiles at 19:00')
    eq(h.t('card-zapis-do-kroniky').count(), 0, 'finale hidden')
    eq(st('chvilka-filosofie'), 'near')
    eq(st('ve-zdravem-tele'), 'timelocked')
    check('20:00' in h.text('card-ve-zdravem-tele'), 'time chip')
    eq(st('byt-ci-nebyt'), 'locked')
    eq(h.t('progress').count(), 0, 'no progress counter in the header')
    eq(h.page.locator('.gcard[data-status=done]').count(), 0)
    check('0' in h.text('score-points') and h.text('score-bonus').startswith('+'), 'score row')
    # open with distance + done seal
    h.unlock('maugli')
    h.done_all(P, ids=['rubicon'], pts=8)
    h.js('Dante.refresh()')
    eq(st('maugli'), 'open')
    check(any(u in h.text('card-maugli') for u in (' m', ' km')), 'distance on open card: ' + h.text('card-maugli'))
    eq(st('rubicon'), 'done')
    eq(h.t('card-rubicon').locator('.seal-b').count(), 1, 'seal')
    eq(h.page.locator('.gcard[data-status=done]').count(), 1)
    check('8' in h.text('score-points'))
    h.shot('grid')
    # finale at 21:00
    h.open(now='21:05')
    eq(h.page.locator('.gcard').count(), 11)
    eq(h.t('card-zapis-do-kroniky').get_attribute('data-status'), 'open')
    h.shot('grid-finale')


@scenario('3 grid', 'mnichov grid: locked until reached, near at Mauglí', (IPHONE,), geo=near(M, 'maugli'))
def t_grid_m(h):
    h.start(M, now='12:00')
    st = lambda c: h.t('card-' + c).get_attribute('data-status')
    eq(h.page.locator('.gcard').count(), len(regular(M)))
    eq(st('maugli'), 'near')
    eq(st('byt-ci-nebyt'), 'locked')
    h.shot('grid-mnichov')


# ============================================================ 4 unlock
@scenario('4 unlock', 'GPS unlock, far, persists after leaving, debug', BOTH, geo=FAR)
def t_unlock(h):
    h.start(P)
    h.card('byt-ci-nebyt')
    check(h.t('locked-view').count() == 1, 'locked view')
    check('dělí' in h.text('locked-view'), h.text('locked-view'))
    h.shot('card-locked')
    h.click('btn-check-here')
    h.page.wait_for_function('document.querySelector("#toast").textContent.includes("Zatím nejste")')
    check(h.t('locked-view').count() == 1, 'still locked')
    h.geo(at(P, 'byt-ci-nebyt'))
    h.page.wait_for_selector('[data-testid=btn-check-here]:not([disabled])')
    h.click('btn-check-here')
    h.page.wait_for_selector('[data-testid=btn-confirm]')
    check('byt-ci-nebyt' in h.js('Dante.st.unlocked'))
    h.geo(FAR)
    h.js('Dante.nav("#/grid")'); h.page.wait_for_selector('[data-testid=screen-grid]')
    h.click('btn-check-pos')
    h.page.wait_for_function('Dante.distTo(Dante.place("byt-ci-nebyt").p.at) > 5000')
    h.page.wait_for_function('document.querySelector("[data-testid=card-byt-ci-nebyt]").dataset.status === "open"')
    h.card('byt-ci-nebyt')
    check(h.t('btn-confirm').count() == 1, 'stays unlocked after leaving')
    # debug corner unlock (also bypasses time lock)
    h.card('maugli')
    h.click('debug-unlock')
    h.page.wait_for_selector('[data-testid=btn-confirm]')
    check(any('DEBUG' in d for d in h.dialogs))
    check('maugli' in h.js('Dante.st.geoSkipped'))
    h.js('Dante.nav("#/grid")')
    h.page.wait_for_selector('.dbg-b')


@scenario('4 unlock', 'time lock V: blocked before 20:00, opens after', BOTH, geo=near(P, 've-zdravem-tele'))
def t_timelock(h):
    h.start(P, now='19:30')
    h.card('ve-zdravem-tele')
    check('20:00' in h.text('locked-view'), h.text('locked-view'))
    check(h.t('btn-confirm').count() == 0, 'no confirm button')
    h.shot('card-timelocked')
    h.open(now='20:00')
    h.pos_wait()
    h.page.wait_for_function('document.querySelector("[data-testid=card-ve-zdravem-tele]").dataset.status === "near"')
    h.card('ve-zdravem-tele')
    check(h.t('btn-confirm').count() == 1, 'confirm available at 20:00')


# ============================================================ 5-6 confirm / choices / counter
@scenario('5-6 confirm', 'confirm card, bonus pending, undo', BOTH, geo=near(P, 'chvilka-filosofie'))
def t_confirm(h):
    h.start(P)
    c = CARDS['chvilka-filosofie']
    h.card('chvilka-filosofie')
    h.shot('card-confirm')
    h.click('btn-confirm')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), bodu(c['points']))
    if c.get('bonus'):
        check('+%d' % c['bonus']['max'] in h.text('bonus-line'), h.text('bonus-line'))
    h.shot('card-confirm-done')
    ev = h.ntfy.events('card_done')
    h.page.wait_for_timeout(200)
    ev = h.ntfy.events('card_done')
    check(len(ev) == 1 and ev[0]['card'] == 'chvilka-filosofie' and ev[0]['points'] == c['points'], ev)
    h.js('Dante.nav("#/grid")')
    h.page.wait_for_selector('[data-testid=screen-grid]')
    check(str(c['points']) in h.text('score-points'))
    if c.get('bonus'):
        eq(h.text('score-bonus'), '+%d' % c['bonus']['max'] + (' BONUS' if 'BONUS' in h.text('score-bonus') else ''))
    h.card('chvilka-filosofie')
    h.click('btn-undo')
    h.page.wait_for_selector('[data-testid=btn-confirm]')
    check(h.js('Object.keys(Dante.st.done).length') == 0)
    h.page.wait_for_timeout(200)
    eq(len(h.ntfy.events('card_undone')), 1)


@scenario('5-6 confirm', 'choices (Praha V) and counter (Mnichov Velmi dobré)', (IPHONE,), geo=near(P, 've-zdravem-tele'))
def t_choices(h):
    h.start(P, now='20:05')
    h.card('ve-zdravem-tele')
    h.click('btn-confirm')                              # nothing chosen
    h.page.wait_for_function('document.querySelector("#toast").textContent.includes("vyberte")')
    eq(h.t('done-title').count(), 0)
    for v in CARDS['ve-zdravem-tele']['task']['choices']:
        h.pick('choice-%d' % v)
    h.pick('choice-10')
    h.shot('card-choices')
    h.click('btn-confirm')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), '10 BODŮ')
    # counter (Mnichov ends at 15:50, so play it at noon)
    h.open(now='12:00')
    h.js('Dante.nav("#/")'); h.page.wait_for_selector('[data-testid=screen-picker]')
    h.click('game-' + M)
    h.page.fill('[data-testid=team-name]', 'Mnichované')
    h.click('btn-start'); h.page.wait_for_selector('[data-testid=screen-grid]')
    h.unlock('velmi-dobre')
    h.card('velmi-dobre')
    cn = CARDS['velmi-dobre']['task']['counter']
    for _ in range(3):
        h.click('cnt-inc')
    eq(int(h.t('counter').input_value()), min(cn['max'], cn.get('min', 0) + 3))
    h.click('cnt-dec')
    want = int(h.t('counter').input_value())
    for _ in range(cn['max'] + 3):
        h.click('cnt-inc')
    eq(int(h.t('counter').input_value()), cn['max'], 'clamped to max')
    h.click('cnt-dec'); h.click('cnt-dec')
    want = int(h.t('counter').input_value())
    h.shot('card-counter')
    h.click('btn-confirm')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), '%d %s' % (want, h.js('Dante.plural(%d)' % want)))


# ============================================================ 7 quiz
@scenario('7 quiz', 'quiz VII: answers, explanations, 2 per correct', (IPHONE,), geo=near(P, 'u-rek-babylonskych'))
def t_quiz(h):
    h.start(P)
    h.card('u-rek-babylonskych')
    t = CARDS['u-rek-babylonskych']['task']
    qs = t['questions']
    h.click('btn-quiz-submit')
    h.page.wait_for_function('document.querySelector("#toast").textContent.includes("Odpovězte")')
    for qi, q in enumerate(qs):
        want = q['correct'] if qi != 0 else (q['correct'] + 1) % len(q['options'])
        h.pick('q%d-o%d' % (qi, want))
    h.shot('card-quiz')
    h.click('btn-quiz-submit')
    h.page.wait_for_selector('[data-testid=quiz-result]')
    ok = len(qs) - 1
    check('%d / %d' % (ok, len(qs)) in h.text('quiz-result'), h.text('quiz-result'))
    check('%d' % (ok * t['pointsPerCorrect']) in h.text('quiz-result'))
    eq(h.page.locator('.opt.right').count(), len(qs), 'right marked')
    eq(h.page.locator('.opt.wrong').count(), 1, 'wrong marked')
    eq(h.page.locator('[data-testid^=explain-]').count(), len([q for q in qs if q.get('explain')]))
    h.shot('card-quiz-result')
    h.click('btn-quiz-done')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), bodu(ok * t['pointsPerCorrect']))


@scenario('7 quiz', 'shuffled quiz (Mnichov Prosté, Watsone): own order kept on reload, scored by option', (IPHONE,))
def t_quiz_shuffle(h):
    cid = 'proste-watsone'
    t = CARDS[cid]['task']
    qs = t['questions']
    check(t.get('shuffle'), 'card is shuffled')
    h.start(M, now='12:00', wait_pos=False)
    h.unlock(cid)
    h.card(cid)
    def dom_order():
        return [h.page.locator('fieldset.opts').nth(qi).locator('input').evaluate_all('els => els.map(e => +e.value)')
                for qi in range(len(qs))]
    first = dom_order()
    for qi, q in enumerate(qs):
        eq(sorted(first[qi]), list(range(len(q['options']))), 'q%d is a permutation' % qi)
    eq(first, h.js('Dante.st.quizOrder["%s"]' % cid), 'order stored in state')
    h.page.reload(); h.page.wait_for_selector('[data-testid=screen-card]')
    eq(dom_order(), first, 'same order after reload')
    for qi, q in enumerate(qs):
        want = q['correct'] if qi == 0 else (q['correct'] + 1) % len(q['options'])
        h.pick('q%d-o%d' % (qi, want))
    h.shot('card-quiz-shuffle')
    h.click('btn-quiz-submit')
    h.page.wait_for_selector('[data-testid=quiz-result]')
    ok = 1
    check('%d / %d' % (ok, len(qs)) in h.text('quiz-result'), h.text('quiz-result'))
    eq(h.page.locator('.opt.right').count(), len(qs), 'right marked')
    eq(h.page.locator('[data-testid^=explain-]').count(), len(qs))
    h.click('btn-quiz-done')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), bodu(ok * t['pointsPerCorrect']))


# ============================================================ 8 submit / grade
@scenario('8 submit', 'submit IX: posts submission, waiting screen, grade replaces bonus', (IPHONE,), geo=near(P, 'pis-barde-skladej'))
def t_submit(h):
    h.start(P)
    c = CARDS['pis-barde-skladej']
    fields = c['task']['fields']
    h.card('pis-barde-skladej')
    eq(h.text('submit-team'), 'Testeři')
    h.click('btn-submit')
    check('Vyplňte' in h.page.inner_text('#sub-msg'), 'empty form blocked')
    h.shot('card-submit-form')
    for f in fields:
        h.page.fill('[data-testid=field-%s]' % f['id'], 'Hodnota %s\nřádek 2' % f['id'] if f.get('multiline') else 'Píseň č. 1')
    h.click('btn-submit')
    h.page.wait_for_selector('[data-testid=submit-sent]')
    h.page.wait_for_timeout(200)
    sub = h.ntfy.events('submission')
    eq(len(sub), 1)
    s = sub[0]
    check(s['card'] == 'pis-barde-skladej' and s['team'] == 'Testeři' and s['submission'] and set(s['fields']) == {f['id'] for f in fields}, s)
    mx = c['bonus']['max']
    check('+%d' % mx in h.text('bonus-pending'), h.text('bonus-pending'))
    h.shot('card-submit-waiting')
    # no grade yet (and an unrelated grade must be ignored)
    h.ntfy.grade(P, 'pis-barde-skladej', 'wrong-id', 9, 'cizí')
    h.click('btn-check-grade')
    h.page.wait_for_selector('[data-testid=grade-status]')
    check('neohodnoceno' in h.text('grade-status'), h.text('grade-status'))
    h.js('Dante.nav("#/grid")'); h.page.wait_for_selector('[data-testid=screen-grid]')
    eq(h.text('score-bonus'), '+%d' % mx + (' BONUS' if 'BONUS' in h.text('score-bonus') else ''))
    # real grade
    h.ntfy.grade(P, 'pis-barde-skladej', s['submission'], 8, 'Pěkná píseň')
    h.card('pis-barde-skladej')
    h.click('btn-check-grade')
    h.page.wait_for_selector('[data-testid=graded-title]')
    check('8' in h.text('graded-points'), h.text('graded-points'))
    check('Pěkná píseň' in h.text('grade-note'))
    h.shot('card-submit-graded')
    h.js('Dante.nav("#/grid")'); h.page.wait_for_selector('[data-testid=screen-grid]')
    check(h.text('score-points').startswith('8'), h.text('score-points'))
    check(h.text('score-bonus').startswith('+0'), h.text('score-bonus'))


# ============================================================ 9 find
@scenario('9 find', 'find III: direction hints, success at target', (IPHONE,), geo=near(P, 'cisarsky-poklad'))
def t_find(h):
    h.start(P)
    tg = at(P, 'cisarsky-poklad', 'target')
    h.card('cisarsky-poklad')
    h.shot('card-find')
    cases = [((tg[0] - 0.01, tg[1]), 'sever'), ((tg[0] + 0.01, tg[1]), 'jih'),
             ((tg[0], tg[1] - 0.02), 'východ'), ((tg[0], tg[1] + 0.02), 'západ')]
    for ll, word in cases:
        h.geo(ll)
        h.page.wait_for_selector('[data-testid=btn-find]:not([disabled])')
        h.click('btn-find')
        h.page.wait_for_function('document.querySelector("[data-testid=find-msg]").textContent.includes("Víc na")')
        check('Víc na %s!' % word in h.text('find-msg'), '%s: %s' % (word, h.text('find-msg')))
        h.page.wait_for_selector('[data-testid=btn-find]:not([disabled])')
        h.js('document.querySelector("#find-msg").textContent = ""')
    h.geo(tg)
    h.click('btn-find')
    h.page.wait_for_selector('[data-testid=done-title]')
    eq(h.text('done-points'), bodu(CARDS['cisarsky-poklad']['points']))


# ============================================================ 10 guess
@scenario('10 guess', 'Žlutý: timer, +4,2 s, skip, finish, no restart', (IPHONE,))
def t_guess(h):
    h.start(M, now='12:00', wait_pos=False)
    t = CARDS['zluty']['task']
    h.unlock('zluty')
    h.card('zluty')
    check('0:42' in h.text('btn-guess-start'), h.text('btn-guess-start'))
    check('rozhodčí' in h.page.inner_text('[data-testid=screen-card]'))
    h.shot('card-guess-start')
    h.click('btn-guess-start')
    h.page.wait_for_selector('[data-testid=guess-timer]')
    h.page.wait_for_timeout(300)
    check(h.text('guess-timer') in ('0:42', '0:41'), h.text('guess-timer'))
    first = h.text('guess-word')
    check(first and h.text('guess-def'))
    h.shot('guess-referee')
    seen = {first}
    for i in range(6):
        h.click('btn-guessed')
        h.page.wait_for_function('Dante.st.guess.zluty.guessed === %d' % (i + 1))
        seen.add(h.text('guess-word'))
    h.click('btn-skip')
    h.page.wait_for_function('Dante.st.guess.zluty.skipped === 1')
    check('UHODNUTO 6 · PŘESKOČENO 1' in h.text('guess-counts').upper(), h.text('guess-counts'))
    m, s = h.text('guess-timer').split(':')
    check(abs(int(m) * 60 + int(s) - (42 + 6 * 4.2)) <= 4, 'timer extended: ' + h.text('guess-timer'))
    check(len(seen) == 7, 'words distinct (shuffled order, no repeats)')
    # time runs out
    h.js('Dante.st.guess.zluty.startedAt -= 200000')
    h.page.wait_for_selector('[data-testid=guess-end]', timeout=5000)
    eq(h.text('guess-points'), bodu(round(6 * t['pointsPerCorrect'])))
    h.shot('guess-end')
    h.click('btn-back-cards')
    h.page.wait_for_selector('[data-testid=screen-grid]')
    eq(h.t('card-zluty').get_attribute('data-status'), 'done')
    h.card('zluty')
    eq(h.t('btn-guess-start').count(), 0, 'cannot restart')
    h.js('location.hash = "#/guess/zluty"')
    h.page.wait_for_selector('[data-testid=guess-end]')
    eq(h.t('btn-guessed').count(), 0)
    h.page.reload(); h.page.wait_for_selector('[data-testid^=screen-]')
    h.js('location.hash = "#/guess/zluty"')
    h.page.wait_for_selector('[data-testid=guess-end]')
    check(h.js('Dante.st.done.zluty.points') == round(6 * t['pointsPerCorrect']))


# ============================================================ 11 finale + kronika
def kronika_flow(h, game, wrong_from, finale_geo=None):
    """Runs the whole kronika; the first `wrong_from` answers are right, the rest wrong."""
    fin = finale(game)
    n = kronika_count(game)
    h.click('btn-fin-start')
    h.page.wait_for_selector('[data-testid=screen-kronika]')
    qs = h.js('Dante.st.kronika.qs.map(q => ({ card: q.card, correct: q.correct, options: Dante.kronikaOptions(q) }))')
    eq(len(qs), n, 'question count')
    seen = set()
    for q in qs:
        check(len(q['options']) == 3 and len(set(q['options'])) == 3, 'three distinct options %s' % q['options'])
        work = CARDS[q['card']]['kronika']['work']
        check(q['options'][q['correct']] == work, 'correct option is the card work')
        check(sum(1 for o in q['options'] if o == work) == 1, 'work appears exactly once')
        seen.add(q['card'])
    eq(len(seen), n, 'one question per card')
    for i, q in enumerate(qs):
        eq(h.text('kronika-progress').split('·')[0].strip(), '%d / %d' % (i + 1, n))
        if i == 3:
            h.page.reload(); h.page.wait_for_selector('[data-testid=screen-kronika]')   # persists
            eq(h.text('kronika-progress').split('·')[0].strip(), '%d / %d' % (i + 1, n), 'reload keeps position')
            if i == 3: h.shot('kronika-quiz')
        title = CARDS[q['card']]['title']
        eq(h.t('kcard-title').count(), 0, 'card title hidden before answering')
        check(title not in h.page.inner_text('[data-testid=screen-kronika]'), 'title not on screen: ' + title)
        right = i < wrong_from
        pick = q['correct'] if right else (q['correct'] + 1) % 3
        h.click('kopt-%d' % pick)
        h.page.wait_for_selector('[data-testid=kfeedback]')
        eq(h.text('kcard-title'), title, 'title revealed after answering')
        fb = h.text('kfeedback')
        check(fb.startswith('Správně') == right, fb)
        check(h.t('kopt-0').is_disabled(), 'locked after answering')
        if i == 0:
            h.shot('kronika-answered')
        h.click('btn-next')
        if i < n - 1:
            h.page.wait_for_selector('[data-testid=kopt-0]')
    h.page.wait_for_selector('[data-testid=screen-end]')
    return qs


@scenario('11 finale+kronika', 'finale hidden before 21:00, then all-done / 21:00 / zapsat se hned', BOTH, geo=FAR)
def t_finale(h):
    fin = finale(P)
    h.start(P, now='19:30')
    eq(h.t('card-' + fin).count(), 0, 'hidden')
    h.done_all(P)
    h.js('Dante.render()')
    h.page.wait_for_selector('[data-testid=card-%s]' % fin)         # visible once all others are done
    h.card(fin)
    check('CÍL' in h.text('finale-target'), h.text('finale-target'))
    h.shot('card-finale')
    h.click('btn-fin-start')
    h.page.wait_for_function('document.querySelector("[data-testid=fin-msg]").textContent.includes("Ještě nejste")')
    check(h.t('screen-kronika').count() == 0)
    h.click('btn-fin-now')                       # confirm accepted
    check(any('Zapsat se' in d for d in h.dialogs))
    eq(h.js('Dante.st.over'), True)
    h.go('#/grid')
    h.page.wait_for_selector('[data-testid=over-note]')
    # other (not done) cards: n/a, everything is done; a fresh game at 21:00
    h2 = h
    h2.js('localStorage.clear()')
    h2.open(now='21:00')
    h2.js('Dante.nav("#/")'); h2.page.wait_for_selector('[data-testid=screen-picker]')
    h2.click('game-' + P)
    h2.page.fill('[data-testid=team-name]', 'Pozdní')
    h2.click('btn-start'); h2.page.wait_for_selector('[data-testid=screen-grid]')
    h2.page.wait_for_selector('[data-testid=card-%s]' % fin)


@scenario('11 finale+kronika', 'kronika quiz Praha: distinct options, persisted, end screen', BOTH, geo=FAR)
def t_kronika_p(h):
    fin = finale(P)
    h.start(P, now='21:05', team='Kronikáři')
    h.done_all(P, pts=1)
    h.card(fin)
    h.geo(at(P, fin))
    h.page.wait_for_function('Dante.distTo(Dante.place("%s").p.at) < 50' % fin)
    qs = kronika_flow(h, P, 5)
    n = len(qs)
    eq(h.text('end-team'), 'Kronikáři')
    eq(h.text('end-points'), str(len(regular(P))))
    eq(h.text('end-quiz'), '5')
    check(h.text('end-total').startswith(str(len(regular(P)) + 5)), h.text('end-total'))
    check(h.text('finish-text'), 'finish text')
    h.shot('end')
    h.page.wait_for_timeout(200)
    ev = h.ntfy.events('kronika_done')
    check(len(ev) == 1 and ev[0]['correct'] == 5 and ev[0]['total'] == n, ev)
    h.page.reload(); h.page.wait_for_selector('[data-testid=screen-end]')
    eq(h.text('end-quiz'), '5')


@scenario('11 finale+kronika', 'kronika quiz Mnichov (at the finale spot), all correct', (IPHONE,), geo=near(M, 'zapis-do-kroniky'))
def t_kronika_m(h):
    fin = finale(M)
    h.start(M, now='14:50', team='Mnichované')
    h.done_all(M)
    h.card(fin)
    qs = kronika_flow(h, M, 99)
    eq(len(qs), kronika_count(M))
    eq(h.text('end-quiz'), str(len(qs)))


# ============================================================ 12 compass
CENTER = (50.055, 14.42)


@scenario('12 compass', 'markers, chips, zoom, heading mode, status', (IPHONE,), geo=CENTER)
def t_compass(h):
    h.start(P)
    h.js('Dante.nav("#/compass")')
    h.page.wait_for_selector('[data-testid=radar]')
    h.page.wait_for_selector('[data-testid^=marker-]')
    n_at = len([p for p in GAMES[P]['cards'] if 'at' in p and p['card'] != finale(P)])
    eq(h.page.locator('[data-testid^=marker-]').count(), n_at)
    h.shot('compass-north')
    ch = h.t('chip-rubicon')
    eq(ch.get_attribute('aria-pressed'), 'true')
    ch.click()
    eq(h.page.locator('[data-testid^=marker-]').count(), n_at - 1)
    eq(h.t('marker-rubicon').count(), 0)
    h.click('chip-rubicon')
    eq(h.page.locator('[data-testid^=marker-]').count(), n_at)
    z0 = h.text('zoom-label')
    check(z0.startswith('OKRUH'), z0)
    h.click('zoom-out')
    z1 = h.text('zoom-label')
    check(z1 != z0, 'zoom out changes label')
    h.click('zoom-in'); h.click('zoom-in')
    check(h.text('zoom-label') != z1)
    # live status line / watchPosition
    check('POLOHA SE AKTUALIZUJE SAMA' in h.text('compass-status').upper(), h.text('compass-status'))
    before = h.text('marker-chvilka-filosofie')
    h.geo((50.0432, 14.412))
    h.page.wait_for_function('document.querySelector("[data-testid=marker-chvilka-filosofie]").textContent !== %s' % json.dumps(before), timeout=8000)
    # heading mode
    h.click('mode-heading')
    check(h.t('mode-heading').get_attribute('aria-pressed') == 'true')
    h.page.wait_for_timeout(400)          # requestPermission() promise (Chromium exposes it for iOS UAs) must settle first
    h.js('''() => { const e = new Event('deviceorientationabsolute'); e.alpha = 315; e.absolute = true; window.dispatchEvent(e); }''')
    check('severovýchod' in h.text('compass-readout') and '45' in h.text('compass-readout'), h.text('compass-readout'))
    check(h.js('document.querySelector("#radar").style.getPropertyValue("--rot")') == '-45deg')
    h.shot('compass-heading')
    # 45 -> 359 must go the short way round (never through the 60..300 range)
    seen = []
    for _ in range(40):
        seen.append(h.js('''() => { const e = new Event('deviceorientationabsolute'); e.alpha = 1; e.absolute = true; window.dispatchEvent(e); return Dante.compass.heading; }'''))
    check(not any(60 < x < 300 for x in seen), 'wrap-around smoothing: %s' % [round(x) for x in seen[:12]])
    check(seen[-1] > 350 or seen[-1] < 10, seen[-1])
    h.click('mode-north')
    check(h.js('document.querySelector("#radar").style.getPropertyValue("--rot")') in ('0deg', '0'))
    eq(h.text('compass-readout'), 'Sever je nahoře')
    # leaving the screen stops the watch
    h.js('Dante.nav("#/grid")'); h.page.wait_for_selector('[data-testid=screen-grid]')


@scenario('12 compass', 'no heading sensor -> message, stays north-up', (IPHONE,), geo=CENTER)
def t_compass_nosensor(h):
    h.start(P)
    h.js('Dante.nav("#/compass")'); h.page.wait_for_selector('[data-testid=radar]')
    h.click('mode-heading')
    h.page.wait_for_function('document.querySelector("[data-testid=compass-readout]").textContent.includes("Sever zůstává nahoře")', timeout=6000)   # 'nedává údaj' (no sensor) or 'nebyl povolen' (Chromium rejects requestPermission)
    eq(h.t('mode-north').get_attribute('aria-pressed'), 'true')


# ============================================================ 13 tracking
@scenario('13 tracking', 'position on start + after 5 min, card_done, payload shape', (IPHONE,), geo=near(P, 'chvilka-filosofie'), clock=True)
def t_tracking(h):
    h.start(P, team='Stopaři')
    h.page.wait_for_function('1', timeout=1000)
    for _ in range(40):
        if h.ntfy.events('position'): break
        h.page.wait_for_timeout(100)
    eq(len(h.ntfy.events('position')), 1, 'first position at start')
    h.page.clock.fast_forward('05:10')
    for _ in range(60):
        if len(h.ntfy.events('position')) >= 2: break
        h.page.wait_for_timeout(100)
    eq(len(h.ntfy.events('position')), 2, 'second position after 5 min')
    h.card('chvilka-filosofie'); h.click('btn-confirm')
    h.page.wait_for_selector('[data-testid=done-title]')
    h.page.wait_for_timeout(300)
    check(len(h.ntfy.events('card_done')) == 1)
    for p in h.ntfy.posts:
        for k in ('v', 'game', 'team', 'event', 'ts'):
            check(k in p, 'missing %s in %s' % (k, p))
        eq(p['v'], 1); eq(p['game'], P); eq(p['team'], 'Stopaři')
        check(p['ts'].endswith('Z') or '+' in p['ts'], p['ts'])
    pos = h.ntfy.events('position')[0]
    check(abs(pos['lat'] - 50.04318) < 1e-4 and 'lng' in pos, pos)


@scenario('13 tracking', '?now / ?pingSec are ignored on foreign hosts', (IPHONE,))
def t_testmode(h):
    root = str(ROOT)
    def serve(route):
        rel = route.request.url.split('dante.test/', 1)[1].split('?')[0].split('#')[0]
        f = Path(root) / rel
        if f.is_dir(): f = f / 'index.html'
        if f.is_file(): route.fulfill(path=str(f))
        else: route.fulfill(status=404, body='')
    h.ctx.route('http://dante.test/**', serve)
    h.page.goto('http://dante.test/?now=03:33&pingSec=1')
    h.page.wait_for_selector('[data-testid^=screen-]')
    eq(h.js('Dante.testMode'), False)
    check(abs(h.js('Dante.nowMs() - Date.now()')) < 2000, '?now ignored')
    h.page.goto(h.base + '/?now=03:33&pingSec=7')
    h.page.wait_for_selector('[data-testid^=screen-]')
    eq(h.js('Dante.testMode'), True)
    eq(h.js('new Date(Dante.nowMs()).getHours()'), 3)
    h.js('Dante.loadGame("%s")' % P)
    eq(h.js('Dante.Track.intervalMs()'), 7000)


# ============================================================ 14-15 storage / organizer
@scenario('14 storage', 'Praha progress does not leak into Mnichov', (IPHONE,), geo=near(P, 'chvilka-filosofie'))
def t_isolation(h):
    h.start(P)
    h.done_all(P, ids=['chvilka-filosofie', 'byt-ci-nebyt'], pts=5)
    h.js('Dante.nav("#/")'); h.page.wait_for_selector('[data-testid=screen-picker]')
    h.click('game-' + M)
    h.page.wait_for_selector('[data-testid=screen-name]')
    check(h.t('btn-start').count() == 1 and h.t('btn-continue').count() == 0, 'fresh Mnichov')
    h.page.fill('[data-testid=team-name]', 'Jiní'); h.click('btn-start')
    h.page.wait_for_selector('[data-testid=screen-grid]')
    check(h.text('score-points').startswith('0'))
    eq(h.page.locator('.gcard[data-status=done]').count(), 0)
    keys = h.js('Object.keys(localStorage)')
    check('dante:%s:state' % P in keys and 'dante:%s:state' % M in keys, keys)
    h.js('Dante.nav("#/")'); h.page.wait_for_selector('[data-testid=screen-picker]')
    h.click('game-' + P)
    h.click('btn-continue'); h.page.wait_for_selector('[data-testid=screen-grid]')
    eq(h.page.locator('.gcard[data-status=done]').count(), 2)


@scenario('15 organizer', 'long-press panel sets bonus points', (IPHONE,), geo=near(P, 'chvilka-filosofie'))
def t_judge(h):
    h.start(P)
    mx = CARDS['chvilka-filosofie']['bonus']['max']
    h.js('mx => { Dante.markDone("chvilka-filosofie", 5, mx); Dante.render(); }', mx)
    eq(h.text('score-bonus').split()[0], '+%d' % mx)
    box = h.t('score-row').bounding_box()
    h.page.mouse.move(box['x'] + 20, box['y'] + 10); h.page.mouse.down(); h.page.wait_for_timeout(750); h.page.mouse.up()
    h.page.wait_for_selector('[data-testid=judge-panel]')
    h.shot('judge-panel')
    h.page.fill('[data-testid=judge-chvilka-filosofie]', '3')
    h.click('judge-save')
    h.page.wait_for_selector('[data-testid=judge-panel]', state='detached')
    check(h.text('score-points').startswith('8'), h.text('score-points'))
    check(h.text('score-bonus').startswith('+0'), h.text('score-bonus'))
    # short press does nothing
    h.page.mouse.move(box['x'] + 20, box['y'] + 10); h.page.mouse.down(); h.page.wait_for_timeout(150); h.page.mouse.up()
    eq(h.t('judge-panel').count(), 0)


# ============================================================ 16 layout
def layout_pass(h, w):
    bad = []
    def chk(label):
        sw, cw, off = h.overflow()
        h.shot('w%d_%s' % (w, label))
        if sw > cw or off:
            bad.append('%s: scroll %d > %d %s' % (label, sw, cw, off))
    h.open(now='21:05'); chk('picker')
    h.js('Dante.nav("#/name/%s")' % P); h.page.wait_for_selector('[data-testid=screen-name]'); chk('name')
    h.page.fill('[data-testid=team-name]', 'Velmi dlouhé jméno týmu které se musí zalomit správně'); h.click('btn-start')
    h.page.wait_for_selector('[data-testid=screen-grid]')
    h.pos_wait()
    chk('grid')
    h.unlock(*[c for c in regular(P)])
    h.js('Dante.markDone("rubicon", 10, 0); Dante.markDone("maugli", 8, 5)'); h.js('Dante.render()')
    chk('grid2')
    for cid, label in [('byt-ci-nebyt', 'card'), ('cisarsky-poklad', 'card-find'), ('mind-meld', 'card-confirm'), ('polyfemos', 'card-bonus')]:
        h.card(cid); chk(label)
    h.card('rubicon'); chk('card-done')
    h.card('u-rek-babylonskych')
    qs = CARDS['u-rek-babylonskych']['task']['questions']
    for qi, q in enumerate(qs): h.pick('q%d-o%d' % (qi, q['correct']))
    h.click('btn-quiz-submit'); h.page.wait_for_selector('[data-testid=quiz-result]'); chk('card-quiz')
    h.card('pis-barde-skladej'); chk('card-submit')
    for f in CARDS['pis-barde-skladej']['task']['fields']:
        h.page.fill('[data-testid=field-%s]' % f['id'], 'Text písně ' * 4)
    h.click('btn-submit'); h.page.wait_for_selector('[data-testid=submit-sent]'); chk('card-submit-wait')
    h.card('ve-zdravem-tele'); chk('card-choices')
    h.js('Dante.nav("#/compass")'); h.page.wait_for_selector('[data-testid^=marker-]'); chk('compass')
    h.card(finale(P)); chk('finale')
    h.js('Dante.markDone("byt-ci-nebyt", 5, 0)'); h.unlock(finale(P))
    h.js('Dante.nav("#/kronika")'); h.page.wait_for_selector('[data-testid=screen-kronika]'); chk('kronika')
    h.click('kopt-0'); h.page.wait_for_selector('[data-testid=kfeedback]'); chk('kronika-answered')
    h.js('Dante.st.kronika.finished = true; Dante.nav("#/end")'); h.page.wait_for_selector('[data-testid=screen-end]'); chk('end')
    return bad


@scenario('16 layout', 'no horizontal scroll at 360 and 390 px (Praha screens)', (IPHONE,), geo=near(P, 'chvilka-filosofie'), per_width=True)
def t_layout(h):
    pass   # handled specially in main (needs one context per width)


def layout_m_pass(h):
    bad = []
    def chk(label):
        sw, cw, off = h.overflow(); h.shot('w360_m_' + label)
        if sw > cw or off: bad.append('%s: %d>%d %s' % (label, sw, cw, off))
    h.start(M, now='12:00', wait_pos=False); chk('grid')
    h.unlock('zluty', 'velmi-dobre')
    h.card('zluty'); chk('guess-start')
    h.click('btn-guess-start'); h.page.wait_for_selector('[data-testid=guess-timer]'); chk('guess-referee')
    h.js('Dante.st.guess.zluty.startedAt -= 200000'); h.page.wait_for_selector('[data-testid=guess-end]'); chk('guess-end')
    h.card('velmi-dobre'); chk('counter')
    return bad


@scenario('16 layout', 'layout of Mnichov-only screens at 360 px', (IPHONE,), viewport={'width': 360, 'height': 740})
def t_layout_m(h):
    bad = layout_m_pass(h)
    check(not bad, '; '.join(bad))


# ============================================================ 17-18 monitor
def monitor_events():
    now = time.time()
    iso = lambda m: datetime.datetime.fromtimestamp(now - m * 60, datetime.timezone.utc).isoformat().replace('+00:00', 'Z')
    ev = lambda m, team, event, **kw: dict(dict(v=1, game=P, team=team, event=event, ts=iso(m)), **kw)
    return [
        ev(60, 'Stopaři', 'position', lat=50.0432, lng=14.412),
        ev(55, 'Stopaři', 'card_done', card='chvilka-filosofie', title='x', points=5, bonus=0, lat=50.04318, lng=14.41196),
        ev(45, 'Stopaři', 'card_done', card='byt-ci-nebyt', title='x', points=10, bonus=0, lat=50.0706, lng=14.4248),
        ev(2, 'Stopaři', 'position', lat=50.0667, lng=14.4285),
        ev(40, 'Poutníci', 'position', lat=50.05, lng=14.41),
        ev(30, 'Poutníci', 'card_done', card='maugli', title='x', points=8, bonus=0, lat=50.0549, lng=14.4189),
        ev(30, 'Vogoni', 'position', lat=50.0502, lng=14.4125),
        ev(25, 'Vogoni', 'card_done', card='rubicon', title='x', points=8, bonus=0, lat=50.0667, lng=14.4285),
        ev(20, 'Vogoni', 'card_done', card='pis-barde-skladej', title='x', points=0, bonus=10, lat=50.056, lng=14.418),
        ev(20, 'Vogoni', 'submission', card='pis-barde-skladej', title='x', submission='sub-1',
           fields={'song': 'Kočka <b>leze</b> dírou', 'lyrics': 'Kočka leze dírou,\npes oknem, pes oknem,\n' * 8}),
        ev(15, 'Poutníci', 'submission', card='pis-barde-skladej', title='x', submission='sub-2', fields={'song': 'Hej', 'lyrics': 'la la'}),
        ev(14, 'Poutníci', 'grade', card='pis-barde-skladej', submission='sub-2', points=7, note='fajn'),
        dict(ev(5, 'Cizí', 'position', lat=1, lng=1), game='other'),
    ]


MON = 'file:///' + str(DANTE / '_poradatel' / 'monitor.html').replace('\\', '/')


def monitor_load(h):
    h.ntfy.poll = monitor_events()
    h.page.goto(MON)
    h.page.wait_for_selector('[data-testid=team]', timeout=15000)
    h.page.wait_for_timeout(1500)


@scenario('17-18 monitor', 'monitor loads: teams, events, filters, stations', (IPHONE,), mobile=False, viewport={'width': 1440, 'height': 900})
def t_monitor(h):
    monitor_load(h)
    teams = h.t('team').all_inner_texts()
    eq(len(teams), 3, 'teams: %s' % teams)
    for name in ('Stopaři', 'Poutníci', 'Vogoni'):
        check(any(name in t for t in teams), name)
    check(not any('Cizí' in t for t in teams), 'other game filtered')
    n_all = h.t('event').count()
    check(n_all >= 10, 'events %d' % n_all)
    h.click('filter-done')
    n_done = h.t('event').count()
    check(0 < n_done < n_all, 'filter narrows %d/%d' % (n_done, n_all))
    check(all(k == 'card_done' for k in h.js('Array.from(document.querySelectorAll("[data-testid=event]")).map(e => e.dataset.kind)')))
    h.click('filter-all')
    eq(h.t('event').count(), n_all)
    check(h.t('grade-card').count() == 1, 'one ungraded submission')
    check(h.t('graded').count() == 1, 'one graded')
    check('OBODOVÁNÍ' in h.page.inner_text('#gradeTitle').upper() or '1' in h.page.inner_text('#gradeTitle'))
    st = h.text('status')
    check(st and 'NAČÍTÁM' not in st, st)
    # stations (map markers) when Leaflet loaded
    mk = h.page.locator('.leaflet-marker-icon').count()
    check(mk >= len([p for p in GAMES[P]['cards'] if 'at' in p]) or mk == 0, 'station markers %d' % mk)
    # HTML in submission is escaped
    check(h.page.locator('[data-testid=grade-card] b').count() == 0, 'submission text not rendered as HTML')
    h.shot('monitor')


@scenario('17-18 monitor', 'grading posts grade payload and moves item to graded', (IPHONE,), mobile=False, viewport={'width': 1440, 'height': 900})
def t_monitor_grade(h):
    monitor_load(h)
    h.click('grade-minus'); h.click('grade-minus')
    h.page.fill('[data-testid=grade-note]', '2 slova špatně.')
    pts = h.t('grade-points').input_value()
    h.click('grade-save')
    for _ in range(40):
        if h.ntfy.events('grade'): break
        h.page.wait_for_timeout(100)
    g = h.ntfy.events('grade')
    eq(len(g), 1)
    g = g[0]
    check(g['submission'] == 'sub-1' and g['card'] == 'pis-barde-skladej' and g['team'] == 'Vogoni' and g['game'] == P
          and g['v'] == 1 and g['note'] == '2 slova špatně.' and g['points'] == int(pts), g)
    h.page.wait_for_function('document.querySelectorAll("[data-testid=graded]").length === 2', timeout=5000)
    eq(h.t('grade-card').count(), 0)
    # the app must understand that very payload
    h.shot('monitor-graded')
    # offline -> status shows an error, no crash
    h.ctx.unroute('https://ntfy.sh/**')
    h.ctx.route('https://ntfy.sh/**', lambda r: r.abort())
    h.page.click('#refresh'); h.page.wait_for_timeout(600)
    check('NAČÍTÁM' not in h.text('status'))
    h.errors[:] = [e for e in h.errors if 'ERR_FAILED' not in e and 'Failed to load' not in e]


# ============================================================ 19 languages
CZ_ONLY = re.compile(r'\S*[ěščřžůťďňĚŠČŘŽŮŤĎŇ]\S*')
NAMES_OK = ('TÁČEK', 'Botič')        # Czech names that stay in the translations (PTÁČEK loses its P to the drop cap)


def set_lang(h, lang):
    """Language for every page load of this context, as if picked with the flag before."""
    h.ctx.add_init_script("try { localStorage.setItem('dante:lang', '%s') } catch (e) {}" % lang)


def card_in(cid, lang):
    return CARDS[cid] if lang == 'cs' else CARDS_I18N[(cid, lang)]


def shape(v, path=''):
    """Card without its texts: what a translation has to keep (points, answers, ids, counts, order)."""
    if isinstance(v, dict):
        return {k: shape(x, path + '.' + k) for k, x in v.items() if k != 'alsoAccept'}
    if isinstance(v, list):
        return [shape(x, path) for x in v]
    if isinstance(v, str) and path.rsplit('.', 1)[-1] not in ('id', 'type', 'youtube', 'src', 'quiz', 'rounding') and path != '.task.hint':
        return ''
    return v


def czech_left(h):
    """Words with Czech-only letters anywhere a player can see or hear them (text, labels, placeholders, toast, dialogs)."""
    txt = h.js(r"""() => { const app = document.querySelector('#app'), out = [app.innerText, document.querySelector('#toast').textContent];
        app.querySelectorAll('[aria-label],[placeholder],[alt]').forEach(e => ['aria-label', 'placeholder', 'alt'].forEach(a => out.push(e.getAttribute(a) || '')));
        return out.join('\n'); }""") + '\n' + '\n'.join(h.dialogs)
    for n in NAMES_OK:
        txt = txt.replace(n, '')
    return sorted(set(CZ_ONLY.findall(txt)))


@scenario('19 languages', 'translations keep card structure, UI keys and placeholders; data.js is current', (IPHONE,))
def t_lang_data(h):
    for (cid, lang), c in CARDS_I18N.items():
        check(lang in ('en', 'de'), 'unknown language file %s.%s' % (cid, lang))
        check(cid in CARDS, 'no Czech card for %s.%s' % (cid, lang))
        eq(shape(c), shape(CARDS[cid]), '%s.%s structure' % (cid, lang))
    used = {p['card'] for g in GAMES.values() for p in g['cards']}
    missing = sorted('%s.%s' % (c, l) for c in used for l in ('en', 'de') if (c, l) not in CARDS_I18N)
    check(not missing, 'untranslated cards: %s' % missing)
    for g in GAMES.values():
        for l in ('en', 'de'):
            check((g.get('i18n') or {}).get(l, {}).get('title'), '%s has no %s title' % (g['id'], l))
    h.open()
    files = lambda sub: {f.stem: json.loads(f.read_text(encoding='utf-8')) for f in (DANTE / 'data' / sub).glob('*.json')}
    check(h.js('DANTE_DATA') == {'cards': files('cards'), 'games': files('games')}, 'data.js is out of date: run build-data.bat')
    S = h.js('Dante.STRINGS')
    def ph(v):
        if isinstance(v, str): return sorted(re.findall(r'\{(\w+)\}', v))
        return len(v) if isinstance(v, list) else sorted(v)
    for l in ('en', 'de'):
        eq(sorted(S[l]), sorted(S['cs']), '%s keys' % l)
        for k, v in S['cs'].items():
            eq(ph(S[l][k]), ph(v), '%s.%s placeholders' % (l, k))


@scenario('19 languages', 'flag cycles cs -> en -> de -> cs, is remembered and sits on every screen', (IPHONE,), geo=FAR)
def t_lang_flag(h):
    h.open(now='12:00')
    heads = {'cs': 'VYBERTE HRU', 'en': 'CHOOSE A GAME', 'de': 'SPIEL WÄHLEN'}
    for lang in ('cs', 'en', 'de'):
        eq(h.t('lang-flag').get_attribute('data-lang'), lang)
        eq(h.js('document.documentElement.lang'), lang)
        check(heads[lang] in h.text('screen-picker'), h.text('screen-picker'))
        title = GAMES[M]['title'] if lang == 'cs' else GAMES[M]['i18n'][lang]['title']
        check(title in h.text('game-' + M), h.text('game-' + M))
        h.shot('picker-' + lang)
        h.click('lang-flag')
    eq(h.t('lang-flag').get_attribute('data-lang'), 'cs', 'third tap is Czech again')
    h.click('lang-flag')
    h.page.reload(); h.page.wait_for_selector('[data-testid=screen-picker]')
    eq(h.t('lang-flag').get_attribute('data-lang'), 'en', 'kept after reload')
    def one_flag(where):
        eq(h.page.locator('[data-testid=lang-flag]').count(), 1, 'flags on ' + where)
        eq(h.t('lang-flag').get_attribute('data-lang'), 'en', 'language on ' + where)
    one_flag('picker')
    h.click('game-' + M); h.page.wait_for_selector('[data-testid=screen-name]'); one_flag('name')
    h.page.fill('[data-testid=team-name]', 'Pilgrims'); h.click('btn-start')
    h.page.wait_for_selector('[data-testid=screen-grid]'); one_flag('grid')
    eq(h.t('progress').count(), 0, 'no progress counter')
    h.go('#/compass'); one_flag('compass')
    h.card('byt-ci-nebyt'); h.page.wait_for_selector('[data-testid=locked-view]'); one_flag('locked card')
    h.unlock('zluty'); h.card('zluty'); one_flag('card')
    h.click('btn-guess-start'); h.page.wait_for_selector('[data-testid=guess-timer]'); one_flag('guess')
    h.done_all(M); h.go('#/kronika'); one_flag('kronika')
    h.js('Dante.st.kronika.finished = true; Dante.nav("#/end")'); h.page.wait_for_selector('[data-testid=screen-end]'); one_flag('end')
    h.shot('end-en')


@scenario('19 languages', 'switching mid-game keeps score, typed text and picks; cards, quiz and kronika follow', (IPHONE,), geo=FAR)
def t_lang_switch(h):
    h.open(now='12:00')
    h.click('game-' + M)
    h.page.fill('[data-testid=team-name]', 'Poutníci')
    h.click('lang-flag')
    eq(h.t('team-name').input_value(), 'Poutníci', 'typed team name survives the switch')
    eq(h.text('btn-start'), 'START GAME')
    h.click('btn-start'); h.page.wait_for_selector('[data-testid=screen-grid]')
    # a done card: points stay, the card text follows the language
    h.unlock('maugli'); h.card('maugli'); h.click('btn-confirm'); h.page.wait_for_selector('[data-testid=done-title]')
    pts = CARDS['maugli']['points']
    eq(h.text('done-points'), '%d POINTS' % pts)
    eq(h.text('card-title'), card_in('maugli', 'en')['title'])
    h.click('lang-flag')
    eq(h.text('done-points'), '%d PUNKTE' % pts)
    eq(h.text('card-title'), card_in('maugli', 'de')['title'])
    eq(h.t('done-title').inner_text(), 'Geschafft!')
    h.go('#/grid')
    check(h.text('score-points').startswith('%d PUNKTE' % pts), h.text('score-points'))
    eq(h.t('card-maugli').get_attribute('data-status'), 'done')
    check(card_in('u-rek-babylonskych', 'de')['title'] in h.text('card-u-rek-babylonskych'), h.text('card-u-rek-babylonskych'))
    # an unsent quiz pick survives, the result is in the new language
    cid = 'u-rek-babylonskych'; qs = CARDS[cid]['task']['questions']
    h.unlock(cid); h.card(cid)
    for qi, q in enumerate(qs):
        h.pick('q%d-o%d' % (qi, q['correct']))
    h.click('lang-flag')                                        # -> cs
    eq(h.js('Array.from(document.querySelectorAll("input[type=radio]:checked")).map(e => +e.value)'), [q['correct'] for q in qs], 'picks kept')
    check(card_in(cid, 'cs')['task']['questions'][0]['q'] in h.text('screen-card'))
    h.click('lang-flag')                                        # -> en
    h.click('btn-quiz-submit'); h.page.wait_for_selector('[data-testid=quiz-result]')
    check('%d / %d CORRECT' % (len(qs), len(qs)) in h.text('quiz-result'), h.text('quiz-result'))
    eq(h.text('explain-0'), card_in(cid, 'en')['task']['questions'][0]['explain'])
    # Žlutý: the same word, in the language on screen
    h.unlock('zluty'); h.card('zluty'); h.click('btn-guess-start'); h.page.wait_for_selector('[data-testid=guess-word]')
    g = h.js('Dante.st.guess.zluty')
    for lang in ('de', 'cs', 'en'):
        h.click('lang-flag')
        eq(h.text('guess-word'), card_in('zluty', lang)['task']['words'][g['order'][g['idx']]]['word'], 'guess word in ' + lang)
    h.js('Dante.st.guess.zluty.startedAt -= 200000'); h.page.wait_for_selector('[data-testid=guess-end]')
    # kronika: the options switch language, the right one stays right
    h.done_all(M); h.go('#/kronika')
    for lang in ('de', 'cs', 'en'):
        h.click('lang-flag')
        q = h.js('Dante.st.kronika.qs[0]')
        opts = h.js('Dante.kronikaOptions(Dante.st.kronika.qs[0])')
        eq(opts[q['correct']], card_in(q['card'], lang)['kronika']['work'], 'right work in ' + lang)
        eq([h.text('kopt-%d' % i).split('\n')[-1] for i in range(3)], opts, 'options shown in ' + lang)
    h.click('kopt-%d' % q['correct']); h.page.wait_for_selector('[data-testid=kfeedback]')
    check(h.text('kfeedback').startswith('Correct!'), h.text('kfeedback'))
    eq(h.text('kcard-title'), card_in(q['card'], 'en')['title'])


def no_czech_walk(h, lang):
    set_lang(h, lang)
    left = []
    def chk(label):
        bad = czech_left(h)
        if bad: left.append('%s: %s' % (label, ' '.join(bad[:6])))
    h.open(now='12:00'); chk('picker')
    h.click('game-' + M); h.page.wait_for_selector('[data-testid=screen-name]'); chk('name')
    h.click('btn-start'); chk('name error')
    h.page.fill('[data-testid=team-name]', 'Pilgrims'); h.click('btn-start'); h.page.wait_for_selector('[data-testid=screen-grid]')
    chk('grid')
    h.go('#/compass'); h.page.wait_for_timeout(300); chk('compass')
    h.card('byt-ci-nebyt'); chk('locked card')
    h.click('debug-unlock'); h.page.wait_for_selector('[data-testid=btn-confirm]'); chk('debug unlock')
    h.unlock(*regular(M))
    for cid in regular(M):
        h.card(cid); chk(cid)
    h.card('u-rek-babylonskych')
    for qi, q in enumerate(CARDS['u-rek-babylonskych']['task']['questions']): h.pick('q%d-o%d' % (qi, q['correct']))
    h.click('btn-quiz-submit'); h.page.wait_for_selector('[data-testid=quiz-result]'); chk('quiz result')
    h.click('btn-quiz-done'); h.page.wait_for_selector('[data-testid=done-title]'); chk('quiz done')
    h.card('rubicon'); h.click('btn-confirm'); h.page.wait_for_selector('[data-testid=done-title]'); chk('confirm done')
    h.card('pis-barde-skladej')
    for f in CARDS['pis-barde-skladej']['task']['fields']: h.page.fill('[data-testid=field-%s]' % f['id'], 'Song')
    h.click('btn-submit'); h.page.wait_for_selector('[data-testid=submit-sent]'); chk('submit sent')
    h.card('zluty'); h.click('btn-guess-start'); h.page.wait_for_selector('[data-testid=guess-word]'); chk('guess referee')
    h.js('Dante.st.guess.zluty.startedAt -= 200000'); h.page.wait_for_selector('[data-testid=guess-end]'); chk('guess end')
    h.done_all(M); h.card(finale(M)); h.page.wait_for_timeout(300); chk('finale')
    h.go('#/kronika'); chk('kronika')
    h.click('kopt-0'); h.page.wait_for_selector('[data-testid=kfeedback]'); chk('kronika answered')
    h.js('Dante.st.kronika.finished = true; Dante.nav("#/end")'); h.page.wait_for_selector('[data-testid=screen-end]'); chk('end')
    h.open(now='16:00', hash='#/grid'); chk('game over')
    for cid in [c for c in regular(P) if c not in regular(M)]:      # Praha-only cards
        h.js('Dante.loadGame("%s"); Dante.st.started = true; Dante.unlock("%s")' % (P, cid))
        h.card(cid); chk(cid)
    return left


for _lang in ('en', 'de'):
    def _make(lang):
        @scenario('19 languages', 'no Czech left on any screen in %s' % lang, (IPHONE,), geo=FAR)
        def t_no_czech(h):
            left = no_czech_walk(h, lang)
            check(not left, '; '.join(left))

        @scenario('19 languages', 'layout at 360 px in %s (Praha and Mnichov screens)' % lang, (IPHONE,), geo=near(P, 'chvilka-filosofie'), viewport={'width': 360, 'height': 740})
        def t_layout_lang(h):
            set_lang(h, lang)
            bad = layout_pass(h, 360)
            h.js('localStorage.removeItem("dante:lastGame")')
            bad += layout_m_pass(h)
            check(not bad, '; '.join(bad))
    _make(_lang)


# ============================================================ runner
def main(argv):
    flt = [a for a in argv if not a.startswith('-')]
    only_dev = None
    if '--pixel' in argv: only_dev = PIXEL
    results = {}
    srv, base = start_server()
    t0 = time.time()
    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        for s in REG:
            title = '%s | %s' % (s['group'], s['name'])
            if flt and not any(f.lower() in title.lower() for f in flt):
                continue
            runs = []
            if s['kw'].get('per_width'):
                runs = [(IPHONE, {'viewport': {'width': w, 'height': 760}}, w) for w in (360, 390)]
            else:
                runs = [(d, {}, None) for d in s['devices'] if not only_dev or d == only_dev]
            for dev, extra, w in runs:
                kw = {k: v for k, v in s['kw'].items() if k in ('viewport', 'mobile')}
                kw.update(extra)
                name = ''.join(ch if ch.isalnum() else '_' for ch in s['name'])[:28] + '_' + dev.replace(' ', '')
                h = H(pw, browser, base, dev, name, geo=s['geo'], clock=s['clock'], **kw)
                label = '%s [%s]' % (title, dev + (' %dpx' % w if w else ''))
                err = None
                try:
                    if w:
                        bad = layout_pass(h, w)
                        check(not bad, '; '.join(bad))
                    else:
                        s['fn'](h)
                    if h.errors:
                        raise AssertionError('console/page errors: ' + ' | '.join(h.errors[:4]))
                except Exception as e:
                    err = '%s: %s' % (type(e).__name__, str(e).splitlines()[0][:300] if str(e) else '')
                    try: h.shot('FAIL')
                    except Exception: pass
                    if '-v' in argv: traceback.print_exc()
                    if h.errors and 'console/page' not in err: err += ' | errors: ' + ' | '.join(h.errors[:3])
                h.close()
                results.setdefault(s['group'], []).append((label, err))
                print(('PASS ' if not err else 'FAIL ') + label + ('' if not err else '\n     ' + err), flush=True)
        browser.close()
    srv.shutdown()
    print('\n=== summary (%.0f s) ===' % (time.time() - t0))
    total_f = 0
    for g, rs in results.items():
        f = len([1 for _, e in rs if e]); total_f += f
        print('%-22s %d/%d passed' % (g, len(rs) - f, len(rs)))
    print('screenshots:', SHOTS)
    return 1 if total_f else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
