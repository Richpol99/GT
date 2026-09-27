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
    toolbar.className = 'row mb-4 align-items-center';
    
    let seasonOptions = '';
    seasons.forEach(s => {
        const sel = s.id === activeSeason.id ? 'selected' : '';
        seasonOptions += `<option value="${s.id}" ${sel}>${s.name} ${s.is_active ? '(Activa)' : ''}</option>`;
    });

    toolbar.innerHTML = `
        <div class="col-md-5 mb-3 mb-md-0">
            <div class="input-group">
                <span class="input-group-text bg-dark border-secondary text-warning"><i class="fas fa-search"></i></span>
                <input type="text" id="rankingSearch" class="form-control bg-dark text-light border-secondary" placeholder="Buscar piloto o país en tiempo real...">
            </div>
        </div>
        <div class="col-md-4 ms-auto text-md-end d-flex align-items-center justify-content-md-end">
            <label class="me-2 text-muted fw-bold small text-uppercase">Temporada:</label>
            <select id="seasonSelect" class="form-select bg-dark text-light border-secondary" style="max-width: 220px;">
                ${seasonOptions}
            </select>
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
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-muted">Cargando clasificación...</td></tr>';

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
            let posDisplay = item.position;
            if (item.position === 1) posDisplay = '🥇 1';
            else if (item.position === 2) posDisplay = '🥈 2';
            else if (item.position === 3) posDisplay = '🥉 3';

            tr.innerHTML = `
                <td class="text-center fw-bold" style="font-size: 16px;">${posDisplay}</td>
                <td class="text-center fw-bold text-light">${item.psn_id}</td>
                <td class="text-center">
                    <img src="assets/country/${item.country}.png" alt="${item.country}" style="width: 27px; height: 20px; vertical-align: middle;" loading="lazy" decoding="async" onerror="this.src='assets/country/pdi.png'">
                </td>
                <td class="text-center fw-bold text-warning" style="font-size: 17px;">${item.total_points}</td>
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
// RESULTADOS DE CARRERAS
// -----------------------------------------------------------
async function setupResultadosPage(seasons, activeSeason) {
    const mainSection = document.querySelector('.contact-from-section') || document.querySelector('.resultados');
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
        <div class="row align-items-center bg-dark p-3 rounded border border-secondary">
            <div class="col-md-6 mb-2 mb-md-0">
                <input type="text" id="raceFilterInput" class="form-control bg-black text-light border-secondary" placeholder="🔍 Filtrar por piloto o país en las carreras...">
            </div>
            <div class="col-md-6 text-md-end d-flex align-items-center justify-content-md-end">
                <label class="me-2 text-muted fw-bold small text-uppercase mb-0">Temporada:</label>
                <select id="seasonSelectResultados" class="form-select bg-black text-light border-secondary" style="max-width: 220px;">
                    ${seasonOptions}
                </select>
            </div>
        </div>
        <div id="racePillsContainer" class="d-flex flex-wrap gap-2 mt-3"></div>
    `;

    const targetRow = document.querySelector('.contact-from-section .container') || mainSection;
    targetRow.parentNode.insertBefore(controlsContainer, targetRow);

    // Contenedor dinámico de carreras
    const racesDisplay = document.createElement('div');
    racesDisplay.id = 'dynamicRacesContainer';
    controlsContainer.after(racesDisplay);

    // Ocultar contenido estático viejo de resultados
    const oldResults = document.querySelectorAll('.contact-from-section');
    oldResults.forEach(el => el.style.display = 'none');

    let currentRaces = [];

    async function loadRaces(seasonId) {
        racesDisplay.innerHTML = '<p class="text-center text-muted py-5">Cargando carreras...</p>';
        try {
            const resp = await fetch(`/api/seasons/${seasonId}/races`);
            currentRaces = await resp.json();
            renderPills(currentRaces);
            renderRaces(currentRaces);
        } catch (e) {
            racesDisplay.innerHTML = '<p class="text-center text-danger py-5">Error al cargar carreras.</p>';
        }
    }

    function renderPills(races) {
        const pillsBox = document.getElementById('racePillsContainer');
        pillsBox.innerHTML = '';
        if (races.length <= 1) return;

        const allBtn = document.createElement('button');
        allBtn.className = 'btn btn-sm btn-outline-warning active me-1 mb-1';
        allBtn.innerText = 'Ver Todas';
        allBtn.addEventListener('click', () => {
            pillsBox.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            allBtn.classList.add('active');
            renderRaces(currentRaces);
        });
        pillsBox.appendChild(allBtn);

        races.forEach(r => {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-secondary me-1 mb-1';
            btn.innerText = `Ronda ${r.round_number}`;
            btn.addEventListener('click', () => {
                pillsBox.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                renderRaces([r]);
            });
            pillsBox.appendChild(btn);
        });
    }

    function renderRaces(races) {
        racesDisplay.innerHTML = '';
        const searchQ = document.getElementById('raceFilterInput').value.toLowerCase().trim();

        if (races.length === 0) {
            racesDisplay.innerHTML = `
                <div class="container text-center py-5">
                    <h4 class="text-muted">No hay carreras registradas en esta temporada todavía.</h4>
                    <p class="text-muted small">Las nuevas carreras registradas desde el panel aparecerán aquí.</p>
                </div>
            `;
            return;
        }

        races.forEach(race => {
            let filteredResults = race.results;
            if (searchQ) {
                filteredResults = race.results.filter(res => 
                    res.psn_id.toLowerCase().includes(searchQ) || res.country.toLowerCase().includes(searchQ)
                );
            }

            if (searchQ && filteredResults.length === 0) return;

            let rowsHtml = '';
            filteredResults.forEach(res => {
                rowsHtml += `
                    <tr>
                        <td class="text-center fw-bold">${res.position}</td>
                        <td class="text-center text-light fw-bold">${res.psn_id}</td>
                        <td class="text-center">
                            <img src="assets/country/${res.country}.png" alt="${res.country}" style="width: 27px; height: 20px;" loading="lazy" decoding="async" onerror="this.src='assets/country/pdi.png'">
                        </td>
                        <td class="text-center text-muted">${race.car}</td>
                        ${res.notes ? `<td class="text-center small text-muted">${res.notes}</td>` : ''}
                        <td class="text-center fw-bold text-warning">+${res.points}</td>
                    </tr>
                `;
            });

            const raceCard = document.createElement('div');
            raceCard.className = 'container mb-5';
            raceCard.innerHTML = `
                <div class="row">
                    <div class="col-lg-12">
                        <div class="d-flex justify-content-between align-items-center mb-3 border-bottom border-secondary pb-2">
                            <h2 class="text-warning mb-0" style="font-size: 24px; font-weight: 700;">${race.title}</h2>
                            <span class="badge bg-secondary">${race.car}</span>
                        </div>
                        <div class="table-responsive">
                            <table class="table table-dark text-center" style="background: #141a24; border-radius: 8px;">
                                <thead>
                                    <tr style="border-bottom: 2px solid #f28123;">
                                        <th class="text-center">POSICION</th>
                                        <th class="text-center">ID DE PSN</th>
                                        <th class="text-center">PAIS</th>
                                        <th class="text-center">AUTO</th>
                                        ${race.results.some(r => r.notes) ? '<th class="text-center">TIEMPO / NOTAS</th>' : ''}
                                        <th class="text-center">PUNTOS</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
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
