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
                    <span class="input-group-text" style="border-right: none; background: #090c10 !important; border-color: #1e293b !important; color: #f28123;"><i class="fas fa-search"></i></span>
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
            let posDisplay = `<span class="badge rounded-pill bg-dark text-light border border-secondary px-2 py-1">#${item.position}</span>`;
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
                <td class="text-center fw-bold text-light align-middle" style="font-size: 15px;">${item.psn_id}</td>
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
// RESULTADOS DE CARRERAS (DISEÑO MODERNO GT ESPORTS / F1)
// -----------------------------------------------------------
async function setupResultadosPage(seasons, activeSeason) {
    const mainSection = document.querySelector('.resultados');
    if (!mainSection) return;

    // Crear barra de control
    const controlsContainer = document.createElement('div');
    controlsContainer.className = 'container mb-5';
    
    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === activeSeason.id ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    controlsContainer.innerHTML = `
        <div class="gt-toolbar">
            <div class="row align-items-center">
                <div class="col-md-7 mb-3 mb-md-0">
                    <div class="input-group">
                        <span class="input-group-text" style="border-right: none; background: #090c10 !important; border-color: #1e293b !important; color: #f28123;"><i class="fas fa-search"></i></span>
                        <input type="text" id="raceFilterInput" class="form-control gt-search-input" placeholder="Buscar piloto o país en todas las carreras..." style="border-left: none;">
                    </div>
                </div>
                <div class="col-md-5 text-md-end d-flex align-items-center justify-content-md-end">
                    <label class="me-2 text-muted fw-bold small text-uppercase mb-0">Temporada:</label>
                    <select id="seasonSelectResultados" class="form-select gt-season-select" style="max-width: 220px;">
                        ${seasonOptions}
                    </select>
                </div>
            </div>
            <div id="racePillsContainer" class="gt-pills-bar"></div>
        </div>
    `;

    // Contenedor dinámico de carreras
    const racesDisplay = document.createElement('div');
    racesDisplay.id = 'dynamicRacesContainer';

    // Limpiar contenido estático viejo de resultados y adjuntar los dinámicos
    mainSection.innerHTML = '';
    mainSection.appendChild(controlsContainer);
    mainSection.appendChild(racesDisplay);

    let currentRaces = [];

    async function loadRaces(seasonId) {
        racesDisplay.innerHTML = `
            <div class="container text-center py-5">
                <div class="gt-race-card p-5 text-center">
                    <i class="fas fa-spinner fa-spin fa-2x text-warning mb-3"></i>
                    <p class="text-muted mb-0">Cargando resultados de la temporada...</p>
                </div>
            </div>
        `;
        try {
            const resp = await fetch(`/api/seasons/${seasonId}/races`);
            currentRaces = await resp.json();
            renderPills(currentRaces);
            renderRaces(currentRaces);
        } catch (e) {
            racesDisplay.innerHTML = `
                <div class="container text-center py-5">
                    <div class="gt-race-card p-5 text-center text-danger">
                        <i class="fas fa-exclamation-triangle fa-2x mb-3"></i>
                        <p class="mb-0">Error al cargar carreras desde la base de datos.</p>
                    </div>
                </div>
            `;
        }
    }

    function renderPills(races) {
        const pillsBox = document.getElementById('racePillsContainer');
        pillsBox.innerHTML = '';
        if (races.length <= 1) return;

        const allBtn = document.createElement('button');
        allBtn.className = 'gt-pill-btn active';
        allBtn.innerHTML = '<i class="fas fa-layer-group me-1"></i> Ver Todas';
        allBtn.addEventListener('click', () => {
            pillsBox.querySelectorAll('.gt-pill-btn').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            renderRaces(currentRaces);
        });
        pillsBox.appendChild(allBtn);

        races.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'gt-pill-btn';
            btn.innerHTML = `<i class="fas fa-flag me-1"></i> Ronda ${r.round_number}`;
            btn.addEventListener('click', () => {
                pillsBox.querySelectorAll('.gt-pill-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderRaces([r]);
            });
            pillsBox.appendChild(btn);
        });
    }

    function renderRaces(races) {
        racesDisplay.innerHTML = '';
        const searchQ = document.getElementById('raceFilterInput') ? document.getElementById('raceFilterInput').value.toLowerCase().trim() : '';

        if (races.length === 0) {
            racesDisplay.innerHTML = `
                <div class="container text-center py-5">
                    <div class="gt-race-card p-5 text-center">
                        <i class="fas fa-flag-checkered fa-3x text-warning mb-3"></i>
                        <h4 class="text-light">No hay carreras registradas en esta temporada todavía.</h4>
                        <p class="text-muted small mb-0">Las nuevas carreras registradas desde el panel administrativo aparecerán aquí.</p>
                    </div>
                </div>
            `;
            return;
        }

        races.forEach(race => {
            let filteredResults = race.results || [];
            if (searchQ) {
                filteredResults = filteredResults.filter(res => 
                    res.psn_id.toLowerCase().includes(searchQ) || (res.country && res.country.toLowerCase().includes(searchQ))
                );
            }

            if (searchQ && filteredResults.length === 0) return;

            // 1. Podio Visual Top 3
            let podiumHtml = '';
            const top3 = (race.results || []).slice(0, 3);
            if (!searchQ && top3.length >= 2) {
                const p1 = top3[0];
                const p2 = top3[1];
                const p3 = top3[2];

                podiumHtml = `
                    <div class="gt-podium-section">
                        <div class="gt-podium-grid">
                            <!-- P2 (Plata) -->
                            <div class="gt-podium-card gt-podium-p2">
                                <div class="gt-podium-rank-badge">🥈 2º Lugar</div>
                                <div class="gt-podium-driver-name">
                                    <img src="assets/country/${p2.country || 'pdi'}.png" alt="${p2.country}" class="gt-flag-img" onerror="this.src='assets/country/pdi.png'">
                                    <span>${p2.psn_id}</span>
                                </div>
                                <div class="gt-podium-points">+${p2.points} PTS</div>
                                ${p2.notes ? `<div class="gt-podium-time">${p2.notes}</div>` : ''}
                            </div>

                            <!-- P1 (Oro - Ganador) -->
                            <div class="gt-podium-card gt-podium-p1">
                                <div class="gt-podium-rank-badge">🏆 GANADOR &bull; 1º LUGAR</div>
                                <div class="gt-podium-driver-name" style="font-size: 20px;">
                                    <img src="assets/country/${p1.country || 'pdi'}.png" alt="${p1.country}" class="gt-flag-img" style="width: 32px; height: 23px;" onerror="this.src='assets/country/pdi.png'">
                                    <span>${p1.psn_id}</span>
                                </div>
                                <div class="gt-podium-points" style="font-size: 15px;">+${p1.points} PTS</div>
                                ${p1.notes ? `<div class="gt-podium-time" style="font-weight: 700; color: #fbbf24;">${p1.notes}</div>` : ''}
                            </div>

                            <!-- P3 (Bronce) -->
                            ${p3 ? `
                            <div class="gt-podium-card gt-podium-p3">
                                <div class="gt-podium-rank-badge">🥉 3º Lugar</div>
                                <div class="gt-podium-driver-name">
                                    <img src="assets/country/${p3.country || 'pdi'}.png" alt="${p3.country}" class="gt-flag-img" onerror="this.src='assets/country/pdi.png'">
                                    <span>${p3.psn_id}</span>
                                </div>
                                <div class="gt-podium-points">+${p3.points} PTS</div>
                                ${p3.notes ? `<div class="gt-podium-time">${p3.notes}</div>` : ''}
                            </div>
                            ` : '<div></div>'}
                        </div>
                    </div>
                `;
            }

            // 2. Filas Aerodinámicas tipo Cards
            let rowsHtml = '';
            filteredResults.forEach(res => {
                let posClass = 'pos-other';
                if (res.position === 1) posClass = 'pos-1';
                else if (res.position === 2) posClass = 'pos-2';
                else if (res.position === 3) posClass = 'pos-3';
                else if (res.position <= 10) posClass = 'pos-top10';

                let badgesHtml = '';
                if (res.is_pole) badgesHtml += `<span class="gt-badge-tag gt-tag-pole me-1">🚩 POLE</span>`;
                if (res.is_fastest_lap) badgesHtml += `<span class="gt-badge-tag gt-tag-fastest">⚡ V. RÁPIDA</span>`;

                rowsHtml += `
                    <div class="gt-driver-row ${posClass}">
                        <div class="gt-pos-badge">#${res.position}</div>
                        <div class="gt-driver-info">
                            <img src="assets/country/${res.country || 'pdi'}.png" alt="${res.country}" class="gt-flag-img" onerror="this.src='assets/country/pdi.png'">
                            <span class="gt-driver-name">${res.psn_id}</span>
                            ${badgesHtml}
                        </div>
                        <div class="gt-car-info">
                            <i class="fas fa-car-side me-1 text-muted"></i> ${race.car}
                        </div>
                        <div class="gt-time-info">
                            ${res.notes ? `<i class="far fa-clock me-1"></i> ${res.notes}` : '<span class="text-muted">—</span>'}
                        </div>
                        <div class="gt-points-info">
                            <span class="gt-pts-badge">+${res.points} PTS</span>
                        </div>
                    </div>
                `;
            });

            // Envoltorio de la carrera
            const raceCard = document.createElement('div');
            raceCard.className = 'container';
            raceCard.innerHTML = `
                <div class="gt-race-card">
                    <!-- Cabecera Carrera -->
                    <div class="gt-race-header">
                        <div class="gt-race-title-group">
                            <span class="gt-race-badge-round">RONDA ${String(race.round_number).padStart(2, '0')}</span>
                            <h3 class="gt-race-title">${race.title}</h3>
                        </div>
                        <div class="gt-race-meta">
                            <span class="gt-meta-pill highlight"><i class="fas fa-car"></i> ${race.car}</span>
                            <span class="gt-meta-pill"><i class="fas fa-map-marker-alt"></i> ${race.track || 'Circuito Oficial'}</span>
                            <span class="gt-meta-pill"><i class="fas fa-users"></i> ${race.results ? race.results.length : 0} Pilotos</span>
                        </div>
                    </div>

                    <!-- Podio Visual Top 3 -->
                    ${podiumHtml}

                    <!-- Lista Completa de Clasificación -->
                    <div class="gt-results-list">
                        ${rowsHtml}
                    </div>
                </div>
            `;
            racesDisplay.appendChild(raceCard);
        });
    }

    document.getElementById('raceFilterInput').addEventListener('input', () => {
        renderRaces(currentRaces);
    });

    document.getElementById('seasonSelectResultados').addEventListener('change', (e) => {
        loadRaces(e.target.value);
    });

    loadRaces(activeSeason.id);
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
                                <td class="text-center text-light fw-bold">${d.psn_id}</td>
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
