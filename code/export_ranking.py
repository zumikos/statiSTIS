def export_ranking(master, output_dir, season):
    """Vytvoří žebříček pro nejnovější sezónu"""

    if season is None:
        last_year = master["Sezóna"].max()
    else:
        last_year = season

    ranking = (
        master[master["Sezóna"] == last_year]
        .sort_values(["STR", "ID"],ascending=[False, True]
        )
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
        "Rok",
        "Po-hlaví",
        "Oddíl",
        "Kraj",
        "Region",
        "STR",
    ]

    ranking = ranking[columns]

    file = output_dir / f"ranking_{last_year}.csv"
    ranking.to_csv(file, index=False, encoding="utf-8-sig")

    print(f"✓ Uložen žebříček STR ({len(ranking)} hráčů).")