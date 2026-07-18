from pathlib import Path
import sys
import pandas as pd
from export_ranking import export_ranking
from export_movers import export_movers
from export_players import export_players
from export_player_count import export_player_count

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

BASE_DIR = Path(__file__).resolve().parent.parent # složka projektu
DATA_DIR = BASE_DIR / "source" # zdroje dat jsou ve složce /source
CSV_DIR = BASE_DIR / "csv"     # csv soubory budou ve složce /csv

CSV_DIR.mkdir(exist_ok=True)

MOVERS_STR_MIN = 800

def load_all_seasons():
    """Načtení jednotlivých sezón"""

    frames = []

    for file in sorted(DATA_DIR.glob("*.xlsx")):

        year = int(file.stem)

        print(f"Načítám {file.name}")

        df = pd.read_excel(file)

        df["Pořadí"] = df["Pořadí"].astype("Int64")  
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
                "Pořadí",
                "Sezóna"
            ]
        ])

    return pd.concat(frames, ignore_index=True)

master = load_all_seasons()
print(f"Načteno {len(master)} záznamů.\n")

export_ranking(master, CSV_DIR, None) # export všech sezón
export_movers(master, CSV_DIR, None, MOVERS_STR_MIN) # export všech sezón
export_players(master, CSV_DIR, MOVERS_STR_MIN) # export jednotlivých hráčů
export_player_count(master, CSV_DIR) # export počtu hráčů v jednotlivých sezónách

print("\nHotovo.")
