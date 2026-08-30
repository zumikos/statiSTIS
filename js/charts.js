function createSvgElement(name, attributes = {}) {
    const element = document.createElementNS("http://www.w3.org/2000/svg", name);
    Object.entries(attributes).forEach(([key, value]) => element.setAttribute(key, value));
    return element;
}

function addRotatedXLabel(svg, x, y, text, offset = 10) {
    const labelX = x + offset;
    const label = createSvgElement("text", {
        x: labelX,
        y,
        "text-anchor": "end",
        transform: `rotate(-45 ${labelX} ${y})`,
        class: "chart-axis-label"
    });
    label.textContent = text;
    svg.appendChild(label);
}

function bindHoverEvents(element, show, hide) {
    element.addEventListener("mouseenter", show);
    element.addEventListener("mouseleave", hide);
    element.addEventListener("focus", show);
    element.addEventListener("blur", hide);
}

function addChartAxisTitle(svg, text, attributes) {
    if (!text) return;
    const title = createSvgElement("text", {
        ...attributes,
        class: "chart-axis-label"
    });
    title.textContent = text;
    svg.appendChild(title);
}

function renderInteractiveLineChart({
    container,
    data,
    xValues,
    width,
    height,
    margin,
    minValue,
    maxValue,
    yTicks,
    ariaLabel,
    xLabel,
    xLabelOffset = 10,
    xTitle = "",
    yTitle = "",
    rightYTitle = "",
    formatRightYLabel = null,
    formatYLabel = formatThousands,
    formatTooltip = item => formatThousands(item.value),
    formatPointAria = item => `${xLabel(item.x)}: ${formatThousands(item.value)}`,
    tooltipWidth = 82,
    reverseY = false,
    emptyMessage = "Graf neobsahuje žádná data."
}) {
    container.replaceChildren();
    const dataByX = new Map(data.map(item => [item.x, item]));
    const series = xValues.map(xValue => dataByX.get(xValue) ?? {
        x: xValue,
        value: undefined
    });
    const available = series.filter(item =>
        item.value !== null && item.value !== undefined && Number.isFinite(Number(item.value))
    );
    if (available.length === 0) {
        container.textContent = emptyMessage;
        return;
    }

    const plotWidth = width - margin.left - margin.right;
    const plotHeight = height - margin.top - margin.bottom;
    const x = value => margin.left +
        ((value - xValues[0]) / (xValues[xValues.length - 1] - xValues[0])) * plotWidth;
    const y = value => margin.top + (
        reverseY
            ? (Number(value) - minValue) / (maxValue - minValue)
            : (maxValue - Number(value)) / (maxValue - minValue)
    ) * plotHeight;
    const svg = createSvgElement("svg", {
        viewBox: `0 0 ${width} ${height}`,
        role: "img",
        "aria-label": ariaLabel
    });

    yTicks.forEach(value => {
        const lineY = y(value);
        svg.appendChild(createSvgElement("line", {
            x1: margin.left,
            y1: lineY,
            x2: width - margin.right,
            y2: lineY,
            class: "chart-grid-line"
        }));
        const label = createSvgElement("text", {
            x: margin.left - 10,
            y: lineY + 5,
            "text-anchor": "end",
            class: "chart-axis-label"
        });
        label.textContent = formatYLabel(value);
        svg.appendChild(label);

        if (formatRightYLabel) {
            const rightLabel = createSvgElement("text", {
                x: width - margin.right + 10,
                y: lineY + 5,
                "text-anchor": "start",
                class: "chart-axis-label"
            });
            rightLabel.textContent = formatRightYLabel(value);
            svg.appendChild(rightLabel);
        }
    });

    xValues.forEach(value => {
        const lineX = x(value);
        svg.appendChild(createSvgElement("line", {
            x1: lineX,
            y1: margin.top,
            x2: lineX,
            y2: height - margin.bottom,
            class: "chart-grid-line"
        }));
        addRotatedXLabel(
            svg,
            lineX,
            height - margin.bottom + 24,
            xLabel(value),
            xLabelOffset
        );
    });

    let currentSegment = [];
    const drawSegment = () => {
        if (currentSegment.length > 1) {
            svg.appendChild(createSvgElement("polyline", {
                points: currentSegment.map(item => `${x(item.x)},${y(item.value)}`).join(" "),
                class: "chart-line"
            }));
        }
        currentSegment = [];
    };
    series.forEach(item => {
        if (item.value === null || item.value === undefined) {
            drawSegment();
        } else {
            currentSegment.push({ x: item.x, value: Number(item.value) });
        }
    });
    drawSegment();

    const tooltip = createSvgElement("g", { class: "chart-value-tooltip" });
    const tooltipBackground = createSvgElement("rect", {
        width: tooltipWidth,
        height: 30,
        rx: 6
    });
    const tooltipText = createSvgElement("text", {
        x: tooltipWidth / 2,
        y: 20,
        "text-anchor": "middle"
    });
    tooltip.append(tooltipBackground, tooltipText);

    const points = new Map();
    available.forEach(item => {
        const point = createSvgElement("circle", {
            cx: x(item.x),
            cy: y(item.value),
            r: 6,
            class: "chart-point",
            tabindex: 0,
            "aria-label": formatPointAria(item)
        });
        svg.appendChild(point);
        points.set(item.x, point);
    });

    const spacing = plotWidth / Math.max(1, xValues.length - 1);
    available.forEach(item => {
        const center = x(item.x);
        const left = Math.max(margin.left, center - spacing / 2);
        const right = Math.min(width - margin.right, center + spacing / 2);
        const point = points.get(item.x);
        const hoverColumn = createSvgElement("rect", {
            x: left,
            y: margin.top,
            width: right - left,
            height: plotHeight,
            class: "chart-hover-column",
            tabindex: 0,
            "aria-label": formatPointAria(item)
        });
        const show = () => {
            const pointY = y(item.value);
            const tooltipLines = [].concat(formatTooltip(item));
            const tooltipHeight = 12 + tooltipLines.length * 18;
            const tooltipX = Math.min(
                Math.max(center - tooltipWidth / 2, 0),
                width - tooltipWidth
            );
            const tooltipY = pointY < tooltipHeight + 18
                ? pointY + 14
                : pointY - tooltipHeight - 12;
            tooltip.setAttribute("transform", `translate(${tooltipX} ${tooltipY})`);
            tooltipBackground.setAttribute("height", tooltipHeight);
            tooltipText.replaceChildren();
            tooltipLines.forEach((line, index) => {
                const tspan = createSvgElement("tspan", {
                    x: tooltipWidth / 2,
                    y: 20 + index * 18
                });
                tspan.textContent = line;
                tooltipText.appendChild(tspan);
            });
            tooltip.classList.add("is-visible");
            point.classList.add("is-active");
        };
        const hide = () => {
            tooltip.classList.remove("is-visible");
            point.classList.remove("is-active");
        };
        bindHoverEvents(point, show, hide);
        bindHoverEvents(hoverColumn, show, hide);
        svg.appendChild(hoverColumn);
    });
    svg.appendChild(tooltip);

    addChartAxisTitle(svg, xTitle, {
        x: margin.left + plotWidth / 2,
        y: height - 8,
        "text-anchor": "middle"
    });
    addChartAxisTitle(svg, yTitle, {
        x: 18,
        y: margin.top + plotHeight / 2,
        "text-anchor": "middle",
        transform: `rotate(-90 18 ${margin.top + plotHeight / 2})`
    });
    addChartAxisTitle(svg, rightYTitle, {
        x: width - 18,
        y: margin.top + plotHeight / 2,
        "text-anchor": "middle",
        transform: `rotate(90 ${width - 18} ${margin.top + plotHeight / 2})`
    });

    container.appendChild(svg);
}

