# statiSTIS

Statistiky z českého stolního tenisu.

## O projektu

Motivací k tomuto projektu bylo zkusit si vytvořit první webové stránky a navázat na web elost.cz, aby byly znovu zpřístupněny statistiky jako skokani sezóny.

Web spojuje veřejně dostupná data z žebříčků ze všech sezón systému STIS a nabízí zejména:

- seznam největších skokanů a skokanek podle sezóny, pohlaví, krajského svazu a minimálního výchozího STR;
- žebříčky hráčů podle sezóny, pohlaví, kraje a kategorie (U21, U19, U17, U15, U13 a U11);
- vyhledávání hráčů a jejich vývoj STR v jednotlivých sezónách;
- porovnání vývoje STR a pořadí dvou hráčů;
- historické rekordy nejvyššího STR a největších sezónních posunů;
- vyhledávání oddílů a oddílové žebříčky.

Mládežnické kategorie v žebříčcích jsou věkové limity, nikoli navzájem oddělené skupiny. Například výběr U19 proto zahrnuje také mladší hráče, kteří limit U19 splňují.

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
- Skript `code/update_html.py` udržuje společnou navigaci a metadata pro sdílení odkazů na sociálních sítích.

## Aktualizace dat

Po přidání zdrojových souborů pojmenovaných ve formátu `ranking_<počáteční_rok>_<koncový_rok>.xlsx`, například `ranking_2025_2026.xlsx`, se data vytvoří příkazem:

```powershell
.\.venv\Scripts\python.exe code\update.py
```

Skript vytvoří také malý `csv/home_top_<počáteční_rok>_<koncový_rok>.csv` pro čtyři úvodní Top 10 tabulky. Úplný žebříček se na úvodní stránce načítá až při přiblížení k sezónním grafům.

Vyhledávání hráčů používá malý soubor `csv/player_index.csv`. Úplné historie hráčů jsou rozdělené do menších souborů ve složce `csv/players/` a načtou se až po otevření profilu nebo výběru hráče do porovnání.

Výchozí sezóny webu a hodnoty nabízené ve výběru minimálního STR jsou uvedeny v konstantách `SEASONS` a `MOVERS_STR_MIN_VALUES` v `js/config.js`.
Při aktualizaci dat aktuální sezóny je potřeba upravit také `LATEST_RANKING_DATE` a `NEXT_RANKING_DATE`.

Po změně navigace, názvu, popisu nebo kanonické adresy stránky aktualizujte společné části HTML příkazem:

```powershell
.\.venv\Scripts\python.exe code\update_html.py
```

## Publikování

Projekt je statický web určený pro GitHub Pages. Nevyžaduje serverovou databázi ani backend.

## Zdroj dat

Data vycházejí z veřejně dostupných žebříčků systému STIS.
