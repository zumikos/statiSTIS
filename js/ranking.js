const selectedSeason = getSelectedSeason();
const selectedSex = getSelectedSex();

// Sloupce a jejich šířky lze upravit přímo zde.
const RANKING_COLUMNS = [
    { data: "Pořadí", title: "Pořadí", width: "1%" },
    { data: "ID", title: "ID", width: "1%" },
    { data: "Hráč", title: "Hráč", width: "10rem" },
    { data: "Rok narození", title: "Rok narození", width: "1%" },
    { data: "Pohlaví", title: "Pohlaví", width: "1%" },
    { data: "Oddíl", title: "Oddíl", width: "12rem" },
    { data: "Kraj", title: "Kraj", width: "1%" },
    { data: "STR", title: "STR", width: "1%" }
];

setupSeasonSelect(SEASONS, selectedSeason, "zebricky.html");
setupSexSelection(selectedSex, "zebricky.html", selectedSeason);
createStatisticsTable({
    tableId: "ranking",
    csvFile: `csv/ranking_${selectedSeason}.csv`,
    columns: RANKING_COLUMNS,
    rowFilter: row => selectedSex === "all" || row["Pohlaví"] === selectedSex,
    renumberRows: selectedSex !== "all",
    rankField: "STR",
    order: [[0, "asc"]],
    columnDefs: [
        { targets: "_all", className: "dt-head-center" },
        { targets: [3, 4, 6], className: "dt-body-center" },
        { targets: [2, 5], className: "wrap-column" },
        { targets: [0, 1, 3, 4, 6, 7], className: "nowrap-column" }
    ]
});
