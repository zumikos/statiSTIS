const searchView = document.getElementById("player-search-view");
const detailView = document.getElementById("player-detail-view");
const searchForm = document.getElementById("player-search-form");
const searchInput = document.getElementById("player-search-input");
const searchStatus = document.getElementById("player-search-status");
const resultsContainer = document.getElementById("player-results");

let playersPromise;

function loadPlayers() {
    if (!playersPromise) {
        playersPromise = loadCsv("csv/players.csv")
            .then(data => data
                .filter(player => player.ID !== undefined)
                .map(player => ({
                    ...player,
                    "Hráč": formatPlayerName(player["Hráč"])
                }))
            );
    }

    return playersPromise;
}

function playerLink(player) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = `hraci.html?ID=${encodeURIComponent(player.ID)}`;

    const name = document.createElement("strong");
    name.textContent = player["Hráč"];

    const details = document.createElement("span");
    const birthYear = player["Rok narození"] || "rok narození neuveden";
    details.textContent = `Ročník: ${birthYear}, ID: ${player.ID}`;

    link.append(name, details);
    return link;
}

const playerResults = createPaginatedResultList(resultsContainer, playerLink);

function playerMatchPriority(player, queryText) {
    if (String(player.ID) === queryText) return -1;

    const name = String(player["Hráč"] ?? "").trim();
    const surname = name.split(/\s+/)[0] || "";
    const queryWords = queryText.split(/\s+/).filter(Boolean);
    const reversedQuery = queryWords.length > 1 ? [...queryWords].reverse().join(" ") : queryText;
    const nameLower = name.toLocaleLowerCase("cs");
    const surnameLower = surname.toLocaleLowerCase("cs");
    const queryLower = queryText.toLocaleLowerCase("cs");
    const reversedLower = reversedQuery.toLocaleLowerCase("cs");
    const normalizedName = normalizeText(name, true);
    const normalizedSurname = normalizeText(surname, true);
    const normalizedQuery = normalizeText(queryText, true);
    const normalizedReversed = normalizeText(reversedQuery, true);

    if (surname === queryText) return 0;
    if (surnameLower === queryLower) return 1;
    if (name === queryText || name === reversedQuery) return 2;
    if (nameLower === queryLower || nameLower === reversedLower) return 3;
    if (name.startsWith(queryText) || name.startsWith(reversedQuery)) return 4;
    if (nameLower.startsWith(queryLower) || nameLower.startsWith(reversedLower)) return 5;
    if (name.includes(queryText) || name.includes(reversedQuery)) return 6;
    if (nameLower.includes(queryLower) || nameLower.includes(reversedLower)) return 7;
    if (normalizedSurname === normalizedQuery) return 8;
    if (normalizedName === normalizedQuery || normalizedName === normalizedReversed) return 9;
    if (normalizedName.startsWith(normalizedQuery) || normalizedName.startsWith(normalizedReversed)) return 10;
    if (normalizedName.includes(normalizedQuery) || normalizedName.includes(normalizedReversed)) return 11;

    return null;
}

async function searchPlayers(query) {
    const normalizedQuery = normalizeText(query, true);
    playerResults.clear();

    if (normalizedQuery.length < 2) {
        searchStatus.textContent = "Zadejte alespoň dva znaky.";
        return;
    }

    searchStatus.textContent = "Načítám hráče…";

    try {
        const players = await loadPlayers();
        const queryText = String(query).trim();
        const matches = players
            .map(player => {
                return { player, matchPriority: playerMatchPriority(player, queryText) };
            })
            .filter(result => result.matchPriority !== null)
            .sort((first, second) =>
                first.matchPriority - second.matchPriority ||
                String(first.player["Hráč"]).localeCompare(String(second.player["Hráč"]), "cs", {
                    sensitivity: "variant"
                })
            )
            .map(result => result.player);

        if (matches.length === 0) {
            searchStatus.textContent = "Žádný hráč nebyl nalezen.";
            return;
        }

        searchStatus.textContent = `Nalezeno hráčů: ${matches.length}`;
        playerResults.show(matches);
    } catch (error) {
        searchStatus.textContent = "Seznam hráčů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function formatValue(value) {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
}

function formatPercentile(rank, totalPlayers) {
    const numericRank = Number(rank);
    const numericTotal = Number(totalPlayers);
    if (!Number.isFinite(numericRank) || !Number.isFinite(numericTotal) || numericTotal < 1) return "—";

    const percentile = 100 * (numericTotal - numericRank + 1) / numericTotal;
    return `${percentile.toFixed(1).replace(".", ",")}`;
}

function renderPlayerHistory(player) {
    const table = document.getElementById("player-history");
    table.replaceChildren();

    const headers = [
        "Sezóna", "STR", "Pořadí", "Percentil", "Změna STR",
        "Pořadí skokani", "Percentil skokani"
    ];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach(header => {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");
    SEASONS.filter(year => player[`${year} STR`] !== null && player[`${year} STR`] !== undefined)
        .forEach(year => {
            const row = document.createElement("tr");
            const values = [
                formatSeason(year),
                formatThousands(player[`${year} STR`]),
                player[`${year} pořadí`],
                formatPercentile(player[`${year} pořadí`], player[`${year} počet hráčů`]),
                formatThousands(player[`${year} STR změna`], true),
                formatValue(player[`${year} Pořadí skokani`]),
                formatPercentile(
                    player[`${year} Pořadí skokani`],
                    player[`${year} počet skokanů`]
                )
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = formatValue(value);
                row.appendChild(cell);
            });
            tbody.appendChild(row);
        });

    table.append(thead, tbody);
}

function renderPlayerStrChart(player) {
    const container = document.getElementById("player-str-chart");
    const ratings = SEASONS.map(year => ({
        x: year,
        value: player[`${year} STR`]
    }));
    const availableRatings = ratings.filter(item => item.value !== null && item.value !== undefined);

    if (availableRatings.length === 0) {
        container.textContent = "Pro tohoto hráče nejsou dostupná data STR.";
        return;
    }

    const values = availableRatings.map(item => Number(item.value));
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = Math.max(50, (rawMax - rawMin) * 0.15);
    const minValue = Math.max(0, Math.floor((rawMin - padding) / 100) * 100);
    const maxValue = Math.ceil((rawMax + padding) / 100) * 100 || 100;
    renderInteractiveLineChart({
        container,
        data: ratings,
        xValues: SEASONS,
        width: 1000,
        height: 420,
        margin: { top: 25, right: 25, bottom: 75, left: 70 },
        minValue,
        maxValue,
        yTicks: Array.from(
            { length: 5 },
            (_, step) => minValue + ((maxValue - minValue) * step) / 4
        ),
        ariaLabel: `Vývoj STR hráče ${player["Hráč"]}`,
        xLabel: formatSeason,
        formatYLabel: value => formatThousands(Math.round(value)),
        formatTooltip: item => `STR ${formatThousands(item.value)}`,
        formatPointAria: item =>
            `${formatSeason(item.x)}: STR ${formatThousands(item.value)}`,
        tooltipWidth: 82,
        emptyMessage: "Pro tohoto hráče nejsou dostupná data STR."
    });
}

function renderPlayerRankChart(player) {
    const container = document.getElementById("player-rank-chart");
    const ranks = SEASONS.map(year => ({
        x: year,
        value: player[`${year} pořadí`],
        percentile: formatPercentile(
            player[`${year} pořadí`],
            player[`${year} počet hráčů`]
        )
    }));
    const availableRanks = ranks.filter(item =>
        item.value !== null &&
        item.value !== undefined &&
        Number.isFinite(Number(item.value))
    );

    if (availableRanks.length === 0) {
        container.textContent = "Pro tohoto hráče nejsou dostupná data pořadí.";
        return;
    }

    const highestRank = Math.max(...availableRanks.map(item => Number(item.value)));
    const maxValue = Math.max(2, highestRank);
    const yTicks = Array.from(
        new Set(Array.from(
            { length: 5 },
            (_, step) => Math.round(1 + ((maxValue - 1) * step) / 4)
        ))
    );

    renderInteractiveLineChart({
        container,
        data: ranks,
        xValues: SEASONS,
        width: 1000,
        height: 420,
        margin: { top: 25, right: 25, bottom: 75, left: 80 },
        minValue: 1,
        maxValue,
        yTicks,
        reverseY: true,
        ariaLabel: `Vývoj pořadí hráče ${player["Hráč"]}`,
        xLabel: formatSeason,
        formatYLabel: value => formatThousands(value),
        formatTooltip: item => [
            `Pořadí ${formatThousands(item.value)}`,
            `Percentil ${item.percentile}`
        ],
        formatPointAria: item =>
            `${formatSeason(item.x)}: pořadí ${formatThousands(item.value)}, ` +
            `percentil ${item.percentile}`,
        tooltipWidth: 150,
        emptyMessage: "Pro tohoto hráče nejsou dostupná data pořadí."
    });
}

async function showPlayerDetail(playerId) {
    searchView.hidden = true;
    detailView.hidden = false;
    document.getElementById("player-name").textContent = "Načítám hráče…";

    try {
        const players = await loadPlayers();
        const player = players.find(item => String(item.ID) === playerId);

        if (!player) {
            document.getElementById("player-name").textContent = "Hráč nebyl nalezen";
            document.getElementById("player-info").textContent = "Zkontrolujte ID v adrese.";
            return;
        }

        document.title = `${SITE_NAME} – ${player["Hráč"]}`;
        document.getElementById("player-name").textContent = player["Hráč"];
        const genderLabels = { M: "muži", Z: "ženy" };
        const gender = genderLabels[player["Pohlaví"]] || formatValue(player["Pohlaví"]);
        const category = getPlayerAgeCategory(player["Rok narození"], DEFAULT_SEASON);
        document.getElementById("player-info").textContent =
            `ID: ${player.ID}, Rok narození: ${formatValue(player["Rok narození"])}, ` +
            `Pohlaví: ${gender}, Kategorie: ${category}`;
        renderPlayerHistory(player);
        renderPlayerStrChart(player);
        renderPlayerRankChart(player);
    } catch (error) {
        document.getElementById("player-name").textContent = "Data se nepodařilo načíst";
        document.getElementById("player-info").textContent = "Zkuste stránku obnovit.";
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchPlayers(searchInput.value);
});

const requestedPlayer = new URLSearchParams(window.location.search).get("ID");
if (requestedPlayer) {
    showPlayerDetail(requestedPlayer);
}
