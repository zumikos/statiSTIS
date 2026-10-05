const MATCH_HOME_ORDER = "ABCDBCDACDABDABC";
const MATCH_AWAY_ORDER = "XYZUXYZUXYZUXYZU";
const MATCH_STORAGE_KEY = "statistis-match-lineup";
const matchSlots = [];
const matchSingles = { home: {}, away: {} };
const matchDoubles = { home: [[], []], away: [[], []] };
const matchStatus = document.getElementById("match-status");
const matchResults = document.getElementById("match-results");
const matchStorageStatus = document.getElementById("match-storage-status");

function invalidateMatch() {
    matchResults.hidden = true;
    matchStatus.textContent = "";
}

function createMatchSlot(team, letter, containerId, label = letter) {
    const side = team === "home" ? "domácího" : "hostujícího";
    const row = document.createElement("div");
    row.className = "match-player";
    row.innerHTML = `
        <strong>${letter}</strong>
        <div class="match-player-entry">
            <form class="entity-search match-search" role="search">
                <input type="search" aria-label="Jméno ${side} hráče ${label}" placeholder="Jméno hráče" autocomplete="off">
                <button type="submit" aria-label="Vyhledat hráče ${label}" title="Vyhledat">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"></circle><path d="M15.5 15.5 21 21"></path></svg>
                </button>
            </form>
            <div class="match-selected" hidden></div>
            <p class="match-slot-status" role="status"></p>
            <div class="match-search-results"></div>
        </div>
        <label class="match-rating-label">STR <input type="number" min="1" max="3000" step="1" inputmode="numeric" aria-label="STR ${side} hráče ${label}"></label>`;
    document.getElementById(containerId).appendChild(row);

    const slot = {
        team, letter, label, player: null, request: 0,
        form: row.querySelector("form"),
        search: row.querySelector('input[type="search"]'),
        rating: row.querySelector('input[type="number"]'),
        selected: row.querySelector(".match-selected"),
        status: row.querySelector(".match-slot-status")
    };
    const resultList = createPaginatedResultList(
        row.querySelector(".match-search-results"),
        player => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "search-result comparison-result";
            const name = document.createElement("strong");
            name.textContent = player["Hráč"];
            const details = document.createElement("span");
            details.textContent = formatPlayerSearchDetails(player);
            button.append(name, details);
            button.addEventListener("click", () => selectMatchPlayer(slot, player));
            return button;
        }, 10
    );

    slot.form.addEventListener("submit", async event => {
        event.preventDefault();
        const query = slot.search.value.trim();
        const request = ++slot.request;
        resultList.clear();
        if (normalizeText(query, true).length < 2) {
            slot.status.textContent = "Zadejte alespoň dva znaky.";
            return;
        }
        slot.status.textContent = "Načítám hráče…";
        try {
            const matches = await findPlayers(query);
            if (request !== slot.request) return;
            slot.status.textContent = matches.length ? `Nalezeno hráčů: ${matches.length}` : "Žádný hráč nebyl nalezen.";
            resultList.show(matches);
        } catch {
            if (request === slot.request) slot.status.textContent = "Seznam hráčů se nepodařilo načíst.";
        }
    });

    slot.clear = (focus = true) => {
        slot.request += 1;
        slot.player = null;
        slot.rating.value = "";
        slot.selected.hidden = true;
        slot.form.hidden = false;
        slot.search.value = "";
        slot.status.textContent = "";
        resultList.clear();
        if (focus) slot.search.focus();
        invalidateMatch();
    };
    slot.showPlayer = (player, rating) => {
        slot.request += 1;
        slot.player = player;
        slot.rating.value = rating?.rating ?? "";
        slot.selected.replaceChildren();
        const details = document.createElement("div");
        const name = document.createElement("strong");
        name.appendChild(createPlayerProfileLink(player.ID, player["Hráč"]));
        const description = document.createElement("span");
        description.textContent = formatPlayerSearchDetails(player);
        details.append(name, description);
        const change = document.createElement("button");
        change.type = "button";
        change.className = "button";
        change.textContent = "Změnit";
        change.addEventListener("click", () => {
            slot.clear();
            matchSlotChanged(slot);
        });
        slot.selected.append(details, change);
        slot.selected.hidden = false;
        slot.form.hidden = true;
        resultList.clear();
        slot.status.textContent = rating ? "" : "STR není k dispozici; zadejte ho ručně.";
        invalidateMatch();
    };
    slot.rating.addEventListener("input", () => matchSlotChanged(slot));
    matchSlots.push(slot);
    return slot;
}

async function selectMatchPlayer(slot, summary) {
    const request = ++slot.request;
    slot.status.textContent = "Načítám hráče…";
    try {
        const player = await loadPlayer(summary.ID);
        if (request !== slot.request) return;
        if (!player) throw Error("Hráč nebyl nalezen.");
        slot.showPlayer(player, latestPlayerRating(player));
        matchSlotChanged(slot);
    } catch {
        if (request === slot.request) slot.status.textContent = "Hráče se nepodařilo načíst.";
    }
}

function matchSlotChanged(slot) {
    invalidateMatch();
    if (slot.double) {
        slot.autoFill = false;
        return;
    }
    const index = (slot.team === "home" ? "ABCD" : "XYZU").indexOf(slot.letter);
    const doubleSlot = matchDoubles[slot.team][Math.floor(index / 2)][index % 2];
    if (!doubleSlot.autoFill) return;
    if (slot.player) {
        const rating = slot.rating.value === "" ? null : { rating: slot.rating.value };
        doubleSlot.showPlayer(slot.player, rating);
    } else {
        doubleSlot.clear(false);
        doubleSlot.rating.value = slot.rating.value;
    }
}

for (const team of ["home", "away"]) {
    for (const letter of team === "home" ? "ABCD" : "XYZU") {
        matchSingles[team][letter] = createMatchSlot(team, letter, `match-${team}-players`);
    }
    for (let pair = 1; pair <= 2; pair += 1) {
        for (let player = 1; player <= 2; player += 1) {
            const slot = createMatchSlot(
                team, String(player), `match-${team}-double-${pair}`, `Č${pair}, hráč ${player}`
            );
            slot.double = true;
            slot.autoFill = true;
            matchDoubles[team][pair - 1].push(slot);
        }
    }
}

function slotRating(slot) {
    return slot.rating.value.trim() === "" ? null : Number(slot.rating.value);
}

function matchParticipant(slots) {
    return {
        rating: slots.reduce((sum, slot) => sum + slotRating(slot), 0) / slots.length,
        label: slots.map(slot =>
            `${slot.player?.["Hráč"] || slot.label} (${formatThousands(slotRating(slot))})`
        ).join(" + ")
    };
}

function matchFixtures() {
    const fixtures = [];
    for (let number = 1; number <= 2; number += 1) {
        const home = matchParticipant(matchDoubles.home[number - 1]);
        const away = matchParticipant(matchDoubles.away[number - 1]);
        fixtures.push({ type: `Č${number}`, home, away, chance: strWinProbability(home.rating, away.rating) });
    }
    for (let index = 0; index < 16; index += 1) {
        const home = matchParticipant([matchSingles.home[MATCH_HOME_ORDER[index]]]);
        const away = matchParticipant([matchSingles.away[MATCH_AWAY_ORDER[index]]]);
        fixtures.push({ type: `D${String(index + 1).padStart(2, "0")}`, home, away, chance: strWinProbability(home.rating, away.rating) });
    }
    return fixtures;
}

function matchOutcome(fixtures) {
    let states = new Map([[0, 1]]);
    for (const fixture of fixtures) {
        const next = new Map();
        const add = (score, probability) => next.set(score, (next.get(score) || 0) + probability);
        for (const [score, probability] of states) {
            const home = Math.floor(score / 11);
            const away = score % 11;
            if (home === 10 || away === 10) {
                add(score, probability);
                continue;
            }
            const chance = fixture.chance;
            add((home + 1) * 11 + away, probability * chance);
            add(home * 11 + away + 1, probability * (1 - chance));
        }
        states = next;
    }
    const outcome = { home: 0, draw: 0, away: 0 };
    for (const [score, probability] of states) {
        const home = Math.floor(score / 11);
        const away = score % 11;
        if (home === 10) outcome.home += probability;
        else if (away === 10) outcome.away += probability;
        else outcome.draw += probability;
    }
    return outcome;
}

const formatMatchPercent = value => `${(value * 100).toLocaleString("cs-CZ", {
    minimumFractionDigits: 1, maximumFractionDigits: 1
})} %`;

function calculateMatch() {
    invalidateMatch();
    const missing = matchSlots.find(slot =>
        slot.rating.value.trim() === "" || !Number.isInteger(slotRating(slot)) ||
        slotRating(slot) < 1 || slotRating(slot) > 3000
    );
    if (missing) {
        matchStatus.textContent = `Zadejte celé STR od 1 do 3 000 pro ${missing.team === "home" ? "domácího" : "hostujícího"} hráče ${missing.label}.`;
        missing.rating.focus();
        return;
    }
    const ids = Object.values(matchSingles).flatMap(team => Object.values(team))
        .filter(slot => slot.player).map(slot => String(slot.player.ID));
    if (new Set(ids).size !== ids.length) {
        matchStatus.textContent = "Stejný hráč nemůže být ve dvou pozicích pro dvouhry.";
        return;
    }
    for (const pair of [...matchDoubles.home, ...matchDoubles.away]) {
        if (pair[0].player && pair[1].player && String(pair[0].player.ID) === String(pair[1].player.ID)) {
            matchStatus.textContent = "Ve stejné čtyřhře nemůže být jeden hráč dvakrát.";
            return;
        }
    }

    const fixtures = matchFixtures();
    const outcome = matchOutcome(fixtures);
    document.getElementById("match-home-win").textContent = formatMatchPercent(outcome.home);
    document.getElementById("match-draw").textContent = formatMatchPercent(outcome.draw);
    document.getElementById("match-away-win").textContent = formatMatchPercent(outcome.away);

    const body = document.getElementById("match-fixtures");
    body.replaceChildren();
    fixtures.forEach(fixture => {
        const row = document.createElement("tr");
        [fixture.type, fixture.home.label, fixture.away.label,
            formatMatchPercent(fixture.chance), formatMatchPercent(1 - fixture.chance)]
            .forEach(value => {
                const cell = document.createElement("td");
                cell.textContent = value;
                row.appendChild(cell);
            });
        body.appendChild(row);
    });
    matchResults.hidden = false;
}

document.getElementById("match-calculate").addEventListener("click", calculateMatch);

function matchSlotData(slot) {
    const player = slot.player && Object.fromEntries(
        ["ID", "Hráč", "Oddíl", "Rok narození"].map(key => [key, slot.player[key]])
    );
    return { player, rating: slot.rating.value, autoFill: slot.autoFill };
}

function restoreMatchSlot(slot, data) {
    if (data?.player?.ID && data.player["Hráč"]) {
        slot.showPlayer(data.player, null);
    } else {
        slot.clear(false);
    }
    slot.rating.value = data?.rating ?? "";
    if (slot.double) slot.autoFill = data?.autoFill !== false;
}

document.getElementById("match-save").addEventListener("click", () => {
    try {
        localStorage.setItem(MATCH_STORAGE_KEY, JSON.stringify(matchSlots.map(matchSlotData)));
        matchStorageStatus.textContent = "Sestava byla uložena v tomto prohlížeči.";
    } catch {
        matchStorageStatus.textContent = "Sestavu se nepodařilo uložit v tomto prohlížeči.";
    }
});

try {
    const saved = JSON.parse(localStorage.getItem(MATCH_STORAGE_KEY));
    if (Array.isArray(saved) && saved.length === matchSlots.length) {
        matchSlots.forEach((slot, index) => restoreMatchSlot(slot, saved[index]));
        matchStorageStatus.textContent = "Uložená sestava byla načtena.";
    }
} catch {
    matchStorageStatus.textContent = "Uloženou sestavu se nepodařilo načíst.";
}
