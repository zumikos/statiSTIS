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

    rating_change = ratings_by_season.diff(axis="columns").iloc[:, 1:]
    rating_change.columns = [f"{c} STR změna" for c in rating_change.columns]
    
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
        movers[f"{current} počet skokanů"] = (
            movers.groupby("Pohlaví")["ID"].transform("size").astype("Int64")
        )
        movers = movers.rename(columns={
            "Pořadí": f"{current} Pořadí skokani"
        })
        mover_columns.append(
            movers.set_index("ID")[[
                f"{current} Pořadí skokani",
                f"{current} počet skokanů"
            ]]
        )

    players = (
        players
        .set_index("ID")
        .join(rating)
        .join(rank)
        .join(rating_change)
    )

    for mover_data in mover_columns:
        players = players.join(mover_data)

    player_counts = master.groupby(["Sezóna", "Pohlaví"]).size()
    for year in years:
        players[f"{year} počet hráčů"] = players["Pohlaví"].map(
            player_counts.loc[year]
        ).astype("Int64")

    players = players.reset_index()
    
    players.to_csv(
    output_dir / "players.csv",
    index=False,
    encoding="utf-8-sig"
    )
    
    print(f"✓ Uloženy statistiky hráčů ({len(players)} hráčů).")
