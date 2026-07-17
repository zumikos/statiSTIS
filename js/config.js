const SEASONS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const DEFAULT_SEASON = Math.max(...SEASONS);
const TEAM_NAME_OVERRIDES = {
    "AC Sparta Praha - stolní tenis, z.s.": "AC Sparta Praha",
    "Akademie stolního tenisu Petra Korbela, z.s.": "Akademie stolního tenisu Petra Korbela",
    "HB Ostrov , z.s.": "HB Ostrov",
    "Klub stolního tenisu Bohnice z.s.": "KST Bohnice",
    "Klub stolního tenisu Dolní Němčí, z.s.": "KST Dolní Němčí",
    "Klub stolního tenisu Kunštát, z.s.": "KST Kunštát",
    "Klub stolního tenisu LVA, z.s.": "KST LVA",
    "KST Apollo Ústí nad Labem z.s.": "KST Apollo Ústí nad Labem",
    "KST NOVÝ JIČÍN, z.s.": "KST Nový Jičín",
    "KST Slezan Opava z.s.": "KST Slezan Opava",
    "KST Zlín, z.s.": "KST Zlín",
    "Městský sportovní klub Břeclav stolní tenis, pobočný spolek": "MSK Břeclav",
    "Oddíl stolního tenisu TTC MG ODRA GAS Vratimov,z.s.": "TTC MG ODRA GAS Vratimov",
    "PINK Liberec, z.s.": "PINK Liberec",
    "SK Dobré, z.s.": "SK Dobré",
    "SK Domeček Soběslav z.s.": "SK Domeček Soběslav",
    "SK Kotlářka, z.s.": "SK Kotlářka",
    "SK Slavia Praha - stolní tenis, z. s.": "SK Slavia Praha",
    "SK Slopné, z. s.": "SK Slopné",
    "SKST Hodonín z.s.": "SKST Hodonín",
    "Sportovní klub Jihlava, z.s.": "SK Jihlava",
    "Sportovní klub policie Sever Ústí nad Labem z.s.": "SKP Sever Ústí nad Labem",
    "Sportovní klub stolního tenisu Chodov z. s.": "SKST Chodov",
    "Sportovní klub stolního tenisu Havířov z.s.": "SKST Havířov",
    "Sportovní klub stolního tenisu Liga Pro Liberec z.s.": "SKST Liga Pro Liberec",
    "Stavební fakulta SK Kotlářka El Niňo Praha": "SF SKK El Niňo Praha",
    "Stolní tenis club Slaný, z.s.": "STC Slaný",
    "Stolní tenis Sever Žatec z.s.": "ST Sever Žatec",
    "Table Tennis Club Litoměřice, z.s.": "TTC Litoměřice",
    "Tělocvičná jednota Sokol Horažďovice": "TJ Sokol Horažďovice",
    "Tělocvičná jednota Sokol Mnichovo Hradiště": "TJ Sokol Mnichovo Hradiště",
    "Tělocvičná jednota Sokol Stochov-Honice": "TJ Sokol Stochov-Honice",
    "Tělocvičná jednota Sokol Vranovice": "TJ Sokol Vranovice",
    "Tělovýchovná jednota Sokol Opava- Kateřinky,z.s": "TJ Sokol Opava-Kateřinky",
    "Tělocvičná jednota Sokol Studená I.": "TJ Sokol Studená I.",
    "Tělocvičná jednota Sokol Vsetín": "TJ Sokol Vsetín",
    "Tělovýchovná jednota Ostrava": "TJ Ostrava",
    "Tělovýchovná jednota Sokol Kralovice, z.s.": "TJ Sokol Kralovice",
    "Tělovýchovná jednota Spartak Bílovec z.s.": "TJ Spartak Bílovec",
    "Tělovýchovná jednota Spartak Pelhřimov, z.s.": "TJ Spartak Pelhřimov",
    "Tělovýchovná jednota Union Plzeň, z.s.": "TJ Union Plzeň",
    "TJ Aero Odolena Voda, z.s.": "TJ Aero Odolena Voda",
    "TJ Agrotec Hustopeče z.s.": "TJ Agrotec Hustopeče",
    "TJ AVIA Čakovice, z.s.": "TJ AVIA Čakovice",
    "TJ ČZ Strakonice , spolek": "TJ ČZ Strakonice",
    "TJ Dobřany, z.s.": "TJ Dobřany",
    "TJ Jiskra Heřmanův Městec z.s.": "TJ Jiskra Heřmanův Městec",
    "TJ Lokomotiva Česká Lípa, z.s.": "TJ Lokomotiva Česká Lípa",
    "TJ Orion Praha, z.s.": "TJ Orion Praha",
    "TJ Sadská o.s.": "TJ Sadská",
    "TJ Slavoj Praha, spolek": "TJ Slavoj Praha",
    "TJ Slovan Broumov, z.s.": "TJ Slovan Broumov",
    "TJ Sokol Malín z.s.": "TJ Sokol Malín",
    "TJ Sokol Popůvky, z.s.": "TJ Sokol Popůvky",
    "TJ Sokol Šarovy z.s.": "TJ Sokol Šarovy",
    "TJ Spartak Čelákovice, z.s.": "TJ Spartak Čelákovice",
    "TJ Šanov, z.s.": "TJ Šanov",
    "TJ Šumavan Vimperk z.s.": "TJ Šumavan Vimperk",
    "TJ Tatran Hostinné, spolek": "TJ Tatran Hostinné",
    "TJ Třineckých železáren, spolek": "TJ Třineckých železáren",
    "TSM Kladno, z.s.": "TSM Kladno",
    "TT Club Ostrava, z.s.": "TTC Ostrava",
    "TT Moravský Krumlov, z.s.": "TT Moravský Krumlov",
    "TTC ELIZZA PRAHA, z.s.": "TTC Elizza Praha",
    "TTC FRÝDLANT, z.s.": "TTC Frýdlant",
    "TTC KARLOVARSKO 2020, z.s.": "TTC Karlovarsko 2020",
    "TTC Kostelec nad Orlicí, z.s.": "TTC Kostelec nad Orlicí",
    "TTC Moravská Slavia Brno, z.s.": "TTC Moravská Slavia Brno",
    "TTC Siko Orlová z.s.": "TTC Siko Orlová",
    "z.s.TTC Klánovice - stolní tenis": "TTC Klánovice",
};

function formatSeason(year) {
    return `${year - 1}/${String(year).slice(-2)}`;
}

function formatTeamName(name) {
    return TEAM_NAME_OVERRIDES[name] || name;
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
