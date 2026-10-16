# Dante – testy

Playwright (Python, Chromium) v emulaci telefonu (iPhone 13, Pixel 7). Lokální server se spustí
sám (`http://localhost:<port>/`), ntfy.sh je podvržený v paměti, Google Fonts / YouTube /
mapové dlaždice jsou zablokované. Test selže i při jakékoli chybě v konzoli.

    pip install playwright && python -m playwright install chromium
    python -X utf8 tests/run_tests.py            # vše (~45 s)
    python -X utf8 tests/run_tests.py kronika    # jen scénáře obsahující "kronika"
    python -X utf8 tests/run_tests.py --pixel -v # jen Pixel 7, s tracebackem

Snímky obrazovky: `tests/_shots/` (nebo cesta v proměnné `DANTE_SHOTS`).
Scénáře odpovídají testovacímu plánu (výběr hry, jméno, mřížka, odemykání, typy úkolů,
finále + kvíz kroniky, kompas, sledování polohy, oddělení her, panel pořadatele, rozložení
na 360/390 px, monitor pořadatele, jazyky: vlaječka cs → en → de, přepnutí uprostřed hry, žádná čeština v en/de,
stejná struktura přeložených karet, rozložení v en/de).
