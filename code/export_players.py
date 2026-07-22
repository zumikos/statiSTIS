from export_movers import calculate_movers


def export_players(master, output_dir, movers_str_min=800):
    players = (
        master
        .sort_values(["ID", "Sezóna"])
        .drop_duplicates("ID", keep="last")
        [
            [
                "ID",
                "Hráč",
                "Rok narození",
                "Pohlaví"
            ]
        ]
    )
    
    rating = (
        master
        .pivot(
            index="ID",
            columns="Sezóna",
            values="STR"
        )
    )

    rating.columns = [f"{c} STR" for c in rating.columns]
    
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

        movers = calculate_movers(master, current, movers_str_min, ["Pohlaví"])
        movers[f"{current} počet skokanů"] = (
            movers.groupby("Pohlaví")["ID"].transform("size").astype("Int64")
        )
        movers = movers.rename(columns={
            "STR změna": f"{current} STR změna",
            "Pořadí": f"{current} Pořadí skokani"
        })
        mover_columns.append(
            movers.set_index("ID")[[
                f"{current} STR změna",
                f"{current} Pořadí skokani",
                f"{current} počet skokanů"
            ]]
        )
    
    players = (
        players
        .set_index("ID")
        .join(rating)
        .join(rank)
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
