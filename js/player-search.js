const searchView = document.getElementById("player-search-view");
const detailView = document.getElementById("player-detail-view");
const searchForm = document.getElementById("player-search-form");
const searchInput = document.getElementById("player-search-input");
const searchStatus = document.getElementById("player-search-status");
const resultsContainer = document.getElementById("player-results");

function playerLink(player) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = `hledat-hrace.html?ID=${encodeURIComponent(player.ID)}`;

    const name = document.createElement("strong");
    name.textContent = player["Hráč"];

    const details = document.createElement("span");
    const birthYear = player["Rok narození"] || "rok narození neuveden";
    details.textContent = `Ročník: ${birthYear}, ID: ${player.ID}`;

    link.append(name, details);
    return link;
}

const playerResults = createPaginatedResultList(resultsContainer, playerLink);

async function searchPlayers(query) {
    const normalizedQuery = normalizeText(query, true);
    playerResults.clear();

    if (normalizedQuery.length < 2) {
        searchStatus.textContent = "Zadejte alespoň dva znaky.";
        return;
    }

    searchStatus.textContent = "Načítám hráče…";

    try {
        const matches = await findPlayers(query);

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

const PLAYER_TOTAL_COLUMNS = {
    M: { players: "Muži", movers: "Skokani muži" },
    Z: { players: "Ženy", movers: "Skokani ženy" }
};

function calculateRatingChange(player, year) {
    const currentValue = player[`${year} STR`];
    const previousValue = player[`${year - 1} STR`];
    if ([currentValue, previousValue].some(value =>
        value === null || value === undefined || value === ""
    )) return null;

    const current = Number(currentValue);
    const previous = Number(previousValue);
    return Number.isFinite(current) && Number.isFinite(previous) ? current - previous : null;
}

function renderPlayerHistory(player, seasonSummaries) {
    const table = document.getElementById("player-history");
    table.replaceChildren();

    const headers = [
        "Sezóna", "Kategorie", "Oddíl", "STR", "Pořadí", "Percentil", "Změna STR",
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
            const teamName = formatTeamName(player[`${year} Oddíl`]);
            const totals = seasonSummaries.get(year);
            const totalColumns = PLAYER_TOTAL_COLUMNS[player["Pohlaví"]] || {};
            const values = [
                formatSeason(year),
                getPlayerAgeCategory(player["Rok narození"], year),
                teamName ? createTeamProfileLink(teamName, { sezona: year }) : "—",
                formatThousands(player[`${year} STR`]),
                formatRank(player[`${year} pořadí`]),
                formatPercentile(player[`${year} pořadí`], totals?.[totalColumns.players]),
                formatThousands(calculateRatingChange(player, year)),
                formatRank(player[`${year} Pořadí skokani`]),
                formatPercentile(
                    player[`${year} Pořadí skokani`],
                    totals?.[totalColumns.movers]
                )
            ];

            values.forEach(value => {
                const cell = document.createElement("td");
                if (value instanceof Node) {
                    cell.appendChild(value);
                } else {
                    cell.textContent = formatValue(value);
                }
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
        margin: { top: 25, right: 25, bottom: 90, left: 70 },
        minValue,
        maxValue,
        yTicks: Array.from(
            { length: 5 },
            (_, step) => minValue + ((maxValue - minValue) * step) / 4
        ),
        ariaLabel: `Vývoj STR hráče ${player["Hráč"]}`,
        xLabel: formatSeason,
        xTitle: "Sezóna",
        yTitle: "STR",
        formatYLabel: value => formatThousands(Math.round(value)),
        formatTooltip: item => `STR ${formatThousands(item.value)}`,
        formatPointAria: item =>
            `${formatSeason(item.x)}: STR ${formatThousands(item.value)}`,
        tooltipWidth: 82,
        emptyMessage: "Pro tohoto hráče nejsou dostupná data STR."
    });
}

function renderPlayerPositionChart(player, {
    containerId,
    rankColumn,
    totalColumnType,
    seasonSummaries,
    ariaLabel,
    emptyMessage
}) {
    const container = document.getElementById(containerId);
    const totalColumn = PLAYER_TOTAL_COLUMNS[player["Pohlaví"]]?.[totalColumnType];
    const ranks = SEASONS.map(year => {
        const totalPlayers = seasonSummaries.get(year)?.[totalColumn];
        return {
            x: year,
            value: player[`${year} ${rankColumn}`],
            percentile: formatPercentile(player[`${year} ${rankColumn}`], totalPlayers),
            totalPlayers
        };
    });
    const availableRanks = ranks.filter(item =>
        item.value !== null &&
        item.value !== undefined &&
        Number.isFinite(Number(item.value))
    );

    if (availableRanks.length === 0) {
        container.textContent = emptyMessage;
        return;
    }

    const highestRank = Math.max(...availableRanks.map(item => Number(item.value)));
    const tickStep = Math.max(1, Math.ceil((highestRank - 1) / 4));
    const yTicks = Array.from({ length: 5 }, (_, step) => 1 + tickStep * step);
    const maxValue = yTicks[yTicks.length - 1];
    const latestTotalPlayers = [...availableRanks]
        .reverse()
        .map(item => Number(item.totalPlayers))
        .find(Number.isFinite);

    renderInteractiveLineChart({
        container,
        data: ranks,
        xValues: SEASONS,
        width: 1000,
        height: 420,
        margin: { top: 25, right: 80, bottom: 90, left: 80 },
        minValue: 1,
        maxValue,
        yTicks,
        reverseY: true,
        ariaLabel,
        xLabel: formatSeason,
        xTitle: "Sezóna",
        yTitle: "Pořadí",
        rightYTitle: "Percentil",
        formatRightYLabel: latestTotalPlayers
            ? value => formatPercentile(value, latestTotalPlayers)
            : null,
        formatYLabel: value => formatRank(value),
        formatTooltip: item => [
            `Pořadí ${formatRank(item.value)}`,
            `Percentil ${item.percentile}`
        ],
        formatPointAria: item =>
            `${formatSeason(item.x)}: pořadí ${formatRank(item.value)}, ` +
            `percentil ${item.percentile}`,
        tooltipWidth: 150,
        emptyMessage
    });
}

function renderPlayerRankChart(player, seasonSummaries) {
    renderPlayerPositionChart(player, {
        containerId: "player-rank-chart",
        rankColumn: "pořadí",
        totalColumnType: "players",
        seasonSummaries,
        ariaLabel: `Vývoj pořadí hráče ${player["Hráč"]}`,
        emptyMessage: "Pro tohoto hráče nejsou dostupná data pořadí."
    });
}

function renderPlayerMoversRankChart(player, seasonSummaries) {
    renderPlayerPositionChart(player, {
        containerId: "player-movers-rank-chart",
        rankColumn: "Pořadí skokani",
        totalColumnType: "movers",
        seasonSummaries,
        ariaLabel: `Vývoj pořadí skokanů hráče ${player["Hráč"]}`,
        emptyMessage: "Pro tohoto hráče nejsou dostupná data pořadí skokanů."
    });
}

async function showPlayerDetail(playerId) {
    searchView.hidden = true;
    detailView.hidden = false;
    document.getElementById("player-name").textContent = "Načítám hráče…";

    try {
        const [players, summaryRows] = await Promise.all([loadPlayers(), loadSeasonSummary()]);
        const player = players.find(item => String(item.ID) === playerId);
        const seasonSummaries = new Map(summaryRows.map(row => [row["Sezóna"], row]));

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
        const playerInfo = document.getElementById("player-info");
        playerInfo.textContent =
            `ID: ${player.ID}, Rok narození: ${formatValue(player["Rok narození"])}, ` +
            `Pohlaví: ${gender}, Kategorie: ${category}, Oddíl: `;
        const teamName = formatTeamName(player["Oddíl"]);
        playerInfo.append(teamName ? createTeamProfileLink(teamName) : "—");
        renderPlayerHistory(player, seasonSummaries);
        renderPlayerStrChart(player);
        renderPlayerRankChart(player, seasonSummaries);
        renderPlayerMoversRankChart(player, seasonSummaries);
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
