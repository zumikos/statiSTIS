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
    if (!hasChartValue(rank) || !hasChartValue(totalPlayers)) return "—";

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

const HISTORY_RANK_SCOPES = {
    "national-adult": {
        rankSuffix: "pořadí", moverRankSuffix: "Pořadí skokani",
        regional: false, youth: false, rankFiles: []
    },
    "regional-adult": {
        rankSuffix: "pořadí kraj", moverRankSuffix: "Pořadí skokani kraj",
        regional: true, youth: false, rankFiles: ["region"]
    },
    "national-youth": {
        rankSuffix: "pořadí kategorie", moverRankSuffix: "Pořadí skokani kategorie",
        fallbackRankSuffix: "pořadí", fallbackMoverRankSuffix: "Pořadí skokani",
        regional: false, youth: true, rankFiles: ["category"]
    },
    "regional-youth": {
        rankSuffix: "pořadí kraj kategorie",
        moverRankSuffix: "Pořadí skokani kraj kategorie",
        fallbackRankSuffix: "pořadí kraj",
        fallbackMoverRankSuffix: "Pořadí skokani kraj",
        regional: true, youth: true, rankFiles: ["region", "region_category"]
    }
};

function playerRankCountKey(season, sex, association, category) {
    return [season, sex, association || "", category].join("|");
}

function selectedHistoryRankScope() {
    const form = document.getElementById("player-ranking-scope");
    const values = new FormData(form);
    return {
        ...HISTORY_RANK_SCOPES[`${values.get("area")}-${values.get("age")}`],
        moverStrMinimum: Number(values.get("mover-str-min"))
    };
}

async function addPlayerScopeRanks(player, rankScope) {
    const rankMaps = await Promise.all(rankScope.rankFiles.map(loadPlayerScopeRanks));
    return Object.assign(
        {},
        player,
        ...rankMaps.map(ranks => ranks.get(String(player.ID)) || {})
    );
}

function renderPlayerHistory(player, rankCounts, moverRanks = player) {
    const table = document.getElementById("player-history");
    table.replaceChildren();
    const rankScope = selectedHistoryRankScope();

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
    SEASONS.filter(year => hasChartValue(player[`${year} STR`]))
        .forEach(year => {
            const row = document.createElement("tr");
            const teamName = formatTeamName(player[`${year} Oddíl`]);
            const ageCategory = getPlayerAgeCategory(player["Rok narození"], year);
            const rankCategory = rankScope.youth && ageCategory !== "—"
                ? ageCategory
                : "dospělí";
            const association = rankScope.regional ? player[`${year} Kraj`] : "";
            const scopedRank = player[`${year} ${rankScope.rankSuffix}`];
            const rank = hasChartValue(scopedRank)
                ? scopedRank
                : player[`${year} ${rankScope.fallbackRankSuffix || rankScope.rankSuffix}`];
            const totals = rankCounts.get(playerRankCountKey(
                year, player["Pohlaví"], association, rankCategory
            ));
            const scopedMoverRank = moverRanks[`${year} ${rankScope.moverRankSuffix}`];
            const moverRank = hasChartValue(scopedMoverRank)
                ? scopedMoverRank
                : moverRanks[
                    `${year} ${rankScope.fallbackMoverRankSuffix || rankScope.moverRankSuffix}`
                ];
            const values = [
                formatSeason(year),
                ageCategory,
                teamName ? createTeamProfileLink(teamName, { sezona: year }) : "—",
                formatThousands(player[`${year} STR`]),
                formatRank(rank),
                formatPercentile(rank, totals?.players),
                formatThousands(calculateRatingChange(player, year)),
                formatRank(moverRank),
                formatPercentile(
                    moverRank,
                    totals?.movers[rankScope.moverStrMinimum]
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
    const availableRatings = ratings.filter(item => hasChartValue(item.value));

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
    const availableRanks = ranks.filter(item => hasChartValue(item.value));

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

async function showPlayerDetail(playerId) {
    searchView.hidden = true;
    detailView.hidden = false;
    document.getElementById("player-name").textContent = "Načítám hráče…";

    try {
        const [player, summaryRows, rankCountRows] = await Promise.all([
            loadPlayer(playerId), loadSeasonSummary(), loadPlayerRankCounts()
        ]);
        const seasonSummaries = new Map(summaryRows.map(row => [row["Sezóna"], row]));
        const rankCounts = new Map(rankCountRows.map(row => [
            playerRankCountKey(row["Sezóna"], row["Pohlaví"], row["Kraj"], row["Kategorie"]),
            {
                players: row["Počet hráčů"],
                movers: Object.fromEntries(MOVERS_STR_MIN_VALUES.map(strMinimum => [
                    strMinimum, row[`Počet skokanů ${strMinimum}`]
                ]))
            }
        ]));

        if (!player) {
            document.getElementById("player-name").textContent = "Hráč nebyl nalezen";
            document.getElementById("player-info").textContent = "Zkontrolujte ID v adrese.";
            return;
        }

        document.title = `${SITE_NAME} – ${player["Hráč"]}`;
        document.getElementById("player-name").textContent = player["Hráč"];
        const compareLink = document.createElement("a");
        compareLink.className = "button";
        compareLink.href = `porovnat-hrace.html?ID1=${encodeURIComponent(player.ID)}`;
        compareLink.textContent = "Porovnat s jiným hráčem";
        document.querySelector(".entity-detail-heading").appendChild(compareLink);
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
        renderPlayerHistory(player, rankCounts);
        let historyRenderRequest = 0;
        document.getElementById("player-ranking-scope").addEventListener("change", async () => {
            const request = ++historyRenderRequest;
            const rankScope = selectedHistoryRankScope();
            const scopedPlayer = await addPlayerScopeRanks(player, rankScope);
            const { moverStrMinimum } = rankScope;
            const moverRanks = moverStrMinimum === MOVERS_STR_MIN_VALUES[0]
                ? scopedPlayer
                : (await loadPlayerMoverRanks(moverStrMinimum)).get(String(player.ID)) || {};
            if (request === historyRenderRequest) {
                renderPlayerHistory(scopedPlayer, rankCounts, moverRanks);
            }
        });
        renderPlayerStrChart(player);
        renderPlayerPositionChart(player, {
            containerId: "player-rank-chart",
            rankColumn: "pořadí",
            totalColumnType: "players",
            seasonSummaries,
            ariaLabel: `Vývoj pořadí hráče ${player["Hráč"]}`,
            emptyMessage: "Pro tohoto hráče nejsou dostupná data pořadí."
        });
        renderPlayerPositionChart(player, {
            containerId: "player-movers-rank-chart",
            rankColumn: "Pořadí skokani",
            totalColumnType: "movers",
            seasonSummaries,
            ariaLabel: `Vývoj pořadí skokanů hráče ${player["Hráč"]}`,
            emptyMessage: "Pro tohoto hráče nejsou dostupná data pořadí skokanů."
        });
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
