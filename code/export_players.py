import pandas as pd

from export_movers import MOVERS_STR_MINIMUMS, calculate_movers


PLAYER_PROFILE_SHARD_COUNT = 64


def player_age_category(row):
    birth_year = row["Rok narození"]
    if pd.isna(birth_year):
        return None

    age = row["Sezóna"] - birth_year
    if age > 21:
        return "dospělí"
    for category_age in (21, 19, 17, 15, 13):
        if age >= category_age - 1:
            return f"U{category_age}"
    return "U11"


def add_group_ranks(master, value_column):
    ranked = master.copy()
    ranked["Kategorie"] = ranked.apply(player_age_category, axis=1)
    ranked["Pořadí"] = (
        ranked.groupby(["Sezóna", "Pohlaví"])[value_column]
        .rank(method="min", ascending=False)
        .astype("Int64")
    )
    ranked["Pořadí kraj"] = (
        ranked.groupby(["Sezóna", "Pohlaví", "Kraj"])[value_column]
        .rank(method="min", ascending=False)
        .astype("Int64")
    )
    ranked["Pořadí kategorie"] = pd.NA
    ranked["Pořadí kraj kategorie"] = pd.NA

    count_frames = []

    def add_counts(data, category):
        national = (
            data.groupby(["Sezóna", "Pohlaví"])
            .size()
            .rename("Počet")
            .reset_index()
        )
        national["Kraj"] = ""
        regional = (
            data.groupby(["Sezóna", "Pohlaví", "Kraj"])
            .size()
            .rename("Počet")
            .reset_index()
        )
        national["Kategorie"] = category
        regional["Kategorie"] = category
        count_frames.extend([national, regional])

    add_counts(ranked, "dospělí")
    for category_age in (21, 19, 17, 15, 13, 11):
        category = f"U{category_age}"
        eligible = ranked["Rok narození"] >= ranked["Sezóna"] - category_age
        category_rows = ranked[eligible]
        national_ranks = (
            category_rows.groupby(["Sezóna", "Pohlaví"])[value_column]
            .rank(method="min", ascending=False)
            .astype("Int64")
        )
        regional_ranks = (
            category_rows.groupby(["Sezóna", "Pohlaví", "Kraj"])[value_column]
            .rank(method="min", ascending=False)
            .astype("Int64")
        )
        players_in_category = ranked["Kategorie"] == category
        ranked.loc[players_in_category, "Pořadí kategorie"] = national_ranks
        ranked.loc[players_in_category, "Pořadí kraj kategorie"] = regional_ranks
        add_counts(category_rows, category)

    rank_counts = pd.concat(count_frames, ignore_index=True)[
        ["Sezóna", "Pohlaví", "Kraj", "Kategorie", "Počet"]
    ]
    return ranked, rank_counts


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

    associations_by_season = master.pivot(
        index="ID",
        columns="Sezóna",
        values="Kraj"
    )
    associations_by_season.columns = [f"{c} Kraj" for c in associations_by_season.columns]

    ranked_players, player_rank_counts = add_group_ranks(master, "STR")
    rank_tables = []
    for column, suffix in (
        ("Pořadí", "pořadí"),
        ("Pořadí kraj", "pořadí kraj"),
        ("Pořadí kategorie", "pořadí kategorie"),
        ("Pořadí kraj kategorie", "pořadí kraj kategorie")
    ):
        rank = ranked_players.pivot(
            index="ID",
            columns="Sezóna",
            values=column
        )
        rank.columns = [f"{c} {suffix}" for c in rank.columns]
        rank_tables.append(rank)

    years = sorted(master["Sezóna"].unique())
    mover_columns = []
    mover_rank_columns = []
    mover_count_frames = []
    mover_sex_counts = pd.DataFrame(
        0,
        index=years,
        columns=["Skokani muži", "Skokani ženy"],
        dtype="Int64"
    )

    for str_minimum in MOVERS_STR_MINIMUMS:
        minimum_rank_columns = []
        for current in years[1:]:
            previous = current - 1
            if previous not in years:
                continue

            movers = calculate_movers(master, current, str_minimum)
            movers["Sezóna"] = current
            ranked_movers, current_mover_counts = add_group_ranks(movers, "STR změna")
            current_mover_counts["STR minimum"] = str_minimum
            mover_count_frames.append(current_mover_counts)
            if str_minimum == MOVERS_STR_MINIMUMS[0]:
                counts = movers.groupby("Pohlaví").size()
                mover_sex_counts.loc[current, "Skokani muži"] = counts.get("M", 0)
                mover_sex_counts.loc[current, "Skokani ženy"] = counts.get("Z", 0)
            for column, suffix in (
                ("Pořadí", "Pořadí skokani"),
                ("Pořadí kraj", "Pořadí skokani kraj"),
                ("Pořadí kategorie", "Pořadí skokani kategorie"),
                ("Pořadí kraj kategorie", "Pořadí skokani kraj kategorie")
            ):
                output_column = f"{current} {suffix}"
                mover_rank = ranked_movers.rename(columns={column: output_column})
                rank_column = mover_rank.set_index("ID")[[output_column]]
                if str_minimum == MOVERS_STR_MINIMUMS[0]:
                    target = mover_columns if column == "Pořadí" else mover_rank_columns
                    target.append(rank_column)
                else:
                    minimum_rank_columns.append(rank_column)

        if minimum_rank_columns:
            minimum_ranks = pd.concat(minimum_rank_columns, axis="columns")
            minimum_ranks.reset_index().to_csv(
                output_dir / f"player_mover_ranks_STR{str_minimum}.csv",
                index=False,
                encoding="utf-8-sig"
            )

    players = (
        players
        .set_index("ID")
        .join(rating)
        .join(teams_by_season)
        .join(rank_tables[0])
    )

    scope_ranks = {
        "category": rank_tables[2],
        "region": associations_by_season.join(rank_tables[1]),
        "region_category": rank_tables[3]
    }
    for mover_rank in mover_rank_columns:
        column = mover_rank.columns[0]
        if "kraj kategorie" in column:
            scope = "region_category"
        elif "kategorie" in column:
            scope = "category"
        else:
            scope = "region"
        scope_ranks[scope] = scope_ranks[scope].join(mover_rank)

    for mover_data in mover_columns:
        players = players.join(mover_data)

    players = players.reset_index()
    
    profile_dir = output_dir / "players"
    profile_dir.mkdir(exist_ok=True)
    players["Profil"] = players["ID"].astype("Int64") % PLAYER_PROFILE_SHARD_COUNT
    players[["ID", "Hráč", "Rok narození", "Profil"]].to_csv(
        output_dir / "player_index.csv",
        index=False,
        encoding="utf-8-sig"
    )
    profile_files = set()
    for profile, rows in players.groupby("Profil"):
        profile_file = profile_dir / f"{profile:02d}.csv"
        rows.drop(columns="Profil").to_csv(
            profile_file,
            index=False,
            encoding="utf-8-sig"
        )
        profile_files.add(profile_file)
    for old_profile_file in profile_dir.glob("*.csv"):
        if old_profile_file not in profile_files:
            old_profile_file.unlink()
    players = players.drop(columns="Profil")
    count_keys = ["Sezóna", "Pohlaví", "Kraj", "Kategorie"]
    mover_rank_counts = (
        pd.concat(mover_count_frames, ignore_index=True)
        .pivot(index=count_keys, columns="STR minimum", values="Počet")
        .rename(columns=lambda value: f"Počet skokanů {value}")
        .reset_index()
    )
    rank_counts = player_rank_counts.rename(columns={"Počet": "Počet hráčů"}).merge(
        mover_rank_counts,
        on=count_keys,
        how="left"
    )
    for str_minimum in MOVERS_STR_MINIMUMS:
        rank_counts[f"Počet skokanů {str_minimum}"] = (
            rank_counts[f"Počet skokanů {str_minimum}"].astype("Int64")
        )
    rank_counts.to_csv(
        output_dir / "player_ranks_counts.csv",
        index=False,
        encoding="utf-8-sig"
    )
    for scope, ranks in scope_ranks.items():
        ranks.dropna(how="all").reset_index().to_csv(
            output_dir / f"player_ranks_{scope}.csv",
            index=False,
            encoding="utf-8-sig"
        )
    
    print(f"✓ Uloženy statistiky hráčů ({len(players)} hráčů).")
    return mover_sex_counts
