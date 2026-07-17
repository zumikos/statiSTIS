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
