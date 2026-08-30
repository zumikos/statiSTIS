const SEASONS = [2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];
const DEFAULT_SEASON = Math.max(...SEASONS);
const SITE_NAME = "statiSTIS";
const LAST_UPDATED_DATE = "30. 08. 2026";
const TABLE_PAGE_LENGTHS = [50, 100, 500, 1000];
const MOVERS_STR_MIN_VALUES = [800, 1200, 1600, 2000];
const PLAYER_SEXES = [
    { value: "all", label: "Všichni" },
    { value: "M", label: "Muži" },
    { value: "Z", label: "Ženy" }
];
const YOUTH_AGES = [21, 19, 17, 15, 13];
const DISPLAY_CATEGORY_AGES = [...YOUTH_AGES, 11];
const PLAYER_GROUPS = [
    ...PLAYER_SEXES.map(sex => ({
        value: sex.value,
        label: sex.label,
        sex: sex.value === "all" ? null : sex.value,
        age: null
    })),
    ...YOUTH_AGES.flatMap(age => [
        { value: `U${age}M`, label: `U${age}M`, sex: "M", age },
        { value: `U${age}Z`, label: `U${age}Ž`, sex: "Z", age }
    ])
];
const ASSOCIATIONS = [
    { value: "all", label: "Všechny", name: null },
    { value: "A", label: "A", name: "Pražský" },
    { value: "S", label: "S", name: "Středočeský" },
    { value: "C", label: "C", name: "Jihočeský" },
    { value: "P", label: "P", name: "Plzeňský" },
    { value: "K", label: "K", name: "Karlovarský" },
    { value: "U", label: "U", name: "Ústecký" },
    { value: "L", label: "L", name: "Liberecký" },
    { value: "H", label: "H", name: "Kralovéhradecký" },
    { value: "E", label: "E", name: "Pardubický" },
    { value: "J", label: "J", name: "Vysočina" },
    { value: "B", label: "B", name: "Jihomoravský" },
    { value: "M", label: "M", name: "Olomoucký" },
    { value: "T", label: "T", name: "Moravskoslezský" },
    { value: "Z", label: "Z", name: "Zlínský" }
];
const TABLE_LANGUAGE = {
    thousands: " ",
    info: "Zobrazeno _START_ až _END_ z _TOTAL_ záznamů",
    infoEmpty: "Žádné záznamy",
    infoFiltered: "(filtrováno z celkem _MAX_ záznamů)",
    zeroRecords: "Nenalezeny žádné záznamy",
    emptyTable: "Tabulka neobsahuje žádná data"
};

const PLAYER_NAME_OVERRIDES = {
    "LIAO Ting-Yao": "Liao Ting-Yao"
};

// Pouze názvy, které nelze bezpečně vyřešit obecnými pravidly níže.
const TEAM_NAME_OVERRIDES = {
    "Dům dětí a mládeže Uherský Ostroh, příspěvková": "DDM Uherský Ostroh",
    "Dům dětí a mládeže Cvikováček, příspěvková organiz": "DDM Cvikováček",
    "Klub přátel školy při Střední průmyslové škole Zengrova 1, Ostrava-Vítkovice, z.s.": "Klub přátel školy při SPŠ Zengrova 1, Ostrava-Vítkovice",
    "Městský sportovní klub Břeclav stolní tenis, pobočný spolek": "MSK Břeclav",
    "MK Řeznovice, oddíl stolního tenisu Sportovního  klubu Řeznovice, z.s.": "MK Řeznovice",
    "Oddíl stolního tenisu TTC MG ODRA GAS Vratimov,z.s.": "TTC MG ODRA GAS Vratimov",
    "Spolek Dělnická tělocvičná jednota Sparta Kladno": "DTJ Sparta Kladno",
    "Spolek Sportovního klubu Dobrá Voda u Českých Budějovic": "SK Dobrá Voda u Českých Budějovic",
    "Spolek TJ Sokol Praha 9 - Běchovice II": "TJ Sokol Praha 9 - Běchovice II",
    "Spolek TableTenisClub Jablonec nad Nisou": "TTC Jablonec nad Nisou",
    "Stavební fakulta SK Kotlářka El Niňo Praha": "SF SKK El Niňo Praha",
    "Stolní tenis club Slaný, z.s.": "STC Slaný",
    "Stolní tenis Sever Žatec z.s.": "ST Sever Žatec",
    "TJ ABC Braník, z. s. oddíl stolního tenisu": "TJ ABC Braník",
    "Tělovýchovná jednota Rapid Lásenice, spolek.": "TJ Rapid Lásenice",
    "TT Club Ostrava, z.s.": "TTC Ostrava",
    "TTC Praha - klub stolního tenisu, z.s.": "TTC Praha",
    "zapsaný spolek Stolní tenis Střekov": "Stolní tenis Střekov",
};

const TEAM_NAME_REPLACEMENTS = [
    [/Sbor dobrovolných hasičů/gi, "SDH"],
    [/Dům dětí a mládeže/gi, "DDM"],
    [/^Sportovní klub stolního tenisu\b/i, "SKST"],
    [/^Sportovní klub policie\b/i, "SKP"],
    [/^Klub stolního tenisu\b/i, "KST"],
    [/^Městský sportovní klub\b/i, "MSK"],
    [/^Vysokoškolský sportovní klub\b/i, "VSK"],
    [/^Sportovní klub\b/i, "SK"],
    [/^Tělovýchovná jednota\b/i, "TJ"],
    [/^Tělocvična jednota\b/i, "TJ"],
    [/^Tělocvičná jednota\b/i, "TJ"],
    [/^Table Tennis Club\b/i, "TTC"],
    [/^TT Club\b/i, "TTC"],
    [/^T\.?\s*J\.?/i, "TJ"]
];
