/* Dante – languages: UI strings (cs / en / de), the flag switch, translated cards and game texts */
(function () {
  'use strict';
  var D = window.Dante;
  var LANGS = D.LANGS = ['cs', 'en', 'de'];
  var KEY = 'dante:lang';

  // ---- UI strings. {name} is filled in by D.t(); values passed in must already be escaped where the result is HTML ----
  var S = {
    cs: {
      langSwitch: 'Jazyk: čeština. Přepnout na: {next}', langNames: { cs: 'čeština', en: 'angličtina', de: 'němčina' },
      // picker / team name
      chooseGame: 'VYBERTE HRU', stations: '{n} stanovišť', games: 'Hry', stationsEnd: '{n} stanovišť · konec ve {t}', gameEnds: 'Konec hry: {t}',
      yourTeam: 'VÁŠ TÝM', teamAsk: 'Jak se váš tým jmenuje?', teamPh: 'Název vašeho týmu', teamEmpty: 'Napište nejdřív název týmu.',
      start: 'ZAČÍT HRU', cont: 'POKRAČOVAT', newGame: 'NOVÁ HRA',
      newGameAsk: 'Opravdu začít znovu? Veškerý postup a body tohoto týmu se smažou.',
      // header / grid
      toCompass: 'Přepnout na kompas', toGrid: 'Přepnout na karty', toPicker: 'Výběr hry',
      overNote: 'Hra skončila · úkoly už nelze plnit', finale: 'FINÁLE', atTime: 'v {t}',
      checkPos: 'ZKONTROLOVAT MOJI POLOHU', locating: 'ZJIŠŤUJI POLOHU…', nearCards: 'Jste u karty {n}.', noneNear: 'Žádná karta zatím není v dosahu.',
      geoFail: 'Polohu se nepodařilo zjistit. Zkontrolujte povolení polohy.', geoFailShort: 'Polohu se nepodařilo zjistit.',
      // organizer panel
      judgeTitle: 'PANEL POŘADATELE', judgeEmpty: 'Zatím žádné splněné úkoly s bonusovými body.', save: 'ULOŽIT', close: 'ZAVŘÍT',
      // card
      back: 'Zpět', backToCards: 'ZPĚT NA KARTY', backToCardsLow: 'Zpět na karty', debugUnlock: 'Ladicí odemčení',
      takesPlace: 'Koná se v {t}', timeLocked: 'Tuto kartu lze plnit pouze ve {t}.',
      locked: 'Karta je zamčená. Dojděte na označené místo (do {r} m) a zkontrolujte polohu.', lockedDist: 'Od karty vás dělí {d}.',
      atPlace: 'Jste na místě, karta je odemčená.', notNear: 'Zatím nejste v dosahu karty.',
      debugFinale: '⚠ DEBUG: spustit kvíz bez kontroly polohy v cíli? Použijte jen při testování.',
      debugCard: '⚠ DEBUG: odemknout tuto kartu bez kontroly polohy (a času)? Použijte jen při testování.',
      debugDone: 'Karta odemčena (debug).',
      over: 'Hra skončila.', overCard: 'Hra skončila, úkol už nelze splnit.',
      done: 'Splněno!', doneBtn: 'SPLNĚNO', undo: 'ZRUŠIT SPLNĚNÍ',
      bonusWaits: '+{n} bonusových bodů čeká na obodování', bonusIncl: 'z toho bonus +{n}',
      howMany: 'Kolik bodů jste získali?', pickFirst: 'Nejdřív vyberte, kolik bodů jste získali.', pointLess: 'Ubrat bod', pointMore: 'Přidat bod',
      // cartouche
      cartQuiz: '{n} {pts} ZA SPRÁVNOU ODPOVĚĎ', cartQuizSub: 'až {max} {pts} za celý kvíz',
      cartGuess: '{n} {pts} ZA UHODNUTÉ SLOVO', upTo: 'až {max} {pts}', perWord: ' + {s} s za každé slovo', rounded: ' · součet se na konci zaokrouhlí',
      cartChoices: 'vyberte podle výsledku', cartUpTo: 'AŽ {max} {pts}', cartBonus: 'bonus až +{max} · {desc}', cartFind: 'za nalezení skrytého místa',
      minutes: ['minuta', 'minuty', 'minut'],
      // quiz
      quizResult: '{ok} / {n} SPRÁVNĚ → {pts}', quizSend: 'ODESLAT ODPOVĚDI', quizAll: 'Odpovězte prosím na všechny otázky.',
      // submit
      graded: 'Ohodnoceno!', gradedSwap: 'Bonus se změnil na skutečné body', gradedBy: 'Pořadatel udělil <strong>{pts} z {max}</strong>.',
      gradeNote: 'POZNÁMKA POŘADATELE', checkedAt: 'Zkontrolováno v {t}', checkFail: 'kontrola se nezdařila (jste online?)', notGraded: 'zatím neohodnoceno',
      sentAt: 'ODESLÁNO · {t}', sentWait: 'Text má pořadatel a teď čeká na obodování.', bonusPts: '+{n} BONUSOVÝCH BODŮ',
      bonusPotential: 'zatím jen potenciálně · po obodování se změní ve skutečné body', checkPoints: 'ZKONTROLOVAT BODY',
      autoCheck: 'Aplikace se podívá i sama, pokaždé když posílá polohu (každých {n} minut).',
      sender: 'ODESÍLÁ', yourTeamFallback: 'Váš tým', send: 'ODESLAT', fillAll: 'Vyplňte prosím všechna pole.',
      // find
      here: 'JSEM TADY!', locatingLow: 'Zjišťuji polohu…', moreTo: 'Tady to ještě není. Víc na {dir}!',
      // guess
      guessCont: 'POKRAČOVAT V HRE', guessStart: 'SPUSTIT ODPOČET · {t}', refereeOnly: 'Telefon odteď drží jen rozhodčí.',
      guessedSkipped: 'Uhodnuto {g} · přeskočeno {s}', guessSummary: 'Uhodnuto {g} · přeskočeno {s} · {p} za slovo, zaokrouhleno',
      referee: 'ROZHODČÍ', allWords: 'Všechna slova prošla', timeUp: 'Čas vypršel', wordOf: 'SLOVO {i} / {n}',
      dontSay: 'NEŘÍKEJ NAHLAS', readAloud: 'PŘEČTI NAHLAS', guessedBtn: 'UHODNUTO · +{s} s', skip: 'PŘESKOČIT',
      secsLeft: 'Zbývá {n} sekund', guessCounts: 'UHODNUTO {g} · PŘESKOČENO {s}',
      // finale
      locatingTarget: 'zjišťuji polohu…', atFinish: 'jste v cíli', target: 'CÍL · {x}', noLocation: 'poloha není dostupná',
      showOnCompass: 'UKÁZAT NA KOMPASU', quizCont: 'POKRAČOVAT V KVÍZU', quizStartHere: 'JSME V CÍLI · SPUSTIT KVÍZ', quizStart: 'SPUSTIT KVÍZ',
      chronicleNow: 'ZAPSAT SE DO KRONIKY HNED', overGoFinish: 'Hra je u konce. Dojděte do cíle a spusťte kvíz.',
      notAtFinish: 'Ještě nejste v cíli, zbývá {d} {dir}.',
      chronicleAsk: 'Zapsat se do kroniky hned? Hra pro váš tým skončí a už nepůjde plnit další úkoly.',
      // kronika / end
      chronicle: 'ZÁPIS DO KRONIKY', kRight: 'Správně! +{n} {pts}', kWrong: 'Bohužel. Správně je: {x}',
      kQuestion: 'Z jakého díla pochází ukázka na této kartě?', kOptions: 'Možnosti', kResult: 'ZOBRAZIT VÝSLEDEK', kNext: 'DALŠÍ OTÁZKA',
      kHint: 'Vyberte jednu možnost. Odpověď už nejde vzít zpět.',
      endStations: 'Body ze stanovišť', endQuiz: 'Kvíz · {ok} / {n} správně', endBonus: 'Bonus, čeká na obodování', endTotal: 'Celkem',
      endTitle: 'Zapsáno do kroniky', endVerse: 'A odtud jsme vyšli znovu uzřít hvězdy.',
      // compass
      range: 'OKRUH {r}', showChip: 'Zobrazit {x}', noPlace: 'BEZ URČENÉ POLOHY',
      noSensor: 'Tento telefon nedává údaj o směru. Sever zůstává nahoře.', sensorDenied: 'Přístup ke kompasu nebyl povolen. Sever zůstává nahoře.',
      northUp: 'Sever je nahoře', waitCompass: 'Čekám na údaj z kompasu…', facing: 'Díváte se na {dir} · {deg}°',
      geoOff: 'POLOHA NENÍ DOSTUPNÁ · POVOLTE ZJIŠŤOVÁNÍ POLOHY', geoWait: 'ČEKÁM NA POLOHU…', geoLive: 'POLOHA SE AKTUALIZUJE SAMA · PŘED {s} S',
      focusOnly: 'Na kompasu je jen cíl.', showAll: 'Ukázat všechny karty', orient: 'Natočení kompasu', modeNorth: 'SEVER NAHOŘE', modeHeading: 'PODLE POHLEDU',
      you: 'Vaše poloha', waitPos: 'Čekám na polohu…', zoomOut: 'Oddálit', zoomIn: 'Přiblížit', onCompass: 'ZOBRAZIT NA KOMPASU',
      rose: ['S', 'V', 'J', 'Z'],
      dirAdv: ['severně', 'severovýchodně', 'východně', 'jihovýchodně', 'jižně', 'jihozápadně', 'západně', 'severozápadně'],
      dirAcc: ['sever', 'severovýchod', 'východ', 'jihovýchod', 'jih', 'jihozápad', 'západ', 'severozápad'],
      dir4: { n: 'sever', s: 'jih', e: 'východ', w: 'západ' }
    },

    en: {
      langSwitch: 'Language: English. Switch to: {next}', langNames: { cs: 'Czech', en: 'English', de: 'German' },
      chooseGame: 'CHOOSE A GAME', stations: '{n} stations', games: 'Games', stationsEnd: '{n} stations · ends at {t}', gameEnds: 'Game ends: {t}',
      yourTeam: 'YOUR TEAM', teamAsk: 'What is your team called?', teamPh: 'Your team name', teamEmpty: 'Enter your team name first.',
      start: 'START GAME', cont: 'CONTINUE', newGame: 'NEW GAME',
      newGameAsk: 'Really start over? All progress and points of this team will be deleted.',
      toCompass: 'Switch to compass', toGrid: 'Switch to cards', toPicker: 'Choose a game',
      overNote: 'The game is over · tasks can no longer be completed', finale: 'FINALE', atTime: 'at {t}',
      checkPos: 'CHECK MY LOCATION', locating: 'GETTING LOCATION…', nearCards: 'You are at card {n}.', noneNear: 'No card is within range yet.',
      geoFail: 'Could not get your location. Check the location permission.', geoFailShort: 'Could not get your location.',
      judgeTitle: 'ORGANIZER PANEL', judgeEmpty: 'No completed tasks with bonus points yet.', save: 'SAVE', close: 'CLOSE',
      back: 'Back', backToCards: 'BACK TO CARDS', backToCardsLow: 'Back to cards', debugUnlock: 'Debug unlock',
      takesPlace: 'Takes place at {t}', timeLocked: 'This card can only be played at {t}.',
      locked: 'This card is locked. Go to the marked spot (within {r} m) and check your location.', lockedDist: 'You are {d} away from the card.',
      atPlace: 'You are there, the card is unlocked.', notNear: 'You are not within range of the card yet.',
      debugFinale: '⚠ DEBUG: start the quiz without checking the location at the finish? Use for testing only.',
      debugCard: '⚠ DEBUG: unlock this card without checking the location (and time)? Use for testing only.',
      debugDone: 'Card unlocked (debug).',
      over: 'The game is over.', overCard: 'The game is over, this task can no longer be completed.',
      done: 'Done!', doneBtn: 'DONE', undo: 'UNDO',
      bonusWaits: '+{n} bonus points waiting to be scored', bonusIncl: 'including bonus +{n}',
      howMany: 'How many points did you get?', pickFirst: 'First choose how many points you got.', pointLess: 'One point less', pointMore: 'One point more',
      cartQuiz: '{n} {pts} PER CORRECT ANSWER', cartQuizSub: 'up to {max} {pts} for the whole quiz',
      cartGuess: '{n} {pts} PER GUESSED WORD', upTo: 'up to {max} {pts}', perWord: ' + {s} s for every word', rounded: ' · the total is rounded at the end',
      cartChoices: 'choose according to your result', cartUpTo: 'UP TO {max} {pts}', cartBonus: 'bonus up to +{max} · {desc}', cartFind: 'for finding the hidden spot',
      minutes: ['minute', 'minutes', 'minutes'],
      quizResult: '{ok} / {n} CORRECT → {pts}', quizSend: 'SUBMIT ANSWERS', quizAll: 'Please answer all the questions.',
      graded: 'Scored!', gradedSwap: 'The bonus turned into real points', gradedBy: 'The organizer awarded <strong>{pts} of {max}</strong>.',
      gradeNote: 'ORGANIZER’S NOTE', checkedAt: 'Checked at {t}', checkFail: 'check failed (are you online?)', notGraded: 'not scored yet',
      sentAt: 'SENT · {t}', sentWait: 'The organizer has your text and it is now waiting to be scored.', bonusPts: '+{n} BONUS POINTS',
      bonusPotential: 'potential only for now · they turn into real points once scored', checkPoints: 'CHECK POINTS',
      autoCheck: 'The app also checks by itself every time it sends your location (every {n} minutes).',
      sender: 'SENT BY', yourTeamFallback: 'Your team', send: 'SEND', fillAll: 'Please fill in all the fields.',
      here: 'WE ARE HERE!', locatingLow: 'Getting your location…', moreTo: 'Not here yet. Further {dir}!',
      guessCont: 'CONTINUE THE GAME', guessStart: 'START COUNTDOWN · {t}', refereeOnly: 'From now on only the referee holds the phone.',
      guessedSkipped: 'Guessed {g} · skipped {s}', guessSummary: 'Guessed {g} · skipped {s} · {p} per word, rounded',
      referee: 'REFEREE', allWords: 'All words done', timeUp: 'Time is up', wordOf: 'WORD {i} / {n}',
      dontSay: 'DON’T SAY IT ALOUD', readAloud: 'READ ALOUD', guessedBtn: 'GUESSED · +{s} s', skip: 'SKIP',
      secsLeft: '{n} seconds left', guessCounts: 'GUESSED {g} · SKIPPED {s}',
      locatingTarget: 'getting location…', atFinish: 'you are at the finish', target: 'FINISH · {x}', noLocation: 'location unavailable',
      showOnCompass: 'SHOW ON COMPASS', quizCont: 'CONTINUE THE QUIZ', quizStartHere: 'WE ARE AT THE FINISH · START QUIZ', quizStart: 'START QUIZ',
      chronicleNow: 'SIGN THE CHRONICLE NOW', overGoFinish: 'The game is over. Go to the finish and start the quiz.',
      notAtFinish: 'You are not at the finish yet, {d} {dir} to go.',
      chronicleAsk: 'Sign the chronicle now? The game will end for your team and no more tasks can be completed.',
      chronicle: 'THE CHRONICLE', kRight: 'Correct! +{n} {pts}', kWrong: 'Sorry. The right answer is: {x}',
      kQuestion: 'Which work is the excerpt on this card from?', kOptions: 'Options', kResult: 'SHOW RESULT', kNext: 'NEXT QUESTION',
      kHint: 'Choose one option. The answer cannot be taken back.',
      endStations: 'Points from stations', endQuiz: 'Quiz · {ok} / {n} correct', endBonus: 'Bonus, waiting to be scored', endTotal: 'Total',
      endTitle: 'Written in the Chronicle', endVerse: 'Thence we came forth to rebehold the stars.',
      range: 'RANGE {r}', showChip: 'Show {x}', noPlace: 'NO FIXED LOCATION',
      noSensor: 'This phone does not report its heading. North stays up.', sensorDenied: 'Compass access was not allowed. North stays up.',
      northUp: 'North is up', waitCompass: 'Waiting for the compass…', facing: 'You are facing {dir} · {deg}°',
      geoOff: 'LOCATION UNAVAILABLE · ALLOW LOCATION ACCESS', geoWait: 'WAITING FOR LOCATION…', geoLive: 'LOCATION UPDATES BY ITSELF · {s} S AGO',
      focusOnly: 'Only the finish is on the compass.', showAll: 'Show all cards', orient: 'Compass orientation', modeNorth: 'NORTH UP', modeHeading: 'HEADING UP',
      you: 'Your location', waitPos: 'Waiting for location…', zoomOut: 'Zoom out', zoomIn: 'Zoom in', onCompass: 'SHOW ON COMPASS',
      rose: ['N', 'E', 'S', 'W'],
      dirAdv: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
      dirAcc: ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'],
      dir4: { n: 'north', s: 'south', e: 'east', w: 'west' }
    },

    de: {
      langSwitch: 'Sprache: Deutsch. Wechseln zu: {next}', langNames: { cs: 'Tschechisch', en: 'Englisch', de: 'Deutsch' },
      chooseGame: 'SPIEL WÄHLEN', stations: '{n} Stationen', games: 'Spiele', stationsEnd: '{n} Stationen · Ende um {t}', gameEnds: 'Spielende: {t}',
      yourTeam: 'EUER TEAM', teamAsk: 'Wie heißt euer Team?', teamPh: 'Name eures Teams', teamEmpty: 'Schreibt zuerst den Namen eures Teams.',
      start: 'SPIEL STARTEN', cont: 'WEITER', newGame: 'NEUES SPIEL',
      newGameAsk: 'Wirklich neu anfangen? Der ganze Fortschritt und alle Punkte dieses Teams werden gelöscht.',
      toCompass: 'Zum Kompass wechseln', toGrid: 'Zu den Karten wechseln', toPicker: 'Spiel wählen',
      overNote: 'Das Spiel ist vorbei · Aufgaben können nicht mehr erfüllt werden', finale: 'FINALE', atTime: 'um {t}',
      checkPos: 'MEINEN STANDORT PRÜFEN', locating: 'STANDORT WIRD ERMITTELT…', nearCards: 'Ihr seid bei Karte {n}.', noneNear: 'Noch ist keine Karte in Reichweite.',
      geoFail: 'Der Standort konnte nicht ermittelt werden. Prüft die Standortfreigabe.', geoFailShort: 'Der Standort konnte nicht ermittelt werden.',
      judgeTitle: 'PANEL DER SPIELLEITUNG', judgeEmpty: 'Noch keine erfüllten Aufgaben mit Bonuspunkten.', save: 'SPEICHERN', close: 'SCHLIESSEN',
      back: 'Zurück', backToCards: 'ZURÜCK ZU DEN KARTEN', backToCardsLow: 'Zurück zu den Karten', debugUnlock: 'Debug-Entsperrung',
      takesPlace: 'Findet um {t} statt', timeLocked: 'Diese Karte kann nur um {t} gespielt werden.',
      locked: 'Die Karte ist gesperrt. Geht zum markierten Ort (bis auf {r} m) und prüft euren Standort.', lockedDist: 'Bis zur Karte sind es noch {d}.',
      atPlace: 'Ihr seid da, die Karte ist entsperrt.', notNear: 'Ihr seid noch nicht in Reichweite der Karte.',
      debugFinale: '⚠ DEBUG: Quiz ohne Standortprüfung am Ziel starten? Nur zum Testen verwenden.',
      debugCard: '⚠ DEBUG: Diese Karte ohne Prüfung von Standort (und Uhrzeit) entsperren? Nur zum Testen verwenden.',
      debugDone: 'Karte entsperrt (Debug).',
      over: 'Das Spiel ist vorbei.', overCard: 'Das Spiel ist vorbei, die Aufgabe kann nicht mehr erfüllt werden.',
      done: 'Geschafft!', doneBtn: 'ERLEDIGT', undo: 'RÜCKGÄNGIG',
      bonusWaits: '+{n} Bonuspunkte warten auf die Bewertung', bonusIncl: 'davon Bonus +{n}',
      howMany: 'Wie viele Punkte habt ihr bekommen?', pickFirst: 'Wählt zuerst, wie viele Punkte ihr bekommen habt.', pointLess: 'Einen Punkt weniger', pointMore: 'Einen Punkt mehr',
      cartQuiz: '{n} {pts} PRO RICHTIGE ANTWORT', cartQuizSub: 'bis zu {max} {pts} für das ganze Quiz',
      cartGuess: '{n} {pts} PRO ERRATENES WORT', upTo: 'bis zu {max} {pts}', perWord: ' + {s} s für jedes Wort', rounded: ' · die Summe wird am Ende gerundet',
      cartChoices: 'wählt nach eurem Ergebnis', cartUpTo: 'BIS ZU {max} {pts}', cartBonus: 'Bonus bis zu +{max} · {desc}', cartFind: 'für das Finden des versteckten Ortes',
      minutes: ['Minute', 'Minuten', 'Minuten'],
      quizResult: '{ok} / {n} RICHTIG → {pts}', quizSend: 'ANTWORTEN ABSCHICKEN', quizAll: 'Bitte beantwortet alle Fragen.',
      graded: 'Bewertet!', gradedSwap: 'Der Bonus wurde zu echten Punkten', gradedBy: 'Die Spielleitung hat <strong>{pts} von {max}</strong> vergeben.',
      gradeNote: 'NOTIZ DER SPIELLEITUNG', checkedAt: 'Geprüft um {t}', checkFail: 'Prüfung fehlgeschlagen (seid ihr online?)', notGraded: 'noch nicht bewertet',
      sentAt: 'GESENDET · {t}', sentWait: 'Die Spielleitung hat euren Text, er wartet jetzt auf die Bewertung.', bonusPts: '+{n} BONUSPUNKTE',
      bonusPotential: 'vorerst nur möglich · nach der Bewertung werden daraus echte Punkte', checkPoints: 'PUNKTE PRÜFEN',
      autoCheck: 'Die App schaut auch selbst nach, jedes Mal wenn sie den Standort sendet (alle {n} Minuten).',
      sender: 'ES SENDET', yourTeamFallback: 'Euer Team', send: 'SENDEN', fillAll: 'Bitte füllt alle Felder aus.',
      here: 'WIR SIND HIER!', locatingLow: 'Standort wird ermittelt…', moreTo: 'Noch nicht hier. Weiter nach {dir}!',
      guessCont: 'SPIEL FORTSETZEN', guessStart: 'COUNTDOWN STARTEN · {t}', refereeOnly: 'Ab jetzt hält nur der Schiedsrichter das Handy.',
      guessedSkipped: 'Erraten {g} · übersprungen {s}', guessSummary: 'Erraten {g} · übersprungen {s} · {p} pro Wort, gerundet',
      referee: 'SCHIEDSRICHTER', allWords: 'Alle Wörter sind durch', timeUp: 'Die Zeit ist um', wordOf: 'WORT {i} / {n}',
      dontSay: 'NICHT LAUT SAGEN', readAloud: 'LAUT VORLESEN', guessedBtn: 'ERRATEN · +{s} s', skip: 'ÜBERSPRINGEN',
      secsLeft: 'Noch {n} Sekunden', guessCounts: 'ERRATEN {g} · ÜBERSPRUNGEN {s}',
      locatingTarget: 'Standort wird ermittelt…', atFinish: 'ihr seid am Ziel', target: 'ZIEL · {x}', noLocation: 'Standort nicht verfügbar',
      showOnCompass: 'AUF DEM KOMPASS ZEIGEN', quizCont: 'QUIZ FORTSETZEN', quizStartHere: 'WIR SIND AM ZIEL · QUIZ STARTEN', quizStart: 'QUIZ STARTEN',
      chronicleNow: 'JETZT IN DIE CHRONIK EINTRAGEN', overGoFinish: 'Das Spiel ist vorbei. Geht zum Ziel und startet das Quiz.',
      notAtFinish: 'Ihr seid noch nicht am Ziel, noch {d} {dir}.',
      chronicleAsk: 'Jetzt in die Chronik eintragen? Das Spiel endet dann für euer Team und es können keine weiteren Aufgaben erfüllt werden.',
      chronicle: 'DIE CHRONIK', kRight: 'Richtig! +{n} {pts}', kWrong: 'Leider nicht. Richtig ist: {x}',
      kQuestion: 'Aus welchem Werk stammt der Auszug auf dieser Karte?', kOptions: 'Antworten', kResult: 'ERGEBNIS ANZEIGEN', kNext: 'NÄCHSTE FRAGE',
      kHint: 'Wählt eine Antwort. Sie kann nicht zurückgenommen werden.',
      endStations: 'Punkte von den Stationen', endQuiz: 'Quiz · {ok} / {n} richtig', endBonus: 'Bonus, wartet auf die Bewertung', endTotal: 'Gesamt',
      endTitle: 'In die Chronik eingetragen', endVerse: 'Und dann traten wir hinaus, die Sterne wiederzusehen.',
      range: 'RADIUS {r}', showChip: '{x} anzeigen', noPlace: 'OHNE FESTEN ORT',
      noSensor: 'Dieses Handy liefert keine Blickrichtung. Norden bleibt oben.', sensorDenied: 'Der Zugriff auf den Kompass wurde nicht erlaubt. Norden bleibt oben.',
      northUp: 'Norden ist oben', waitCompass: 'Warte auf den Kompass…', facing: 'Ihr schaut nach {dir} · {deg}°',
      geoOff: 'STANDORT NICHT VERFÜGBAR · STANDORTZUGRIFF ERLAUBEN', geoWait: 'WARTE AUF STANDORT…', geoLive: 'STANDORT AKTUALISIERT SICH SELBST · VOR {s} S',
      focusOnly: 'Auf dem Kompass ist nur das Ziel.', showAll: 'Alle Karten zeigen', orient: 'Ausrichtung des Kompasses', modeNorth: 'NORDEN OBEN', modeHeading: 'BLICKRICHTUNG',
      you: 'Euer Standort', waitPos: 'Warte auf Standort…', zoomOut: 'Verkleinern', zoomIn: 'Vergrößern', onCompass: 'AUF DEM KOMPASS ZEIGEN',
      rose: ['N', 'O', 'S', 'W'],
      dirAdv: ['nördlich', 'nordöstlich', 'östlich', 'südöstlich', 'südlich', 'südwestlich', 'westlich', 'nordwestlich'],
      dirAcc: ['Norden', 'Nordosten', 'Osten', 'Südosten', 'Süden', 'Südwesten', 'Westen', 'Nordwesten'],
      dir4: { n: 'Norden', s: 'Süden', e: 'Osten', w: 'Westen' }
    }
  };
  D.STRINGS = S;   // tests compare the key sets

  function initial() {
    var saved = D.lsGet(KEY);
    if (LANGS.indexOf(saved) >= 0) return saved;
    var nav = String((navigator.languages && navigator.languages[0]) || navigator.language || '').toLowerCase();
    if (/^(cs|sk)\b/.test(nav)) return 'cs';
    if (/^de\b/.test(nav)) return 'de';
    return 'en';
  }
  D.lang = initial();
  document.documentElement.lang = D.lang;
  D.setLang = function (l) {
    if (LANGS.indexOf(l) < 0) return;
    D.lang = l; D.lsSet(KEY, l);
    document.documentElement.lang = l;
  };

  // raw value (string, array, object) in the current language, Czech as fallback
  D.tv = function (key) { var v = S[D.lang][key]; return v != null ? v : S.cs[key]; };
  D.t = function (key, vars) {
    var s = D.tv(key);
    if (s == null) return key;
    return vars ? s.replace(/\{(\w+)\}/g, function (m, k) { return vars[k] != null ? vars[k] : m; }) : s;
  };

  // ---- points, numbers, minutes, directions ----
  var PTS = {
    cs: function (n) { return !Number.isInteger(n) ? 'bodu' : n === 1 ? 'bod' : (n >= 2 && n <= 4 ? 'body' : 'bodů'); },
    en: function (n) { return n === 1 ? 'point' : 'points'; },
    de: function (n) { return n === 1 ? 'Punkt' : 'Punkte'; }
  };
  D.plural = function (n) { return PTS[D.lang](n).toUpperCase(); };      // "BODY", "POINTS", "PUNKTE"
  D.pluralLower = function (n) { return PTS[D.lang](n); };              // "body", "points", "Punkte"
  D.num = function (n) { var s = String(n); return D.lang === 'en' ? s : s.replace('.', ','); };
  D.ptsText = function (n) { return D.num(n) + ' ' + D.pluralLower(n); };   // "3 body", "0,42 bodu"
  D.ptsLabel = function (n) { return D.num(n) + ' ' + D.plural(n); };       // "3 BODY", "0,42 BODU"
  D.minutesText = function (m) {
    var w = D.tv('minutes');
    return m + ' ' + (m === 1 ? w[0] : (m <= 4 ? w[1] : w[2]));
  };
  D.dirAdv = function (deg) { return D.tv('dirAdv')[Math.round(deg / 45) % 8]; };
  D.dirAcc = function (deg) { return D.tv('dirAcc')[Math.round(deg / 45) % 8]; };

  // ---- translated content: data/cards/<id>.<lang>.json, game "i18n": { "<lang>": { title, place, date, finishText } } ----
  D.cardOf = function (id) { return D.data.cards[id + '.' + D.lang] || D.data.cards[id] || null; };
  D.gameText = function (g, key) {
    var o = g && g.i18n && g.i18n[D.lang];
    return (o && o[key] != null) ? o[key] : (g ? g[key] : '');
  };

  // ---- flag switch (top right on every screen): tap = next language ----
  var FLAG = {
    cs: '<svg viewBox="0 0 6 4" preserveAspectRatio="none" aria-hidden="true"><rect width="6" height="4" fill="#d7141a"/><rect width="6" height="2" fill="#fff"/><path d="M0 0L3 2L0 4z" fill="#11457e"/></svg>',
    en: '<svg viewBox="0 0 60 30" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><clipPath id="flag-uk"><path d="M30,15h30v15zv15h-30zh-30v-15zv-15h30z"/></clipPath>' +
      '<rect width="60" height="30" fill="#012169"/><path d="M0,0L60,30M60,0L0,30" stroke="#fff" stroke-width="6"/>' +
      '<path d="M0,0L60,30M60,0L0,30" clip-path="url(#flag-uk)" stroke="#c8102e" stroke-width="4"/>' +
      '<path d="M30,0v30M0,15h60" stroke="#fff" stroke-width="10"/><path d="M30,0v30M0,15h60" stroke="#c8102e" stroke-width="6"/></svg>',
    de: '<svg viewBox="0 0 5 3" preserveAspectRatio="none" aria-hidden="true"><rect width="5" height="1" fill="#000"/><rect y="1" width="5" height="1" fill="#dd0000"/><rect y="2" width="5" height="1" fill="#ffce00"/></svg>'
  };
  function nextLang() { return LANGS[(LANGS.indexOf(D.lang) + 1) % LANGS.length]; }
  D.flag = function (cls) {
    return '<button type="button" class="flagbtn' + (cls ? ' ' + cls : '') + '" data-act="lang" data-testid="lang-flag" data-lang="' + D.lang + '" aria-label="' +
      D.esc(D.t('langSwitch', { next: D.tv('langNames')[nextLang()] })) + '">' + FLAG[D.lang] + '</button>';
  };
  // back link on the left, flag on the right
  D.topRow = function (label, act) { return '<div class="toprow">' + D.back(label, act) + D.flag() + '</div>'; };

  // redraw in the new language, keeping what was typed or picked but not yet sent
  D.acts = D.acts || {};
  D.acts.lang = function () {
    var form = D.$$('#app input, #app textarea').map(function (el) { return { id: el.id, type: el.type, name: el.name, value: el.value, checked: el.checked }; });
    D.setLang(nextLang());
    D.refresh();
    form.forEach(function (f) {
      if (f.type === 'radio') {
        if (!f.checked) return;
        D.$$('#app input[type=radio]').forEach(function (r) { if (r.name === f.name && r.value === f.value && !r.disabled) r.checked = true; });
      } else if (f.id) {
        var el = document.getElementById(f.id);
        if (el && el.value !== f.value) el.value = f.value;
      }
    });
  };
})();
