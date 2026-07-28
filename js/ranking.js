const selectedSeason = getSelectedSeason();
const selectedGroup = getSelectedPlayerGroup();

// Sloupce a jejich šířky lze upravit přímo zde.
const RANKING_COLUMNS = [
    { data: "Pořadí", title: "Pořadí", width: "1%" },
    { data: "ID", title: "ID", width: "1%" },
    { data: "Hráč", title: "Hráč", width: "10rem" },
    { data: "Rok narození", title: "Rok narození", width: "1%" },
    { data: "Kategorie", title: "Kategorie", width: "1%" },
    { data: "Pohlaví", title: "Pohlaví", width: "1%" },
    { data: "Oddíl", title: "Oddíl", width: "12rem" },
    { data: "Kraj", title: "Svaz", width: "1%" },
    { data: "STR", title: "STR", width: "1%" }
];

setupSeasonSelect(SEASONS, selectedSeason, "zebricky.html");
setupPlayerGroupSelection(selectedGroup, "zebricky.html", selectedSeason);
createStatisticsTable({
    tableId: "ranking",
    csvFile: `csv/ranking_${selectedSeason}.csv`,
    columns: RANKING_COLUMNS,
    rowFilter: row => playerMatchesGroup(row, selectedGroup, selectedSeason),
    rankField: selectedGroup.value === "all" ? null : "STR",
    categorySeason: selectedSeason,
    order: [[0, "asc"]],
    columnDefs: [
        { targets: "_all", className: "dt-head-center" },
        { targets: [3, 4, 5, 7], className: "dt-body-center" },
        { targets: [2, 6], className: "wrap-column" },
        { targets: [0, 1, 3, 4, 5, 7, 8], className: "nowrap-column" }
    ]
});
