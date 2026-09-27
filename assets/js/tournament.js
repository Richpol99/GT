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
// RANKING GENERAL
// -----------------------------------------------------------
async function setupRankingPage(seasons, activeSeason) {
    const tableContainer = document.querySelector('.resultados .container') || document.querySelector('.table-responsive');
    if (!tableContainer) return;

    // Insertar barra de controles interactiva
    const toolbar = document.createElement('div');
    toolbar.className = 'gt-toolbar mb-4';
    
    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === activeSeason.id ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    toolbar.innerHTML = `
        <div class="row align-items-center">
            <div class="col-md-6 mb-3 mb-md-0">
                <div class="input-group">
                    <span class="input-group-text" style="border-right: none; background: #f8fafc !important; border-color: #e2e8f0 !important; color: #f28123;"><i class="fas fa-search"></i></span>
                    <input type="text" id="rankingSearch" class="form-control gt-search-input" placeholder="Buscar piloto o país en tiempo real..." style="border-left: none;">
                </div>
            </div>
            <div class="col-md-6 text-md-end d-flex align-items-center justify-content-md-end">
                <label class="me-2 text-muted fw-bold small text-uppercase mb-0">Temporada:</label>
                <select id="seasonSelect" class="form-select gt-season-select" style="max-width: 220px;">
                    ${seasonOptions}
                </select>
            </div>
        </div>
    `;

    // Encontrar tabla existente
    const existingTable = document.querySelector('.table');
    if (existingTable && existingTable.parentNode) {
        existingTable.parentNode.insertBefore(toolbar, existingTable);
    }

    let standingsData = [];

    async function loadStandings(seasonId) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted"><i class="fas fa-spinner fa-spin me-2 text-warning"></i> Cargando clasificación...</td></tr>';

        try {
            const resp = await fetch(`/api/seasons/${seasonId}/standings`);
            standingsData = await resp.json();
            renderStandings(standingsData);
        } catch (e) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-danger">Error cargando clasificación.</td></tr>';
        }
    }

    function renderStandings(data) {
        const tbody = document.querySelector('.table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">No hay registros de puntos en esta temporada aún.</td></tr>';
            return;
        }

        data.forEach(item => {
            const tr = document.createElement('tr');
            
            // Icono de medalla para top 3
            let posDisplay = `<span class="badge rounded-pill bg-light text-dark border px-2 py-1">#${item.position}</span>`;
            let rowStyle = '';
            if (item.position === 1) {
                posDisplay = '<span class="badge rounded-pill px-3 py-1" style="background: linear-gradient(135deg, #fbbf24, #d97706); color: #000; font-weight: 800; font-size: 14px;">🥇 1</span>';
                rowStyle = 'background: rgba(251, 191, 36, 0.08);';
            } else if (item.position === 2) {
                posDisplay = '<span class="badge rounded-pill px-3 py-1" style="background: linear-gradient(135deg, #e2e8f0, #94a3b8); color: #000; font-weight: 800; font-size: 14px;">🥈 2</span>';
                rowStyle = 'background: rgba(203, 213, 225, 0.05);';
            } else if (item.position === 3) {
                posDisplay = '<span class="badge rounded-pill px-3 py-1" style="background: linear-gradient(135deg, #f97316, #c2410c); color: #fff; font-weight: 800; font-size: 14px;">🥉 3</span>';
                rowStyle = 'background: rgba(249, 115, 22, 0.05);';
            }

            if (rowStyle) tr.setAttribute('style', rowStyle);

            tr.innerHTML = `
                <td class="text-center fw-bold align-middle">${posDisplay}</td>
                <td class="text-center fw-bold text-dark align-middle" style="font-size: 15px;">${item.psn_id}</td>
                <td class="text-center align-middle">
                    <img src="assets/country/${item.country}.png" alt="${item.country}" class="gt-flag-img" loading="lazy" decoding="async" onerror="this.src='assets/country/pdi.png'">
                    <span class="ms-1 small text-muted text-uppercase">${item.country}</span>
                </td>
                <td class="text-center fw-bold align-middle">
                    <span class="gt-pts-badge">${item.total_points} PTS</span>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // Buscador interactivo
    document.getElementById('rankingSearch').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = standingsData.filter(d => 
            d.psn_id.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
        );
        renderStandings(filtered);
    });

    // Cambio de temporada
    document.getElementById('seasonSelect').addEventListener('change', (e) => {
        loadStandings(e.target.value);
    });

    // Carga inicial
    loadStandings(activeSeason.id);
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

    // Helper: Iniciales de piloto para el avatar
    function getInitials(name) {
        if (!name) return 'GT';
        const clean = name.replace(/[^a-zA-Z0-9]/g, '');
        return clean.substring(0, 2).toUpperCase() || 'GT';
    }

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

        contentArea.innerHTML = `
            <!-- Overview de la sesión -->
            <div class="fe-session-header">
                <div class="container">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="badge bg-dark text-white text-uppercase px-2 py-1" style="font-size: 11px; letter-spacing: 1px;">RONDA ${String(race.round_number).padStart(2, '0')}</span>
                            </div>
                            <h2 class="fe-session-title">${race.title || 'Ronda ' + race.round_number}</h2>
                            <div class="fe-session-meta">
                                <span class="fe-meta-tag highlight"><i class="fas fa-car-side"></i> ${race.car}</span>
                                <span class="fe-meta-tag"><i class="fas fa-map-marker-alt"></i> ${race.track || 'Circuito Oficial'}</span>
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

            <!-- Tabla Flotante Formula E -->
            <div class="container fe-table-container">
                <div class="table-responsive">
                    <table class="fe-table">
                        <thead>
                            <tr>
                                <th style="width: 70px; text-align: center;">POS</th>
                                <th>PILOTO</th>
                                <th class="fe-hide-mobile">AUTO</th>
                                <th class="fe-hide-mobile">TIEMPO / DETALLES</th>
                                <th style="text-align: right; width: 120px;">PUNTOS</th>
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
                let posClass = 'other';
                if (res.position === 1) posClass = 'p1';
                else if (res.position === 2) posClass = 'p2';
                else if (res.position === 3) posClass = 'p3';
                else if (res.position <= 10) posClass = 'top10';

                let badgesHtml = '';
                if (res.is_pole) badgesHtml += `<span class="fe-tag fe-tag-pole me-1">POLE</span>`;
                if (res.is_fastest_lap) badgesHtml += `<span class="fe-tag fe-tag-fastest">FL</span>`;

                const tr = document.createElement('tr');
                tr.className = `fe-row ${posClass}`;
                tr.innerHTML = `
                    <td class="text-center">
                        <div class="fe-pos-num">${res.position}</div>
                    </td>
                    <td>
                        <div class="fe-driver-cell">
                            <div class="fe-driver-avatar">${getInitials(res.psn_id)}</div>
                            <div class="fe-driver-details">
                                <div class="fe-driver-name">${res.psn_id}</div>
                                <div class="fe-driver-sub">
                                    <img src="assets/country/${res.country || 'pdi'}.png" alt="${res.country}" class="fe-round-flag" style="width: 18px; height: 12px;" onerror="this.src='assets/country/pdi.png'">
                                    <span class="text-uppercase">${res.country || 'PDI'}</span>
                                    ${badgesHtml}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="fe-car-cell">${race.car}</td>
                    <td class="fe-time-cell">
                        ${res.notes ? res.notes : '<span class="text-muted">—</span>'}
                    </td>
                    <td class="fe-points-cell">
                        <span class="fe-points-badge">+${res.points} PTS</span>
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
        contentArea.innerHTML = `
            <div class="container text-center py-5">
                <div class="fe-empty-state">
                    <i class="fas fa-spinner fa-spin fa-2x text-warning mb-3"></i>
                    <p class="text-muted mb-0">Cargando clasificación de pilotos...</p>
                </div>
            </div>
        `;

        try {
            const resp = await fetch(`/api/seasons/${seasonId}/standings`);
            cachedStandings = await resp.json();
            renderStandingsView(cachedStandings);
        } catch (e) {
            contentArea.innerHTML = `
                <div class="container text-center py-5">
                    <div class="fe-empty-state text-danger">
                        <i class="fas fa-exclamation-triangle fe-empty-icon text-danger"></i>
                        <h4 class="fw-bold">Error de conexión</h4>
                        <p class="text-muted small mb-0">No se pudo cargar la tabla de clasificación.</p>
                    </div>
                </div>
            `;
        }
    }

    // Renderizar la vista de clasificación
    function renderStandingsView(standings) {
        contentArea.innerHTML = `
            <div class="fe-session-header">
                <div class="container">
                    <div class="d-flex align-items-center justify-content-between flex-wrap gap-3">
                        <div>
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <span class="badge bg-warning text-dark text-uppercase px-2 py-1" style="font-size: 11px; letter-spacing: 1px; font-weight: 800;">CAMPEONATO GENERAL</span>
                            </div>
                            <h2 class="fe-session-title">DRIVERS STANDINGS</h2>
                            <div class="fe-session-meta">
                                <span class="fe-meta-tag highlight"><i class="fas fa-trophy"></i> Temporada Oficial</span>
                                <span class="fe-meta-tag"><i class="fas fa-users"></i> ${standings.length} Pilotos con puntos</span>
                            </div>
                        </div>
                        <div>
                            <input type="text" id="feStandingsSearch" class="form-control fe-search-box" placeholder="Buscar piloto o país...">
                        </div>
                    </div>
                </div>
            </div>

            <div class="container fe-table-container">
                <div class="table-responsive">
                    <table class="fe-table">
                        <thead>
                            <tr>
                                <th style="width: 70px; text-align: center;">POS</th>
                                <th>PILOTO</th>
                                <th class="text-center">PAÍS</th>
                                <th class="text-center fe-hide-mobile">CARRERAS</th>
                                <th class="text-center fe-hide-mobile">VICTORIAS</th>
                                <th class="text-center fe-hide-mobile">PODIOS</th>
                                <th style="text-align: right; width: 130px;">TOTAL PTS</th>
                            </tr>
                        </thead>
                        <tbody id="feStandingsTableBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const tbody = document.getElementById('feStandingsTableBody');
        const searchInput = document.getElementById('feStandingsSearch');

        function renderRows(items) {
            tbody.innerHTML = '';
            if (items.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center py-5 text-muted">
                            <i class="fas fa-info-circle me-1"></i> No hay pilotos registrados con puntos aún.
                        </td>
                    </tr>
                `;
                return;
            }

            items.forEach(item => {
                let posClass = 'other';
                if (item.position === 1) posClass = 'p1';
                else if (item.position === 2) posClass = 'p2';
                else if (item.position === 3) posClass = 'p3';
                else if (item.position <= 10) posClass = 'top10';

                let rankBadge = '';
                if (item.rank) {
                    rankBadge = `<span class="fe-rank-badge fe-rank-${item.rank}">${item.rank}</span>`;
                }

                const tr = document.createElement('tr');
                tr.className = `fe-row ${posClass}`;
                tr.innerHTML = `
                    <td class="text-center">
                        <div class="fe-pos-num">${item.position}</div>
                    </td>
                    <td>
                        <div class="fe-driver-cell">
                            <div class="fe-driver-avatar">${getInitials(item.psn_id)}</div>
                            <div class="fe-driver-details">
                                <div class="fe-driver-name">${item.psn_id}</div>
                                <div class="fe-driver-sub">
                                    ${rankBadge}
                                </div>
                            </div>
                        </div>
                    </td>
                    <td class="text-center">
                        <div class="d-inline-flex align-items-center gap-1">
                            <img src="assets/country/${item.country || 'pdi'}.png" alt="${item.country}" class="fe-round-flag" style="width: 20px; height: 13px;" onerror="this.src='assets/country/pdi.png'">
                            <span class="small text-uppercase fw-bold text-muted">${item.country || 'PDI'}</span>
                        </div>
                    </td>
                    <td class="fe-stat-cell fe-hide-mobile">${item.races_completed || 0}</td>
                    <td class="fe-stat-cell fe-hide-mobile ${item.wins > 0 ? 'fe-stat-win' : ''}">
                        ${item.wins > 0 ? `<i class="fas fa-trophy me-1 text-warning"></i>${item.wins}` : '0'}
                    </td>
                    <td class="fe-stat-cell fe-hide-mobile">
                        ${item.podiums > 0 ? `<i class="fas fa-medal me-1 text-warning"></i>${item.podiums}` : '0'}
                    </td>
                    <td class="fe-points-cell">
                        <span class="fe-points-badge">${item.total_points} PTS</span>
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
