function formatTopTableValue(row, column) {
    const value = row[column];
    if (column === "Hráč") return formatPlayerName(value);
    if (column === "Oddíl") return formatTeamName(value);
    if (["STR", "STR změna"].includes(column)) return formatThousands(value);
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
            const value = formatTopTableValue(row, column.key);
            if (column.key === "Hráč") {
                content.appendChild(createPlayerProfileLink(row.ID, value));
            } else if (column.key === "Oddíl") {
                content.appendChild(createTeamProfileLink(value));
            } else {
                content.textContent = value;
            }
            td.appendChild(content);
            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.append(thead, tbody);
}

function renderPlayerCountChart(data) {
    const minValue = 8000;
    const maxValue = 20000;
    renderInteractiveLineChart({
        container: document.getElementById("home-player-count"),
        data: data.map(item => ({ x: item.year, value: item.value })),
        xValues: SEASONS,
        width: 650,
        height: 420,
        margin: { top: 25, right: 20, bottom: 95, left: 75 },
        minValue,
        maxValue,
        yTicks: Array.from({ length: 7 }, (_, index) => minValue + index * 2000),
        ariaLabel: "Vývoj počtu hráčů",
        xLabel: year => `${formatSeason(year)}${year === 2021 ? "*" : ""}`,
        xLabelOffset: 16,
        xTitle: "Sezóna",
        yTitle: "Počet hráčů",
        tooltipWidth: 118,
        formatTooltip: item => formatThousands(item.value),
        formatPointAria: item =>
            `${formatSeason(item.x)}: ${formatThousands(item.value)} hráčů`
    });
}

function renderHistogram(data) {
    const container = document.getElementById("home-histogram");
    container.replaceChildren();

    const ratings = data.map(row => Number(row.STR)).filter(Number.isFinite);
    const sortedRatings = [...ratings].sort((first, second) => first - second);
    const mean = ratings.reduce((sum, value) => sum + value, 0) / ratings.length;
    const middle = Math.floor(sortedRatings.length / 2);
    const median = sortedRatings.length % 2
        ? sortedRatings[middle]
        : (sortedRatings[middle - 1] + sortedRatings[middle]) / 2;
    const standardDeviation = Math.sqrt(
        ratings.reduce((sum, value) => sum + (value - mean) ** 2, 0) / ratings.length
    );
    const formatStatistic = value => value.toLocaleString("cs-CZ", {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    });
    document.getElementById("home-histogram-stats").textContent =
        `medián = ${formatStatistic(median)}; průměr = ${formatStatistic(mean)}; sm. odchylka = ${formatStatistic(standardDeviation)}`;
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

function associationStatistics(data) {
    const ratingsByAssociation = new Map();

    data.forEach(row => {
        const association = formatAssociationName(row["Kraj"]);
        const rating = Number(row["STR"]);
        if (!association || !Number.isFinite(rating)) return;
        if (!ratingsByAssociation.has(association)) ratingsByAssociation.set(association, []);
        ratingsByAssociation.get(association).push(rating);
    });

    return [...ratingsByAssociation].map(([association, ratings]) => {
        ratings.sort((first, second) => first - second);
        const middle = Math.floor(ratings.length / 2);
        const median = ratings.length % 2
            ? ratings[middle]
            : (ratings[middle - 1] + ratings[middle]) / 2;
        return { association, count: ratings.length, median };
    });
}

function niceAxisMaximum(maximum) {
    const magnitude = 10 ** Math.floor(Math.log10(maximum));
    const step = magnitude / 5;
    return Math.ceil(maximum / step) * step;
}

function renderAssociationBarChart(containerId, data, valueKey, yTitle) {
    const container = document.getElementById(containerId);
    container.replaceChildren();

    const sortedData = [...data].sort((first, second) =>
        second[valueKey] - first[valueKey] ||
        first.association.localeCompare(second.association, "cs")
    );
    if (sortedData.length === 0) {
        container.textContent = "Graf neobsahuje žádná data.";
        return;
    }

    const width = 760;
    const height = 520;
    const margin = { top: 24, right: 18, bottom: 175, left: 76 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const yMaximum = niceAxisMaximum(Math.max(...sortedData.map(item => item[valueKey])));
    const y = value => margin.top + plotHeight * (1 - value / yMaximum);
    const columnWidth = plotWidth / sortedData.length;
    const barWidth = Math.max(8, columnWidth * 0.68);
    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": yTitle
    });

    for (let index = 0; index <= 4; index += 1) {
        const value = yMaximum * index / 4;
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createSvgElement("text", {
            x: margin.left - 10, y: lineY + 5, "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = Math.round(value).toLocaleString("cs-CZ");
        svg.appendChild(label);
    }

    const bars = new Map();
    sortedData.forEach((item, index) => {
        const center = margin.left + columnWidth * (index + 0.5);
        const lineX = margin.left + columnWidth * index;
        svg.appendChild(createSvgElement("line", {
            x1: lineX, y1: margin.top, x2: lineX, y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        addRotatedXLabel(svg, center, height - margin.bottom + 26, item.association, 12);

        const bar = createSvgElement("rect", {
            x: center - barWidth / 2,
            y: y(item[valueKey]),
            width: barWidth,
            height: height - margin.bottom - y(item[valueKey]),
            class: "chart-histogram-bar"
        });
        svg.appendChild(bar);
        bars.set(item.association, bar);
    });
    svg.appendChild(createSvgElement("line", {
        x1: width - margin.right, y1: margin.top,
        x2: width - margin.right, y2: height - margin.bottom,
        class: "chart-grid-line"
    }));

    const tooltipWidth = 220;
    const tooltip = createSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createSvgElement("rect", {
        width: tooltipWidth, height: 48, rx: 6
    });
    const associationText = createSvgElement("text", { x: 10, y: 19 });
    const valueText = createSvgElement("text", { x: 10, y: 39 });
    tooltip.append(tooltipBackground, associationText, valueText);

    sortedData.forEach((item, index) => {
        const left = margin.left + columnWidth * index;
        const center = left + columnWidth / 2;
        const bar = bars.get(item.association);
        const hoverColumn = createSvgElement("rect", {
            x: left, y: margin.top, width: columnWidth, height: plotHeight,
            class: "chart-histogram-hover", tabindex: 0,
            "aria-label": `${item.association}: ${Math.round(item[valueKey]).toLocaleString("cs-CZ")}`
        });
        const show = () => {
            const tooltipX = Math.min(Math.max(center - tooltipWidth / 2, 0), width - tooltipWidth);
            tooltip.setAttribute("transform", `translate(${tooltipX} ${margin.top + 8})`);
            associationText.textContent = item.association;
            valueText.textContent = valueKey === "count"
                ? `Počet hráčů: ${item.count.toLocaleString("cs-CZ")}`
                : `Medián STR: ${item.median.toLocaleString("cs-CZ")}`;
            tooltip.classList.add("is-visible");
            bar.classList.add("is-active");
        };
        const hide = () => {
            tooltip.classList.remove("is-visible");
            bar.classList.remove("is-active");
        };
        bindHoverEvents(hoverColumn, show, hide);
        svg.appendChild(hoverColumn);
    });
    svg.appendChild(tooltip);

    const xAxisTitle = createSvgElement("text", {
        x: margin.left + plotWidth / 2, y: height - 8,
        "text-anchor": "middle", class: "chart-axis-label"
    });
    xAxisTitle.textContent = "Svaz";
    svg.appendChild(xAxisTitle);

    const yAxisTitle = createSvgElement("text", {
        x: 18, y: margin.top + plotHeight / 2, "text-anchor": "middle",
        transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`,
        class: "chart-axis-label"
    });
    yAxisTitle.textContent = yTitle;
    svg.appendChild(yAxisTitle);
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
document.getElementById("last-updated").textContent =
    `Stránka naposledy aktualizována ${LAST_UPDATED_DATE}`;
document.getElementById("home-men-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-men-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-women-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-women-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram-season").textContent = homeSeasonLabel;
document.getElementById("home-association-count-season").textContent = homeSeasonLabel;
document.getElementById("home-association-median-season").textContent = homeSeasonLabel;
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
        const associations = associationStatistics(data);
        renderAssociationBarChart("home-association-count", associations, "count", "Počet hráčů");
        renderAssociationBarChart("home-association-median", associations, "median", "Medián STR");
        const men = filterAndRankRows(data, row => row["Pohlaví"] === "M", "STR");
        renderTopTable(men, "home-men-ranking", rankingColumns);
        const women = filterAndRankRows(data, row => row["Pohlaví"] === "Z", "STR");
        renderTopTable(women, "home-women-ranking", rankingColumns);
    })
    .catch(() => {
        document.getElementById("home-histogram").textContent =
            "Graf se nepodařilo načíst.";
        document.getElementById("home-association-count").textContent =
            "Graf se nepodařilo načíst.";
        document.getElementById("home-association-median").textContent =
            "Graf se nepodařilo načíst.";
        const message = "Data se nepodařilo načíst. Zkuste stránku obnovit.";
        showTableError("home-men-ranking", message);
        showTableError("home-women-ranking", message);
    });

loadCsv(`csv/movers_${DEFAULT_SEASON - 1}_${DEFAULT_SEASON}_STR800.csv`)
    .then(data => {
        const men = filterAndRankRows(data, row => row["Pohlaví"] === "M", "STR změna");
        renderTopTable(men, "home-men-movers", moverColumns);
        const women = filterAndRankRows(data, row => row["Pohlaví"] === "Z", "STR změna");
        renderTopTable(women, "home-women-movers", moverColumns);
    })
    .catch(() => {
        const message = "Data se nepodařilo načíst. Zkuste stránku obnovit.";
        showTableError("home-men-movers", message);
        showTableError("home-women-movers", message);
    });
