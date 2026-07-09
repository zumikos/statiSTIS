const params = new URLSearchParams(window.location.search);
const selectedSeason = params.get("season") || DEFAULT_SEASON.toString();

const seasonSelect = document.getElementById("season");

SEASONS.slice().reverse().forEach(year => {
    const option = document.createElement("option");
    option.value = year;
    option.textContent = `${year - 1}/${String(year).slice(2)}`;
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
        data = data.map(row => ({
            "Pořadí": row["Pořadí"],
            "ID": row["ID"],
            "Hráč": row["Hráč"],
            "Rok": row["Rok"],
            "Po-hlaví": row["Po-hlaví"],
            "Oddíl": row["Oddíl"],
            "Kraj": row["Kraj"],
            "STR": row["STR"]
        }));

        const columns = Object.keys(data[0]).map(name => ({
            title: name,
            data: name
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
                topStart: "search",
                topEnd: "pageLength",
                bottomStart: "info",
                bottomEnd: "paging"
            },

            columnDefs: [
                { targets: "_all", className: "dt-head-center" }, // zarovná na střed hlavičky všech sloupců
                { targets: [3, 4, 6], className: "dt-body-center" }, // zarovná na střed obsah sloupců "Rok" a "Pohlaví"
                { targets: [2, 5, 6], className: "wrap-column" }
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
            }
        });
    }
});