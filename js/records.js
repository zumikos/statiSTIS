const RECORD_SEXES = [
    { value: "M", suffix: "men" },
    { value: "Z", suffix: "women" }
];

function playerCell(record) {
    return createPlayerProfileLink(record.ID, formatPlayerName(record["Hráč"]));
}

function teamCell(record) {
    const teamName = formatTeamName(record["Oddíl"]);
    return teamName
        ? createTeamProfileLink(teamName, { sezona: record["Sezóna"] })
        : "—";
}

const STR_COLUMNS = [
    { heading: "#", value: record => record["Pořadí"] },
    { heading: "Hráč", value: playerCell },
    { heading: "Oddíl", value: teamCell },
    { heading: "STR", value: record => formatThousands(record.STR) },
    { heading: "Sezóna", value: record => formatSeason(record["Sezóna"]) }
];

const MOVER_COLUMNS = [
    { heading: "#", value: record => record["Pořadí"] },
    { heading: "Hráč", value: playerCell },
    { heading: "Oddíl", value: teamCell },
    { heading: "STR\nzměna", value: record => formatThousands(record["STR změna"]) },
    { heading: "Sezóna", value: record => formatSeason(record["Sezóna"]) }
];

function renderRecordTable(tableId, records, columns) {
    const table = document.getElementById(tableId);
    const headerRow = document.createElement("tr");
    columns.forEach(column => {
        const heading = document.createElement("th");
        heading.scope = "col";
        heading.textContent = column.heading;
        headerRow.appendChild(heading);
    });

    const head = document.createElement("thead");
    head.appendChild(headerRow);
    const body = document.createElement("tbody");

    records.forEach(record => {
        const row = document.createElement("tr");
        columns.forEach(column => {
            const cell = document.createElement("td");
            const value = column.value(record);
            cell.append(value instanceof Node ? value : String(value));
            row.appendChild(cell);
        });
        body.appendChild(row);
    });

    table.replaceChildren(head, body);
}

loadCsv("csv/records.csv")
    .then(records => {
        RECORD_SEXES.forEach(sex => {
            renderRecordTable(
                `highest-str-${sex.suffix}`,
                records.filter(record =>
                    record.Typ === "highest_str" && record["Pohlaví"] === sex.value
                ),
                STR_COLUMNS
            );

            MOVERS_STR_MIN_VALUES.forEach(strMinimum => {
                renderRecordTable(
                    `movers-${strMinimum}-${sex.suffix}`,
                    records.filter(record =>
                        record.Typ === "mover" &&
                        record["Pohlaví"] === sex.value &&
                        record["STR minimum"] === strMinimum
                    ),
                    MOVER_COLUMNS
                );
            });
        });

        document.getElementById("records-status").hidden = true;
        document.getElementById("records-content").hidden = false;
    })
    .catch(error => {
        console.error(error);
        const status = document.getElementById("records-status");
        status.className = "data-error";
        status.textContent = "Data se nepodařilo načíst. Zkuste stránku obnovit.";
    });
