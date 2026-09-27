// GT Academy - FIA WEC / Le Mans Telemetry Frontend Integration
document.addEventListener('DOMContentLoaded', async () => {
    const isPaddockPage = window.location.pathname.includes('paddock') || !!document.getElementById('paddock-grid');
    const isRankingPage = window.location.pathname.includes('ranking') || !!document.querySelector('.ranking-content');
    const isResultadosPage = window.location.pathname.includes('resultados') || !!document.querySelector('.resultados-page');
    const isRangosPage = window.location.pathname.includes('rangos');

    if (!isRankingPage && !isResultadosPage && !isRangosPage && !isPaddockPage) {
        return;
    }

    // =======================================================
    // 4. PÁGINA: PADDOCK OFICIAL DE PILOTOS (paddock.html)
    // =======================================================
    if (isPaddockPage) {
        setupPaddockPage();
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
// HELPERS COMPARTIDOS FIA WEC TELEMETRY
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

function getCategoryBadge(pos, rank) {
    if (pos === 1) return '<span class="wec-badge wec-badge-category">GT-PRO</span>';
    if (rank === 'platino' || rank === 'diamante' || rank === 'oro') {
        return '<span class="wec-badge wec-badge-category">GT-PRO</span>';
    }
    return '<span class="wec-badge wec-badge-rank">GT-CUP</span>';
}

// -----------------------------------------------------------
// HELPERS CAR BRAND LOGOS PACK
// -----------------------------------------------------------
const carBrandsList = [
    { key: 'ford', name: 'Ford', match: ['ford'] },
    { key: 'ferrari', name: 'Ferrari', match: ['ferrari'] },
    { key: 'nissan', name: 'Nissan', match: ['nissan', 'nisan', 'nismo'] },
    { key: 'porsche', name: 'Porsche', match: ['porsche'] },
    { key: 'toyota', name: 'Toyota', match: ['toyota', 'gazoo', 'supra', 'yaris', 'celica'] },
    { key: 'honda', name: 'Honda', match: ['honda', 'mugen', 'nsx', 'civic', 's2000'] },
    { key: 'bmw', name: 'BMW', match: ['bmw'] },
    { key: 'mercedes-benz', name: 'Mercedes-Benz', match: ['mercedes', 'benz', 'amg'] },
    { key: 'audi', name: 'Audi', match: ['audi'] },
    { key: 'chevrolet', name: 'Chevrolet', match: ['chevrolet', 'chevy', 'corvette', 'camaro'] },
    { key: 'lamborghini', name: 'Lamborghini', match: ['lamborghini', 'lambo'] },
    { key: 'aston-martin', name: 'Aston Martin', match: ['aston', 'martin', 'aston-martin'] },
    { key: 'mclaren', name: 'McLaren', match: ['mclaren'] },
    { key: 'subaru', name: 'Subaru', match: ['subaru', 'sti', 'impreza', 'brz'] },
    { key: 'mazda', name: 'Mazda', match: ['mazda', 'miata', 'rx7', 'rx-7', 'rx8', 'rx-8'] },
    { key: 'mitsubishi', name: 'Mitsubishi', match: ['mitsubishi', 'lancer', 'evo'] },
    { key: 'dodge', name: 'Dodge', match: ['dodge', 'viper', 'charger', 'challenger', 'hellcat'] },
    { key: 'alfa-romeo', name: 'Alfa Romeo', match: ['alfa', 'romeo', 'alfa-romeo', 'alfaromeo'] },
    { key: 'renault', name: 'Renault', match: ['renault', 'megane', 'clio'] },
    { key: 'peugeot', name: 'Peugeot', match: ['peugeot'] },
    { key: 'volkswagen', name: 'Volkswagen', match: ['volkswagen', 'vw', 'golf', 'scirocco', 'beetle'] },
    { key: 'alpine', name: 'Alpine', match: ['alpine'] },
    { key: 'bugatti', name: 'Bugatti', match: ['bugatti', 'veyron', 'chiron'] },
    { key: 'lexus', name: 'Lexus', match: ['lexus'] },
    { key: 'jaguar', name: 'Jaguar', match: ['jaguar'] },
    { key: 'genesis', name: 'Genesis', match: ['genesis'] },
    { key: 'suzuki', name: 'Suzuki', match: ['suzuki', 'swift'] },
    { key: 'hyundai', name: 'Hyundai', match: ['hyundai'] },
    { key: 'tesla', name: 'Tesla', match: ['tesla'] },
    { key: 'lotus', name: 'Lotus', match: ['lotus', 'elise', 'exige', 'evora'] },
    { key: 'maserati', name: 'Maserati', match: ['maserati'] },
    { key: 'acura', name: 'Acura', match: ['acura'] },
    { key: 'infiniti', name: 'Infiniti', match: ['infiniti'] },
    { key: 'cadillac', name: 'Cadillac', match: ['cadillac'] },
    { key: 'bentley', name: 'Bentley', match: ['bentley'] },
    { key: 'mini', name: 'MINI', match: ['mini', 'cooper'] },
    { key: 'volvo', name: 'Volvo', match: ['volvo'] },
    { key: 'fiat', name: 'Fiat', match: ['fiat', 'abarth'] }
];

function getCarBrandBadge(carString) {
    if (!carString) {
        return `<img src="assets/brands/default-car.svg" alt="Car" class="wec-brand-logo" onerror="this.style.display='none'">`;
    }
    const clean = carString.toLowerCase().replace(/[^a-z0-9]/g, ' ');
    const words = clean.split(/\s+/).filter(Boolean);
    
    for (const b of carBrandsList) {
        for (const pattern of b.match) {
            if (words.includes(pattern) || clean.includes(pattern)) {
                return `<img src="assets/brands/${b.key}.svg" alt="${b.name}" title="${b.name}" class="wec-brand-logo" onerror="this.onerror=null;this.src='assets/brands/default-car.svg'">`;
            }
        }
    }
    
    return `<img src="assets/brands/default-car.svg" alt="Car" class="wec-brand-logo">`;
}

// -----------------------------------------------------------
// HELPERS GRAN TURISMO 6 CAR IMAGES
// -----------------------------------------------------------
const carImagesMap = [
    { match: ['ford gt', 'gt 2006', 'gt 06', 'ford gt 2006'], file: 'ford_gt_2006.jpg' },
    { match: ['enzo', 'ferrari enzo', 'enzo ferrari'], file: 'ferrari_enzo_2002.jpg' },
    { match: ['gt-r nismo', 'gtr nismo', 'nismo 2014', 'gt-r 2014', 'r35'], file: 'nissan_gtr_nismo_2014.jpg' },
    { match: ['f40', 'ferrari f40'], file: 'ferrari_f40_1992.jpg' },
    { match: ['mustang', 'boss 302', 'mustang boss'], file: 'ford_mustang_boss_302_2013.jpg' },
    { match: ['fairlady', 'fayrlady', 'z34', '370z'], file: 'nissan_fairlady_z_z34_2008.jpg' },
    { match: ['250 gt', '250gt', 'passo corto'], file: 'ferrari_250_gt_1961.jpg' },
    { match: ['focus st', 'focus 2013'], file: 'ford_focus_st_2013.jpg' }
];

function getCarImageUrl(carString) {
    if (!carString) return 'assets/cars/default.jpg';
    const clean = carString.toLowerCase();
    for (const c of carImagesMap) {
        for (const pattern of c.match) {
            if (clean.includes(pattern)) {
                return `assets/cars/${c.file}`;
            }
        }
    }
    return 'assets/cars/default.jpg';
}

const getCarImage = getCarImageUrl;

// =======================================================
// RENDERIZADOR FIA WEC: TABLA DE CLASIFICACIÓN GENERAL
// =======================================================
async function renderWECStandingsTable(container, seasonId, seasons) {
    container.innerHTML = `
        <div class="container text-center py-5">
            <div class="wec-empty-state">
                <i class="fas fa-spinner fa-spin fa-2x text-info mb-3"></i>
                <p class="text-muted mb-0">Cargando clasificación oficial FIA WEC...</p>
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
                    <div class="wec-empty-state">
                        <i class="fas fa-trophy wec-empty-icon text-muted"></i>
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
                <th class="th-round" title="${r.title || 'Ronda ' + r.round_number}">
                    R${String(r.round_number).padStart(2, '0')}
                </th>
            `;
        });

        container.innerHTML = `
            <div class="container my-4">
                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div class="text-muted small">
                        <i class="fas fa-trophy text-warning me-1"></i> <strong class="text-dark">Clasificación General</strong> &bull; <span class="font-monospace">${races.length} Rondas &bull; ${standings.length} Pilotos</span>
                    </div>
                    <div>
                        <input type="text" id="wecStandingsSearch" class="wec-search-box" placeholder="Buscar piloto o país...">
                    </div>
                </div>

                <!-- Tabla de Clasificación Matriz WEC -->
                <div class="wec-standings-scroll">
                    <table class="wec-table">
                        <thead>
                            <tr>
                                <th class="th-pos">POS</th>
                                <th class="th-driver">PILOTO</th>
                                <th class="th-car d-none d-md-table-cell">AUTO / CATEGORÍA</th>
                                ${roundHeadersHtml}
                                <th class="th-pts">TOTAL PTS</th>
                            </tr>
                        </thead>
                        <tbody id="wecStandingsRowsBody"></tbody>
                    </table>
                </div>
            </div>
        `;

        const tbody = document.getElementById('wecStandingsRowsBody');
        const searchInput = document.getElementById('wecStandingsSearch');

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
                const driverCar = driverCarMap[item.driver_id] || 'GT CUP';

                // Generar celdas por ronda
                let roundsCellsHtml = '';
                races.forEach(r => {
                    const rData = driverRoundMap[item.driver_id] ? driverRoundMap[item.driver_id][r.round_number] : null;
                    if (rData) {
                        let tagsHtml = '';
                        if (rData.is_pole) tagsHtml += '<span class="badge bg-danger text-white me-1" style="font-size: 8px;">P</span>';
                        if (rData.is_fl) tagsHtml += '<span class="badge bg-purple text-white" style="font-size: 8px; background: #7c3aed;">FL</span>';

                        roundsCellsHtml += `
                            <td class="wec-cell-round">
                                <span class="wec-round-pts-val">${rData.points}</span>
                                <span class="wec-round-pos-sub">P${rData.position}</span>
                                ${tagsHtml ? `<div class="mt-1">${tagsHtml}</div>` : ''}
                            </td>
                        `;
                    } else {
                        roundsCellsHtml += `
                            <td class="wec-cell-round wec-round-empty">
                                <span>—</span>
                            </td>
                        `;
                    }
                });

                const tr = document.createElement('tr');
                tr.className = item.position === 1 ? 'row-p1' : '';
                tr.innerHTML = `
                    <!-- 1. Posición WEC -->
                    <td class="wec-cell-pos">
                        <span class="wec-pos-tag">P${item.position}</span>
                    </td>

                    <!-- 2. Piloto (Bandera + Nombre + Badges) -->
                    <td>
                        <div class="wec-cell-driver">
                            <img src="assets/country/${item.country || 'pdi'}.png" alt="${item.country}" class="wec-driver-flag" onerror="this.src='assets/country/pdi.png'">
                            <div class="wec-driver-info">
                                <span class="wec-driver-name">${item.psn_id}</span>
                                <div class="wec-driver-badges">
                                    <span class="wec-badge wec-badge-rank">${getCountryCode(item.country)}</span>
                                    ${item.rank ? `<span class="wec-badge wec-badge-rank">${item.rank.toUpperCase()}</span>` : ''}
                                    ${getCategoryBadge(item.position, item.rank)}
                                </div>
                            </div>
                        </div>
                    </td>

                    <!-- 3. Auto / Categoría con Logo Real de Marca -->
                    <td class="wec-cell-car d-none d-md-table-cell">
                        <span class="wec-cell-car-inner">
                            ${getCarBrandBadge(driverCar)}
                            <span>${driverCar}</span>
                        </span>
                    </td>

                    <!-- 4. Desglose de Rondas -->
                    ${roundsCellsHtml}

                    <!-- 5. Total de Puntos -->
                    <td class="wec-cell-total-pts">
                        <span class="wec-total-pts-tag">${item.total_points} PTS</span>
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
        console.error('Error al cargar la clasificación:', e);
        container.innerHTML = `
            <div class="container text-center py-5">
                <div class="wec-empty-state text-danger">
                    <i class="fas fa-exclamation-triangle wec-empty-icon text-danger"></i>
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
        <!-- Filter & Navigation Bar -->
        <div class="wec-filter-bar">
            <div class="container d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div class="wec-nav-tabs">
                    <a href="resultados.html" class="wec-nav-tab" style="text-decoration: none;">
                        <i class="fas fa-flag-checkered"></i> Race Results
                    </a>
                    <button class="wec-nav-tab active">
                        <i class="fas fa-trophy"></i> Drivers Standings
                    </button>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="text-muted fw-bold small text-uppercase mb-0 d-none d-sm-inline">Temporada:</label>
                    <select id="seasonSelectRanking" class="form-select wec-season-dropdown">
                        ${seasonOptions}
                    </select>
                </div>
            </div>
        </div>

        <!-- Contenedor de la Tabla -->
        <div id="wecRankingTableContent"></div>
    `;

    const rankingTableContainer = document.getElementById('wecRankingTableContent');
    const seasonSelect = document.getElementById('seasonSelectRanking');

    seasonSelect.addEventListener('change', (e) => {
        currentSeasonId = parseInt(e.target.value, 10);
        renderWECStandingsTable(rankingTableContainer, currentSeasonId, seasons);
    });

    renderWECStandingsTable(rankingTableContainer, currentSeasonId, seasons);
}

// -----------------------------------------------------------
// 2. RESULTADOS DE CARRERAS (FIA WEC TELEMETRY DASHBOARD)
// -----------------------------------------------------------
async function setupResultadosPage(seasons, activeSeason) {
    const mainSection = document.querySelector('.resultados');
    if (!mainSection) return;

    let currentSeasonId = activeSeason.id;
    let currentTab = 'races'; // 'races' | 'standings'
    let cachedRaces = [];
    let activeRaceIndex = 0;

    // Generar opciones de temporada
    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === currentSeasonId ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    // Estructura base FIA WEC
    mainSection.innerHTML = `
        <!-- Filter & Navigation Bar -->
        <div class="wec-filter-bar">
            <div class="container d-flex flex-wrap align-items-center justify-content-between gap-3">
                <div class="wec-nav-tabs">
                    <button class="wec-nav-tab active" data-tab="races">
                        <i class="fas fa-flag-checkered"></i> Race Results
                    </button>
                    <button class="wec-nav-tab" data-tab="standings">
                        <i class="fas fa-trophy"></i> Drivers Standings
                    </button>
                </div>
                <div class="d-flex align-items-center gap-2">
                    <label class="text-muted fw-bold small text-uppercase mb-0 d-none d-sm-inline">Temporada:</label>
                    <select id="seasonSelectResultados" class="form-select wec-season-dropdown">
                        ${seasonOptions}
                    </select>
                </div>
            </div>
        </div>

        <!-- Horizontal Round Ribbon -->
        <div class="wec-round-strip-wrapper" id="wecRoundStripWrapper">
            <div class="container">
                <div class="wec-round-strip" id="wecRoundStrip"></div>
            </div>
        </div>

        <!-- Dynamic Content Area -->
        <div id="wecDynamicContent"></div>
    `;

    const roundStripWrapper = document.getElementById('wecRoundStripWrapper');
    const roundStrip = document.getElementById('wecRoundStrip');
    const contentArea = document.getElementById('wecDynamicContent');
    const navTabs = document.querySelectorAll('.wec-nav-tab');
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
                <div class="wec-empty-state">
                    <i class="fas fa-spinner fa-spin fa-2x text-info mb-3"></i>
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
                        <div class="wec-empty-state">
                            <i class="fas fa-flag-checkered wec-empty-icon"></i>
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
            console.error('Error cargando carreras:', e);
            contentArea.innerHTML = `
                <div class="container text-center py-5">
                    <div class="wec-empty-state text-danger">
                        <i class="fas fa-exclamation-triangle wec-empty-icon text-danger"></i>
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
            tile.className = `wec-round-tile ${isActive ? 'active' : ''}`;
            tile.innerHTML = `
                <div class="wec-round-tile-top">
                    <span class="wec-round-num">ROUND ${String(race.round_number).padStart(2, '0')}</span>
                    <img src="assets/country/${flagCountry}.png" alt="${flagCountry}" class="wec-round-flag" onerror="this.src='assets/country/pdi.png'">
                </div>
                <div class="wec-round-title-text" title="${race.title || 'Ronda ' + race.round_number}">${race.title || 'Ronda ' + race.round_number}</div>
                <div class="wec-round-car-text" title="${race.car}">
                    ${getCarBrandBadge(race.car)}
                    <span>${race.car}</span>
                </div>
            `;

            tile.addEventListener('click', () => {
                activeRaceIndex = idx;
                roundStrip.querySelectorAll('.wec-round-tile').forEach(t => t.classList.remove('active'));
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
            <div class="container my-4">
                <!-- Tarjeta Destacada de Auto Oficial Gran Turismo 6 -->
                <div class="wec-machine-card">
                    <div class="wec-machine-card-content">
                        <div class="wec-machine-info">
                            <div class="wec-machine-badge">
                                ${getCarBrandBadge(race.car)}
                                <span>VEHÍCULO OFICIAL GRAN TURISMO 6</span>
                            </div>
                            <h2 class="wec-machine-title">${race.car}</h2>
                            <div class="wec-machine-meta">
                                <span><i class="fas fa-flag-checkered text-warning me-1"></i> Ronda ${race.round_number}: ${race.title || 'Gran Premio'}</span>
                                <span><i class="fas fa-map-marker-alt text-danger me-1"></i> ${race.track || 'Circuito Oficial'}</span>
                                <span><i class="fas fa-users text-primary me-1"></i> ${results.length} Pilotos en parrilla</span>
                            </div>
                        </div>
                        <div class="wec-machine-image-wrap">
                            <img src="${getCarImageUrl(race.car)}" alt="${race.car}" class="wec-machine-image" onerror="this.style.display='none'">
                        </div>
                    </div>
                </div>

                <div class="d-flex justify-content-between align-items-center flex-wrap gap-2 mb-3">
                    <div class="text-muted small">
                        <i class="fas fa-list-ol text-warning me-1"></i> <strong>Resultados Oficiales &bull; Ronda ${race.round_number}</strong>
                    </div>
                    <div>
                        <input type="text" id="wecRaceSearch" class="wec-search-box" placeholder="Buscar piloto o país...">
                    </div>
                </div>

                <!-- Lista de Filas Telemetría WEC -->
                <div class="wec-rows-container" id="wecRaceRowsContainer"></div>
            </div>
        `;

        const rowsContainer = document.getElementById('wecRaceRowsContainer');
        const searchInput = document.getElementById('wecRaceSearch');

        function renderRows(items) {
            rowsContainer.innerHTML = '';
            if (items.length === 0) {
                rowsContainer.innerHTML = `
                    <div class="text-center py-5 text-muted wec-empty-state">
                        <i class="fas fa-info-circle me-1"></i> No se encontraron pilotos para esta búsqueda.
                    </div>
                `;
                return;
            }

            items.forEach(res => {
                let badgesHtml = '';
                if (res.is_pole) badgesHtml += `<span class="wec-badge wec-badge-pole">POLE</span>`;
                if (res.is_fastest_lap) badgesHtml += `<span class="wec-badge wec-badge-fl">FL</span>`;
                if (res.rank) badgesHtml += `<span class="wec-badge wec-badge-rank">${res.rank.toUpperCase()}</span>`;
                badgesHtml += getCategoryBadge(res.position, res.rank);

                const rowDiv = document.createElement('div');
                rowDiv.className = `wec-row ${res.position === 1 ? 'p1' : (res.position === 2 ? 'p2' : (res.position === 3 ? 'p3' : ''))}`;

                // Telemetría / Tiempo / GAP
                let telemetryHtml = '';
                if (res.position === 1) {
                    telemetryHtml = `<div class="wec-telemetry-col leader"><i class="fas fa-flag-checkered me-1"></i> LÍDER ${res.notes ? '&bull; ' + res.notes : ''}</div>`;
                } else {
                    const gapText = res.notes ? res.notes : '+ GAP';
                    telemetryHtml = `<div class="wec-telemetry-col">${gapText}</div>`;
                }

                rowDiv.innerHTML = `
                    <!-- 1. Posición WEC -->
                    <div class="wec-pos">P${res.position}</div>

                    <!-- 2. Piloto (Bandera + Nombre + Badges) -->
                    <div class="wec-driver-col">
                        <img src="assets/country/${res.country || 'pdi'}.png" alt="${res.country}" class="wec-driver-flag" onerror="this.src='assets/country/pdi.png'">
                        <div class="wec-driver-info">
                            <span class="wec-driver-name">${res.psn_id}</span>
                            <div class="wec-driver-badges">
                                <span class="wec-badge wec-badge-rank">${getCountryCode(res.country)}</span>
                                ${badgesHtml}
                            </div>
                        </div>
                    </div>

                    <!-- 3. Auto / Vehículo con Logo Real de Marca -->
                    <div class="wec-car-col">
                        ${getCarBrandBadge(race.car)}
                        <span>${race.car}</span>
                    </div>

                    <!-- 4. Telemetría / Brecha al Líder -->
                    ${telemetryHtml}

                    <!-- 5. Puntos -->
                    <div class="wec-pts-col">
                        <span class="wec-pts-badge">+${res.points} PTS</span>
                    </div>
                `;
                rowsContainer.appendChild(rowDiv);
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
        renderWECStandingsTable(contentArea, seasonId, seasons);
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

// -----------------------------------------------------------
// 4. PÁGINA: PADDOCK OFICIAL DE PILOTOS (paddock.html)
// -----------------------------------------------------------
async function setupPaddockPage() {
    const paddockGrid = document.getElementById('paddock-grid');
    const searchInput = document.getElementById('paddock-search');
    const filterBtns = document.querySelectorAll('.paddock-filter-btn');
    const countNum = document.getElementById('paddock-count-num');
    const modalBackdrop = document.getElementById('gt6-driver-modal');
    const modalCloseBtn = document.getElementById('modal-close-btn');

    if (!paddockGrid) return;

    let allDrivers = [];
    let currentSort = 'points';
    let searchQuery = '';

    try {
        const resp = await fetch('/api/paddock');
        if (!resp.ok) throw new Error('Error al consultar /api/paddock');
        allDrivers = await resp.json();
    } catch (err) {
        console.error('Error cargando paddock:', err);
        paddockGrid.innerHTML = `
            <div class="col-12 text-center py-5">
                <div class="wec-empty-state">
                    <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                    <p class="text-white mb-2">No se pudo cargar la parrilla de pilotos.</p>
                    <button class="btn btn-outline-info btn-sm mt-2" onclick="location.reload()">Reintentar</button>
                </div>
            </div>
        `;
        return;
    }

    function getSortedDrivers(drivers) {
        const list = [...drivers];
        if (currentSort === 'points') {
            list.sort((a, b) => (b.total_points - a.total_points) || (b.wins - a.wins) || (b.podiums - a.podiums) || a.psn_id.localeCompare(b.psn_id));
        } else if (currentSort === 'wins') {
            list.sort((a, b) => (b.wins - a.wins) || (b.podiums - a.podiums) || (b.total_points - a.total_points) || a.psn_id.localeCompare(b.psn_id));
        } else if (currentSort === 'podiums') {
            list.sort((a, b) => (b.podiums - a.podiums) || (b.wins - a.wins) || (b.total_points - a.total_points) || a.psn_id.localeCompare(b.psn_id));
        } else if (currentSort === 'name') {
            list.sort((a, b) => a.psn_id.localeCompare(b.psn_id));
        }
        return list;
    }

    function renderGrid() {
        let filtered = allDrivers.filter(d => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return d.psn_id.toLowerCase().includes(q) || (d.country && d.country.toLowerCase().includes(q));
        });

        const sorted = getSortedDrivers(filtered);
        if (countNum) countNum.textContent = sorted.length;

        if (sorted.length === 0) {
            paddockGrid.innerHTML = `
                <div class="col-12 text-center py-5" style="grid-column: 1 / -1;">
                    <div class="wec-empty-state">
                        <i class="fas fa-search fa-2x text-muted mb-3"></i>
                        <p class="text-muted mb-0">No se encontraron pilotos con el criterio de búsqueda.</p>
                    </div>
                </div>
            `;
            return;
        }

        paddockGrid.innerHTML = '';
        sorted.forEach(d => {
            const card = document.createElement('div');
            card.className = 'gt6-driver-card';

            const country = d.country || 'pdi';
            const cCode = getCountryCode(country);
            const signatureCar = d.signature_car || "Ford GT 2006";
            const carImg = getCarImage(signatureCar);
            const brandBadge = getCarBrandBadge(signatureCar);
            const polesAndFastest = (d.poles || 0) + (d.fastest_laps || 0);

            card.innerHTML = `
                <div class="gt6-card-header">
                    <div class="gt6-driver-identity">
                        <img src="assets/country/${country}.png" alt="${country}" class="gt6-driver-flag" loading="lazy" decoding="async" onerror="this.src='assets/country/pdi.png'">
                        <div>
                            <div class="gt6-driver-name" title="${d.psn_id}">${d.psn_id}</div>
                            <span class="gt6-country-badge">${cCode}</span>
                        </div>
                    </div>
                    <span class="gt6-pilot-tag">GT6 PILOT</span>
                </div>

                <div class="gt6-card-machine">
                    <img src="${carImg}" alt="${signatureCar}" class="gt6-card-machine-bg" loading="lazy" decoding="async">
                    <div class="gt6-card-machine-overlay"></div>
                    <div class="gt6-card-machine-info">
                        ${brandBadge}
                        <div class="gt6-machine-name" title="${signatureCar}">${signatureCar}</div>
                    </div>
                </div>

                <div class="gt6-card-stats">
                    <div class="gt6-stat-cell">
                        <span class="gt6-stat-label"><i class="fas fa-trophy text-warning"></i> Victorias</span>
                        <span class="gt6-stat-value gold">${d.wins || 0}</span>
                    </div>
                    <div class="gt6-stat-cell">
                        <span class="gt6-stat-label"><i class="fas fa-medal text-info"></i> Podios</span>
                        <span class="gt6-stat-value silver">${d.podiums || 0}</span>
                    </div>
                    <div class="gt6-stat-cell">
                        <span class="gt6-stat-label"><i class="fas fa-stopwatch text-muted"></i> Poles / VR</span>
                        <span class="gt6-stat-value">${polesAndFastest}</span>
                    </div>
                    <div class="gt6-stat-cell">
                        <span class="gt6-stat-label"><i class="fas fa-bolt text-info"></i> Puntos</span>
                        <span class="gt6-stat-value cyan">${d.total_points || 0}</span>
                    </div>
                </div>

                <div class="gt6-card-footer">
                    <span class="gt6-card-races-count">${d.races_count || 0} Carreras</span>
                    <button type="button" class="gt6-btn-palmares" data-psn="${encodeURIComponent(d.psn_id)}">
                        <i class="fas fa-chart-line"></i> Palmarés
                    </button>
                </div>
            `;
            paddockGrid.appendChild(card);
        });

        // Event listener for Palmarés buttons
        paddockGrid.querySelectorAll('.gt6-btn-palmares').forEach(btn => {
            btn.addEventListener('click', () => {
                const psn = decodeURIComponent(btn.dataset.psn);
                openDriverModal(psn);
            });
        });
    }

    // Filter and search handlers
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value.trim();
            renderGrid();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSort = btn.dataset.sort;
            renderGrid();
        });
    });

    // Modal logic
    async function openDriverModal(psnId) {
        if (!modalBackdrop) return;
        const modalDriverName = document.getElementById('modal-driver-name');
        const modalDriverFlag = document.getElementById('modal-driver-flag');
        const modalDriverCountry = document.getElementById('modal-driver-country');
        const modalDriverBody = document.getElementById('modal-driver-body');

        modalDriverName.textContent = psnId;
        modalDriverBody.innerHTML = `
            <div class="text-center py-4">
                <i class="fas fa-spinner fa-spin fa-2x text-info mb-2"></i>
                <p class="text-muted">Cargando palmarés de ${psnId}...</p>
            </div>
        `;

        modalBackdrop.classList.add('show');
        modalBackdrop.setAttribute('aria-hidden', 'false');

        try {
            const resp = await fetch(`/api/drivers/${encodeURIComponent(psnId)}`);
            if (!resp.ok) throw new Error('Error al cargar perfil');
            const driver = await resp.json();

            const country = driver.country || 'pdi';
            modalDriverFlag.src = `assets/country/${country}.png`;
            modalDriverCountry.textContent = getCountryCode(country);

            const history = driver.history || [];
            const totalRaces = history.length;
            const totalWins = history.filter(h => h.position === 1).length;
            const totalPodiums = history.filter(h => h.position >= 1 && h.position <= 3).length;
            const totalPts = history.reduce((sum, h) => sum + (h.points || 0), 0);
            const winRate = totalRaces > 0 ? Math.round((totalWins / totalRaces) * 100) : 0;

            let historyRowsHtml = '';
            if (history.length === 0) {
                historyRowsHtml = '<tr><td colspan="5" class="text-center text-muted py-3">Aún no tiene carreras registradas en el campeonato.</td></tr>';
            } else {
                history.forEach(h => {
                    let posBadge = `<span class="badge bg-secondary">P${h.position}</span>`;
                    if (h.position === 1) posBadge = '<span class="badge bg-warning text-dark"><i class="fas fa-trophy"></i> P1</span>';
                    else if (h.position === 2) posBadge = '<span class="badge bg-light text-dark"><i class="fas fa-medal"></i> P2</span>';
                    else if (h.position === 3) posBadge = '<span class="badge bg-danger text-light"><i class="fas fa-award"></i> P3</span>';

                    const carBadge = getCarBrandBadge(h.car);

                    historyRowsHtml += `
                        <tr>
                            <td><span class="text-info fw-bold">${h.season_name || 'T1'}</span> • R${h.round_number}</td>
                            <td>${h.race_title || 'Carrera Oficial'}</td>
                            <td>
                                <div class="d-flex align-items-center gap-2">
                                    ${carBadge}
                                    <span style="font-size: 0.78rem;">${h.car}</span>
                                </div>
                            </td>
                            <td class="text-center">${posBadge}</td>
                            <td class="text-end text-info fw-bold">+${h.points} PTS</td>
                        </tr>
                    `;
                });
            }

            modalDriverBody.innerHTML = `
                <div class="gt6-modal-stats-summary">
                    <div class="gt6-modal-stat-box">
                        <div class="num">${totalRaces}</div>
                        <div class="lbl">Carreras</div>
                    </div>
                    <div class="gt6-modal-stat-box">
                        <div class="num" style="color: #facc15;">${totalWins}</div>
                        <div class="lbl">Victorias (${winRate}%)</div>
                    </div>
                    <div class="gt6-modal-stat-box">
                        <div class="num" style="color: #e2e8f0;">${totalPodiums}</div>
                        <div class="lbl">Podios</div>
                    </div>
                    <div class="gt6-modal-stat-box">
                        <div class="num">${totalPts}</div>
                        <div class="lbl">Puntos Totales</div>
                    </div>
                </div>

                <h4 style="font-family: var(--font-heading); font-size: 0.95rem; color: #fff; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px;">
                    <i class="fas fa-history text-info me-2"></i> Historial de Carreras GT6
                </h4>

                <div class="table-responsive">
                    <table class="gt6-modal-history-table">
                        <thead>
                            <tr>
                                <th>Ronda</th>
                                <th>Evento</th>
                                <th>Auto</th>
                                <th class="text-center">Posición</th>
                                <th class="text-end">Puntos</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${historyRowsHtml}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (e) {
            console.error(e);
            modalDriverBody.innerHTML = `
                <div class="text-center py-4">
                    <p class="text-danger mb-0">Error al cargar historial del piloto.</p>
                </div>
            `;
        }
    }

    function closeModal() {
        if (modalBackdrop) {
            modalBackdrop.classList.remove('show');
            modalBackdrop.setAttribute('aria-hidden', 'true');
        }
    }

    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', (e) => {
            if (e.target === modalBackdrop) closeModal();
        });
    }
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeModal();
    });

    // Initial render
    renderGrid();
}

