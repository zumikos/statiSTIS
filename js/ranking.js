const selectedSeason = getSelectedSeason();

// Šířky sloupců: Pořadí, ID, Hráč, Rok narození, Pohlaví, Oddíl, Kraj, STR.
const RANKING_COLUMN_WIDTHS = ["1%", "1%", "10rem", "1%", "1%", "12rem", "1%", "1%"];

const seasonSelect = document.getElementById("season");

SEASONS.slice().reverse().forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = formatSeason(year);
    seasonSelect.appendChild(option);
});

seasonSelect.value = selectedSeason;

seasonSelect.addEventListener("change", function () {
    location.href = "zebricky.html?season=" + this.value;
});

Papa.parse(`csv/ranking_${selectedSeason}.csv`, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function (results) {
        let data = results.data.filter(row => row["ID"] !== undefined);
        
        if (data.length === 0) {
            showTableError("ranking", "Pro tuto sezónu nejsou dostupná žádná data.");
            return;
        }

        data = data.map(row => ({
            "Pořadí": row["Pořadí"],
            "ID": row["ID"],
            "Hráč": row["Hráč"],
            "Rok narození": row["Rok narození"],
            "Pohlaví": row["Pohlaví"],
            "Oddíl": formatTeamName(row["Oddíl"]),
            "Kraj": row["Kraj"],
            "STR": row["STR"]
        }));

        const columns = Object.keys(data[0]).map((name, index) => ({
            title: name,
            data: name,
            width: RANKING_COLUMN_WIDTHS[index]
        }));

        new DataTable("#ranking", {
            data: data,
            columns: columns,

            pageLength: 50,
            lengthMenu: [
                [50, 100, 500, 1000],
                [50, 100, 500, 1000]
            ],

            order: [[0, "asc"]],
            scrollX: true,
            autoWidth: false,

            layout: {
                top2Start: "search",
                top2End: "pageLength",
                topStart: "info",
                topEnd: "paging",
                bottomStart: "info",
                bottomEnd: "paging"
            },

            columnDefs: [
                { targets: "_all", className: "dt-head-center" }, // zarovná na střed hlavičky všech sloupců
                { targets: [3, 4, 6], className: "dt-body-center" }, // zarovná na střed obsah sloupců "Rok" a "Pohlaví"
                { targets: [2, 5], className: "wrap-column" },
                { targets: [0, 1, 3, 4, 6, 7], className: "nowrap-column" }
            ],

            language: {
                thousands: " ",
                search: "Hledat:",
                lengthMenu: "Zobrazit _MENU_ záznamů na stránku",
                info: "Zobrazeno _START_ až _END_ z _TOTAL_ záznamů",
                infoEmpty: "Žádné záznamy",
                infoFiltered: "(filtrováno z celkem _MAX_ záznamů)",
                zeroRecords: "Nenalezeny žádné záznamy",
                emptyTable: "Tabulka neobsahuje žádná data",
            },

            initComplete: function () {
                document
                    .querySelector(".dt-length select")
                    .classList.add("entries-dropdown");
            }
        });
    },

    error: function () {
        showTableError("ranking", "Data se nepodařilo načíst. Zkuste stránku obnovit.");
    }
});
