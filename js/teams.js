const teamSearchView = document.getElementById("team-search-view");
const teamDetailView = document.getElementById("team-detail-view");
const teamSearchForm = document.getElementById("team-search-form");
const teamSearchInput = document.getElementById("team-search-input");
const teamSearchStatus = document.getElementById("team-search-status");
const teamResults = document.getElementById("team-results");

let teamsPromise;

function loadTeams() {
    if (!teamsPromise) {
        teamsPromise = loadCsv(`csv/ranking_${DEFAULT_SEASON}.csv`).then(rows => {
            const teams = new Map();
            rows.filter(row => row.ID !== undefined).forEach(row => {
                const name = formatTeamName(row["Oddíl"]);
                if (!teams.has(name)) {
                    teams.set(name, {
                        name,
                        playerCount: 0,
                        associations: new Set()
                    });
                }
                const team = teams.get(name);
                team.playerCount += 1;
                const association = formatAssociationName(row["Kraj"]);
                if (association) team.associations.add(association);
            });
            return [...teams.values()].map(team => ({
                name: team.name,
                playerCount: team.playerCount,
                association: [...team.associations]
                    .sort((first, second) => first.localeCompare(second, "cs"))
                    .join(", ")
            }));
        });
    }
    return teamsPromise;
}

function teamMatchPriority(name, query) {
    const teamName = normalizeText(name);
    const enteredQuery = normalizeText(query);
    const queryHasDiacritics = normalizeText(enteredQuery, true) !== enteredQuery;

    if (teamName === enteredQuery) return 0;
    if (teamName.startsWith(enteredQuery)) return 1;
    if (teamName.includes(enteredQuery)) return 2;
    if (queryHasDiacritics) return null;

    const normalizedName = normalizeText(teamName, true);
    const normalizedQuery = normalizeText(enteredQuery, true);
    if (normalizedName === normalizedQuery) return 3;
    if (normalizedName.startsWith(normalizedQuery)) return 4;
    return normalizedName.includes(normalizedQuery) ? 5 : null;
}

function teamLink(team) {
    const link = document.createElement("a");
    link.className = "search-result";
    link.href = `oddily.html?oddil=${encodeURIComponent(team.name)}`;
    const name = document.createElement("strong");
    name.textContent = team.name;
    const details = document.createElement("span");
    details.textContent = `${team.association ? `Svaz: ${team.association}, ` : ""}Hráčů: ${
        team.playerCount.toLocaleString("cs-CZ")
    }`;
    link.append(name, details);
    return link;
}

const teamResultList = createPaginatedResultList(teamResults, teamLink);

async function searchTeams(query) {
    const enteredQuery = normalizeText(query);
    teamResultList.clear();
    if (enteredQuery.length < 2) {
        teamSearchStatus.textContent = "Zadejte alespoň dva znaky.";
        return;
    }

    teamSearchStatus.textContent = "Načítám oddíly…";
    try {
        const matches = (await loadTeams())
            .map(team => ({ team, priority: teamMatchPriority(team.name, query) }))
            .filter(result => result.priority !== null)
            .sort((first, second) =>
                first.priority - second.priority ||
                first.team.name.localeCompare(second.team.name, "cs", { sensitivity: "variant" })
            )
            .map(result => result.team);

        teamSearchStatus.textContent = matches.length
            ? `Nalezeno oddílů: ${matches.length}`
            : "Žádný oddíl nebyl nalezen.";
        teamResultList.show(matches);
    } catch (error) {
        teamSearchStatus.textContent = "Seznam oddílů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function showTeamDetail(teamName) {
    teamSearchView.hidden = true;
    teamDetailView.hidden = false;
    document.getElementById("team-name").textContent = teamName;
    document.getElementById("team-season").textContent = formatSeason(DEFAULT_SEASON);
    document.title = `${SITE_NAME} – ${teamName}`;
    const selectedSex = getSelectedSex();
    setupSexSelection(selectedSex, "oddily.html", null, { oddil: teamName });

    const columns = [
        { data: "Pořadí", title: "Pořadí", width: "1%" },
        { data: "ID", title: "ID", width: "1%" },
        { data: "Hráč", title: "Hráč", width: "12rem" },
        { data: "Rok narození", title: "Rok narození", width: "1%" },
        { data: "Pohlaví", title: "Pohlaví", width: "1%" },
        { data: "STR", title: "STR", width: "1%", render: renderThousands }
    ];

    createStatisticsTable({
        tableId: "team-ranking",
        csvFile: `csv/ranking_${DEFAULT_SEASON}.csv`,
        columns,
        rowFilter: row =>
            formatTeamName(row["Oddíl"]) === teamName &&
            (selectedSex === "all" || row["Pohlaví"] === selectedSex),
        rankField: "STR",
        showPageLength: false,
        order: [[0, "asc"]],
        columnDefs: [
            { targets: "_all", className: "dt-head-center" },
            { targets: [3, 4], className: "dt-body-center" },
            { targets: 2, className: "wrap-column" },
            { targets: [0, 1, 3, 4, 5], className: "nowrap-column" }
        ]
    });
}

teamSearchForm.addEventListener("submit", event => {
    event.preventDefault();
    searchTeams(teamSearchInput.value);
});

const requestedTeam = new URLSearchParams(window.location.search).get("oddil");
if (requestedTeam) showTeamDetail(requestedTeam);
