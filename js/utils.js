const SEARCH_RESULTS_PER_PAGE = 50;

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

function formatSeason(year) {
    return `${year - 1}/${String(year).slice(-2)}`;
}

function formatPlayerName(name) {
    return PLAYER_NAME_OVERRIDES[name] || name;
}

function formatAssociationName(name) {
    if (!name) return "";
    return String(name)
        .replace(/^KSST\s+/i, "")
        .replace(/\s+SST$/i, "")
        .trim();
}

function formatThousands(value, signed = false) {
    if (value === null || value === undefined || value === "") return "—";
    const number = Number(value);
    if (!Number.isFinite(number)) return String(value);
    const formatted = number.toLocaleString("cs-CZ");
    return signed && number > 0 ? `+${formatted}` : formatted;
}

function renderThousands(value, type) {
    return type === "display" ? formatThousands(value) : value;
}

function createPlayerProfileLink(playerId, playerName) {
    const link = document.createElement("a");
    link.className = "player-profile-link";
    link.href = `hraci.html?ID=${encodeURIComponent(playerId)}`;
    link.textContent = playerName;
    return link;
}

function renderPlayerProfileLink(playerName, type, row) {
    return type === "display"
        ? createPlayerProfileLink(row.ID, playerName)
        : playerName;
}

function getPlayerAgeCategory(birthYear, season) {
    const year = Number(birthYear);
    if (!Number.isFinite(year)) return "—";
    if (year < season - 21) return "dospělí";

    const categoryAge = DISPLAY_CATEGORY_AGES.find(age => year <= season - age + 1);
    return categoryAge ? `U${categoryAge}` : "U11";
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

function normalizeText(value, removeDiacritics = false) {
    let text = String(value ?? "").trim().toLocaleLowerCase("cs");
    if (removeDiacritics) {
        text = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return text;
}

function createShowMoreButton(remaining, batchSize, onClick) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "button show-more-results";
    button.textContent = `Zobrazit další (${Math.min(batchSize, remaining)})`;
    button.addEventListener("click", onClick);
    return button;
}

function createPaginatedResultList(
    container,
    renderItem,
    batchSize = SEARCH_RESULTS_PER_PAGE
) {
    let items = [];
    let visibleCount = 0;

    const render = () => {
        container.replaceChildren();
        if (items.length === 0) return;

        const list = document.createElement("div");
        list.className = "search-results-list";
        items.slice(0, visibleCount).forEach(item => list.appendChild(renderItem(item)));
        container.appendChild(list);

        if (visibleCount < items.length) {
            const remaining = items.length - visibleCount;
            container.appendChild(createShowMoreButton(remaining, batchSize, () => {
                visibleCount = Math.min(visibleCount + batchSize, items.length);
                render();
            }));
        }
    };

    return {
        show(newItems) {
            items = newItems;
            visibleCount = Math.min(batchSize, items.length);
            render();
        },
        clear() {
            items = [];
            visibleCount = 0;
            container.replaceChildren();
        }
    };
}

