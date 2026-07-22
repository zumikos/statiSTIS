function formatTopTableValue(row, column) {
    const value = row[column];
    if (column === "Oddíl") return formatTeamName(value);
    if (["STR", "STR změna"].includes(column) && Number.isFinite(Number(value))) {
        return Number(value).toLocaleString("cs-CZ");
    }
    return value;
}

function renderTopTable(rows, tableId, columnsToShow, maxRows = 10) {
    const data = rows.filter(row => row.ID !== undefined).slice(0, maxRows);
                
    if (data.length === 0) {
        showTableError(tableId, "Pro tuto sezónu nejsou dostupná žádná data.");
        return;
    }

    const table = document.getElementById(tableId);

    const thead = document.createElement("thead");
    const tbody = document.createElement("tbody");

    const headerRow = document.createElement("tr");

    columnsToShow.forEach(column => {
        const th = document.createElement("th");
        th.textContent = column.label;
        headerRow.appendChild(th);
    });

    thead.appendChild(headerRow);

    data.forEach(row => {
        const tr = document.createElement("tr");

        columnsToShow.forEach(column => {
            const td = document.createElement("td");
            const content = document.createElement("span");
            content.className = "compact-cell-content";
            content.textContent = formatTopTableValue(row, column.key);
            td.appendChild(content);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.append(thead, tbody);
}

function renderPlayerCountChart(data) {
    const container = document.getElementById("home-player-count");
    container.replaceChildren();

    const width = 650;
    const height = 420;
    const margin = { top: 25, right: 20, bottom: 95, left: 75 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const minValue = 8000;
    const maxValue = 20000;
    const x = year => margin.left + ((year - SEASONS[0]) / (SEASONS.length - 1)) * plotWidth;
    const y = value => margin.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": "Vývoj počtu hráčů"
    });

    for (let value = minValue; value <= maxValue; value += 2000) {
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createSvgElement("text", {
            x: margin.left - 10, y: lineY + 5, "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = value.toLocaleString("cs-CZ");
        svg.appendChild(label);
    }

    data.forEach(item => {
        const lineX = x(item.year);
        svg.appendChild(createSvgElement("line", {
            x1: lineX, y1: margin.top, x2: lineX, y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        addRotatedXLabel(
            svg, lineX, height - margin.bottom + 24,
            `${formatSeason(item.year)}${item.year === 2021 ? "*" : ""}`, 16
        );
    });

    svg.appendChild(createSvgElement("polyline", {
        points: data.map(item => `${x(item.year)},${y(item.value)}`).join(" "),
        class: "chart-line"
    }));

    const tooltip = createSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createSvgElement("rect", { width: 118, height: 30, rx: 6 });
    const tooltipText = createSvgElement("text", {
        x: 59, y: 20, "text-anchor": "middle"
    });
    tooltip.append(tooltipBackground, tooltipText);

    const points = new Map();
    data.forEach(item => {
        const point = createSvgElement("circle", {
            cx: x(item.year),
            cy: y(item.value),
            r: 6,
            class: "chart-point",
            tabindex: 0,
            "aria-label": `${formatSeason(item.year)}: ${item.value.toLocaleString("cs-CZ")} hráčů`
        });
        svg.appendChild(point);
        points.set(item.year, point);
    });

    const spacing = plotWidth / Math.max(1, data.length - 1);
    data.forEach(item => {
        const center = x(item.year);
        const left = Math.max(margin.left, center - spacing / 2);
        const right = Math.min(width - margin.right, center + spacing / 2);
        const point = points.get(item.year);
        const column = createSvgElement("rect", {
            x: left, y: margin.top, width: right - left, height: plotHeight,
            class: "chart-hover-column", tabindex: 0
        });
        const show = () => {
            const tooltipX = Math.min(Math.max(center - 59, 0), width - 118);
            const pointY = y(item.value);
            const tooltipY = pointY < 60 ? pointY + 14 : pointY - 42;
            tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
            tooltipText.textContent = item.value.toLocaleString("cs-CZ");
            tooltip.classList.add("is-visible");
            point.classList.add("is-active");
        };
        const hide = () => {
            tooltip.classList.remove("is-visible");
            point.classList.remove("is-active");
        };
        bindHoverEvents(point, show, hide);
        bindHoverEvents(column, show, hide);
        svg.appendChild(column);
    });

    svg.appendChild(tooltip);

    const xTitle = createSvgElement("text", {
        x: margin.left + plotWidth / 2,
        y: height - 8,
        "text-anchor": "middle",
        class: "chart-axis-label"
    });
    xTitle.textContent = "Sezóna";
    svg.appendChild(xTitle);

    const yTitle = createSvgElement("text", {
        x: 18,
        y: margin.top + plotHeight / 2,
        "text-anchor": "middle",
        transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`,
        class: "chart-axis-label"
    });
    yTitle.textContent = "Počet hráčů";
    svg.appendChild(yTitle);

    container.appendChild(svg);
}

function renderHistogram(data) {
    const container = document.getElementById("home-histogram");
    container.replaceChildren();

    const ratings = data.map(row => Number(row.STR)).filter(Number.isFinite);
    const bins = Array.from({ length: 26 }, (_, index) => ({
        start: index * 100,
        end: (index + 1) * 100,
        count: 0
    }));
    ratings.forEach(value => {
        if (value >= 0 && value <= 2600) {
            bins[Math.min(Math.floor(value / 100), bins.length - 1)].count += 1;
        }
    });

    const width = 650;
    const height = 420;
    const margin = { top: 25, right: 20, bottom: 95, left: 75 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMax = 2500;
    const x = value => margin.left + (value / 2600) * plotWidth;
    const y = value => margin.top + ((yMax - value) / yMax) * plotHeight;
    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": "Rozložení STR"
    });

    for (let value = 0; value <= yMax; value += 500) {
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createSvgElement("text", {
            x: margin.left - 10, y: lineY + 5, "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = value.toLocaleString("cs-CZ");
        svg.appendChild(label);
    }

    for (let value = 0; value <= 2600; value += 200) {
        const lineX = x(value);
        svg.appendChild(createSvgElement("line", {
            x1: lineX, y1: margin.top, x2: lineX, y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        addRotatedXLabel(svg, lineX, height - margin.bottom + 24, value.toLocaleString("cs-CZ"), 12);
    }

    const bars = new Map();
    bins.forEach(item => {
        const left = x(item.start);
        const right = x(item.end);
        const bar = createSvgElement("rect", {
            x: left + 1,
            y: y(item.count),
            width: Math.max(1, right - left - 2),
            height: height - margin.bottom - y(item.count),
            class: "chart-histogram-bar"
        });
        svg.appendChild(bar);
        bars.set(item.start, bar);
    });

    const tooltip = createSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createSvgElement("rect", { width: 190, height: 48, rx: 6 });
    const rangeText = createSvgElement("text", { x: 10, y: 19 });
    const countText = createSvgElement("text", { x: 10, y: 39 });
    tooltip.append(tooltipBackground, rangeText, countText);

    bins.forEach(item => {
        const left = x(item.start);
        const right = x(item.end);
        const bar = bars.get(item.start);
        const column = createSvgElement("rect", {
            x: left, y: margin.top, width: right - left, height: plotHeight,
            class: "chart-histogram-hover", tabindex: 0
        });
        const show = () => {
            const tooltipX = Math.min(Math.max((left + right) / 2 - 95, 0), width - 190);
            tooltip.setAttribute("transform", `translate(${tooltipX} ${margin.top + 8})`);
            rangeText.textContent = `STR: ${item.start}–${item.end}`;
            countText.textContent = `Počet hráčů: ${item.count.toLocaleString("cs-CZ")}`;
            tooltip.classList.add("is-visible");
            bar.classList.add("is-active");
        };
        const hide = () => {
            tooltip.classList.remove("is-visible");
            bar.classList.remove("is-active");
        };
        bindHoverEvents(column, show, hide);
        svg.appendChild(column);
    });
    svg.appendChild(tooltip);

    const xTitle = createSvgElement("text", {
        x: margin.left + plotWidth / 2, y: height - 8,
        "text-anchor": "middle", class: "chart-axis-label"
    });
    xTitle.textContent = "STR";
    svg.appendChild(xTitle);

    const yTitle = createSvgElement("text", {
        x: 18, y: margin.top + plotHeight / 2, "text-anchor": "middle",
        transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`,
        class: "chart-axis-label"
    });
    yTitle.textContent = "Počet hráčů";
    svg.appendChild(yTitle);
    container.appendChild(svg);
}

loadCsv("csv/player_count.csv")
    .then(data => renderPlayerCountChart(data.map(row => ({
        year: row["Sezóna"],
        value: row["Počet hráčů"]
    }))))
    .catch(() => {
        document.getElementById("home-player-count").textContent =
            "Graf se nepodařilo načíst.";
    });

const homeSeasonLabel = formatSeason(DEFAULT_SEASON);
document.getElementById("home-men-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-men-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-women-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-women-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram-season").textContent = homeSeasonLabel;
document.getElementById("home-women-ranking-link").href =
    `zebricky.html?sezona=${DEFAULT_SEASON}&pohlavi=Z`;
document.getElementById("home-women-movers-link").href =
    `skokani.html?sezona=${DEFAULT_SEASON}&pohlavi=Z`;
document.getElementById("home-men-ranking-link").href =
    `zebricky.html?sezona=${DEFAULT_SEASON}&pohlavi=M`;
document.getElementById("home-men-movers-link").href =
    `skokani.html?sezona=${DEFAULT_SEASON}&pohlavi=M`;

const rankingColumns = [
    { key: "Pořadí", label: "#" },
    { key: "Hráč", label: "Hráč" },
    { key: "Oddíl", label: "Oddíl" },
    { key: "STR", label: "STR" }
];
const moverColumns = [
    { key: "Pořadí", label: "#" },
    { key: "Hráč", label: "Hráč" },
    { key: "Oddíl", label: "Oddíl" },
    { key: "STR změna", label: "STR\nzměna" }
];

loadCsv(`csv/ranking_${DEFAULT_SEASON}.csv`)
    .then(data => {
        renderHistogram(data);
        const men = filterAndRenumberRows(data, row => row["Pohlaví"] === "M", true, "STR");
        renderTopTable(men, "home-men-ranking", rankingColumns);
        const women = filterAndRenumberRows(data, row => row["Pohlaví"] === "Z", true, "STR");
        renderTopTable(women, "home-women-ranking", rankingColumns);
    })
    .catch(() => {
        document.getElementById("home-histogram").textContent =
            "Graf se nepodařilo načíst.";
        const message = "Data se nepodařilo načíst. Zkuste stránku obnovit.";
        showTableError("home-men-ranking", message);
        showTableError("home-women-ranking", message);
    });

loadCsv(`csv/movers_${DEFAULT_SEASON - 1}_${DEFAULT_SEASON}_STR800.csv`)
    .then(data => {
        const men = filterAndRenumberRows(data, row => row["Pohlaví"] === "M", true, "STR změna");
        renderTopTable(men, "home-men-movers", moverColumns);
        const women = filterAndRenumberRows(data, row => row["Pohlaví"] === "Z", true, "STR změna");
        renderTopTable(women, "home-women-movers", moverColumns);
    })
    .catch(() => {
        const message = "Data se nepodařilo načíst. Zkuste stránku obnovit.";
        showTableError("home-men-movers", message);
        showTableError("home-women-movers", message);
    });
