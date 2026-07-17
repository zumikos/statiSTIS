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
    
    rank = (
        master
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

        previous_ratings = (
            master[master["Sezóna"] == previous][["ID", "STR"]]
            .rename(columns={"STR": "PreviousSTR"})
        )
        current_ratings = (
            master[master["Sezóna"] == current][["ID", "STR"]]
            .rename(columns={"STR": "CurrentSTR"})
        )
        movers = current_ratings.merge(previous_ratings, on="ID", how="inner")
        movers = movers[movers["PreviousSTR"] >= movers_str_min].copy()
        movers[f"{current} změna"] = movers["CurrentSTR"] - movers["PreviousSTR"]
        movers[f"{current} skokani pořadí"] = (
            movers[f"{current} změna"]
            .rank(method="min", ascending=False)
            .astype("Int64")
        )
        mover_columns.append(
            movers.set_index("ID")[[f"{current} změna", f"{current} skokani pořadí"]]
        )
    
    players = (
        players
        .set_index("ID")
        .join(rating)
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
