const moverSeasons = SEASONS.slice(1);
const selectedSeason = getSelectedSeason(moverSeasons);

const seasonSelect = document.getElementById("season");

moverSeasons.slice().reverse().forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = formatSeason(year);
    seasonSelect.appendChild(option);
});

seasonSelect.value = selectedSeason;

seasonSelect.addEventListener("change", function () {
    location.href = "skokani.html?season=" + this.value;
});

const previousSeason = Number(selectedSeason) - 1;
const csvFile = `csv/movers_${previousSeason}_${selectedSeason}_STR800.csv`;

Papa.parse(csvFile, {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,

    complete: function (results) {
        let data = results.data.filter(row => row["ID"] !== undefined);

        if (data.length === 0) {
            showTableError("movers", "Pro tuto sezónu nejsou dostupná žádná data.");
            return;
        }

        data = data.map(row => ({
            "Pořadí": row["Pořadí"],
            "ID": row["ID"],
            "Hráč": row["Hráč"],
            "Rok narození": row["Rok narození"],
            "Pohlaví": row["Pohlaví"],
            "Oddíl": row["Oddíl"],
            "Kraj": row["Kraj"],
            "STR loňské": row["STR loňské"],
            "STR letošní": row["STR letošní"],
            "STR změna": row["STR změna"]
        }));

        const columns = Object.keys(data[0]).map(name => ({
            title: name,
            data: name
        }));

        new DataTable("#movers", {
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
                { targets: "_all", className: "dt-head-center" },
                { targets: [3, 4, 6], className: "dt-body-center" },
                { targets: [2, 5, 6], className: "wrap-column" },
                { targets: 9, className: "dt-body-right strong-column" }
            ],

            language: {
                thousands: " ",
                search: "Hledat:",
                lengthMenu: "Zobrazit _MENU_ záznamů na stránku",
                info: "Zobrazeno _START_ až _END_ z _TOTAL_ záznamů",
                infoEmpty: "Žádné záznamy",
                infoFiltered: "(filtrováno z celkem _MAX_ záznamů)",
                zeroRecords: "Nenalezeny žádné záznamy",
                emptyTable: "Tabulka neobsahuje žádná data"
            },

            initComplete: function () {
                document
                    .querySelector(".dt-length select")
                    .classList.add("entries-dropdown");
            }
        });
    },

    error: function () {
        showTableError("movers", "Data se nepodařilo načíst. Zkuste stránku obnovit.");
    }
});
