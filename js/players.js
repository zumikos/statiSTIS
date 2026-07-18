const searchView = document.getElementById("player-search-view");
const detailView = document.getElementById("player-detail-view");
const searchForm = document.getElementById("player-search-form");
const searchInput = document.getElementById("player-search-input");
const searchStatus = document.getElementById("player-search-status");
const resultsContainer = document.getElementById("player-results");

let playersPromise;
let playerCountsPromise;
let currentMatches = [];
let visibleResultCount = 0;
const RESULTS_PER_PAGE = 50;

function normalizeSearchText(value) {
    return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase("cs")
        .trim();
}

function loadPlayers() {
    if (!playersPromise) {
        playersPromise = new Promise((resolve, reject) => {
            Papa.parse("csv/players.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: results => resolve(results.data.filter(player => player.ID !== undefined)),
                error: reject
            });
        });
    }

    return playersPromise;
}

function loadPlayerCounts() {
    if (!playerCountsPromise) {
        playerCountsPromise = new Promise((resolve, reject) => {
            Papa.parse("csv/player_count.csv", {
                download: true,
                header: true,
                dynamicTyping: true,
                skipEmptyLines: true,
                complete: results => resolve(new Map(
                    results.data.map(row => [Number(row["Sezóna"]), Number(row["Počet hráčů"])])
                )),
                error: reject
            });
        });
    }

    return playerCountsPromise;
}

function playerLink(player) {
    const link = document.createElement("a");
    link.className = "player-result";
    link.href = `hraci.html?player=${encodeURIComponent(player.ID)}`;

    const name = document.createElement("strong");
    name.textContent = player["Hráč"];

    const details = document.createElement("span");
    const birthYear = player["Rok narození"] || "rok narození neuveden";
    details.textContent = `Ročník: ${birthYear}, ID: ${player.ID}`;

    link.append(name, details);
    return link;
}

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
    const normalizedName = normalizeSearchText(name);
    const normalizedSurname = normalizeSearchText(surname);
    const normalizedQuery = normalizeSearchText(queryText);
    const normalizedReversed = normalizeSearchText(reversedQuery);

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
    const normalizedQuery = normalizeSearchText(query);
    resultsContainer.replaceChildren();

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

        currentMatches = matches;
        visibleResultCount = Math.min(RESULTS_PER_PAGE, matches.length);
        renderSearchResults();
    } catch (error) {
        searchStatus.textContent = "Seznam hráčů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function renderSearchResults() {
    resultsContainer.replaceChildren();
    const visibleMatches = currentMatches.slice(0, visibleResultCount);

    searchStatus.textContent = visibleResultCount < currentMatches.length
        ? `Nalezeno ${currentMatches.length} hráčů`
        : `Nalezeno hráčů: ${currentMatches.length}`;

    const list = document.createElement("div");
    list.className = "player-results-list";
    visibleMatches.forEach(player => list.appendChild(playerLink(player)));
    resultsContainer.appendChild(list);

    if (visibleResultCount < currentMatches.length) {
        const showMore = document.createElement("button");
        const remaining = currentMatches.length - visibleResultCount;
        showMore.type = "button";
        showMore.className = "button show-more-results";
        showMore.textContent = `Zobrazit další (${Math.min(RESULTS_PER_PAGE, remaining)})`;
        showMore.addEventListener("click", () => {
            visibleResultCount = Math.min(visibleResultCount + RESULTS_PER_PAGE, currentMatches.length);
            renderSearchResults();
        });
        resultsContainer.appendChild(showMore);
    }
}

function formatValue(value, signed = false) {
    if (value === null || value === undefined || value === "") return "—";
    return signed && Number(value) > 0 ? `+${value}` : String(value);
}

function formatPercentile(rank, totalPlayers) {
    const numericRank = Number(rank);
    const numericTotal = Number(totalPlayers);
    if (!Number.isFinite(numericRank) || !Number.isFinite(numericTotal) || numericTotal < 1) return "—";

    const percentile = 100 * (numericTotal - numericRank + 1) / numericTotal;
    return `${percentile.toFixed(1).replace(".", ",")}`;
}

function renderPlayerHistory(player, playerCounts) {
    const table = document.getElementById("player-history");
    table.replaceChildren();

    const headers = ["Sezóna", "STR", "Pořadí", "Percentil", "Změna STR", "Pořadí skokanů"];
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");
    headers.forEach(label => {
        const th = document.createElement("th");
        th.textContent = label;
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    const tbody = document.createElement("tbody");
    SEASONS.filter(year => player[`${year} STR`] !== null && player[`${year} STR`] !== undefined)
        .forEach(year => {
            const row = document.createElement("tr");
            const values = [
                formatSeason(year),
                player[`${year} STR`],
                player[`${year} pořadí`],
                formatPercentile(player[`${year} pořadí`], playerCounts.get(year)),
                formatValue(player[`${year} STR změna`], true),
                formatValue(player[`${year} Pořadí skokani`])
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

function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
}

function renderPlayerChart(player) {
    const container = document.getElementById("player-str-chart");
    container.replaceChildren();

    const ratings = SEASONS.map(year => ({
        year,
        value: player[`${year} STR`]
    }));
    const availableRatings = ratings.filter(item => item.value !== null && item.value !== undefined);

    if (availableRatings.length === 0) {
        container.textContent = "Pro tohoto hráče nejsou dostupná data STR.";
        return;
    }

    const width = 1000;
    const height = 420;
    const margin = { top: 25, right: 25, bottom: 75, left: 70 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const values = availableRatings.map(item => Number(item.value));
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = Math.max(50, (rawMax - rawMin) * 0.15);
    const minValue = Math.max(0, Math.floor((rawMin - padding) / 100) * 100);
    const maxValue = Math.ceil((rawMax + padding) / 100) * 100 || 100;

    const x = year => margin.left + ((year - SEASONS[0]) / (SEASONS.length - 1)) * plotWidth;
    const y = value => margin.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": `Vývoj STR hráče ${player["Hráč"]}`
    });

    for (let step = 0; step <= 4; step += 1) {
        const value = minValue + ((maxValue - minValue) * step) / 4;
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left,
            y1: lineY,
            x2: width - margin.right,
            y2: lineY,
            class: "chart-grid-line"
        }));

        const label = createSvgElement("text", {
            x: margin.left - 12,
            y: lineY + 5,
            class: "chart-axis-label",
            "text-anchor": "end"
        });
        label.textContent = Math.round(value);
        svg.appendChild(label);
    }

    SEASONS.forEach(year => {
        svg.appendChild(createSvgElement("line", {
            x1: x(year),
            y1: margin.top,
            x2: x(year),
            y2: height - margin.bottom,
            class: "chart-grid-line"
        }));

        const labelX = x(year) + 10;
        const label = createSvgElement("text", {
            x: labelX,
            y: height - margin.bottom + 24,
            class: "chart-axis-label",
            "text-anchor": "end",
            transform: `rotate(-45 ${labelX} ${height - margin.bottom + 24})`
        });
        label.textContent = formatSeason(year);
        svg.appendChild(label);
    });

    let currentSegment = [];
    const drawSegment = () => {
        if (currentSegment.length > 1) {
            svg.appendChild(createSvgElement("polyline", {
                points: currentSegment.map(item => `${x(item.year)},${y(item.value)}`).join(" "),
                class: "chart-line"
            }));
        }
        currentSegment = [];
    };

    ratings.forEach(item => {
        if (item.value === null || item.value === undefined) {
            drawSegment();
        } else {
            currentSegment.push({ year: item.year, value: Number(item.value) });
        }
    });
    drawSegment();

    const tooltip = createSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createSvgElement("rect", {
        width: 82,
        height: 30,
        rx: 6
    });
    const tooltipText = createSvgElement("text", {
        x: 41,
        y: 20,
        "text-anchor": "middle"
    });
    tooltip.append(tooltipBackground, tooltipText);
    svg.appendChild(tooltip);

    const showPointValue = (item, point) => {
        const pointX = x(item.year);
        const pointY = y(Number(item.value));
        const tooltipY = pointY < 60 ? pointY + 14 : pointY - 42;
        const tooltipX = Math.min(Math.max(pointX - 41, 0), width - 82);
        tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
        tooltipText.textContent = `STR ${item.value}`;
        tooltip.classList.add("is-visible");
        point.classList.add("is-active");
    };

    const hidePointValue = point => {
        tooltip.classList.remove("is-visible");
        point.classList.remove("is-active");
    };

    const pointsByYear = new Map();

    availableRatings.forEach(item => {
        const point = createSvgElement("circle", {
            cx: x(item.year),
            cy: y(Number(item.value)),
            r: 6,
            class: "chart-point",
            tabindex: 0
        });
        point.setAttribute("aria-label", `${formatSeason(item.year)}: STR ${item.value}`);
        point.addEventListener("mouseenter", () => showPointValue(item, point));
        point.addEventListener("mouseleave", () => hidePointValue(point));
        point.addEventListener("focus", () => showPointValue(item, point));
        point.addEventListener("blur", () => hidePointValue(point));
        svg.appendChild(point);
        pointsByYear.set(item.year, point);
    });

    const seasonSpacing = plotWidth / Math.max(1, SEASONS.length - 1);
    availableRatings.forEach(item => {
        const center = x(item.year);
        const left = Math.max(margin.left, center - seasonSpacing / 2);
        const right = Math.min(width - margin.right, center + seasonSpacing / 2);
        const point = pointsByYear.get(item.year);
        const hoverColumn = createSvgElement("rect", {
            x: left,
            y: margin.top,
            width: right - left,
            height: plotHeight,
            class: "chart-hover-column",
            tabindex: 0,
            "aria-label": `${formatSeason(item.year)}: STR ${item.value}`
        });
        hoverColumn.addEventListener("mouseenter", () => showPointValue(item, point));
        hoverColumn.addEventListener("mouseleave", () => hidePointValue(point));
        hoverColumn.addEventListener("focus", () => showPointValue(item, point));
        hoverColumn.addEventListener("blur", () => hidePointValue(point));
        svg.appendChild(hoverColumn);
    });

    svg.appendChild(tooltip);

    container.appendChild(svg);
}

async function showPlayerDetail(playerId) {
    searchView.hidden = true;
    detailView.hidden = false;
    document.getElementById("player-name").textContent = "Načítám hráče…";

    try {
        const [players, playerCounts] = await Promise.all([loadPlayers(), loadPlayerCounts()]);
        const player = players.find(item => String(item.ID) === playerId);

        if (!player) {
            document.getElementById("player-name").textContent = "Hráč nebyl nalezen";
            document.getElementById("player-info").textContent = "Zkontrolujte ID v adrese.";
            return;
        }

        document.title = `statiSTIS - ${player["Hráč"]}`;
        document.getElementById("player-name").textContent = player["Hráč"];
        const genderLabels = { M: "Muži", Z: "Ženy" };
        const gender = genderLabels[player["Pohlaví"]] || formatValue(player["Pohlaví"]);
        document.getElementById("player-info").textContent =
            `ID: ${player.ID}, Rok narození: ${formatValue(player["Rok narození"])}, Pohlaví: ${gender}`;
        renderPlayerHistory(player, playerCounts);
        renderPlayerChart(player);
    } catch (error) {
        document.getElementById("player-name").textContent = "Data se nepodařilo načíst";
        document.getElementById("player-info").textContent = "Zkuste stránku obnovit.";
    }
}

searchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchPlayers(searchInput.value);
});

const requestedPlayer = new URLSearchParams(window.location.search).get("player");
if (requestedPlayer) {
    showPlayerDetail(requestedPlayer);
}
