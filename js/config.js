const SEASONS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const DEFAULT_SEASON = Math.max(...SEASONS);
const TABLE_PAGE_LENGTHS = [50, 100, 500, 1000];
const TABLE_PAGE_LENGTH_LABELS = ["\u00a0\u00a0\u00a050", "\u00a0\u00a0100", "\u00a0\u00a0500", "\u00a01 000"];
const PLAYER_SEXES = [
    { value: "all", label: "Všichni" },
    { value: "M", label: "Muži" },
    { value: "Z", label: "Ženy" }
];
const TABLE_LANGUAGE = {
    thousands: " ",
    lengthMenu: "Zobrazit _MENU_ záznamů na stránku",
    info: "Zobrazeno _START_ až _END_ z _TOTAL_ záznamů",
    infoEmpty: "Žádné záznamy",
    infoFiltered: "(filtrováno z celkem _MAX_ záznamů)",
    zeroRecords: "Nenalezeny žádné záznamy",
    emptyTable: "Tabulka neobsahuje žádná data"
};

// Pouze názvy, které nelze bezpečně vyřešit obecnými pravidly níže.
const TEAM_NAME_OVERRIDES = {
    "Dům dětí a mládeže Cvikováček, příspěvková organiz": "DDM Cvikováček",
    "Klub přátel školy při Střední průmyslové škole Zengrova 1, Ostrava-Vítkovice, z.s.": "Klub přátel školy při SPŠ Zengrova 1, Ostrava-Vítkovice",
    "Městský sportovní klub Břeclav stolní tenis, pobočný spolek": "MSK Břeclav",
    "MK Řeznovice, oddíl stolního tenisu Sportovního klubu Řeznovice": "MK Řeznovice",
    "Oddíl stolního tenisu TTC MG ODRA GAS Vratimov,z.s.": "TTC MG ODRA GAS Vratimov",
    "Spolek Sportovního klubu Dobrá Voda u Českých Budějovic": "SK Dobrá Voda u Českých Budějovic",
    "Spolek TableTenisClub Jablonec nad Nisou": "TTC Jablonec nad Nisou",
    "Stavební fakulta SK Kotlářka El Niňo Praha": "SF SKK El Niňo Praha",
    "Stolní tenis club Slaný, z.s.": "STC Slaný",
    "Stolní tenis Sever Žatec z.s.": "ST Sever Žatec",
    "TJ ABC Braník, z. s. oddíl stolního tenisu": "TJ ABC Braník",
    "TT Club Ostrava, z.s.": "TTC Ostrava",
    "TTC Praha - klub stolního tenisu": "TTC Praha",
    "zapsaný spolek Stolní tenis Střekov": "Stolní tenis Střekov",
};

const TEAM_NAME_REPLACEMENTS = [
    [/Sbor dobrovolných hasičů/gi, "SDH"],
    [/Dům dětí a mládeže/gi, "DDM"],
    [/^Sportovní klub stolního tenisu\b/i, "SKST"],
    [/^Sportovní klub policie\b/i, "SKP"],
    [/^Klub stolního tenisu\b/i, "KST"],
    [/^Městský sportovní klub\b/i, "MSK"],
    [/^Sportovní klub\b/i, "SK"],
    [/^Tělovýchovná jednota\b/i, "TJ"],
    [/^Tělocvična jednota\b/i, "TJ"],
    [/^Tělocvičná jednota\b/i, "TJ"],
    [/^Table Tennis Club\b/i, "TTC"],
    [/^TT Club\b/i, "TTC"],
    [/^T\.?\s*J\.?/i, "TJ"]
];

function loadCsv(csvFile) {
    return new Promise((resolve, reject) => {
        Papa.parse(csvFile, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: reject
        });
    });
}

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

function formatSeason(year) {
    return `${year - 1}/${String(year).slice(-2)}`;
}

function formatTeamName(name) {
    if (!name) return name;
    if (TEAM_NAME_OVERRIDES[name]) return TEAM_NAME_OVERRIDES[name];

    let formattedName = String(name)
        .replace(/^\s*z\.?\s*s\.?\s*/i, "")
        .replace(/\s*,?\s*(?:pobočný\s+spolek|spolek|z\.?\s*s\.?|o\.?\s*s\.?)\s*$/i, "")
        .replace(/\s+-\s+stolní tenis\s*$/i, "")
        .replace(/\s*,\s*/g, ", ")
        .replace(/\s+/g, " ")
        .trim();

    TEAM_NAME_REPLACEMENTS.forEach(([pattern, replacement]) => {
        formattedName = formattedName.replace(pattern, replacement).trim();
    });

    return formattedName;
}

function createPlayerTableSearch() {
    const control = document.createElement("div");
    control.className = "dt-search";

    const label = document.createElement("label");
    label.textContent = "Hledat hráče: ";

    const input = document.createElement("input");
    input.type = "search";
    input.autocomplete = "off";
    input.setAttribute("aria-label", "Hledat hráče");

    label.appendChild(input);
    control.appendChild(label);
    return { control, input };
}

function normalizeText(value, removeDiacritics = false) {
    let text = String(value ?? "").trim().toLocaleLowerCase("cs");
    if (removeDiacritics) {
        text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return text;
}

function setupSeasonSelect(availableSeasons, selectedSeason, pageUrl) {
    const seasonSelect = document.getElementById("season");
    availableSeasons.slice().reverse().forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = formatSeason(year);
        seasonSelect.appendChild(option);
    });
    seasonSelect.value = selectedSeason;
    seasonSelect.addEventListener("change", () => {
        const parameters = new URLSearchParams(window.location.search);
        parameters.set("sezona", seasonSelect.value);
        location.href = `${pageUrl}?${parameters}`;
    });
}

function getSelectedSex() {
    const requestedSex = new URLSearchParams(window.location.search).get("pohlavi");
    return PLAYER_SEXES.some(sex => sex.value === requestedSex)
        ? requestedSex
        : "all";
}

function setupSexSelection(selectedSex, pageUrl, selectedSeason) {
    const container = document.getElementById("sex-selection");
    PLAYER_SEXES.forEach(sex => {
        const link = document.createElement("a");
        const parameters = new URLSearchParams({ sezona: selectedSeason });
        if (sex.value !== "all") parameters.set("pohlavi", sex.value);
        link.href = `${pageUrl}?${parameters}`;
        link.className = "sex-button";
        link.textContent = sex.label;
        if (sex.value === selectedSex) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
        container.appendChild(link);
    });
}

async function createStatisticsTable({
    tableId, csvFile, columns, columnDefs, order, rowFilter = () => true, renumberRows = false
}) {
    try {
        const data = filterAndRenumberRows(
            await loadCsv(csvFile),
            row => row.ID !== undefined && rowFilter(row),
            renumberRows
        );
        if (data.length === 0) {
            showTableError(tableId, "Pro tuto sezónu nejsou dostupná žádná data.");
            return;
        }

        data.forEach(row => {
            row["Oddíl"] = formatTeamName(row["Oddíl"]);
        });
        const playerSearch = createPlayerTableSearch();
        const table = new DataTable(`#${tableId}`, {
            data,
            columns,
            pageLength: TABLE_PAGE_LENGTHS[0],
            lengthMenu: [TABLE_PAGE_LENGTHS, TABLE_PAGE_LENGTH_LABELS],
            order,
            scrollX: true,
            autoWidth: false,
            layout: {
                top2Start: () => playerSearch.control,
                top2End: "pageLength",
                topStart: "info",
                topEnd: "paging",
                bottomStart: "info",
                bottomEnd: "paging"
            },
            columnDefs,
            language: TABLE_LANGUAGE,
            initComplete: function () {
                this.api().table().container()
                    .querySelector(".dt-length select")
                    ?.classList.add("entries-dropdown");
            }
        });

        playerSearch.input.addEventListener("input", () => {
            const query = playerSearch.input.value;
            table.column(2).search((_searchText, row) =>
                playerNameMatchesSearch(row["Hráč"], query)
            ).draw();
        });
    } catch (error) {
        showTableError(tableId, "Data se nepodařilo načíst. Zkuste stránku obnovit.");
    }
}

function filterAndRenumberRows(rows, rowFilter, renumberRows = false) {
    return rows.filter(rowFilter).map((row, index) => ({
        ...row,
        "Pořadí": renumberRows ? index + 1 : row["Pořadí"]
    }));
}

function playerNameMatchesSearch(name, query) {
    const enteredQuery = normalizeText(query);
    const hasTypedDiacritics = normalizeText(enteredQuery, true) !== enteredQuery;
    const searchedWords = enteredQuery.split(/\s+/).filter(Boolean);
    if (searchedWords.length === 0) return true;

    let playerName = normalizeText(name);
    let searchedName = searchedWords.join(" ");
    let reversedName = [...searchedWords].reverse().join(" ");
    if (!hasTypedDiacritics) {
        playerName = normalizeText(playerName, true);
        searchedName = normalizeText(searchedName, true);
        reversedName = normalizeText(reversedName, true);
    }

    return playerName.includes(searchedName) || playerName.includes(reversedName);
}

function getSelectedSeason(availableSeasons = SEASONS) {
    const requestedSeason = Number(new URLSearchParams(window.location.search).get("sezona"));
    return availableSeasons.includes(requestedSeason) ? requestedSeason : DEFAULT_SEASON;
}

function showTableError(tableId, message) {
    const table = document.getElementById(tableId);
    table.replaceChildren();

    const caption = document.createElement("caption");
    caption.className = "data-error";
    caption.textContent = message;
    table.appendChild(caption);
}
