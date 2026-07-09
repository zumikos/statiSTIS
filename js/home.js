function loadTopTable(csvFile, tableId, columnsToShow, maxRows = 10) {
    Papa.parse(csvFile, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,

        complete: function (results) {
            const data = results.data
                .filter(row => row["ID"] !== undefined)
                .slice(0, maxRows);

            const table = document.getElementById(tableId);

            const thead = document.createElement("thead");
            const tbody = document.createElement("tbody");

            const headerRow = document.createElement("tr");

            columnsToShow.forEach(column => {
                const th = document.createElement("th");
                th.textContent = column.label;
                headerRow.appendChild(th);
            });

            thead.appendChild(headerRow);

            data.forEach(row => {
                const tr = document.createElement("tr");

                columnsToShow.forEach(column => {
                    const td = document.createElement("td");
                    td.textContent = row[column.key];
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
        }
    });
}

loadTopTable(
    "csv/ranking_2026.csv",
    "home-ranking",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "STR", label: "STR" }
    ]
);

loadTopTable(
    "csv/movers_2025_2026_STR800.csv",
    "home-movers",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "STR_změna", label: "STR změna" }
    ]
);