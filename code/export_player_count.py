def export_player_count(master, output_dir):
    counts = (
        master
        .groupby("Sezóna")
        .size()
        .reset_index(name="Počet hráčů")
    )

    counts.to_csv(
        output_dir / "player_count.csv",
        index=False,
        encoding="utf-8-sig",
    )
    print("✓ Uložena data počtu hráčů.")
