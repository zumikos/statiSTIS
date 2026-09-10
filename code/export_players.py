import pandas as pd

from export_movers import calculate_movers

PLAYER_MOVERS_STR_MIN = 800


def export_players(master, output_dir):
    players = (
        master
        .sort_values(["ID", "Sezóna"])
        .drop_duplicates("ID", keep="last")
        [
            [
                "ID",
                "Hráč",
                "Rok narození",
                "Pohlaví",
                "Oddíl"
            ]
        ]
    )
    
    ratings_by_season = (
        master
        .pivot(
            index="ID",
            columns="Sezóna",
            values="STR"
        )
    )

    rating = ratings_by_season.copy()
    rating.columns = [f"{c} STR" for c in rating.columns]

    teams_by_season = master.pivot(
        index="ID",
        columns="Sezóna",
        values="Oddíl"
    )
    teams_by_season.columns = [f"{c} Oddíl" for c in teams_by_season.columns]

    ranked_by_sex = master.copy()
    ranked_by_sex["Pořadí"] = (
        ranked_by_sex
        .groupby(["Sezóna", "Pohlaví"])["STR"]
        .rank(method="min", ascending=False)
        .astype("Int64")
    )

    rank = (
        ranked_by_sex
        .pivot(
            index="ID",
            columns="Sezóna",
            values="Pořadí"
        )
    )

    rank.columns = [f"{c} pořadí" for c in rank.columns]

    years = sorted(master["Sezóna"].unique())
    mover_columns = []
    mover_counts = pd.DataFrame(
        0,
        index=years,
        columns=["Skokani muži", "Skokani ženy"],
        dtype="Int64"
    )

    for current in years[1:]:
        previous = current - 1
        if previous not in years:
            continue

        movers = calculate_movers(
            master,
            current,
            PLAYER_MOVERS_STR_MIN,
            ["Pohlaví"]
        )
        counts = movers.groupby("Pohlaví").size()
        mover_counts.loc[current, "Skokani muži"] = counts.get("M", 0)
        mover_counts.loc[current, "Skokani ženy"] = counts.get("Z", 0)
        movers = movers.rename(columns={
            "Pořadí": f"{current} Pořadí skokani"
        })
        mover_columns.append(
            movers.set_index("ID")[[f"{current} Pořadí skokani"]]
        )

    players = (
        players
        .set_index("ID")
        .join(rating)
        .join(teams_by_season)
        .join(rank)
    )

    for mover_data in mover_columns:
        players = players.join(mover_data)

    players = players.reset_index()
    
    players.to_csv(
    output_dir / "players.csv",
    index=False,
    encoding="utf-8-sig"
    )
    
    print(f"✓ Uloženy statistiky hráčů ({len(players)} hráčů).")
    return mover_counts
