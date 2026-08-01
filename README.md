# statiSTIS

Statistiky z českého stolního tenisu.

## O projektu

Motivací k tomuto projektu bylo zkusit si vytvořit první webové stránky a navázat na web elost.cz, aby byly znovu zpřístupněny statistiky jako skokani sezóny.

Web spojuje veřejně dostupná data z žebříčků ze všech sezón systému STIS a nabízí zejména:

- seznam největších skokanů a skokanek sezón, a to i pro jednotlivé mládežnické kategorie;
- žebříčky hráčů podle sezóny, pohlaví, kraje a kategorie (U21, U19, U17, U15 a U13);
- vyhledávání hráčů a jejich vývoj STR po konci každé aktivní sezóny;
- vyhledávání oddílů a oddílové žebříčky.

Web je nezávislý statistický projekt a není oficiální stránkou České asociace stolního tenisu.

## Struktura projektu

- HTML stránky jsou v kořenové složce.
- Konstanty a přepisované názvy jsou v `js/config.js`.
- Obecné formátování, načítání CSV a stránkování výsledků jsou v `js/utils.js`.
- Sdílené vykreslování grafů je v `js/charts.js`.
- Ovládání filtrů a tabulek DataTables je v `js/tables.js`.
- Logika jednotlivých stránek je v souborech ve složce `js/`.
- Vzhled webu je definován v `css/style.css`.
- Obrázky a logo webu jsou ve složce `images/`.
- Zdrojové žebříčky ve formátu XLSX naleznete ve složce `source/`.
- Python skripty ve složce `code/` zpracují zdrojová data a vytvoří soubory ve složce `csv/`.

## Aktualizace dat

Po přidání zdrojových souborů pojmenovaných podle koncového roku sezóny, například `2026.xlsx`, se data vytvoří příkazem:

```powershell
.\.venv\Scripts\python.exe code\update.py
```

Výchozí sezóny webu a hodnoty nabízené ve výběru minimálního STR jsou uvedeny v konstantách `SEASONS` a `MOVERS_STR_MIN_VALUES` v `js/config.js`.

## Publikování

Projekt je statický web určený pro GitHub Pages. Nevyžaduje serverovou databázi ani backend.

## Zdroj dat

Data vycházejí z veřejně dostupných žebříčků systému STIS.
