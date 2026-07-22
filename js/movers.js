const moverSeasons = SEASONS.slice(1);
const selectedSeason = getSelectedSeason(moverSeasons);
const selectedSex = getSelectedSex();

// Sloupce a jejich šířky lze upravit přímo zde.
const MOVERS_COLUMNS = [
    { data: "Pořadí", title: "Pořadí", width: "1%" },
    { data: "ID", title: "ID", width: "1%" },
    { data: "Hráč", title: "Hráč", width: "10rem" },
    { data: "Rok narození", title: "Rok narození", width: "1%" },
    { data: "Pohlaví", title: "Pohlaví", width: "1%" },
    { data: "Oddíl", title: "Oddíl", width: "12rem" },
    { data: "Kraj", title: "Kraj", width: "1%" },
    { data: "STR loňské", title: "STR loňské", width: "1%" },
    { data: "STR letošní", title: "STR letošní", width: "1%" },
    { data: "STR změna", title: "STR změna", width: "1%" }
];

setupSeasonSelect(moverSeasons, selectedSeason, "skokani.html");
setupSexSelection(selectedSex, "skokani.html", selectedSeason);
createStatisticsTable({
    tableId: "movers",
    csvFile: `csv/movers_${selectedSeason - 1}_${selectedSeason}_STR800.csv`,
    columns: MOVERS_COLUMNS,
    rowFilter: row => selectedSex === "all" || row["Pohlaví"] === selectedSex,
    renumberRows: selectedSex !== "all",
    rankField: "STR změna",
    order: [[0, "asc"]],
    columnDefs: [
        { targets: "_all", className: "dt-head-center" },
        { targets: [3, 4, 6], className: "dt-body-center" },
        { targets: [2, 5], className: "wrap-column" },
        { targets: [0, 1, 3, 4, 6, 7, 8, 9], className: "nowrap-column" },
        { targets: 9, className: "dt-body-right strong-column" }
    ]
});
