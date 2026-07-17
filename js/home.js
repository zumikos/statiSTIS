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
                
            if (data.length === 0) {
                showTableError(tableId, "Pro tuto sezónu nejsou dostupná žádná data.");
                return;
            }

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
        },

        error: function () {
            showTableError(tableId, "Data se nepodařilo načíst. Zkuste stránku obnovit.");
        }
    });
}

const homeSeasonLabel = formatSeason(DEFAULT_SEASON);
document.getElementById("home-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram").src = `images/histogram_STR_${DEFAULT_SEASON}.html`;

loadTopTable(
    `csv/ranking_${DEFAULT_SEASON}.csv`,
    "home-ranking",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "Oddíl", label: "Oddíl" },
        { key: "STR", label: "STR" }
    ]
);

loadTopTable(
    `csv/movers_${DEFAULT_SEASON - 1}_${DEFAULT_SEASON}_STR800.csv`,
    "home-movers",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "Oddíl", label: "Oddíl" },
        { key: "STR změna", label: "STR změna" }
    ]
);
