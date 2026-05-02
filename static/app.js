// State
let currentTeam = null;

document.addEventListener('DOMContentLoaded', async () => {
    try {
        const carousel = await apiFetch('/api/playoff-carousel');
        if (carousel.currentRound > 0) {
            document.getElementById('bracket-nav-link').hidden = false;
            loadBracket();
        } else {
            loadStandings();
        }
    } catch (e) {
        loadStandings();
    }
});

// --- Data Fetching ---

async function apiFetch(path) {
    const resp = await fetch(path);
    if (!resp.ok) throw new Error(`API error: ${resp.status}`);
    return resp.json();
}

// --- View Management ---

function showView(view) {
    document.getElementById('standings-view').hidden = view !== 'standings';
    document.getElementById('team-view').hidden = view !== 'team';
    document.getElementById('player-view').hidden = view !== 'player';
    document.getElementById('bracket-view').hidden = view !== 'bracket';
    document.getElementById('series-view').hidden = view !== 'series';
}

function showLoading(show) {
    document.getElementById('loading').hidden = !show;
}

function setBreadcrumb(parts) {
    const bc = document.getElementById('breadcrumb');
    bc.innerHTML = '';
    parts.forEach((p, i) => {
        if (i > 0) {
            const sep = document.createElement('span');
            sep.className = 'separator';
            sep.textContent = '/';
            bc.appendChild(sep);
        }
        if (p.onClick) {
            const a = document.createElement('a');
            a.href = '#';
            a.textContent = p.label;
            a.onclick = (e) => { e.preventDefault(); p.onClick(); };
            bc.appendChild(a);
        } else {
            const span = document.createElement('span');
            span.className = 'current';
            span.textContent = p.label;
            bc.appendChild(span);
        }
    });
}

// --- Standings ---

async function loadStandings() {
    setBreadcrumb([]);
    showView('standings');
    showLoading(true);
    try {
        const data = await apiFetch('/api/standings');
        renderStandings(data.standings || []);
    } catch (e) {
        document.getElementById('standings-content').innerHTML =
            `<p class="loading">Failed to load standings: ${e.message}</p>`;
    }
    showLoading(false);
}

function renderStandings(standings) {
    // Group by division
    const divisions = {};
    standings.forEach(t => {
        const div = t.divisionName;
        if (!divisions[div]) divisions[div] = [];
        divisions[div].push(t);
    });

    // Sort each division by points descending
    Object.values(divisions).forEach(teams =>
        teams.sort((a, b) => b.points - a.points || b.wins - a.wins)
    );

    const container = document.getElementById('standings-content');
    container.innerHTML = '';

    // Order divisions by conference
    const divOrder = ['Atlantic', 'Metropolitan', 'Central', 'Pacific'];
    const conferences = { Atlantic: 'Eastern', Metropolitan: 'Eastern', Central: 'Western', Pacific: 'Western' };
    let lastConf = '';

    divOrder.forEach(divName => {
        const teams = divisions[divName];
        if (!teams) return;

        const conf = conferences[divName];
        if (conf !== lastConf) {
            const confHeader = document.createElement('h2');
            confHeader.textContent = `${conf} Conference`;
            confHeader.style.cssText = 'font-size:18px; margin: 24px 0 12px; color: var(--text);';
            container.appendChild(confHeader);
            lastConf = conf;
        }

        const group = document.createElement('div');
        group.className = 'division-group';

        const header = document.createElement('h2');
        header.textContent = divName;
        group.appendChild(header);

        const table = document.createElement('table');
        table.innerHTML = `
            <thead>
                <tr>
                    <th style="width:40px">#</th>
                    <th class="left" style="text-align:left">Team</th>
                    <th>GP</th>
                    <th>W</th>
                    <th>L</th>
                    <th>OTL</th>
                    <th>PTS</th>
                    <th>GF</th>
                    <th>GA</th>
                    <th>DIFF</th>
                    <th>STRK</th>
                    <th>L10</th>
                </tr>
            </thead>
            <tbody></tbody>
        `;

        const tbody = table.querySelector('tbody');
        teams.forEach((t, i) => {
            const abbrev = t.teamAbbrev.default;
            const diff = t.goalDifferential;
            const diffClass = diff > 0 ? 'positive' : diff < 0 ? 'negative' : '';
            const streak = `${t.streakCode}${t.streakCount}`;
            const streakClass = `streak-${t.streakCode}`;

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td class="left">
                    <div class="team-cell" onclick="loadTeam('${abbrev}', '${t.teamName.default}', '${t.teamLogo}')">
                        <img src="${t.teamLogo}" alt="${abbrev}">
                        <span>${t.teamName.default}</span>
                    </div>
                </td>
                <td>${t.gamesPlayed}</td>
                <td>${t.wins}</td>
                <td>${t.losses}</td>
                <td>${t.otLosses}</td>
                <td><strong>${t.points}</strong></td>
                <td>${t.goalFor}</td>
                <td>${t.goalAgainst}</td>
                <td class="${diffClass}">${diff > 0 ? '+' : ''}${diff}</td>
                <td class="${streakClass}">${streak}</td>
                <td>${t.l10Wins}-${t.l10Losses}-${t.l10OtLosses}</td>
            `;
            tbody.appendChild(tr);
        });

        group.appendChild(table);
        container.appendChild(group);
    });
}

// --- Team Roster ---

async function loadTeam(abbrev, teamName, teamLogo) {
    currentTeam = { abbrev, teamName, teamLogo };
    setBreadcrumb([{ label: teamName }]);
    showView('team');
    showLoading(true);

    try {
        const roster = await apiFetch(`/api/roster/${abbrev}`);
        renderTeam(roster, teamName, teamLogo);
    } catch (e) {
        document.getElementById('roster-content').innerHTML =
            `<p class="loading">Failed to load roster: ${e.message}</p>`;
    }
    showLoading(false);
}

function renderTeam(roster, teamName, teamLogo) {
    const header = document.getElementById('team-header');
    header.innerHTML = `
        <img src="${teamLogo}" alt="${teamName}">
        <h2>${teamName}</h2>
    `;

    const container = document.getElementById('roster-content');
    container.innerHTML = '';

    const groups = [
        { label: 'Forwards', players: roster.forwards || [] },
        { label: 'Defensemen', players: roster.defensemen || [] },
        { label: 'Goalies', players: roster.goalies || [] }
    ];

    groups.forEach(g => {
        if (g.players.length === 0) return;

        const section = document.createElement('div');
        section.className = 'position-group';

        const h3 = document.createElement('h3');
        h3.textContent = g.label;
        section.appendChild(h3);

        const grid = document.createElement('div');
        grid.className = 'roster-grid';

        g.players
            .sort((a, b) => a.sweaterNumber - b.sweaterNumber)
            .forEach(p => {
                const card = document.createElement('div');
                card.className = 'player-card';
                card.onclick = () => loadPlayer(p.id, `${p.firstName.default} ${p.lastName.default}`);
                card.innerHTML = `
                    <img src="${p.headshot}" alt="${p.firstName.default} ${p.lastName.default}">
                    <div class="player-info">
                        <div class="player-name">${p.firstName.default} ${p.lastName.default}</div>
                        <div class="player-meta">#${p.sweaterNumber} · ${positionLabel(p.positionCode)}</div>
                    </div>
                `;
                grid.appendChild(card);
            });

        section.appendChild(grid);
        container.appendChild(section);
    });
}

function positionLabel(code) {
    const labels = { C: 'Center', L: 'Left Wing', R: 'Right Wing', D: 'Defense', G: 'Goalie' };
    return labels[code] || code;
}

// --- Player Detail ---

async function loadPlayer(playerId, playerName) {
    setBreadcrumb([
        { label: currentTeam.teamName, onClick: () => loadTeam(currentTeam.abbrev, currentTeam.teamName, currentTeam.teamLogo) },
        { label: playerName }
    ]);
    showView('player');
    showLoading(true);

    try {
        const data = await apiFetch(`/api/player/${playerId}`);
        renderPlayer(data);
    } catch (e) {
        document.getElementById('player-stats').innerHTML =
            `<p class="loading">Failed to load player: ${e.message}</p>`;
    }
    showLoading(false);
}

function renderPlayer(p) {
    const name = `${p.firstName.default} ${p.lastName.default}`;
    const pos = positionLabel(p.position);
    const heroImg = p.heroImage || '';

    const header = document.getElementById('player-header');
    header.innerHTML = `
        <div class="player-hero">
            ${heroImg ? `<img class="player-hero-bg" src="${heroImg}" alt="">` : '<div style="height:200px;background:var(--surface)"></div>'}
            <div class="player-hero-info">
                <img src="${p.headshot}" alt="${name}">
                <div class="player-hero-details">
                    <h2>#${p.sweaterNumber} ${name}</h2>
                    <div class="meta">
                        <span>${pos}</span>
                        <span>Shoots: ${p.shootsCatches}</span>
                        ${p.heightInInches ? `<span>${formatHeight(p.heightInInches)}</span>` : ''}
                        ${p.weightInPounds ? `<span>${p.weightInPounds} lbs</span>` : ''}
                        ${p.birthDate ? `<span>Born: ${p.birthDate}</span>` : ''}
                        ${p.birthCity ? `<span>${p.birthCity.default}, ${p.birthCountry}</span>` : ''}
                    </div>
                </div>
            </div>
        </div>
    `;

    const statsContainer = document.getElementById('player-stats');
    statsContainer.innerHTML = '';

    // Featured stats
    if (p.featuredStats) {
        const fs = p.featuredStats;
        const season = fs.regularSeason?.subSeason;
        const career = fs.regularSeason?.career;
        if (season) {
            const isGoalie = p.position === 'G';
            const cards = isGoalie
                ? [
                    { label: 'GP', value: season.gamesPlayed },
                    { label: 'W', value: season.wins },
                    { label: 'L', value: season.losses },
                    { label: 'OTL', value: season.otLosses },
                    { label: 'GAA', value: season.goalsAgainstAvg?.toFixed(2) },
                    { label: 'SV%', value: season.savePctg?.toFixed(3) },
                    { label: 'SO', value: season.shutouts }
                ]
                : [
                    { label: 'GP', value: season.gamesPlayed },
                    { label: 'G', value: season.goals },
                    { label: 'A', value: season.assists },
                    { label: 'PTS', value: season.points },
                    { label: '+/-', value: season.plusMinus },
                    { label: 'PIM', value: season.pim },
                    { label: 'PPG', value: season.powerPlayGoals },
                    { label: 'S', value: season.shots }
                ];

            const section = document.createElement('div');
            section.className = 'stats-section';
            section.innerHTML = `<h3>Current Season</h3>`;

            const grid = document.createElement('div');
            grid.className = 'featured-stats';
            cards.forEach(c => {
                if (c.value === undefined || c.value === null) return;
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    <div class="stat-value">${c.value}</div>
                    <div class="stat-label">${c.label}</div>
                `;
                grid.appendChild(card);
            });
            section.appendChild(grid);
            statsContainer.appendChild(section);
        }

        if (career) {
            const isGoalie = p.position === 'G';
            const cards = isGoalie
                ? [
                    { label: 'GP', value: career.gamesPlayed },
                    { label: 'W', value: career.wins },
                    { label: 'L', value: career.losses },
                    { label: 'GAA', value: career.goalsAgainstAvg?.toFixed(2) },
                    { label: 'SV%', value: career.savePctg?.toFixed(3) },
                    { label: 'SO', value: career.shutouts }
                ]
                : [
                    { label: 'GP', value: career.gamesPlayed },
                    { label: 'G', value: career.goals },
                    { label: 'A', value: career.assists },
                    { label: 'PTS', value: career.points },
                    { label: '+/-', value: career.plusMinus },
                    { label: 'GWG', value: career.gameWinningGoals }
                ];

            const section = document.createElement('div');
            section.className = 'stats-section';
            section.innerHTML = `<h3>Career Totals</h3>`;

            const grid = document.createElement('div');
            grid.className = 'featured-stats';
            cards.forEach(c => {
                if (c.value === undefined || c.value === null) return;
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    <div class="stat-value">${c.value}</div>
                    <div class="stat-label">${c.label}</div>
                `;
                grid.appendChild(card);
            });
            section.appendChild(grid);
            statsContainer.appendChild(section);
        }
    }

    // Current playoff stats
    if (p.featuredStats && p.featuredStats.playoffs) {
        const ps = p.featuredStats.playoffs.subSeason;
        if (ps) {
            const isGoalie = p.position === 'G';
            const cards = isGoalie
                ? [
                    { label: 'GP', value: ps.gamesPlayed },
                    { label: 'W', value: ps.wins },
                    { label: 'L', value: ps.losses },
                    { label: 'GAA', value: ps.goalsAgainstAvg?.toFixed(2) },
                    { label: 'SV%', value: ps.savePctg?.toFixed(3) },
                    { label: 'SO', value: ps.shutouts }
                ]
                : [
                    { label: 'GP', value: ps.gamesPlayed },
                    { label: 'G', value: ps.goals },
                    { label: 'A', value: ps.assists },
                    { label: 'PTS', value: ps.points },
                    { label: '+/-', value: ps.plusMinus },
                    { label: 'PIM', value: ps.pim },
                    { label: 'PPG', value: ps.powerPlayGoals },
                    { label: 'S', value: ps.shots }
                ];

            const section = document.createElement('div');
            section.className = 'stats-section';
            section.innerHTML = '<h3>Current Playoffs</h3>';

            const grid = document.createElement('div');
            grid.className = 'featured-stats';
            cards.forEach(c => {
                if (c.value === undefined || c.value === null) return;
                const card = document.createElement('div');
                card.className = 'stat-card';
                card.innerHTML = `
                    <div class="stat-value">${c.value}</div>
                    <div class="stat-label">${c.label}</div>
                `;
                grid.appendChild(card);
            });
            section.appendChild(grid);
            statsContainer.appendChild(section);
        }
    }

    // Last 5 games
    if (p.last5Games && p.last5Games.length > 0) {
        const isGoalie = p.position === 'G';
        const section = document.createElement('div');
        section.className = 'stats-section';
        section.innerHTML = `<h3>Last 5 Games</h3>`;

        const table = document.createElement('table');
        if (isGoalie) {
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="left" style="text-align:left">Opponent</th>
                        <th>Decision</th>
                        <th>GA</th>
                        <th>SA</th>
                        <th>SV%</th>
                        <th>TOI</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            p.last5Games.forEach(g => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="left" style="text-align:left">${g.opponentAbbrev || '—'}</td>
                    <td>${g.decision || '—'}</td>
                    <td>${g.goalsAgainst ?? '—'}</td>
                    <td>${g.shotsAgainst ?? '—'}</td>
                    <td>${g.savePctg != null ? g.savePctg.toFixed(3) : '—'}</td>
                    <td>${g.toi || '—'}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="left" style="text-align:left">Opponent</th>
                        <th>G</th>
                        <th>A</th>
                        <th>PTS</th>
                        <th>+/-</th>
                        <th>PIM</th>
                        <th>S</th>
                        <th>TOI</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            p.last5Games.forEach(g => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td class="left" style="text-align:left">${g.opponentAbbrev || '—'}</td>
                    <td>${g.goals ?? '—'}</td>
                    <td>${g.assists ?? '—'}</td>
                    <td>${g.points ?? '—'}</td>
                    <td>${g.plusMinus ?? '—'}</td>
                    <td>${g.pim ?? '—'}</td>
                    <td>${g.shots ?? '—'}</td>
                    <td>${g.toi || '—'}</td>
                `;
                tbody.appendChild(tr);
            });
        }

        section.appendChild(table);
        statsContainer.appendChild(section);
    }

    // Season-by-season totals
    if (p.seasonTotals && p.seasonTotals.length > 0) {
        const nhlSeasons = p.seasonTotals.filter(s => s.leagueAbbrev === 'NHL' && s.gameTypeId !== 3);
        if (nhlSeasons.length > 0) {
            const isGoalie = p.position === 'G';
            const section = document.createElement('div');
            section.className = 'stats-section';
            section.innerHTML = `<h3>NHL Season History</h3>`;

            const table = document.createElement('table');
            if (isGoalie) {
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th class="left" style="text-align:left">Season</th>
                            <th class="left" style="text-align:left">Team</th>
                            <th>GP</th>
                            <th>W</th>
                            <th>L</th>
                            <th>OTL</th>
                            <th>GAA</th>
                            <th>SV%</th>
                            <th>SO</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');
                nhlSeasons.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="left" style="text-align:left">${formatSeason(s.season)}</td>
                        <td class="left" style="text-align:left">${s.teamName?.default || '—'}</td>
                        <td>${s.gamesPlayed}</td>
                        <td>${s.wins}</td>
                        <td>${s.losses}</td>
                        <td>${s.otLosses ?? '—'}</td>
                        <td>${s.goalsAgainstAvg?.toFixed(2) ?? '—'}</td>
                        <td>${s.savePctg?.toFixed(3) ?? '—'}</td>
                        <td>${s.shutouts ?? '—'}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th class="left" style="text-align:left">Season</th>
                            <th class="left" style="text-align:left">Team</th>
                            <th>GP</th>
                            <th>G</th>
                            <th>A</th>
                            <th>PTS</th>
                            <th>+/-</th>
                            <th>PIM</th>
                            <th>PPG</th>
                            <th>S</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');
                nhlSeasons.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="left" style="text-align:left">${formatSeason(s.season)}</td>
                        <td class="left" style="text-align:left">${s.teamName?.default || '—'}</td>
                        <td>${s.gamesPlayed}</td>
                        <td>${s.goals}</td>
                        <td>${s.assists}</td>
                        <td>${s.points}</td>
                        <td>${s.plusMinus ?? '—'}</td>
                        <td>${s.pim ?? '—'}</td>
                        <td>${s.powerPlayGoals ?? '—'}</td>
                        <td>${s.shots ?? '—'}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            section.appendChild(table);
            statsContainer.appendChild(section);
        }
    }

    // Playoff history table
    if (p.seasonTotals && p.seasonTotals.length > 0) {
        const playoffSeasons = p.seasonTotals.filter(s => s.leagueAbbrev === 'NHL' && s.gameTypeId === 3);
        if (playoffSeasons.length > 0) {
            const isGoalie = p.position === 'G';
            const section = document.createElement('div');
            section.className = 'stats-section';
            section.innerHTML = '<h3>NHL Playoff History</h3>';

            const table = document.createElement('table');
            if (isGoalie) {
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th style="text-align:left">Season</th>
                            <th style="text-align:left">Team</th>
                            <th>GP</th>
                            <th>W</th>
                            <th>L</th>
                            <th>GAA</th>
                            <th>SV%</th>
                            <th>SO</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');
                playoffSeasons.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:left">${formatSeason(s.season)}</td>
                        <td style="text-align:left">${s.teamName?.default || '—'}</td>
                        <td>${s.gamesPlayed}</td>
                        <td>${s.wins}</td>
                        <td>${s.losses}</td>
                        <td>${s.goalsAgainstAvg?.toFixed(2) ?? '—'}</td>
                        <td>${s.savePctg?.toFixed(3) ?? '—'}</td>
                        <td>${s.shutouts ?? '—'}</td>
                    `;
                    tbody.appendChild(tr);
                });
            } else {
                table.innerHTML = `
                    <thead>
                        <tr>
                            <th style="text-align:left">Season</th>
                            <th style="text-align:left">Team</th>
                            <th>GP</th>
                            <th>G</th>
                            <th>A</th>
                            <th>PTS</th>
                            <th>+/-</th>
                            <th>PIM</th>
                            <th>PPG</th>
                        </tr>
                    </thead>
                    <tbody></tbody>
                `;
                const tbody = table.querySelector('tbody');
                playoffSeasons.forEach(s => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td style="text-align:left">${formatSeason(s.season)}</td>
                        <td style="text-align:left">${s.teamName?.default || '—'}</td>
                        <td>${s.gamesPlayed}</td>
                        <td>${s.goals}</td>
                        <td>${s.assists}</td>
                        <td>${s.points}</td>
                        <td>${s.plusMinus ?? '—'}</td>
                        <td>${s.pim ?? '—'}</td>
                        <td>${s.powerPlayGoals ?? '—'}</td>
                    `;
                    tbody.appendChild(tr);
                });
            }

            section.appendChild(table);
            statsContainer.appendChild(section);
        }
    }
}

function formatHeight(inches) {
    if (!inches) return '';
    const ft = Math.floor(inches / 12);
    const remaining = inches % 12;
    return `${ft}'${remaining}"`;
}

function formatSeason(seasonId) {
    if (!seasonId) return '—';
    const s = String(seasonId);
    return `${s.substring(0, 4)}-${s.substring(6, 8)}`;
}

// --- Playoffs: Bracket ---

async function loadBracket() {
    setBreadcrumb([]);
    showView('bracket');
    showLoading(true);
    try {
        const data = await apiFetch('/api/playoff-bracket');
        renderBracket(data);
    } catch (e) {
        document.getElementById('bracket-content').innerHTML =
            `<p class="loading">Failed to load bracket: ${e.message}</p>`;
    }
    showLoading(false);
}

function renderBracket(data) {
    const container = document.getElementById('bracket-content');
    container.innerHTML = '';

    const rounds = {};
    (data.series || []).forEach(s => {
        if (!rounds[s.playoffRound]) rounds[s.playoffRound] = [];
        rounds[s.playoffRound].push(s);
    });

    const series = data.series || [];
    const letterToGroup = {
        A: 'e1', B: 'e1', C: 'e1', D: 'e1',
        E: 'w1', F: 'w1', G: 'w1', H: 'w1',
        I: 'e2', J: 'e2',
        K: 'w2', L: 'w2',
        M: 'e3',
        N: 'w3',
        O: 'f',
    };

    const groups = { w1: [], w2: [], w3: [], f: [], e3: [], e2: [], e1: [] };
    series.forEach(s => {
        const g = letterToGroup[s.seriesLetter];
        if (g) groups[g].push(s);
    });

    const confRow = document.createElement('div');
    confRow.className = 'bracket-conf-row';
    confRow.innerHTML = `
        <div class="bracket-conf-label bracket-conf-west">Western Conference</div>
        <div class="bracket-conf-label bracket-conf-final">Stanley Cup</div>
        <div class="bracket-conf-label bracket-conf-east">Eastern Conference</div>
    `;
    container.appendChild(confRow);

    const grid = document.createElement('div');
    grid.className = 'bracket-grid';

    const columns = [
        { header: '1st Round',  side: 'west',  list: groups.w1, count: 4 },
        { header: '2nd Round',  side: 'west',  list: groups.w2, count: 2 },
        { header: 'Conf Final', side: 'west',  list: groups.w3, count: 1 },
        { header: 'Final',      side: 'final', list: groups.f,  count: 1 },
        { header: 'Conf Final', side: 'east',  list: groups.e3, count: 1 },
        { header: '2nd Round',  side: 'east',  list: groups.e2, count: 2 },
        { header: '1st Round',  side: 'east',  list: groups.e1, count: 4 },
    ];

    columns.forEach(c => {
        const col = document.createElement('div');
        col.className = `bracket-col bracket-col-${c.side}`;

        const header = document.createElement('div');
        header.className = 'bracket-round-header';
        header.textContent = c.header;
        col.appendChild(header);

        const wrap = document.createElement('div');
        wrap.className = 'bracket-col-cards';

        if (c.list.length > 0) {
            c.list.forEach(s => wrap.appendChild(buildSeriesCard(s)));
        } else {
            for (let i = 0; i < c.count; i++) wrap.appendChild(buildPlaceholder());
        }
        col.appendChild(wrap);
        grid.appendChild(col);
    });

    container.appendChild(grid);
}

function buildPlaceholder() {
    const ph = document.createElement('div');
    ph.className = 'bracket-series bracket-placeholder';
    ph.textContent = 'TBD';
    return ph;
}

function buildSeriesCard(s) {
    const card = document.createElement('div');
    card.className = 'bracket-series';
    if (s.winningTeamId) card.classList.add('series-complete');

    const top = s.topSeedTeam || {};
    const bot = s.bottomSeedTeam || {};

    if (!top.abbrev && !bot.abbrev) {
        card.classList.add('bracket-placeholder');
        card.textContent = 'TBD';
        return card;
    }

    const topWon = s.winningTeamId && s.winningTeamId === top.id;
    const botWon = s.winningTeamId && s.winningTeamId === bot.id;

    card.innerHTML = `
        <div class="bracket-series-label">${s.seriesLetter}</div>
        ${renderBracketTeam(top, s.topSeedRankAbbrev, s.topSeedWins, topWon, botWon)}
        ${renderBracketTeam(bot, s.bottomSeedRankAbbrev, s.bottomSeedWins, botWon, topWon)}
    `;
    card.onclick = () => loadSeries(s.seriesLetter, top, bot);
    return card;
}

function renderBracketTeam(team, seedAbbrev, wins, won, otherWon) {
    const isTBD = !team.abbrev || team.abbrev === 'TBD';
    const logoHtml = (team.darkLogo || team.logo)
        ? `<img src="${team.darkLogo || team.logo}" alt="${team.abbrev || ''}">`
        : '<span class="bracket-logo-empty"></span>';
    const cls = isTBD ? 'bracket-tbd' : (won ? 'bracket-winner' : (otherWon ? 'bracket-loser' : ''));
    return `
        <div class="bracket-team ${cls}">
            ${logoHtml}
            <span class="bracket-seed">${seedAbbrev || ''}</span>
            <span class="bracket-abbrev">${team.abbrev || 'TBD'}</span>
            <span class="bracket-wins">${(wins ?? '') === '' ? '' : wins}</span>
        </div>
    `;
}

// --- Playoffs: Series Detail ---

async function loadSeries(letter, topTeam, botTeam) {
    const label = `${topTeam.abbrev || 'TBD'} vs ${botTeam.abbrev || 'TBD'}`;
    setBreadcrumb([{ label: label }]);
    showView('series');
    showLoading(true);
    try {
        const data = await apiFetch(`/api/playoff-series/${letter}`);
        renderSeries(data);
    } catch (e) {
        document.getElementById('series-content').innerHTML =
            `<p class="loading">Failed to load series: ${e.message}</p>`;
    }
    showLoading(false);
}

function renderSeries(data) {
    const container = document.getElementById('series-content');
    container.innerHTML = '';

    const top = data.topSeedTeam;
    const bot = data.bottomSeedTeam;
    const bestOf = (data.neededToWin || 4) * 2 - 1;

    const header = document.createElement('div');
    header.className = 'series-header';
    header.innerHTML = `
        <div class="series-header-teams">
            <div class="series-header-team" data-abbrev="${top.abbrev}">
                <img src="${top.darkLogo || top.logo}" alt="${top.abbrev}">
                <span>#${top.seed} ${top.abbrev}</span>
            </div>
            <div class="series-score-display">${top.seriesWins} &ndash; ${bot.seriesWins}</div>
            <div class="series-header-team" data-abbrev="${bot.abbrev}">
                <img src="${bot.darkLogo || bot.logo}" alt="${bot.abbrev}">
                <span>#${bot.seed} ${bot.abbrev}</span>
            </div>
        </div>
        <div class="series-meta-label">Best of ${bestOf} &middot; ${data.roundLabel || ''}</div>
    `;
    header.querySelectorAll('.series-header-team').forEach(el => {
        const abbrev = el.dataset.abbrev;
        const team = abbrev === top.abbrev ? top : bot;
        const fullName = team.name?.default || abbrev;
        el.style.cursor = 'pointer';
        el.onclick = () => loadTeam(abbrev, fullName, team.darkLogo || team.logo);
    });
    container.appendChild(header);

    const section = document.createElement('div');
    section.className = 'stats-section';
    section.innerHTML = '<h3>Games</h3>';

    const table = document.createElement('table');
    table.innerHTML = `
        <thead>
            <tr>
                <th style="text-align:left">Game</th>
                <th style="text-align:left">Date</th>
                <th style="text-align:left">Matchup</th>
                <th>Score</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;

    const tbody = table.querySelector('tbody');
    (data.games || []).forEach(g => {
        if (g.ifNecessary && g.gameState === 'FUT') return;
        const date = g.startTimeUTC
            ? new Date(g.startTimeUTC).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
            : '—';
        const away = g.awayTeam.abbrev;
        const home = g.homeTeam.abbrev;
        let score = '—';
        let status = 'Upcoming';
        if (g.gameState === 'OFF' || g.gameState === 'FINAL') {
            score = `${g.awayTeam.score} – ${g.homeTeam.score}`;
            status = 'Final';
        } else if (g.gameState === 'LIVE') {
            score = `${g.awayTeam.score} – ${g.homeTeam.score}`;
            status = 'Live';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align:left">Game ${g.gameNumber}</td>
            <td style="text-align:left">${date}</td>
            <td style="text-align:left">${away} @ ${home}</td>
            <td>${score}</td>
            <td>${status}</td>
        `;
        tbody.appendChild(tr);
    });

    section.appendChild(table);
    container.appendChild(section);
}
