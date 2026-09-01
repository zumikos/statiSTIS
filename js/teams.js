const teamSearchView = document.getElementById("team-search-view");
const teamDetailView = document.getElementById("team-detail-view");
const teamSearchStatus = document.getElementById("team-search-status");
const selectedSeason = getSelectedSeason();
const selectedAssociation = getSelectedAssociation();

let teamsPromise;
let teamRankingTable;

function loadTeams() {
    if (!teamsPromise) {
        teamsPromise = loadCsv(`csv/ranking_${selectedSeason}.csv`).then(rows => {
            const teams = new Map();
            rows.filter(row => row.ID !== undefined).forEach(row => {
                const name = formatTeamName(row["Oddíl"]);
                if (!teams.has(name)) {
                    teams.set(name, {
                        name,
                        playerCount: 0,
                        associations: new Set(),
                        ratings: []
                    });
                }
                const team = teams.get(name);
                team.playerCount += 1;
                if (Number.isFinite(Number(row.STR))) team.ratings.push(Number(row.STR));
                const association = formatAssociationName(row["Kraj"]);
                if (association) team.associations.add(association);
            });
            const rankedTeams = [...teams.values()]
                .filter(team => !selectedAssociation.name || team.associations.has(selectedAssociation.name))
                .map(team => {
                    const bestRatings = team.ratings.sort((first, second) => second - first).slice(0, 4);
                    return {
                        name: team.name,
                        playerCount: team.playerCount,
                        association: [...team.associations]
                            .sort((first, second) => first.localeCompare(second, "cs"))
                            .join(", "),
                        ratingAverage: Math.round(
                            bestRatings.reduce((sum, rating) => sum + rating, 0) / bestRatings.length
                        )
                    };
                }).sort((first, second) =>
                    second.ratingAverage - first.ratingAverage ||
                    first.name.localeCompare(second.name, "cs")
                );

            let previousTeam;
            return rankedTeams.map((team, index) => {
                const sameScore = previousTeam?.ratingAverage === team.ratingAverage;
                const rank = sameScore ? previousTeam.rank : index + 1;
                previousTeam = { ...team, rank };
                return { ...team, rank };
            });
        });
    }
    return teamsPromise;
}

function teamNameMatchesSearch(name, query) {
    const teamName = normalizeText(name);
    const enteredQuery = normalizeText(query);
    const queryHasDiacritics = normalizeText(enteredQuery, true) !== enteredQuery;

    if (teamName.includes(enteredQuery)) return true;
    if (queryHasDiacritics) return false;

    const normalizedName = normalizeText(teamName, true);
    const normalizedQuery = normalizeText(enteredQuery, true);
    return normalizedName.includes(normalizedQuery);
}

async function renderTeamOverview() {
    teamSearchStatus.hidden = false;
    teamSearchStatus.textContent = "Načítám žebříček oddílů…";
    try {
        const teams = await loadTeams();
        const pageLength = createPageLengthControl(TABLE_PAGE_LENGTHS[0]);
        const teamSearch = createPlayerTableSearch("Hledat oddíl");
        setupSeasonSelect(
            SEASONS,
            selectedSeason,
            "oddily.html",
            "team-overview-season",
            formatRankingDate
        );
        setupAssociationSelection(selectedAssociation, "oddily.html", selectedSeason);
        teamRankingTable = new DataTable("#team-ranking-overview", {
            data: teams,
            columns: [
                { data: "rank", title: "Pořadí", width: "1%" },
                {
                    data: "name",
                    title: "Oddíl",
                    width: "18rem",
                    render: (name, type) => type === "display"
                        ? createTeamProfileLink(name, {
                            sezona: selectedSeason,
                            ...(selectedAssociation.value === "all" ? {} : { svaz: selectedAssociation.value })
                        })
                        : name
                },
                { data: "association", title: "Svaz", width: "8rem" },
                { data: "playerCount", title: "Hráčů", width: "1%", render: renderThousands },
                { data: "ratingAverage", title: "STR", width: "1%", render: renderThousands }
            ],
            pageLength: TABLE_PAGE_LENGTHS[0],
            order: [[0, "asc"]],
            scrollX: true,
            autoWidth: false,
            layout: {
                top2Start: () => teamSearch.control,
                top2End: () => pageLength.control,
                topStart: "info",
                topEnd: "paging",
                bottomStart: "info",
                bottomEnd: "paging"
            },
            columnDefs: [
                { targets: "_all", className: "dt-head-center" },
                { targets: [0, 2, 3, 4], className: "dt-body-center nowrap-column" },
                { targets: 1, className: "wrap-column" }
            ],
            language: TABLE_LANGUAGE
        });
        pageLength.connect(teamRankingTable);
        teamSearch.input.addEventListener("input", () => {
            const query = teamSearch.input.value;
            teamRankingTable.column(1).search((_searchText, team) =>
                teamNameMatchesSearch(team.name, query)
            ).draw();
        });
        teamSearchStatus.hidden = true;
    } catch (error) {
        teamSearchStatus.hidden = false;
        teamSearchStatus.textContent = "Žebříček oddílů se nepodařilo načíst. Zkuste stránku obnovit.";
    }
}

function showTeamDetail(teamName) {
    teamSearchView.hidden = true;
    teamDetailView.hidden = false;
    document.getElementById("team-name").textContent = teamName;
    setupSeasonSelect(
        SEASONS,
        selectedSeason,
        "oddily.html",
        "team-detail-season",
        formatRankingDate
    );
    const backParameters = new URLSearchParams({ sezona: selectedSeason });
    if (selectedAssociation.value !== "all") backParameters.set("svaz", selectedAssociation.value);
    document.getElementById("team-back-link").href = `oddily.html?${backParameters}`;
    document.title = `${SITE_NAME} – ${teamName}`;
    const selectedSex = getSelectedSex();
    setupSexSelection(selectedSex, "oddily.html", selectedSeason, {
        oddil: teamName,
        ...(selectedAssociation.value === "all" ? {} : { svaz: selectedAssociation.value })
    });

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
        csvFile: `csv/ranking_${selectedSeason}.csv`,
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

const requestedTeam = new URLSearchParams(window.location.search).get("oddil");
if (requestedTeam) {
    showTeamDetail(requestedTeam);
} else {
    renderTeamOverview();
}
