import pandas as pd

from constants import MOVERS_STR_MINIMUMS, YOUTH_AGES


RECORD_LIMIT = 3
RECORD_COLUMNS = [
    "Typ", "Kategorie", "STR minimum", "Pořadí", "ID", "Hráč", "Pohlaví",
    "Oddíl", "Sezóna", "STR", "STR změna"
]


def top_by_sex(data, value_column):
    ranked = data.copy()
    ranked["Pořadí"] = (
        ranked.groupby("Pohlaví")[value_column]
        .rank(method="min", ascending=False)
        .astype("Int64")
    )
    ranked = ranked.sort_values(
        ["Pohlaví", value_column, "Sezóna", "ID"],
        ascending=[True, False, False, True]
    )
    return ranked.groupby("Pohlaví", sort=False).head(RECORD_LIMIT)


def career_highs(data):
    return (
        data.sort_values(
            ["ID", "STR", "Sezóna"],
            ascending=[True, False, False]
        )
        .drop_duplicates("ID", keep="first")
    )


def export_records(master, output_dir, mover_frames):
    highest_str = top_by_sex(career_highs(master), "STR")
    highest_str["Typ"] = "highest_str"
    highest_str["Kategorie"] = pd.NA
    highest_str["STR minimum"] = pd.NA
    highest_str["STR změna"] = pd.NA

    category_records = []
    for age in YOUTH_AGES:
        eligible = master[master["Rok narození"] >= master["Sezóna"] - age]
        category_highs = top_by_sex(career_highs(eligible), "STR")
        category_highs["Typ"] = "category_highest_str"
        category_highs["Kategorie"] = f"U{age}"
        category_highs["STR minimum"] = pd.NA
        category_highs["STR změna"] = pd.NA
        category_records.append(category_highs)

    records = [highest_str, *category_records]
    if mover_frames:
        all_movers = pd.concat(mover_frames.values(), ignore_index=True)
        for str_minimum in MOVERS_STR_MINIMUMS:
            movers = all_movers[all_movers["STR loňské"] >= str_minimum].copy()
            movers = top_by_sex(movers, "STR změna")
            movers["Typ"] = "mover"
            movers["Kategorie"] = pd.NA
            movers["STR minimum"] = str_minimum
            movers["STR"] = movers["STR letošní"]
            records.append(movers)

    output = pd.concat(records, ignore_index=True)
    output["STR minimum"] = output["STR minimum"].astype("Int64")
    output["STR změna"] = output["STR změna"].astype("Int64")
    output[RECORD_COLUMNS].to_csv(
        output_dir / "records.csv",
        index=False,
        encoding="utf-8-sig"
    )
    print(f"✓ Uloženy rekordy ({len(output)} záznamů).")
