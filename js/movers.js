const moverSeasons = SEASONS.slice(1);
const selectedSeason = getSelectedSeason(moverSeasons);
const selectedGroup = getSelectedPlayerGroup();
const selectedAssociation = getSelectedAssociation();

// Sloupce a jejich šířky lze upravit přímo zde.
const MOVERS_COLUMNS = [
    { data: "Pořadí", title: "Pořadí", width: "1%" },
    { data: "ID", title: "ID", width: "1%" },
    { data: "Hráč", title: "Hráč", width: "9rem" },
    { data: "Rok narození", title: "Rok<br>narození", width: "1%" },
    { data: "Kategorie", title: "Kate&shy;gorie", width: "1%" },
    { data: "Pohlaví", title: "Po&shy;hlaví", width: "1%" },
    { data: "Oddíl", title: "Oddíl", width: "10rem" },
    { data: "Kraj", title: "Svaz", width: "1%" },
    { data: "STR loňské", title: "STR<br>loňské", width: "1%", render: renderThousands },
    { data: "STR letošní", title: "STR<br>letošní", width: "1%", render: renderThousands },
    { data: "STR změna", title: "STR<br>změna", width: "1%", render: renderThousands }
];

setupSeasonSelect(moverSeasons, selectedSeason, "skokani.html");
setupPlayerGroupSelection(selectedGroup, "skokani.html", selectedSeason);
setupAssociationSelection(selectedAssociation, "skokani.html", selectedSeason);
createStatisticsTable({
    tableId: "movers",
    csvFile: `csv/movers_${selectedSeason - 1}_${selectedSeason}_STR800.csv`,
    columns: MOVERS_COLUMNS,
    rowFilter: row =>
        playerMatchesGroup(row, selectedGroup, selectedSeason) &&
        playerMatchesAssociation(row, selectedAssociation),
    rankField: selectedGroup.value === "all" && selectedAssociation.value === "all"
        ? null
        : "STR změna",
    categorySeason: selectedSeason,
    order: [[0, "asc"]],
    columnDefs: [
        { targets: "_all", className: "dt-head-center" },
        { targets: [3, 4, 5, 7], className: "dt-body-center" },
        { targets: [2, 6], className: "wrap-column" },
        { targets: [0, 1, 3, 4, 5, 7, 8, 9, 10], className: "nowrap-column" },
        { targets: 10, className: "dt-body-right strong-column" }
    ]
});
