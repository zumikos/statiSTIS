def export_ranking(master, output_dir, season=None):
    """Vytvoří žebříček STR pro všechny sezóny nebo pro jednu zadanou sezónu."""

    if season is None:
        seasons = sorted(master["Sezóna"].unique())
    else:
        seasons = [season]

    for season in seasons:
        ranking = (
            master[master["Sezóna"] == season]
            .sort_values(["STR", "ID"], ascending=[False, True])
            .reset_index(drop=True)
        )

        ranking["Pořadí"] = (
            ranking["STR"]
            .rank(method="min", ascending=False)
            .astype(int)
        )

        columns = [
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

        ranking = ranking[columns]

        file = output_dir / f"ranking_{season}.csv"
        ranking.to_csv(file, index=False, encoding="utf-8-sig")

        print(f"✓ Uložen žebříček STR {season} ({len(ranking)} hráčů).")