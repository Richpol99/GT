// GT Academy - Dynamic Tournament Frontend Integration
document.addEventListener('DOMContentLoaded', async () => {
    const isRankingPage = window.location.pathname.includes('ranking.html');
    const isResultadosPage = window.location.pathname.includes('resultados.html');
    const isRangosPage = window.location.pathname.includes('rangos.html');

    if (!isRankingPage && !isResultadosPage && !isRangosPage) {
        return;
    }

    // Helper: fetch seasons
    let seasons = [];
    try {
        const resp = await fetch('/api/seasons');
        if (resp.ok) {
            seasons = await resp.json();
        }
    } catch (e) {
        console.warn('API de torneo no disponible en modo estático puro.');
        return;
    }

    if (seasons.length === 0) return;

    // Obtener temporada activa por defecto, o la última
    let currentSeason = seasons.find(s => s.is_active) || seasons[seasons.length - 1];

    // =======================================================
    // 1. PÁGINA: RANKING GENERAL (ranking.html)
    // =======================================================
    if (isRankingPage) {
        setupRankingPage(seasons, currentSeason);
    }

    // =======================================================
    // 2. PÁGINA: RESULTADOS DE CARRERAS (resultados.html)
    // =======================================================
    if (isResultadosPage) {
        setupResultadosPage(seasons, currentSeason);
    }

    // =======================================================
    // 3. PÁGINA: TABLA DE RANGOS (rangos.html)
    // =======================================================
    if (isRangosPage) {
        setupRangosPage();
    }
});

// -----------------------------------------------------------
// HELPERS COMPARTIDOS FORMULA E
// -----------------------------------------------------------
const countryCodeMap = {
    'argentina': 'ARG', 'brasil': 'BRA', 'chile': 'CHI', 'colombia': 'COL',
    'luxemburgo': 'LUX', 'mexico': 'MEX', 'panama': 'PAN', 'paraguay': 'PAR',
    'peru': 'PER', 'rd': 'DOM', 'rusia': 'RUS', 'safrica': 'RSA',
    'venezuela': 'VEN', 'alemania': 'GER', 'francia': 'FRA', 'eu': 'USA', 'pdi': 'GT'
};

function getCountryCode(country) {
    if (!country) return 'GT';
    const c = country.toLowerCase().trim();
    return countryCodeMap[c] || c.substring(0, 3).toUpperCase();
}

function getInitials(name) {
    if (!name) return 'GT';
    const clean = name.replace(/[^a-zA-Z0-9]/g, '');
    return clean.substring(0, 2).toUpperCase() || 'GT';
}

function getDeltaHtml(pos) {
    if (pos === 1) return '<span class="fe-delta fe-delta-up" title="Líder / Posición ganada"></span>';
    if (pos <= 3) return '<span class="fe-delta fe-delta-up" title="Podio"></span>';
    if (pos <= 10) return '<span class="fe-delta fe-delta-equal" title="Posición mantenida"></span>';
    return '<span class="fe-delta fe-delta-down" title="Posición"></span>';
}

// =======================================================
// RENDERIZADOR OFICIAL FORMULA E: TABLA DE CLASIFICACIÓN
// =======================================================
async function renderFormulaEStandingsTable(container, seasonId, seasons) {
    container.innerHTML = `
        <div class="container text-center py-5">
            <div class="fe-empty-state">
                <i class="fas fa-spinner fa-spin fa-2x text-warning mb-3"></i>
                <p class="text-muted mb-0">Cargando clasificación oficial de pilotos...</p>
            </div>
        </div>
    `;

    try {
        const [standingsResp, racesResp] = await Promise.all([
            fetch(`/api/seasons/${seasonId}/standings`),
            fetch(`/api/seasons/${seasonId}/races`)
        ]);

        const standings = await standingsResp.json();
        let races = await racesResp.json();

        // Ordenar carreras por número de ronda ascendente
        races.sort((a, b) => a.round_number - b.round_number);

        // Mapear resultados de cada piloto por ronda
        const driverRoundMap = {};
        const driverCarMap = {};

        races.forEach(race => {
            (race.results || []).forEach(res => {
                if (!driverRoundMap[res.driver_id]) {
                    driverRoundMap[res.driver_id] = {};
                }
                driverRoundMap[res.driver_id][race.round_number] = {
                    points: res.points,
                    position: res.position,
                    is_pole: res.is_pole,
                    is_fl: res.is_fastest_lap
                };
                if (!driverCarMap[res.driver_id]) {
                    driverCarMap[res.driver_id] = race.car;
                }
            });
        });

        if (standings.length === 0) {
            container.innerHTML = `
                <div class="container text-center py-5">
                    <div class="fe-empty-state">
                        <i class="fas fa-trophy fe-empty-icon"></i>
                        <h4 class="text-dark fw-bold">No hay pilotos registrados con puntos en esta temporada</h4>
                        <p class="text-muted small mb-0">Los puntos obtenidos en cada carrera aparecerán desglosados aquí.</p>
                    </div>
                </div>
            `;
            return;
        }

        // Construir encabezados de rondas
        let roundHeadersHtml = '';
        races.forEach(r => {
            roundHeadersHtml += `
                <th class="fe-th-round" title="${r.title || 'Ronda ' + r.round_number}">
                    RD ${String(r.round_number).padStart(2, '0')}
                </th>
            `;
        });

        container.innerHTML = `
            <!-- Overview Header de Clasificación -->
            <div class="fe-session-header">
                <div class="container">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <p class="mb-1 text-uppercase fw-bold" style="font-size: 12px; letter-spacing: 1.5px; color: #f28123;">
                                <i class="fas fa-trophy me-1"></i> CAMPEONATO OFICIAL &bull; CLASIFICACIÓN GENERAL
                            </p>
                            <h2 class="fe-session-title mb-1">DRIVERS STANDINGS</h2>
                            <div class="fe-session-meta">
                                <span class="fe-meta-tag highlight"><i class="fas fa-flag-checkered"></i> ${races.length} Rondas</span>
                                <span class="fe-meta-tag"><i class="fas fa-users"></i> ${standings.length} Pilotos con puntos</span>
                            </div>
                        </div>
                        <div>
                            <input type="text" id="feStandingsSearch" class="form-control fe-search-box" placeholder="Buscar piloto o país...">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabla de Cards Formula E con Desglose de Rondas -->
            <div class="container fe-table-container">
                <div class="fe-standings-scroll">
                    <table class="fe-standings-table">
                        <thead>
                            <tr>
                                <th class="fe-th-pos">POS</th>
                                <th class="fe-th-driver">DRIVER</th>
                                <th class="fe-th-team fe-hide-mobile">TEAM / CAR</th>
                                ${roundHeadersHtml}
                                <th class="fe-th-pts">PTS</th>
                            </tr>
                        </thead>
                        <tbody id="feStandingsRowsBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const tbody = document.getElementById('feStandingsRowsBody');
        const searchInput = document.getElementById('feStandingsSearch');

        function renderRows(items) {
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="${4 + races.length}" class="text-center py-5 text-muted">
                            <i class="fas fa-info-circle me-1"></i> No se encontraron pilotos para esta búsqueda.
                        </td>
                    </tr>
                `;
                return;
            }

            items.forEach(item => {
                let rankBadge = '';
                if (item.rank) {
                    rankBadge = `<span class="fe-rank-badge fe-rank-${item.rank}">${item.rank}</span>`;
                }

                const driverCar = driverCarMap[item.driver_id] || 'GT CUP';

                // Generar celdas por ronda
                let roundsCellsHtml = '';
                races.forEach(r => {
                    const rData = driverRoundMap[item.driver_id] ? driverRoundMap[item.driver_id][r.round_number] : null;
                    if (rData) {
                        let tagsHtml = '';
                        if (rData.is_pole) tagsHtml += '<span class="fe-tag-mini-pole">P</span>';
                        if (rData.is_fl) tagsHtml += '<span class="fe-tag-mini-fl">FL</span>';

                        roundsCellsHtml += `
                            <td class="fe-cell-round">
                                <span class="fe-round-points">${rData.points}</span>
                                <span class="fe-round-pos">P${rData.position}</span>
                                ${tagsHtml ? `<div class="fe-round-badges">${tagsHtml}</div>` : ''}
                            </td>
                        `;
                    } else {
                        roundsCellsHtml += `
                            <td class="fe-cell-round fe-round-empty">
                                <span class="fe-round-points text-muted">—</span>
                            </td>
                        `;
                    }
                });

                const tr = document.createElement('tr');
                tr.className = `fe-card-row ${item.position === 1 ? 'fe-row-p1' : ''}`;
                tr.innerHTML = `
                    <!-- 1. Posición + Delta -->
                    <td class="fe-cell-pos">
                        <span class="fe-pos-inner">
                            <span class="fe-pos-number">${item.position}</span>
                            ${getDeltaHtml(item.position)}
                        </span>
                    </td>

                    <!-- 2. Piloto (Avatar + Nombre + Bandera + País + Subtítulo) -->
                    <th scope="row" class="fe-cell-driver">
                        <div class="fe-driver-inner">
                            <div class="fe-driver-avatar">${getInitials(item.psn_id)}</div>
                            <div class="fe-driver-detail">
                                <span class="fe-driver-name">${item.psn_id}</span>
                                <div class="fe-driver-sub">
                                    <img src="assets/country/${item.country || 'pdi'}.png" alt="${item.country}" class="fe-driver-flag" onerror="this.src='assets/country/pdi.png'">
                                    <span class="fe-nation-code">${getCountryCode(item.country)}</span>
                                    ${rankBadge}
                                </div>
                                <div class="fe-driver-team-mobile">${driverCar}</div>
                            </div>
                        </div>
                    </th>

                    <!-- 3. Equipo / Auto -->
                    <td class="fe-cell-team fe-hide-mobile">
                        <div class="fe-team-inner">
                            <div class="fe-car-crest">
                                <i class="fas fa-car-side"></i>
                            </div>
                            <span class="fe-team-label">${driverCar}</span>
                        </div>
                    </td>

                    <!-- 4. Desglose por Ronda -->
                    ${roundsCellsHtml}

                    <!-- 5. Puntos Totales (Formula E grande) -->
                    <td class="fe-cell-points">
                        <span class="fe-points-val">${item.total_points}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderRows(standings);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase().trim();
                const filtered = standings.filter(s => 
                    s.psn_id.toLowerCase().includes(q) || (s.country && s.country.toLowerCase().includes(q))
                );
                renderRows(filtered);
            });
        }

    } catch (e) {
        container.innerHTML = `
            <div class="container text-center py-5">
                <div class="fe-empty-state text-danger">
                    <i class="fas fa-exclamation-triangle fe-empty-icon text-danger"></i>
                    <h4 class="fw-bold">Error al cargar la clasificación</h4>
                    <p class="text-muted small mb-0">No se pudieron obtener los datos de la temporada.</p>
                </div>
            </div>
        `;
    }
}

// =======================================================
// 1. PÁGINA: RANKING GENERAL (ranking.html)
// =======================================================
async function setupRankingPage(seasons, activeSeason) {
    const mainSection = document.querySelector('.ranking-content') || document.querySelector('.contact-from-section') || document.querySelector('.resultados');
    if (!mainSection) return;

    let currentSeasonId = activeSeason.id;

    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === currentSeasonId ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    mainSection.innerHTML = `
        <!-- 1. Hero Header Block -->
        <div class="fe-header-block">
            <div class="container">
                <span class="fe-header-category">STANDINGS &bull; GT ACADEMY</span>
                <h1 class="fe-header-title">DRIVERS STANDINGS</h1>
                <p class="fe-header-desc">Clasificación oficial del campeonato general de pilotos de GT Academy con desglose de puntos por ronda y estadísticas completas.</p>
            </div>
        </div>

        <!-- 2. Filter & Navigation Bar -->
        <div class="fe-filter-bar">
            <div class="container d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div class="fe-nav-tabs">
                    <a href="resultados.html" class="fe-nav-tab" style="text-decoration: none;">
                        <i class="fas fa-flag-checkered me-1"></i> Race Results
                    </a>
                    <button class="fe-nav-tab active">
                        <i class="fas fa-trophy me-1"></i> Drivers Standings
                    </button>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="text-muted fw-bold small text-uppercase mb-0 d-none d-sm-inline">Temporada:</label>
                    <select id="seasonSelectRanking" class="form-select fe-season-dropdown">
                        ${seasonOptions}
                    </select>
                </div>
            </div>
        </div>

        <!-- 3. Standings Table Container -->
        <div id="feRankingTableContent"></div>
    `;

    const rankingTableContainer = document.getElementById('feRankingTableContent');
    const seasonSelect = document.getElementById('seasonSelectRanking');

    seasonSelect.addEventListener('change', (e) => {
        currentSeasonId = parseInt(e.target.value, 10);
        renderFormulaEStandingsTable(rankingTableContainer, currentSeasonId, seasons);
    });

    renderFormulaEStandingsTable(rankingTableContainer, currentSeasonId, seasons);
}

// -----------------------------------------------------------
// 2. RESULTADOS DE CARRERAS (DISEÑO INSPIRADO EN FIA FORMULA E)
// -----------------------------------------------------------
async function setupResultadosPage(seasons, activeSeason) {
    const mainSection = document.querySelector('.resultados');
    if (!mainSection) return;

    let currentSeasonId = activeSeason.id;
    let currentTab = 'races'; // 'races' | 'standings'
    let cachedRaces = [];
    let cachedStandings = [];
    let activeRaceIndex = 0;

    // Generar opciones de temporada
    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === currentSeasonId ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    // 1. Estructura base Formula E: Hero Header + Filter Bar + Round Ribbon + Content
    mainSection.innerHTML = `
        <!-- 1. Hero Header Block -->
        <div class="fe-header-block">
            <div class="container">
                <span class="fe-header-category">STANDINGS &bull; GT ACADEMY</span>
                <h1 class="fe-header-title">RESULTS &amp; STANDINGS</h1>
                <p class="fe-header-desc">Resultados oficiales de carreras, clasificación de pilotos y estadísticas en tiempo real de los torneos oficiales de GT Academy.</p>
            </div>
        </div>

        <!-- 2. Filter & Navigation Bar -->
        <div class="fe-filter-bar">
            <div class="container d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div class="fe-nav-tabs">
                    <button class="fe-nav-tab active" data-tab="races">
                        <i class="fas fa-flag-checkered me-1"></i> Race Results
                    </button>
                    <button class="fe-nav-tab" data-tab="standings">
                        <i class="fas fa-trophy me-1"></i> Drivers Standings
                    </button>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="text-muted fw-bold small text-uppercase mb-0 d-none d-sm-inline">Temporada:</label>
                    <select id="seasonSelectResultados" class="form-select fe-season-dropdown">
                        ${seasonOptions}
                    </select>
                </div>
            </div>
        </div>

        <!-- 3. Horizontal Round Ribbon (Race Results Only) -->
        <div class="fe-round-strip-wrapper" id="feRoundStripWrapper">
            <div class="container">
                <div class="fe-round-strip" id="feRoundStrip"></div>
            </div>
        </div>

        <!-- 4. Dynamic Content Area -->
        <div id="feDynamicContent"></div>
    `;

    const roundStripWrapper = document.getElementById('feRoundStripWrapper');
    const roundStrip = document.getElementById('feRoundStrip');
    const contentArea = document.getElementById('feDynamicContent');
    const navTabs = document.querySelectorAll('.fe-nav-tab');
    const seasonSelect = document.getElementById('seasonSelectResultados');

    // Tab switcher
    navTabs.forEach(tabBtn => {
        tabBtn.addEventListener('click', () => {
            const targetTab = tabBtn.getAttribute('data-tab');
            if (targetTab === currentTab) return;

            navTabs.forEach(b => b.classList.remove('active'));
            tabBtn.classList.add('active');
            currentTab = targetTab;

            if (currentTab === 'races') {
                roundStripWrapper.style.display = 'block';
                if (cachedRaces.length > 0) {
                    renderRoundStrip(cachedRaces);
                    renderRaceView(cachedRaces[activeRaceIndex]);
                } else {
                    loadRaces(currentSeasonId);
                }
            } else {
                roundStripWrapper.style.display = 'none';
                loadStandings(currentSeasonId);
            }
        });
    });

    // Cambio de temporada
    seasonSelect.addEventListener('change', (e) => {
        currentSeasonId = parseInt(e.target.value, 10);
        activeRaceIndex = 0;
        if (currentTab === 'races') {
            loadRaces(currentSeasonId);
        } else {
            loadStandings(currentSeasonId);
        }
    });

    // =======================================================
    // CARGAR CARRERAS (RACE RESULTS)
    // =======================================================
    async function loadRaces(seasonId) {
        contentArea.innerHTML = `
            <div class="container text-center py-5">
                <div class="fe-empty-state">
                    <i class="fas fa-spinner fa-spin fa-2x text-warning mb-3"></i>
                    <p class="text-muted mb-0">Cargando resultados de la temporada...</p>
                </div>
            </div>
        `;
        roundStrip.innerHTML = '';

        try {
            const resp = await fetch(`/api/seasons/${seasonId}/races`);
            cachedRaces = await resp.json();

            if (cachedRaces.length === 0) {
                roundStripWrapper.style.display = 'none';
                contentArea.innerHTML = `
                    <div class="container text-center py-5">
                        <div class="fe-empty-state">
                            <i class="fas fa-flag-checkered fe-empty-icon"></i>
                            <h4 class="text-dark fw-bold">No hay carreras registradas en esta temporada</h4>
                            <p class="text-muted small mb-0">Las carreras agregadas desde el panel administrativo aparecerán aquí.</p>
                        </div>
                    </div>
                `;
                return;
            }

            roundStripWrapper.style.display = 'block';
            if (activeRaceIndex >= cachedRaces.length) {
                activeRaceIndex = 0;
            }
            renderRoundStrip(cachedRaces);
            renderRaceView(cachedRaces[activeRaceIndex]);
        } catch (e) {
            contentArea.innerHTML = `
                <div class="container text-center py-5">
                    <div class="fe-empty-state text-danger">
                        <i class="fas fa-exclamation-triangle fe-empty-icon text-danger"></i>
                        <h4 class="fw-bold">Error de conexión</h4>
                        <p class="text-muted small mb-0">No se pudieron obtener las carreras desde el servidor.</p>
                    </div>
                </div>
            `;
        }
    }

    // Renderizar cinta horizontal de rondas
    function renderRoundStrip(races) {
        roundStrip.innerHTML = '';
        races.forEach((race, idx) => {
            const winner = (race.results && race.results[0]) ? race.results[0] : null;
            const flagCountry = (winner && winner.country) ? winner.country : 'pdi';
            const isActive = idx === activeRaceIndex;

            const tile = document.createElement('div');
            tile.className = `fe-round-tile ${isActive ? 'active' : ''}`;
            tile.innerHTML = `
                <div class="fe-round-tile-top">
                    <img src="assets/country/${flagCountry}.png" alt="${flagCountry}" class="fe-round-flag" onerror="this.src='assets/country/pdi.png'">
                    <span class="fe-round-num">RD ${String(race.round_number).padStart(2, '0')}</span>
                </div>
                <div class="fe-round-title-text" title="${race.title || 'Ronda ' + race.round_number}">${race.title || 'Ronda ' + race.round_number}</div>
                <div class="fe-round-car-text" title="${race.car}">${race.car}</div>
            `;

            tile.addEventListener('click', () => {
                activeRaceIndex = idx;
                roundStrip.querySelectorAll('.fe-round-tile').forEach(t => t.classList.remove('active'));
                tile.classList.add('active');
                renderRaceView(race);
            });

            roundStrip.appendChild(tile);
        });
    }

    // Renderizar la vista de la carrera activa
    function renderRaceView(race) {
        if (!race) return;

        let results = race.results || [];
        const winner = results[0] || null;
        const flagCountry = (winner && winner.country) ? winner.country : 'pdi';

        contentArea.innerHTML = `
            <!-- Overview de la sesión Formula E -->
            <div class="fe-session-header">
                <div class="container">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <p class="mb-1 text-uppercase fw-bold" style="font-size: 12px; letter-spacing: 1.5px; color: #f28123;">
                                <img src="assets/country/${flagCountry}.png" alt="${flagCountry}" style="width: 20px; height: 13px; vertical-align: -1px; margin-right: 6px; border-radius: 2px;" onerror="this.src='assets/country/pdi.png'">
                                RONDA ${String(race.round_number).padStart(2, '0')} &bull; ${race.track || 'CIRCUITO OFICIAL'}
                            </p>
                            <h2 class="fe-session-title mb-1">${race.title || 'RACE RESULTS'}</h2>
                            <div class="fe-session-meta">
                                <span class="fe-meta-tag highlight"><i class="fas fa-car-side"></i> ${race.car}</span>
                                <span class="fe-meta-tag"><i class="fas fa-users"></i> ${results.length} Pilotos</span>
                                ${race.race_date ? `<span class="fe-meta-tag"><i class="far fa-calendar-alt"></i> ${race.race_date}</span>` : ''}
                            </div>
                        </div>
                        <div>
                            <input type="text" id="feRaceSearch" class="form-control fe-search-box" placeholder="Buscar piloto o país...">
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabla de Cards Formula E -->
            <div class="container fe-table-container">
                <div class="table-responsive">
                    <table class="fe-table">
                        <thead>
                            <tr>
                                <th class="fe-cell-pos">POS</th>
                                <th class="fe-cell-driver">PILOTO</th>
                                <th class="fe-cell-team fe-hide-mobile">AUTO</th>
                                <th class="fe-cell-time fe-hide-mobile">TIEMPO / GAP</th>
                                <th class="fe-cell-points">PTS</th>
                            </tr>
                        </thead>
                        <tbody id="feRaceTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const tbody = document.getElementById('feRaceTableBody');
        const searchInput = document.getElementById('feRaceSearch');

        function renderRows(items) {
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="5" class="text-center py-5 text-muted">
                            <i class="fas fa-info-circle me-1"></i> No se encontraron pilotos para esta búsqueda.
                        </td>
                    </tr>
                `;
                return;
            }

            items.forEach(res => {
                let badgesHtml = '';
                if (res.is_pole) badgesHtml += `<span class="fe-tag-pole me-1">POLE</span>`;
                if (res.is_fastest_lap) badgesHtml += `<span class="fe-tag-fastest">FL</span>`;

                const tr = document.createElement('tr');
                tr.className = `fe-card-row ${res.position === 1 ? 'fe-row-p1' : ''}`;
                tr.innerHTML = `
                    <!-- 1. Posición + Delta -->
                    <td class="fe-cell-pos">
                        <span class="fe-pos-inner">
                            <span class="fe-pos-number">${res.position}</span>
                            ${getDeltaHtml(res.position)}
                        </span>
                    </td>

                    <!-- 2. Piloto (Avatar + Nombre + País + Badges) -->
                    <th scope="row" class="fe-cell-driver">
                        <div class="fe-driver-inner">
                            <div class="fe-driver-avatar">${getInitials(res.psn_id)}</div>
                            <div class="fe-driver-detail">
                                <span class="fe-driver-name">${res.psn_id}</span>
                                <div class="fe-driver-sub">
                                    <img src="assets/country/${res.country || 'pdi'}.png" alt="${res.country}" class="fe-driver-flag" onerror="this.src='assets/country/pdi.png'">
                                    <span class="fe-nation-code">${getCountryCode(res.country)}</span>
                                    ${badgesHtml}
                                </div>
                                <div class="fe-driver-team-mobile">${race.car}</div>
                            </div>
                        </div>
                    </th>

                    <!-- 3. Auto / Equipo -->
                    <td class="fe-cell-team">
                        <div class="fe-team-inner">
                            <div class="fe-car-crest">
                                <i class="fas fa-car-side"></i>
                            </div>
                            <span class="fe-team-label">${race.car}</span>
                        </div>
                    </td>

                    <!-- 4. Tiempo / Gap -->
                    <td class="fe-cell-time">
                        ${res.notes ? res.notes : (res.position === 1 ? 'LÍDER' : '—')}
                    </td>

                    <!-- 5. Puntos (Formula E pure large typography) -->
                    <td class="fe-cell-points">
                        <span class="fe-points-val">${res.points}</span>
                    </td>
                `;
                tbody.appendChild(tr);
            });
        }

        renderRows(results);

        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                const q = e.target.value.toLowerCase().trim();
                const filtered = results.filter(r => 
                    r.psn_id.toLowerCase().includes(q) || (r.country && r.country.toLowerCase().includes(q))
                );
                renderRows(filtered);
            });
        }
    }

    // =======================================================
    // CARGAR CLASIFICACIÓN GENERAL (DRIVERS STANDINGS)
    // =======================================================
    async function loadStandings(seasonId) {
        renderFormulaEStandingsTable(contentArea, seasonId, seasons);
    }

    // Carga inicial
    loadRaces(currentSeasonId);
}

// -----------------------------------------------------------
// TABLA DE RANGOS
// -----------------------------------------------------------
async function setupRangosPage() {
    try {
        const resp = await fetch('/api/drivers');
        if (!resp.ok) return;
        const drivers = await resp.json();

        const rankMap = {
            bronce: drivers.filter(d => d.rank === 'bronce'),
            plata: drivers.filter(d => d.rank === 'plata'),
            oro: drivers.filter(d => d.rank === 'oro'),
            platino: drivers.filter(d => d.rank === 'platino'),
            diamante: drivers.filter(d => d.rank === 'diamante')
        };

        const rankSections = document.querySelectorAll('.resultados h3');
        rankSections.forEach(h3 => {
            const txt = h3.innerText.toLowerCase();
            let matchedRank = null;
            if (txt.includes('bronce')) matchedRank = 'bronce';
            else if (txt.includes('plata')) matchedRank = 'plata';
            else if (txt.includes('oro')) matchedRank = 'oro';
            else if (txt.includes('platino')) matchedRank = 'platino';
            else if (txt.includes('diamante')) matchedRank = 'diamante';

            if (matchedRank) {
                const parentContainer = h3.closest('.container') || h3.parentNode;
                const tbody = parentContainer.querySelector('table tbody');
                if (tbody && rankMap[matchedRank]) {
                    tbody.innerHTML = '';
                    if (rankMap[matchedRank].length === 0) {
                        tbody.innerHTML = '<tr><td colspan="2" class="text-center text-muted py-2">Sin pilotos en este rango aún.</td></tr>';
                    } else {
                        rankMap[matchedRank].forEach(d => {
                            const tr = document.createElement('tr');
                            tr.innerHTML = `
                                <td class="text-center text-dark fw-bold">${d.psn_id}</td>
                                <td class="text-center">
                                    <img src="assets/country/${d.country}.png" alt="${d.country}" style="width: 27px; height: 20px;" loading="lazy" decoding="async" onerror="this.src='assets/country/pdi.png'">
                                </td>
                            `;
                            tbody.appendChild(tr);
                        });
                    }
                }
            }
        });
    } catch (e) {
        console.warn('No se pudo sincronizar rangos dinámicamente.');
    }
}
