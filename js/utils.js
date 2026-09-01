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

function formatRankingDate(year) {
    return year === DEFAULT_SEASON ? LATEST_RANKING_DATE : `01. 08. ${year}`;
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
    link.href = `hledat-hrace.html?ID=${encodeURIComponent(playerId)}`;
    link.textContent = playerName;
    return link;
}

function renderPlayerProfileLink(playerName, type, row) {
    return type === "display"
        ? createPlayerProfileLink(row.ID, playerName)
        : playerName;
}

function createTeamProfileLink(teamName, additionalParameters = {}) {
    const link = document.createElement("a");
    link.className = "team-profile-link";
    const parameters = new URLSearchParams({ oddil: teamName, ...additionalParameters });
    link.href = `oddily.html?${parameters}`;
    link.textContent = teamName;
    return link;
}

function renderTeamProfileLink(teamName, type) {
    return type === "display" ? createTeamProfileLink(teamName) : teamName;
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
        .replace(/^\s*(?:z\.?\s*s\.?\s*|(?:zapsaný\s+spolek|spolek)\s+)/i, "")
        .replace(/^Oddíl stolního tenisu\s+/i, "")
        .replace(/\s*,?\s*(?:pobočný\s+spolek|spolek|z\.?\s*s\.?|o\.?\s*s\.?|příspěvková(?:\s+organiz(?:ace)?)?)\.?\s*$/i, "")
        .replace(/\s*,?\s*(?:z\.?\s*s\.?\s*)?(?:-\s*)?(?:(?:oddíl|klub)\s+stolního\s+tenisu|stolní\s+tenis)\s*$/i, "")
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

let playersPromise;

function loadPlayers() {
    if (!playersPromise) {
        playersPromise = loadCsv("csv/players.csv")
            .then(data => data
                .filter(player => player.ID !== undefined)
                .map(player => ({
                    ...player,
                    "Hráč": formatPlayerName(player["Hráč"])
                }))
            );
    }

    return playersPromise;
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
    const normalizedName = normalizeText(name, true);
    const normalizedSurname = normalizeText(surname, true);
    const normalizedQuery = normalizeText(queryText, true);
    const normalizedReversed = normalizeText(reversedQuery, true);

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

async function findPlayers(query) {
    const queryText = String(query).trim();
    const players = await loadPlayers();
    return players
        .map(player => ({ player, matchPriority: playerMatchPriority(player, queryText) }))
        .filter(result => result.matchPriority !== null)
        .sort((first, second) =>
            first.matchPriority - second.matchPriority ||
            String(first.player["Hráč"]).localeCompare(String(second.player["Hráč"]), "cs", {
                sensitivity: "variant"
            })
        )
        .map(result => result.player);
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

