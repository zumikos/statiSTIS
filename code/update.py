from pathlib import Path
import pandas as pd
from export_ranking import export_ranking
from export_movers import export_movers
from export_players import export_players
from plots import plot_histogram, plot_player_count

DATA_DIR = Path("source") # data jsou ve složce /source
CSV_DIR = Path("../website/csv") # csv soubory budou ve složce /website/csv
CSV_DIR.mkdir(exist_ok=True)
IMG_DIR = Path("../website/img") # obrázky a grafy budou ve složce /website/img
IMG_DIR.mkdir(exist_ok=True)
SEASON_RANKING = 2026
SEASON_MOVERS = 2026
MOVERS_STR_MIN = 800

def load_all_seasons():
    """Načtení jednotlivých sezón"""

    frames = []

    for file in sorted(DATA_DIR.glob("*.xlsx")):

        year = int(file.stem)

        print(f"Načítám {file.name}")

        df = pd.read_excel(file)

        df["Pořadí"] = df["Pořadí"].astype("Int64")  
        df["Rok"] = df["Rok"].astype("Int64")
        df["STR"] = df["STR"].astype("Int64")
        df["Sezóna"] = year

        frames.append(df[
            [
                "ID",
                "Hráč",
                "Rok",
                "Po-hlaví",
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

export_ranking(master, CSV_DIR, SEASON_RANKING)
export_movers(master, CSV_DIR, SEASON_MOVERS, MOVERS_STR_MIN)
export_players(master, CSV_DIR)

plot_histogram(master, IMG_DIR)
plot_player_count(master, IMG_DIR)

print("\nHotovo.")