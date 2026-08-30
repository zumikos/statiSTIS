const COMPARISON_COLORS = ["#1976d2", "#e76f00"];
const selectedPlayers = [null, null];
const pickerElements = [...document.querySelectorAll(".comparison-picker")];

function comparisonResultButton(player, slot) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "search-result comparison-result";

    const name = document.createElement("strong");
    name.textContent = player["Hráč"];
    const details = document.createElement("span");
    details.textContent = `Ročník: ${player["Rok narození"] || "neuveden"}, ID: ${player.ID}`;
    button.append(name, details);
    button.addEventListener("click", () => selectPlayer(slot, player));
    return button;
}

function renderSearchResults(slot, players) {
    const picker = pickerElements[slot];
    const container = picker.querySelector(".comparison-results");
    container.replaceChildren();
    const list = document.createElement("div");
    list.className = "search-results-list comparison-results-list";
    players.slice(0, 10).forEach(player => list.appendChild(comparisonResultButton(player, slot)));
    container.appendChild(list);
}

async function searchComparisonPlayers(slot, query) {
    const picker = pickerElements[slot];
    const status = picker.querySelector(".comparison-status");
    const results = picker.querySelector(".comparison-results");
    results.replaceChildren();

    if (normalizeText(query, true).length < 2) {
        status.textContent = "Zadejte alespoň dva znaky.";
        return;
    }

    status.textContent = "Načítám hráče…";
    try {
        const matches = await findPlayers(query);
        if (matches.length === 0) {
            status.textContent = "Žádný hráč nebyl nalezen.";
            return;
        }
        status.textContent = matches.length > 10
            ? `Nalezeno hráčů: ${matches.length}. Zobrazeno prvních 10.`
            : `Nalezeno hráčů: ${matches.length}`;
        renderSearchResults(slot, matches);
    } catch (error) {
        status.textContent = "Seznam hráčů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function updateComparisonUrl() {
    const parameters = new URLSearchParams();
    selectedPlayers.forEach((player, index) => {
        if (player) parameters.set(`ID${index + 1}`, player.ID);
    });
    const query = parameters.toString();
    history.replaceState(null, "", `porovnani.html${query ? `?${query}` : ""}`);
}

function selectPlayer(slot, player, updateUrl = true) {
    const otherPlayer = selectedPlayers[slot === 0 ? 1 : 0];
    const picker = pickerElements[slot];
    const status = picker.querySelector(".comparison-status");
    if (otherPlayer && String(otherPlayer.ID) === String(player.ID)) {
        status.textContent = "Vyberte dva různé hráče.";
        return;
    }

    selectedPlayers[slot] = player;
    picker.querySelector(".comparison-search").hidden = true;
    picker.querySelector(".comparison-results").replaceChildren();
    status.textContent = "";

    const selected = picker.querySelector(".comparison-selected");
    selected.hidden = false;
    selected.replaceChildren();
    const text = document.createElement("div");
    const name = document.createElement("strong");
    name.appendChild(createPlayerProfileLink(player.ID, player["Hráč"]));
    const details = document.createElement("span");
    details.textContent = `ID: ${player.ID}, ročník: ${player["Rok narození"] || "neuveden"}`;
    text.append(name, details);
    const changeButton = document.createElement("button");
    changeButton.type = "button";
    changeButton.className = "button";
    changeButton.textContent = "Změnit";
    changeButton.addEventListener("click", () => clearPlayer(slot));
    selected.append(text, changeButton);

    if (updateUrl) updateComparisonUrl();
    renderComparison();
}

function clearPlayer(slot) {
    selectedPlayers[slot] = null;
    const picker = pickerElements[slot];
    picker.querySelector(".comparison-search").hidden = false;
    picker.querySelector(".comparison-selected").hidden = true;
    picker.querySelector(".comparison-status").textContent = "";
    const input = picker.querySelector("input");
    input.value = "";
    input.focus();
    updateComparisonUrl();
    renderComparison();
}

function comparisonBounds(series, reverseY) {
    const values = series.flatMap(item => item.data)
        .filter(item => item.value !== null && item.value !== undefined && item.value !== "")
        .map(item => Number(item.value))
        .filter(Number.isFinite);
    if (reverseY) {
        const highestRank = Math.max(...values);
        const tickStep = Math.max(1, Math.ceil((highestRank - 1) / 4));
        const ticks = Array.from({ length: 5 }, (_, index) => 1 + tickStep * index);
        return { min: 1, max: ticks[ticks.length - 1], ticks };
    }
    const rawMin = Math.min(...values);
    const rawMax = Math.max(...values);
    const padding = Math.max(50, (rawMax - rawMin) * 0.15);
    const min = Math.max(0, Math.floor((rawMin - padding) / 100) * 100);
    const max = Math.ceil((rawMax + padding) / 100) * 100 || 100;
    return {
        min,
        max,
        ticks: Array.from({ length: 5 }, (_, index) => min + ((max - min) * index) / 4)
    };
}

function addComparisonLegend(svg, series, width, height, margin, xScale, yScale) {
    const legendWidth = 260;
    const legendHeight = 62;
    const inset = 12;
    const candidates = [
        { x: width - margin.right - legendWidth - inset, y: margin.top + inset },
        { x: margin.left + inset, y: margin.top + inset },
        {
            x: width - margin.right - legendWidth - inset,
            y: height - margin.bottom - legendHeight - inset
        },
        { x: margin.left + inset, y: height - margin.bottom - legendHeight - inset }
    ];
    const plottedPoints = series.flatMap(item => item.data)
        .filter(point => point.value !== null && point.value !== undefined && point.value !== "")
        .map(point => ({ x: xScale(point.x), y: yScale(point.value) }));
    const penalty = candidate => plottedPoints.filter(point =>
        point.x >= candidate.x - 15 && point.x <= candidate.x + legendWidth + 15 &&
        point.y >= candidate.y - 15 && point.y <= candidate.y + legendHeight + 15
    ).length;
    const position = candidates.reduce((best, candidate) =>
        penalty(candidate) < penalty(best) ? candidate : best
    );

    svg.appendChild(createSvgElement("rect", {
        x: position.x,
        y: position.y,
        width: legendWidth,
        height: legendHeight,
        rx: 6,
        class: "comparison-legend-background"
    }));
    series.forEach((item, index) => {
        const itemY = position.y + 19 + index * 25;
        svg.appendChild(createSvgElement("line", {
            x1: position.x + 12,
            y1: itemY,
            x2: position.x + 42,
            y2: itemY,
            stroke: item.color,
            class: "comparison-legend-line"
        }));
        svg.appendChild(createSvgElement("circle", {
            cx: position.x + 27,
            cy: itemY,
            r: 5,
            fill: "var(--surface)",
            stroke: item.color,
            class: "comparison-legend-point"
        }));
        const label = createSvgElement("text", {
            x: position.x + 52,
            y: itemY + 5,
            class: "chart-axis-label comparison-legend-label"
        });
        label.textContent = item.player["Hráč"];
        svg.appendChild(label);
    });
}

function renderComparisonLineChart({ containerId, field, reverseY, valueLabel }) {
    const container = document.getElementById(containerId);
    const series = selectedPlayers.filter(Boolean).map((player, index) => ({
        player,
        color: COMPARISON_COLORS[index],
        data: SEASONS.map(year => ({ x: year, value: player[`${year} ${field}`] }))
    }));
    const available = series.flatMap(item => item.data).filter(item =>
        item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value))
    );
    container.replaceChildren();
    if (available.length === 0) {
        container.textContent = "Pro vybrané hráče nejsou dostupná data.";
        return;
    }

    const width = 1000;
    const height = 480;
    const margin = { top: 25, right: 25, bottom: 110, left: 80 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const bounds = comparisonBounds(series, reverseY);
    const x = year => margin.left +
        ((year - SEASONS[0]) / (SEASONS[SEASONS.length - 1] - SEASONS[0])) * plotWidth;
    const y = value => margin.top + (reverseY
        ? (Number(value) - bounds.min) / (bounds.max - bounds.min)
        : (bounds.max - Number(value)) / (bounds.max - bounds.min)) * plotHeight;
    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": `${valueLabel}: porovnání hráčů ${series.map(item => item.player["Hráč"]).join(" a ")}`
    });
    bounds.ticks.forEach(value => {
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createSvgElement("text", {
            x: margin.left - 10, y: lineY + 5, "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = formatThousands(Math.round(value));
        svg.appendChild(label);
    });
    SEASONS.forEach(year => {
        const lineX = x(year);
        svg.appendChild(createSvgElement("line", {
            x1: lineX, y1: margin.top, x2: lineX, y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        addRotatedXLabel(svg, lineX, height - margin.bottom + 24, formatSeason(year), 10);
    });

    const pointsByYear = new Map();
    series.forEach(item => {
        let segment = [];
        const drawSegment = () => {
            if (segment.length > 1) {
                svg.appendChild(createSvgElement("polyline", {
                    points: segment.map(point => `${x(point.x)},${y(point.value)}`).join(" "),
                    class: "comparison-chart-line",
                    stroke: item.color
                }));
            }
            segment = [];
        };
        item.data.forEach(point => {
            if (point.value === null || point.value === undefined || !Number.isFinite(Number(point.value))) {
                drawSegment();
                return;
            }
            segment.push(point);
            const circle = createSvgElement("circle", {
                cx: x(point.x), cy: y(point.value), r: 6,
                class: "comparison-chart-point", stroke: item.color,
                style: `--series-color:${item.color}`,
                tabindex: 0,
                "aria-label": `${item.player["Hráč"]}, ${formatSeason(point.x)}: ${valueLabel} ${formatThousands(point.value)}`
            });
            svg.appendChild(circle);
            if (!pointsByYear.has(point.x)) pointsByYear.set(point.x, []);
            pointsByYear.get(point.x).push({ circle, point, item });
        });
        drawSegment();
    });

    const tooltipWidth = 270;
    const tooltip = createSvgElement("g", { class: "chart-value-tooltip comparison-tooltip" });
    const background = createSvgElement("rect", { width: tooltipWidth, rx: 6 });
    const text = createSvgElement("text", { x: 12, "text-anchor": "start" });
    tooltip.append(background, text);
    const spacing = plotWidth / Math.max(1, SEASONS.length - 1);

    pointsByYear.forEach((items, year) => {
        const center = x(year);
        const show = () => {
            const lines = [formatSeason(year), ...items.map(({ point, item }) =>
                `${item.player["Hráč"]}: ${formatThousands(point.value)}`
            )];
            const tooltipHeight = 12 + lines.length * 18;
            const tooltipX = Math.min(Math.max(center - tooltipWidth / 2, 0), width - tooltipWidth);
            tooltip.setAttribute("transform", `translate(${tooltipX} ${margin.top + 8})`);
            background.setAttribute("height", tooltipHeight);
            text.replaceChildren();
            lines.forEach((line, index) => {
                const tspan = createSvgElement("tspan", { x: 12, y: 20 + index * 18 });
                tspan.textContent = line;
                text.appendChild(tspan);
            });
            items.forEach(({ circle }) => circle.classList.add("is-active"));
            tooltip.classList.add("is-visible");
        };
        const hide = () => {
            items.forEach(({ circle }) => circle.classList.remove("is-active"));
            tooltip.classList.remove("is-visible");
        };
        const hoverColumn = createSvgElement("rect", {
            x: Math.max(margin.left, center - spacing / 2),
            y: margin.top,
            width: Math.min(width - margin.right, center + spacing / 2) -
                Math.max(margin.left, center - spacing / 2),
            height: plotHeight,
            class: "chart-hover-column",
            tabindex: 0,
            "aria-label": `${formatSeason(year)}: ${items.map(({ point, item }) =>
                `${item.player["Hráč"]}, ${valueLabel} ${formatThousands(point.value)}`).join("; ")}`
        });
        items.forEach(({ circle }) => bindHoverEvents(circle, show, hide));
        bindHoverEvents(hoverColumn, show, hide);
        svg.appendChild(hoverColumn);
    });
    addComparisonLegend(svg, series, width, height, margin, x, y);
    svg.appendChild(tooltip);
    addChartAxisTitle(svg, "Sezóna", {
        x: margin.left + plotWidth / 2, y: height - 8, "text-anchor": "middle"
    });
    addChartAxisTitle(svg, valueLabel, {
        x: 18, y: margin.top + plotHeight / 2, "text-anchor": "middle",
        transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`
    });
    container.appendChild(svg);
}

function latestPlayerRating(player) {
    for (const season of [...SEASONS].reverse()) {
        const value = player[`${season} STR`];
        if (value === null || value === undefined || value === "") continue;
        const rating = Number(value);
        if (Number.isFinite(rating)) return { rating, season };
    }
    return null;
}

function renderWinProbability() {
    const ratings = selectedPlayers.map(latestPlayerRating);
    const firstProbability = ratings.every(Boolean)
        ? 1 / (1 + 10 ** ((ratings[1].rating - ratings[0].rating) / 400))
        : null;
    const probabilities = [firstProbability, firstProbability === null ? null : 1 - firstProbability];

    selectedPlayers.forEach((player, index) => {
        document.getElementById(`comparison-win-name-${index}`).textContent = player["Hráč"];
        document.getElementById(`comparison-win-value-${index}`).textContent = probabilities[index] === null
            ? "—"
            : `${(probabilities[index] * 100).toLocaleString("cs-CZ", {
                minimumFractionDigits: 1,
                maximumFractionDigits: 1
            })} %`;
        document.getElementById(`comparison-win-rating-${index}`).textContent = ratings[index]
            ? `STR ${formatThousands(ratings[index].rating)} (${formatSeason(ratings[index].season)})`
            : "STR není k dispozici";
    });
}

function renderComparison() {
    const charts = document.getElementById("comparison-charts");
    if (selectedPlayers.some(player => !player)) {
        charts.hidden = true;
        return;
    }
    charts.hidden = false;
    renderComparisonLineChart({
        containerId: "comparison-str-chart", field: "STR", reverseY: false, valueLabel: "STR"
    });
    renderComparisonLineChart({
        containerId: "comparison-rank-chart", field: "pořadí", reverseY: true, valueLabel: "Pořadí"
    });
    renderWinProbability();
}

pickerElements.forEach((picker, slot) => {
    picker.querySelector("form").addEventListener("submit", event => {
        event.preventDefault();
        searchComparisonPlayers(slot, picker.querySelector("input").value);
    });
});

async function restoreComparisonFromUrl() {
    const parameters = new URLSearchParams(window.location.search);
    const ids = [parameters.get("ID1"), parameters.get("ID2")];
    if (!ids.some(Boolean)) return;
    try {
        const players = await loadPlayers();
        ids.forEach((id, slot) => {
            const player = players.find(item => String(item.ID) === id);
            if (player) selectPlayer(slot, player, false);
        });
        updateComparisonUrl();
    } catch (error) {
        pickerElements[0].querySelector(".comparison-status").textContent =
            "Vybrané hráče se nepodařilo načíst.";
    }
}

restoreComparisonFromUrl();
