def export_movers(master, output_dir, season=None, STRmin=800):
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

        prev = (
            master[master["Sezóna"] == previous][["ID", "STR"]]
            .rename(columns={"STR": "PreviousSTR"})
        )

        curr = (
            master[master["Sezóna"] == current][
                [
                    "Pořadí",
                    "ID",
                    "Hráč",
                    "Rok narození",
                    "Pohlaví",
                    "Oddíl",
                    "Kraj",
                    "Region",
                    "STR",
                ]
            ]
            .rename(columns={"STR": "CurrentSTR"})
        )

        movers = curr.merge(prev, on="ID", how="inner")
        movers = movers[movers["PreviousSTR"] >= STRmin]

        movers["STR_změna"] = (
            movers["CurrentSTR"] - movers["PreviousSTR"]
        ).astype("Int64")

        movers = (
            movers
            .sort_values("STR_změna", ascending=False)
            .reset_index(drop=True)
        )

        movers["Pořadí"] = (
            movers["STR_změna"]
            .rank(method="min", ascending=False)
            .astype(int)
        )

        file = output_dir / f"movers_{previous}_{current}_STR{STRmin}.csv"

        movers.to_csv(
            file,
            index=False,
            encoding="utf-8-sig"
        )

        print(
            f"✓ Uloženi skokani sezóny {previous}/{current} "
            f", STRmin = {STRmin} ({len(movers)} hráčů)."
        )