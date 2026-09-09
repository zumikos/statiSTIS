const RECORD_LIMIT = 3;
const RECORD_SEXES = [
    { value: "M", suffix: "men" },
    { value: "Z", suffix: "women" }
];

const STR_COLUMNS = [
    { heading: "#", value: record => record.rank },
    { heading: "Hráč", value: playerCell },
    { heading: "STR", value: record => formatThousands(record.rating) },
    { heading: "Sezóna", value: record => formatSeason(record.season) }
];

const MOVER_COLUMNS = [
    { heading: "#", value: record => record.rank },
    { heading: "Hráč", value: playerCell },
    { heading: "STR\nzměna", value: record => formatThousands(record.change) },
    { heading: "Sezóna", value: record => formatSeason(record.season) }
];

function numericRating(player, season) {
    const value = player[`${season} STR`];
    if (value === null || value === undefined || value === "") return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function playerCell(record) {
    return createPlayerProfileLink(record.ID, record.playerName);
}

function rankedTop(records, valueKey) {
    let previousValue;
    let previousRank;

    return records.slice(0, RECORD_LIMIT).map((record, index) => {
        const rank = index > 0 && record[valueKey] === previousValue
            ? previousRank
            : index + 1;
        previousValue = record[valueKey];
        previousRank = rank;
        return { ...record, rank };
    });
}

function recordComparator(valueKey) {
    return (first, second) =>
        second[valueKey] - first[valueKey] ||
        second.season - first.season ||
        first.playerName.localeCompare(second.playerName, "cs", { sensitivity: "variant" });
}

function summarizePlayers(players) {
    return players.map(player => {
        const seasons = SEASONS
            .map(season => ({ season, rating: numericRating(player, season) }))
            .filter(record => record.rating !== null);
        const peak = seasons.reduce((best, record) =>
            !best || record.rating > best.rating ||
            (record.rating === best.rating && record.season > best.season)
                ? record
                : best
        , null);

        return {
            ID: player.ID,
            playerName: player["Hráč"],
            sex: player["Pohlaví"],
            seasons,
            rating: peak?.rating,
            season: peak?.season
        };
    });
}

function collectMoverRecords(playerSummaries) {
    return playerSummaries.flatMap(player => player.seasons.slice(1).flatMap(current => {
        const previous = player.seasons.find(record => record.season === current.season - 1);
        if (!previous) return [];

        return [{
            ID: player.ID,
            playerName: player.playerName,
            sex: player.sex,
            season: current.season,
            previousRating: previous.rating,
            change: current.rating - previous.rating
        }];
    }));
}

function highestStrRecords(playerSummaries, sex) {
    const records = playerSummaries
        .filter(player => player.sex === sex && player.rating !== undefined)
        .sort(recordComparator("rating"));
    return rankedTop(records, "rating");
}

function moverRecords(allMovers, sex, strMinimum) {
    const records = allMovers
        .filter(record => record.sex === sex && record.previousRating >= strMinimum)
        .sort(recordComparator("change"));
    return rankedTop(records, "change");
}

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

loadPlayers()
    .then(players => {
        const playerSummaries = summarizePlayers(players);
        const allMovers = collectMoverRecords(playerSummaries);

        RECORD_SEXES.forEach(sex => {
            renderRecordTable(
                `highest-str-${sex.suffix}`,
                highestStrRecords(playerSummaries, sex.value),
                STR_COLUMNS
            );
            MOVERS_STR_MIN_VALUES.forEach(strMinimum => {
                renderRecordTable(
                    `movers-${strMinimum}-${sex.suffix}`,
                    moverRecords(allMovers, sex.value, strMinimum),
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
