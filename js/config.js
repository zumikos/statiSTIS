const SEASONS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const DEFAULT_SEASON = Math.max(...SEASONS);

// Pouze názvy, které nelze bezpečně vyřešit obecnými pravidly níže.
const TEAM_NAME_OVERRIDES = {
    "Dům dětí a mládeže Cvikováček, příspěvková organiz": "DDM Cvikováček",
    "Klub přátel školy při Střední průmyslové škole Zengrova 1, Ostrava-Vítkovice, z.s.": "Klub přátel školy při SPŠ Zengrova 1, Ostrava-Vítkovice",
    "Městský sportovní klub Břeclav stolní tenis, pobočný spolek": "MSK Břeclav",
    "Oddíl stolního tenisu TTC MG ODRA GAS Vratimov,z.s.": "TTC MG ODRA GAS Vratimov",
    "Spolek Sportovního klubu Dobrá Voda u Českých Budějovic": "SK Dobrá Voda u Českých Budějovic",
    "Stavební fakulta SK Kotlářka El Niňo Praha": "SF SKK El Niňo Praha",
    "Stolní tenis club Slaný, z.s.": "STC Slaný",
    "Stolní tenis Sever Žatec z.s.": "ST Sever Žatec",
    "TJ ABC Braník, z. s. oddíl stolního tenisu": "TJ ABC Braník",
    "TT Club Ostrava, z.s.": "TTC Ostrava",
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
    [/^T.J.\b/i, "TJ"]
];

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

function playerNameMatchesSearch(name, query) {
    const removeDiacritics = value => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const enteredQuery = String(query).trim().toLocaleLowerCase("cs");
    const hasTypedDiacritics = removeDiacritics(enteredQuery) !== enteredQuery;
    const searchedWords = enteredQuery.split(/\s+/).filter(Boolean);
    if (searchedWords.length === 0) return true;

    let playerName = String(name ?? "").toLocaleLowerCase("cs");
    let searchedName = searchedWords.join(" ");
    let reversedName = [...searchedWords].reverse().join(" ");
    if (!hasTypedDiacritics) {
        playerName = removeDiacritics(playerName);
        searchedName = removeDiacritics(searchedName);
        reversedName = removeDiacritics(reversedName);
    }

    return playerName.includes(searchedName) || playerName.includes(reversedName);
}

function getSelectedSeason(availableSeasons = SEASONS) {
    const requestedSeason = Number(new URLSearchParams(window.location.search).get("season"));
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
