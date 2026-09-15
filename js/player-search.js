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
    if ([rank, totalPlayers].some(value =>
        value === null || value === undefined || value === ""
    )) return "—";

    const numericRank = Number(rank);
    const numericTotal = Number(totalPlayers);
    if (
        !Number.isFinite(numericRank) ||
        !Number.isFinite(numericTotal) ||
        numericRank < 1 ||
        numericTotal < 1
    ) return "—";

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

function playerChartBounds(values, isRank = false) {
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const range = rawMax - rawMin;
    const padding = Math.max(
        isRank ? 0.5 : 5,
        range * 0.1,
        isRank && range === 0 ? rawMin * 0.02 : 0
    );
    const targetStep = (range + 2 * padding) / 4;
    const magnitude = 10 ** Math.floor(Math.log10(targetStep));
    const factors = !isRank && targetStep >= 10 ? [1, 2, 2.5, 5, 10] : [1, 2, 5, 10];
    const tickStep = Math.max(isRank ? 1 : 5, factors
        .map(factor => factor * magnitude)
        .find(step => step >= targetStep));
    const minValue = Math.max(isRank ? 1 : 0,
        Math.floor((rawMin - padding) / tickStep) * tickStep);
    const maxValue = Math.max(minValue + tickStep,
        Math.ceil((rawMax + padding) / tickStep) * tickStep);
    const yTicks = [minValue];
    for (let tick = Math.floor(minValue / tickStep) * tickStep + tickStep;
        tick < maxValue; tick += tickStep) {
        yTicks.push(tick);
    }
    yTicks.push(maxValue);
    return { minValue, maxValue, yTicks };
}

function renderPlayerStrChart(player) {
    const container = document.getElementById("player-str-chart");
    const ratings = SEASONS.map(year => ({
        x: year,
        value: player[`${year} STR`]
    }));
    const availableRatings = ratings.filter(item =>
        item.value !== null && item.value !== undefined && item.value !== "" &&
        Number.isFinite(Number(item.value))
    );

    if (availableRatings.length === 0) {
        container.textContent = "Pro tohoto hráče nejsou dostupná data STR.";
        return;
    }

    const { minValue, maxValue, yTicks } = playerChartBounds(
        availableRatings.map(item => Number(item.value))
    );
    renderInteractiveLineChart({
        container,
        data: ratings,
        xValues: SEASONS,
        width: 1000,
        height: 420,
        margin: { top: 25, right: 25, bottom: 90, left: 70 },
        minValue,
        maxValue,
        yTicks,
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
        item.value !== "" &&
        Number.isFinite(Number(item.value))
    );

    if (availableRanks.length === 0) {
        container.textContent = emptyMessage;
        return;
    }

    const { minValue, maxValue, yTicks } = playerChartBounds(
        availableRanks.map(item => Number(item.value)), true
    );
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
        minValue,
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
        const teamName = formatTeamName(player["Oddíl"]);
        const stisLink = document.createElement("a");
        stisLink.className = "player-profile-link";
        stisLink.href = `https://stis.ping-pong.cz/hrac-${encodeURIComponent(player.ID)}`;
        stisLink.textContent = "STIS profil";
        playerInfo.append(
            "Oddíl: ", teamName ? createTeamProfileLink(teamName) : "—",
            `, Rok narození: ${formatValue(player["Rok narození"])}, ` +
                `Pohlaví: ${gender}, Kategorie: ${category}, `, stisLink
        );
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
