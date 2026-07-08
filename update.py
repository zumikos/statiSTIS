from pathlib import Path
import pandas as pd
from export_ranking import export_ranking
from export_movers import export_movers
from export_players import export_players
from plots import plot_histogram, plot_player_count

DATA_DIR = Path("source") # data jsou ve složce \source
OUTPUT_DIR = Path("output")
OUTPUT_DIR.mkdir(exist_ok=True)
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

export_ranking(master, OUTPUT_DIR, SEASON_RANKING)
export_movers(master, OUTPUT_DIR, SEASON_MOVERS, MOVERS_STR_MIN)
export_players(master, OUTPUT_DIR)

plot_histogram(master, OUTPUT_DIR)
plot_player_count(master, OUTPUT_DIR)

print("\nHotovo.")