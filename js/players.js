const searchView = document.getElementById("player-search-view");
const detailView = document.getElementById("player-detail-view");
const searchForm = document.getElementById("player-search-form");
const searchInput = document.getElementById("player-search-input");
const searchStatus = document.getElementById("player-search-status");
const resultsContainer = document.getElementById("player-results");

let playersPromise;

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

function playerLink(player) {
    const link = document.createElement("a");
    link.className = "player-result";
    link.href = `hraci.html?player=${encodeURIComponent(player.ID)}`;

    const name = document.createElement("strong");
    name.textContent = player["Hráč"];

    const details = document.createElement("span");
    const birthYear = player["Rok narození"] || "rok narození neuveden";
    details.textContent = `STIS ID ${player.ID} · ${birthYear}`;

    link.append(name, details);
    return link;
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
        const matches = players.filter(player =>
            normalizeSearchText(player["Hráč"]).includes(normalizedQuery) ||
            String(player.ID) === normalizedQuery
        );

        if (matches.length === 0) {
            searchStatus.textContent = "Žádný hráč nebyl nalezen.";
            return;
        }

        const visibleMatches = matches.slice(0, 50);
        searchStatus.textContent = matches.length > visibleMatches.length
            ? `Nalezeno ${matches.length} hráčů. Zobrazeno prvních ${visibleMatches.length}; upřesněte hledání.`
            : `Nalezeno hráčů: ${matches.length}`;

        const list = document.createElement("div");
        list.className = "player-results-list";
        visibleMatches.forEach(player => list.appendChild(playerLink(player)));
        resultsContainer.appendChild(list);
    } catch (error) {
        searchStatus.textContent = "Seznam hráčů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function formatValue(value, signed = false) {
    if (value === null || value === undefined || value === "") return "—";
    return signed && Number(value) > 0 ? `+${value}` : String(value);
}

function renderPlayerHistory(player) {
    const table = document.getElementById("player-history");
    table.replaceChildren();

    const headers = ["Sezóna", "STR", "Pořadí", "Změna STR", "Pořadí skokanů"];
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
                formatValue(player[`${year} změna`], true),
                formatValue(player[`${year} skokani pořadí`])
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
        const label = createSvgElement("text", {
            x: x(year),
            y: height - margin.bottom + 24,
            class: "chart-axis-label",
            "text-anchor": "end",
            transform: `rotate(-45 ${x(year)} ${height - margin.bottom + 24})`
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

    availableRatings.forEach(item => {
        const point = createSvgElement("circle", {
            cx: x(item.year),
            cy: y(Number(item.value)),
            r: 6,
            class: "chart-point",
            tabindex: 0
        });
        const title = createSvgElement("title");
        title.textContent = `${formatSeason(item.year)}: STR ${item.value}`;
        point.appendChild(title);
        svg.appendChild(point);
    });

    container.appendChild(svg);
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
            document.getElementById("player-info").textContent = "Zkontrolujte STIS ID v adrese.";
            return;
        }

        document.title = `${player["Hráč"]} – statiSTIS`;
        document.getElementById("player-name").textContent = player["Hráč"];
        document.getElementById("player-info").textContent =
            `STIS ID: ${player.ID} · Rok narození: ${formatValue(player["Rok narození"])} · Pohlaví: ${formatValue(player["Pohlaví"])}`;
        renderPlayerHistory(player);
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
