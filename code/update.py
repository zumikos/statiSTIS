from pathlib import Path
import sys
import pandas as pd
from export_ranking import export_ranking
from export_movers import export_movers, calculate_movers
from export_players import export_players
from export_records import export_records

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent # složka projektu
DATA_DIR = BASE_DIR / "source" # zdroje dat jsou ve složce /source
CSV_DIR = BASE_DIR / "csv"     # csv soubory budou ve složce /csv
CSV_DIR.mkdir(exist_ok=True)

MOVERS_STR_MIN = 800
MOVERS_STR_MIN_VALUES = (MOVERS_STR_MIN, 1200, 1600, 2000)

def export_home_top(master):
    """Uloží jen řádky potřebné pro čtyři tabulky na úvodní stránce."""
    season = int(master["Sezóna"].max())
    ranking = (
        master[master["Sezóna"] == season]
        .sort_values(["STR", "ID"], ascending=[False, True])
        .groupby("Pohlaví", sort=False).head(10)
        .assign(Typ="ranking")
    )
    movers = (
        calculate_movers(master, season, MOVERS_STR_MIN)
        .groupby("Pohlaví", sort=False).head(10)
        .assign(Typ="movers")
    )
    home_top = pd.concat([ranking, movers], ignore_index=True)
    columns = ["Typ", "Pohlaví", "ID", "Hráč", "Oddíl", "STR", "STR změna"]
    home_top[columns].to_csv(CSV_DIR / f"home_top_{season}.csv", index=False, encoding="utf-8-sig")
    print(f"✓ Uloženy Top 10 tabulky pro úvodní stránku ({len(home_top)} řádků).")

def load_all_seasons():
    """Načtení jednotlivých sezón"""

    frames = []

    for file in sorted(DATA_DIR.glob("*.xlsx")):

        year = int(file.stem)

        print(f"Načítám {file.name}")

        df = pd.read_excel(file)

        df["Rok narození"] = df["Rok narození"].astype("Int64")
        df["STR"] = df["STR"].astype("Int64")
        df["Sezóna"] = year

        frames.append(df[
            [
                "ID",
                "Hráč",
                "Rok narození",
                "Pohlaví",
                "Oddíl",
                "Kraj",
                "Region",
                "STR",
                "Sezóna"
            ]
        ])

    return pd.concat(frames, ignore_index=True)

master = load_all_seasons()
print(f"Načteno {len(master)} záznamů.\n")

export_ranking(master, CSV_DIR, None) # export všech sezón
for str_min in MOVERS_STR_MIN_VALUES:
    export_movers(master, CSV_DIR, None, str_min) # export všech sezón i všech hranic STR
export_home_top(master) # export tabulek Top 10 pro úvodní stránku
mover_counts = export_players(master, CSV_DIR) # export jednotlivých hráčů, skokani jen pro STR 800+
export_records(master, CSV_DIR) # export rekordů STR a skokanů
player_counts = (
    master.groupby(["Sezóna", "Pohlaví"])
    .size()
    .unstack(fill_value=0)
    .rename(columns={"M": "Muži", "Z": "Ženy"})
)
player_counts.insert(0, "Všichni", player_counts.sum(axis="columns"))
player_counts = player_counts.join(mover_counts)
ages = master.assign(Věk=master["Sezóna"] - master["Rok narození"])
player_counts["Medián věku všichni"] = ages.groupby("Sezóna")["Věk"].median()
for sex, label in (("M", "muži"), ("Z", "ženy")):
    player_counts[f"Medián věku {label}"] = (
        ages[ages["Pohlaví"] == sex].groupby("Sezóna")["Věk"].median()
    )
player_counts = player_counts.reset_index().rename_axis(None, axis="columns")
player_counts.to_csv(CSV_DIR / "player_count.csv", index=False, encoding="utf-8-sig")
print("\nHotovo.")
