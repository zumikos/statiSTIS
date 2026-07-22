def calculate_movers(master, current, str_min=800, rank_groups=None):
    previous = current - 1
    previous_ratings = (
        master[master["Sezóna"] == previous][["ID", "STR"]]
        .rename(columns={"STR": "STR loňské"})
    )
    current_ratings = (
        master[master["Sezóna"] == current][
            ["ID", "Hráč", "Rok narození", "Pohlaví", "Oddíl", "Kraj", "Region", "STR"]
        ]
        .rename(columns={"STR": "STR letošní"})
    )

    movers = current_ratings.merge(previous_ratings, on="ID", how="inner")
    movers = movers[movers["STR loňské"] >= str_min].copy()
    movers["STR změna"] = (movers["STR letošní"] - movers["STR loňské"]).astype("Int64")
    movers = movers.sort_values("STR změna", ascending=False).reset_index(drop=True)

    if rank_groups:
        movers["Pořadí"] = (
            movers.groupby(rank_groups)["STR změna"]
            .rank(method="min", ascending=False)
            .astype("Int64")
        )
    else:
        movers["Pořadí"] = movers["STR změna"].rank(method="min", ascending=False).astype("Int64")

    return movers


def export_movers(master, output_dir, season=None, str_min=800):
    """Vytvoří žebříčky skokanů STR pro všechny dostupné sezóny nebo pro zadanou sezónu."""

    years = sorted(master["Sezóna"].unique())

    if len(years) < 2:
        print("Nelze spočítat skokany – pouze jedna sezóna.")
        return

    if season is None: # chceme exportovat všechny sezóny
        seasons = years[1:] # první sezóna nemá předchozí rok
    else:
        seasons = [season]

    for current in seasons:
        previous = current - 1

        if previous not in years:
            print(f"⚠ Přeskakuji {current}: chybí předchozí sezóna {previous}.")
            continue

        movers = calculate_movers(master, current, str_min)

        columns = [
            "Pořadí", "ID", "Hráč", "Rok narození", "Pohlaví",
            "Oddíl", "Kraj", "Region", "STR letošní", "STR loňské", "STR změna"
        ]
        movers = movers[columns]

        file = output_dir / f"movers_{previous}_{current}_STR{str_min}.csv"

        movers.to_csv(
            file,
            index=False,
            encoding="utf-8-sig"
        )

        print(
            f"✓ Uloženi skokani sezóny {previous}/{current}"
            f", STRmin = {str_min} ({len(movers)} hráčů)."
        )
