const selectedSeason = getSelectedSeason();
const selectedGroup = getSelectedPlayerGroup();
const selectedAssociation = getSelectedAssociation();

// Sloupce a jejich šířky lze upravit přímo zde.
const RANKING_COLUMNS = [
    { data: "Pořadí", title: "Pořadí", width: "1%" },
    { data: "ID", title: "ID", width: "1%" },
    { data: "Hráč", title: "Hráč", width: "10rem" },
    { data: "Rok narození", title: "Rok<br>narození", width: "1%" },
    { data: "Kategorie", title: "Kate&shy;gorie", width: "1%" },
    { data: "Pohlaví", title: "Po&shy;hlaví", width: "1%" },
    { data: "Oddíl", title: "Oddíl", width: "12rem" },
    { data: "Kraj", title: "Svaz", width: "1%" },
    { data: "STR", title: "STR", width: "1%", render: renderThousands }
];

setupSeasonSelect(SEASONS, selectedSeason, "hraci.html", "season", formatRankingDate);
setupPlayerGroupSelection(selectedGroup, "hraci.html", selectedSeason);
setupAssociationSelection(selectedAssociation, "hraci.html", selectedSeason);
createStatisticsTable({
    tableId: "ranking",
    csvFile: `csv/ranking_${selectedSeason}.csv`,
    columns: RANKING_COLUMNS,
    rowFilter: row =>
        playerMatchesGroup(row, selectedGroup, selectedSeason) &&
        playerMatchesAssociation(row, selectedAssociation),
    rankField: selectedGroup.value === "all" && selectedAssociation.value === "all"
        ? null
        : "STR",
    categorySeason: selectedSeason,
    order: [[0, "asc"]],
    columnDefs: [
        { targets: "_all", className: "dt-head-center" },
        { targets: [3, 4, 5, 7], className: "dt-body-center" },
        { targets: [2, 6], className: "wrap-column" },
        { targets: [0, 1, 3, 4, 5, 7, 8], className: "nowrap-column" }
    ]
});
