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

function createOptionDropdown(values, initialValue, onSelect) {
    const dropdown = document.createElement("div");
    dropdown.className = "page-length-dropdown";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "page-length-toggle";
    toggle.setAttribute("aria-haspopup", "listbox");
    toggle.setAttribute("aria-expanded", "false");

    const menu = document.createElement("div");
    menu.className = "page-length-menu";
    menu.setAttribute("role", "listbox");
    menu.hidden = true;

    const closeMenu = () => {
        menu.hidden = true;
        toggle.setAttribute("aria-expanded", "false");
    };
    const setValue = value => {
        toggle.textContent = value.toLocaleString("cs-CZ");
        menu.querySelectorAll("button").forEach(option => {
            option.setAttribute("aria-selected", String(Number(option.dataset.value) === value));
        });
    };

    values.forEach(value => {
        const option = document.createElement("button");
        option.type = "button";
        option.className = "page-length-option";
        option.dataset.value = value;
        option.setAttribute("role", "option");
        option.textContent = value.toLocaleString("cs-CZ");
        option.addEventListener("click", () => {
            setValue(value);
            onSelect(value);
            closeMenu();
            toggle.focus();
        });
        menu.appendChild(option);
    });

    setValue(initialValue);
    toggle.addEventListener("click", () => {
        const willOpen = menu.hidden;
        menu.hidden = !willOpen;
        toggle.setAttribute("aria-expanded", String(willOpen));
    });
    dropdown.addEventListener("keydown", event => {
        if (event.key === "Escape") {
            closeMenu();
            toggle.focus();
        }
    });
    document.addEventListener("click", event => {
        if (!dropdown.contains(event.target)) closeMenu();
    });

    dropdown.append(toggle, menu);
    return dropdown;
}

function createPageLengthControl(initialLength) {
    const control = document.createElement("div");
    control.className = "page-length-control";
    control.append("Zobrazit ");

    let table;
    const dropdown = createOptionDropdown(
        TABLE_PAGE_LENGTHS,
        initialLength,
        length => table?.page.len(length).draw()
    );
    control.append(dropdown, " záznamů na stránku");
    return {
        control,
        connect: dataTable => { table = dataTable; }
    };
}

function getSelectedMoversStrMin() {
    const requestedValue = Number(
        new URLSearchParams(window.location.search).get("strmin")
    );
    return MOVERS_STR_MIN_VALUES.includes(requestedValue)
        ? requestedValue
        : MOVERS_STR_MIN_VALUES[0];
}

function setupMoversStrMinControl(selectedValue, pageUrl) {
    const container = document.getElementById("movers-str-control");
    const dropdown = createOptionDropdown(
        MOVERS_STR_MIN_VALUES,
        selectedValue,
        value => {
            const parameters = new URLSearchParams(window.location.search);
            if (value === MOVERS_STR_MIN_VALUES[0]) {
                parameters.delete("strmin");
            } else {
                parameters.set("strmin", value);
            }
            location.href = `${pageUrl}?${parameters}`;
        }
    );
    dropdown.querySelector(".page-length-toggle")
        .setAttribute("aria-label", "Minimální STR");
    container.appendChild(dropdown);
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

function renderFilterButtons({
    items,
    selectedValue,
    pageUrl,
    parametersFor,
    containerId = "sex-selection"
}) {
    const container = document.getElementById(containerId);
    items.forEach(item => {
        const link = document.createElement("a");
        link.href = `${pageUrl}?${parametersFor(item)}`;
        link.className = "sex-button";
        link.textContent = item.label;
        if (item.name) {
            link.title = item.name;
            link.setAttribute("aria-label", `${item.label} – ${item.name}`);
        }
        if (item.value === selectedValue) {
            link.classList.add("is-active");
            link.setAttribute("aria-current", "page");
        }
        container.appendChild(link);
    });
}

function getSelectedSex() {
    const requestedSex = new URLSearchParams(window.location.search).get("pohlavi");
    return PLAYER_SEXES.some(sex => sex.value === requestedSex)
        ? requestedSex
        : "all";
}

function setupSexSelection(selectedSex, pageUrl, selectedSeason = null, additionalParameters = {}) {
    renderFilterButtons({
        items: PLAYER_SEXES,
        selectedValue: selectedSex,
        pageUrl,
        parametersFor: sex => {
            const parameters = new URLSearchParams(additionalParameters);
            if (selectedSeason !== null) parameters.set("sezona", selectedSeason);
            if (sex.value !== "all") parameters.set("pohlavi", sex.value);
            return parameters;
        }
    });
}

function getSelectedPlayerGroup() {
    const parameters = new URLSearchParams(window.location.search);
    const category = parameters.get("kategorie");
    const sex = parameters.get("pohlavi");
    const value = category && sex ? `${category}${sex}` : sex || "all";
    return PLAYER_GROUPS.find(group => group.value === value) || PLAYER_GROUPS[0];
}

function setupPlayerGroupSelection(selectedGroup, pageUrl, selectedSeason) {
    renderFilterButtons({
        items: PLAYER_GROUPS,
        selectedValue: selectedGroup.value,
        pageUrl,
        parametersFor: group => {
            const parameters = new URLSearchParams(window.location.search);
            parameters.set("sezona", selectedSeason);
            parameters.delete("pohlavi");
            parameters.delete("kategorie");
            if (group.sex) parameters.set("pohlavi", group.sex);
            if (group.age) parameters.set("kategorie", `U${group.age}`);
            return parameters;
        }
    });
}

function getSelectedAssociation() {
    const requestedAssociation = new URLSearchParams(window.location.search).get("svaz");
    return ASSOCIATIONS.find(association => association.value === requestedAssociation) ||
        ASSOCIATIONS[0];
}

function setupAssociationSelection(selectedAssociation, pageUrl, selectedSeason) {
    renderFilterButtons({
        items: ASSOCIATIONS,
        selectedValue: selectedAssociation.value,
        pageUrl,
        containerId: "association-selection",
        parametersFor: association => {
            const parameters = new URLSearchParams(window.location.search);
            parameters.set("sezona", selectedSeason);
            parameters.delete("svaz");
            if (association.value !== "all") {
                parameters.set("svaz", association.value);
            }
            return parameters;
        }
    });
}

function playerMatchesAssociation(row, association) {
    return !association.name || formatAssociationName(row["Kraj"]) === association.name;
}

function playerMatchesGroup(row, group, season) {
    if (group.sex && row["Pohlaví"] !== group.sex) return false;
    if (!group.age) return true;

    const birthYear = Number(row["Rok narození"]);
    return Number.isFinite(birthYear) && birthYear >= season - group.age;
}

async function createStatisticsTable({
    tableId, csvFile, columns, columnDefs, order, rowFilter = () => true,
    rankField = null, showPageLength = true, categorySeason = null
}) {
    try {
        const data = filterAndRankRows(
            await loadCsv(csvFile),
            row => row.ID !== undefined && rowFilter(row),
            rankField
        );
        if (data.length === 0) {
            showTableError(tableId, "Pro tuto sezónu nejsou dostupná žádná data.");
            return;
        }

        data.forEach(row => {
            row["Hráč"] = formatPlayerName(row["Hráč"]);
            row["Oddíl"] = formatTeamName(row["Oddíl"]);
            row["Kraj"] = formatAssociationName(row["Kraj"]);
            row["Pohlaví"] = row["Pohlaví"] === "Z" ? "Ž" : row["Pohlaví"];
            if (categorySeason !== null) {
                row["Kategorie"] = getPlayerAgeCategory(row["Rok narození"], categorySeason);
            }
        });
        const playerSearch = createPlayerTableSearch();
        const pageLength = showPageLength
            ? createPageLengthControl(TABLE_PAGE_LENGTHS[0])
            : null;
        const layout = {
            top2Start: () => playerSearch.control,
            topStart: "info",
            topEnd: "paging",
            bottomStart: "info",
            bottomEnd: "paging"
        };
        if (pageLength) layout.top2End = () => pageLength.control;
        const renderedColumns = columns.map(column =>
            column.data === "Hráč" && !column.render
                ? { ...column, render: renderPlayerProfileLink }
                : column
        );
        const table = new DataTable(`#${tableId}`, {
            data,
            columns: renderedColumns,
            pageLength: TABLE_PAGE_LENGTHS[0],
            order,
            scrollX: true,
            autoWidth: false,
            layout,
            columnDefs,
            language: TABLE_LANGUAGE
        });
        pageLength?.connect(table);

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

function filterAndRankRows(rows, rowFilter, rankField = null) {
    let previousValue;
    let previousRank;
    return rows.filter(rowFilter).map((row, index) => {
        let rank = row["Pořadí"];
        if (rankField) {
            const value = row[rankField];
            rank = value === previousValue ? previousRank : index + 1;
            previousValue = value;
            previousRank = rank;
        }
        return { ...row, "Pořadí": rank };
    });
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

