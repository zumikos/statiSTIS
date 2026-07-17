function loadTopTable(csvFile, tableId, columnsToShow, maxRows = 10) {
    Papa.parse(csvFile, {
        download: true,
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,

        complete: function (results) {
            const data = results.data
                .filter(row => row["ID"] !== undefined)
                .slice(0, maxRows);
                
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
                    content.textContent = column.key === "Oddíl"
                        ? formatTeamName(row[column.key])
                        : row[column.key];
                    td.appendChild(content);
                    tr.appendChild(td);
                });

                tbody.appendChild(tr);
            });

            table.appendChild(thead);
            table.appendChild(tbody);
        },

        error: function () {
            showTableError(tableId, "Data se nepodařilo načíst. Zkuste stránku obnovit.");
        }
    });
}

function createHomeSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
}

function renderPlayerCountChart(data) {
    const container = document.getElementById("home-player-count");
    container.replaceChildren();

    const width = 650;
    const height = 420;
    const margin = { top: 25, right: 20, bottom: 75, left: 75 };
    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const minValue = 8000;
    const maxValue = 20000;
    const x = year => margin.left + ((year - SEASONS[0]) / (SEASONS.length - 1)) * plotWidth;
    const y = value => margin.top + ((maxValue - value) / (maxValue - minValue)) * plotHeight;

    const svg = createHomeSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": "Vývoj počtu hráčů"
    });

    for (let value = minValue; value <= maxValue; value += 2000) {
        const lineY = y(value);
        svg.appendChild(createHomeSvgElement("line", {
            x1: margin.left, y1: lineY, x2: width - margin.right, y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createHomeSvgElement("text", {
            x: margin.left - 10, y: lineY + 5, "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = value.toLocaleString("cs-CZ");
        svg.appendChild(label);
    }

    data.forEach(item => {
        const lineX = x(item.year);
        svg.appendChild(createHomeSvgElement("line", {
            x1: lineX, y1: margin.top, x2: lineX, y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        const label = createHomeSvgElement("text", {
            x: lineX, y: height - margin.bottom + 24, "text-anchor": "end",
            transform: `rotate(-45 ${lineX} ${height - margin.bottom + 24})`,
            class: "chart-axis-label"
        });
        label.textContent = `${formatSeason(item.year)}${item.year === 2021 ? "*" : ""}`;
        svg.appendChild(label);
    });

    svg.appendChild(createHomeSvgElement("polyline", {
        points: data.map(item => `${x(item.year)},${y(item.value)}`).join(" "),
        class: "chart-line"
    }));

    const tooltip = createHomeSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createHomeSvgElement("rect", { width: 118, height: 30, rx: 6 });
    const tooltipText = createHomeSvgElement("text", {
        x: 59, y: 20, "text-anchor": "middle"
    });
    tooltip.append(tooltipBackground, tooltipText);

    const points = new Map();
    data.forEach(item => {
        const point = createHomeSvgElement("circle", {
            cx: x(item.year), cy: y(item.value), r: 6, class: "chart-point"
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
        const column = createHomeSvgElement("rect", {
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
        column.addEventListener("mouseenter", show);
        column.addEventListener("mouseleave", hide);
        column.addEventListener("focus", show);
        column.addEventListener("blur", hide);
        svg.appendChild(column);
    });

    svg.appendChild(tooltip);

    const xTitle = createHomeSvgElement("text", {
        x: margin.left + plotWidth / 2,
        y: height - 8,
        "text-anchor": "middle",
        class: "chart-axis-label"
    });
    xTitle.textContent = "Sezóna";
    svg.appendChild(xTitle);

    const yTitle = createHomeSvgElement("text", {
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

Papa.parse("csv/player_count.csv", {
    download: true,
    header: true,
    dynamicTyping: true,
    skipEmptyLines: true,
    complete: results => renderPlayerCountChart(results.data.map(row => ({
        year: row["Sezóna"],
        value: row["Počet hráčů"]
    }))),
    error: () => {
        document.getElementById("home-player-count").textContent =
            "Graf se nepodařilo načíst.";
    }
});

const homeSeasonLabel = formatSeason(DEFAULT_SEASON);
document.getElementById("home-ranking-season").textContent = homeSeasonLabel;
document.getElementById("home-movers-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram-season").textContent = homeSeasonLabel;
document.getElementById("home-histogram").src = `images/histogram_STR_${DEFAULT_SEASON}.html?v=native-3`;

loadTopTable(
    `csv/ranking_${DEFAULT_SEASON}.csv`,
    "home-ranking",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "Oddíl", label: "Oddíl" },
        { key: "STR", label: "STR" }
    ]
);

loadTopTable(
    `csv/movers_${DEFAULT_SEASON - 1}_${DEFAULT_SEASON}_STR800.csv`,
    "home-movers",
    [
        { key: "Pořadí", label: "#" },
        { key: "Hráč", label: "Hráč" },
        { key: "Oddíl", label: "Oddíl" },
        { key: "STR změna", label: "STR\nzměna" }
    ]
);
