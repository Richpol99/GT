// GT Academy - Admin Dashboard Logic
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Verificar autenticación
    try {
        const authResp = await fetch('/api/admin/check-auth');
        if (!authResp.ok) {
            window.location.href = '/admin/login.html';
            return;
        }
    } catch (e) {
        window.location.href = '/admin/login.html';
        return;
    }

    // Lista de banderas disponibles en assets/country/
    const COUNTRIES = [
        'argentina', 'brasil', 'chile', 'colombia', 'eu', 'francia', 
        'alemania', 'luxemburgo', 'mexico', 'panama', 'paraguay', 
        'peru', 'rd', 'rusia', 'safrica', 'venezuela', 'pdi'
    ];

    const DEFAULT_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1];

    let allDriversCache = [];
    let allSeasonsCache = [];

    // Elementos DOM
    const logoutBtn = document.getElementById('logoutBtn');
    const seasonFilterRaces = document.getElementById('seasonFilterRaces');
    const racesListContainer = document.getElementById('racesListContainer');
    const btnToggleNewRace = document.getElementById('btnToggleNewRace');
    const newRaceCard = document.getElementById('newRaceCard');
    const newRaceForm = document.getElementById('newRaceForm');
    const formSeasonId = document.getElementById('formSeasonId');
    const raceResultsTbody = document.getElementById('raceResultsTbody');
    const btnAddResultRow = document.getElementById('btnAddResultRow');
    const btnCancelRace = document.getElementById('btnCancelRace');
    const driversTbody = document.getElementById('driversTbody');
    const driverSearchInput = document.getElementById('driverSearchInput');
    const driversDatalist = document.getElementById('driversDatalist');
    const modalDriverCountry = document.getElementById('modalDriverCountry');
    const addDriverModalEl = document.getElementById('addDriverModal');
    const addDriverModal = new bootstrap.Modal(addDriverModalEl);
    const saveDriverForm = document.getElementById('saveDriverForm');
    const btnOpenAddDriver = document.getElementById('btnOpenAddDriver');
    const createSeasonForm = document.getElementById('createSeasonForm');
    const seasonsTbody = document.getElementById('seasonsTbody');

    // Inicializar países en select modal
    COUNTRIES.forEach(c => {
        const opt = document.createElement('option');
        opt.value = c;
        opt.innerText = c.toUpperCase();
        modalDriverCountry.appendChild(opt);
    });

    // Helper Toast
    function showToast(message, type = 'success') {
        const toastBox = document.getElementById('toastBox');
        const bg = type === 'success' ? '#10b981' : '#ef4444';
        const toast = document.createElement('div');
        toast.className = 'toast show align-items-center text-white border-0 mb-2';
        toast.style.backgroundColor = bg;
        toast.style.borderRadius = '6px';
        toast.style.padding = '12px 18px';
        toast.style.boxShadow = '0 8px 20px rgba(0,0,0,0.4)';
        toast.innerHTML = `<div class="d-flex justify-content-between align-items-center"><span>${message}</span></div>`;
        toastBox.appendChild(toast);
        setTimeout(() => toast.remove(), 3500);
    }

    // Logout
    logoutBtn.addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin/login.html';
    });

    // ==========================================
    // CARGAR DATOS INICIALES
    // ==========================================
    async function loadSeasons() {
        const resp = await fetch('/api/seasons');
        allSeasonsCache = await resp.json();
        
        seasonFilterRaces.innerHTML = '';
        formSeasonId.innerHTML = '';
        seasonsTbody.innerHTML = '';

        let activeSeasonId = null;

        allSeasonsCache.forEach(s => {
            if (s.is_active) activeSeasonId = s.id;

            // Filtro de carreras
            const opt1 = document.createElement('option');
            opt1.value = s.id;
            opt1.innerText = `${s.name} ${s.is_active ? '(Activa)' : ''}`;
            seasonFilterRaces.appendChild(opt1);

            // Formulario nueva carrera
            const opt2 = document.createElement('option');
            opt2.value = s.id;
            opt2.innerText = s.name;
            formSeasonId.appendChild(opt2);

            // Tabla pestaña temporadas
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${s.id}</td>
                <td class="fw-bold">${s.name}</td>
                <td>
                    ${s.is_active ? '<span class="badge bg-success">ACTIVA</span>' : '<span class="badge bg-secondary">ARCHIVADA</span>'}
                </td>
                <td>
                    ${!s.is_active ? `<button class="btn btn-sm btn-outline-warning btn-activate-season" data-id="${s.id}">Activar</button>` : '<span class="text-muted small">Temporada en curso</span>'}
                </td>
            `;
            seasonsTbody.appendChild(tr);
        });

        if (activeSeasonId) {
            seasonFilterRaces.value = activeSeasonId;
            formSeasonId.value = activeSeasonId;
        }

        // Eventos activar temporada
        document.querySelectorAll('.btn-activate-season').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.dataset.id;
                await fetch(`/api/admin/seasons/${id}/activate`, { method: 'PUT' });
                showToast('Temporada activada');
                await loadSeasons();
                await loadRaces(seasonFilterRaces.value);
            });
        });

        await loadRaces(seasonFilterRaces.value);
    }

    async function loadDrivers() {
        const resp = await fetch('/api/drivers');
        allDriversCache = await resp.json();

        // Actualizar datalist
        driversDatalist.innerHTML = '';
        allDriversCache.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.psn_id;
            opt.dataset.country = d.country;
            driversDatalist.appendChild(opt);
        });

        renderDriversTable(allDriversCache);
    }

    function renderDriversTable(drivers) {
        driversTbody.innerHTML = '';
        if (drivers.length === 0) {
            driversTbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-4">No se encontraron pilotos.</td></tr>';
            return;
        }

        drivers.forEach(d => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="fw-bold text-light">${d.psn_id}</td>
                <td>
                    <img src="../assets/country/${d.country}.png" alt="${d.country}" class="flag-icon" onerror="this.src='../assets/country/pdi.png'">
                    <span>${d.country.toUpperCase()}</span>
                </td>
                <td>
                    <span class="badge-rank rank-${d.rank}">${d.rank}</span>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-info btn-edit-driver" data-id="${d.id}" data-psn="${d.psn_id}" data-country="${d.country}" data-rank="${d.rank}">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            `;
            driversTbody.appendChild(tr);
        });

        // Eventos editar piloto
        document.querySelectorAll('.btn-edit-driver').forEach(b => {
            b.addEventListener('click', (e) => {
                const btn = e.target.closest('button');
                document.getElementById('modalDriverId').value = btn.dataset.id;
                document.getElementById('modalDriverPsn').value = btn.dataset.psn;
                document.getElementById('modalDriverCountry').value = btn.dataset.country;
                document.getElementById('modalDriverRank').value = btn.dataset.rank;
                document.getElementById('driverModalTitle').innerHTML = `<i class="fas fa-user-edit me-2"></i> Editar Piloto: ${btn.dataset.psn}`;
                addDriverModal.show();
            });
        });
    }

    // Buscador de pilotos
    driverSearchInput.addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase().trim();
        const filtered = allDriversCache.filter(d => 
            d.psn_id.toLowerCase().includes(q) || d.country.toLowerCase().includes(q) || d.rank.toLowerCase().includes(q)
        );
        renderDriversTable(filtered);
    });

    // ==========================================
    // GESTIÓN DE CARRERAS
    // ==========================================
    seasonFilterRaces.addEventListener('change', () => {
        loadRaces(seasonFilterRaces.value);
    });

    async function loadRaces(seasonId) {
        if (!seasonId) return;
        racesListContainer.innerHTML = '<p class="text-muted">Cargando carreras...</p>';
        const resp = await fetch(`/api/seasons/${seasonId}/races`);
        const races = await resp.json();

        if (races.length === 0) {
            racesListContainer.innerHTML = '<div class="alert alert-dark text-center py-4">No hay carreras registradas en esta temporada todavía. ¡Haz clic en "Registrar Nueva Carrera" para comenzar!</div>';
            return;
        }

        racesListContainer.innerHTML = '';
        races.forEach(r => {
            const card = document.createElement('div');
            card.className = 'border border-secondary rounded p-3 mb-3 bg-black';
            
            let resultsHtml = '';
            r.results.slice(0, 5).forEach(res => {
                resultsHtml += `
                    <span class="badge bg-secondary me-2 mb-1">
                        #${res.position} ${res.psn_id} (+${res.points} pts)
                    </span>
                `;
            });
            if (r.results.length > 5) {
                resultsHtml += `<span class="badge bg-dark text-muted">+${r.results.length - 5} más</span>`;
            }

            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-start">
                    <div>
                        <h6 class="text-warning mb-1">${r.title} <span class="badge bg-secondary ms-2">${r.car}</span></h6>
                        <div class="small text-muted mb-2">Ronda ${r.round_number} &bull; ${r.results.length} pilotos participantes</div>
                        <div>${resultsHtml}</div>
                    </div>
                    <div>
                        <button class="btn btn-outline-danger btn-sm btn-delete-race" data-id="${r.id}"><i class="fas fa-trash"></i> Eliminar</button>
                    </div>
                </div>
            `;
            racesListContainer.appendChild(card);
        });

        // Eventos eliminar carrera
        document.querySelectorAll('.btn-delete-race').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const id = e.target.closest('button').dataset.id;
                if (confirm('¿Estás seguro de que deseas eliminar esta carrera? Los puntos de la tabla general se recalcularán automáticamente.')) {
                    const delResp = await fetch(`/api/admin/races/${id}`, { method: 'DELETE' });
                    if (delResp.ok) {
                        showToast('Carrera eliminada y tabla recalculada');
                        loadRaces(seasonFilterRaces.value);
                    }
                }
            });
        });
    }

    // Formulario de nueva carrera
    btnToggleNewRace.addEventListener('click', () => {
        newRaceCard.style.display = newRaceCard.style.display === 'none' ? 'block' : 'none';
        if (newRaceCard.style.display === 'block') {
            initNewRaceRows();
            newRaceCard.scrollIntoView({ behavior: 'smooth' });
        }
    });

    btnCancelRace.addEventListener('click', () => {
        newRaceCard.style.display = 'none';
    });

    function initNewRaceRows() {
        raceResultsTbody.innerHTML = '';
        for (let i = 1; i <= 10; i++) {
            addResultRow(i, DEFAULT_POINTS[i - 1] || 0);
        }
    }

    function addResultRow(position, defaultPts = 0) {
        const tr = document.createElement('tr');
        
        let countryOptions = '';
        COUNTRIES.forEach(c => {
            countryOptions += `<option value="${c}">${c.toUpperCase()}</option>`;
        });

        tr.innerHTML = `
            <td>
                <input type="number" class="form-control form-control-sm text-center row-pos" value="${position}" min="1" style="width: 60px;">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm row-psn" placeholder="ID de PSN" list="driversDatalist" required>
            </td>
            <td>
                <select class="form-select form-select-sm row-country">
                    ${countryOptions}
                </select>
            </td>
            <td>
                <input type="number" class="form-control form-control-sm text-center row-pts" value="${defaultPts}" min="0">
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-pole">
            </td>
            <td class="text-center">
                <input type="checkbox" class="form-check-input row-fastest">
            </td>
            <td>
                <input type="text" class="form-control form-control-sm row-notes" placeholder="ej: +2.450s">
            </td>
            <td>
                <button type="button" class="btn btn-outline-danger btn-sm py-0 px-2 btn-remove-row">&times;</button>
            </td>
        `;

        // Autocompletar país al escribir piloto
        const psnInput = tr.querySelector('.row-psn');
        const countrySelect = tr.querySelector('.row-country');
        psnInput.addEventListener('change', () => {
            const entered = psnInput.value.trim().toLowerCase();
            const found = allDriversCache.find(d => d.psn_id.toLowerCase() === entered);
            if (found && found.country) {
                countrySelect.value = found.country;
            }
        });

        // Eliminar fila
        tr.querySelector('.btn-remove-row').addEventListener('click', () => {
            tr.remove();
        });

        raceResultsTbody.appendChild(tr);
    }

    btnAddResultRow.addEventListener('click', () => {
        const currentRows = raceResultsTbody.querySelectorAll('tr').length;
        const nextPos = currentRows + 1;
        const pts = DEFAULT_POINTS[nextPos - 1] || 0;
        addResultRow(nextPos, pts);
    });

    // Guardar carrera
    newRaceForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const season_id = formSeasonId.value;
        const round_number = document.getElementById('formRoundNumber').value;
        const title = document.getElementById('formRaceTitle').value;
        const car = document.getElementById('formRaceCar').value;

        const results = [];
        const rows = raceResultsTbody.querySelectorAll('tr');

        rows.forEach(tr => {
            const psn = tr.querySelector('.row-psn').value.trim();
            if (!psn) return;
            results.push({
                position: tr.querySelector('.row-pos').value,
                psn_id: psn,
                country: tr.querySelector('.row-country').value,
                points: tr.querySelector('.row-pts').value,
                is_pole: tr.querySelector('.row-pole').checked,
                is_fastest_lap: tr.querySelector('.row-fastest').checked,
                notes: tr.querySelector('.row-notes').value.trim()
            });
        });

        if (results.length === 0) {
            alert('Debes registrar al menos un resultado de piloto.');
            return;
        }

        const payload = {
            season_id,
            round_number,
            title,
            car,
            track: 'Circuito Oficial',
            race_date: new Date().toISOString().split('T')[0],
            results
        };

        try {
            const resp = await fetch('/api/admin/races', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const data = await resp.json();

            if (resp.ok) {
                showToast('¡Carrera registrada con éxito y tabla general actualizada!');
                newRaceCard.style.display = 'none';
                newRaceForm.reset();
                seasonFilterRaces.value = season_id;
                await loadRaces(season_id);
                await loadDrivers();
            } else {
                alert(data.error || 'Error al guardar la carrera');
            }
        } catch (err) {
            alert('Error de red al registrar la carrera');
        }
    });

    // Guardar / Editar Piloto Modal
    btnOpenAddDriver.addEventListener('click', () => {
        document.getElementById('modalDriverId').value = '';
        document.getElementById('modalDriverPsn').value = '';
        document.getElementById('modalDriverCountry').value = 'argentina';
        document.getElementById('modalDriverRank').value = 'bronce';
        document.getElementById('driverModalTitle').innerHTML = '<i class="fas fa-user-plus me-2"></i> Añadir Nuevo Piloto';
        addDriverModal.show();
    });

    saveDriverForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            driver_id: document.getElementById('modalDriverId').value || null,
            psn_id: document.getElementById('modalDriverPsn').value.trim(),
            country: document.getElementById('modalDriverCountry').value,
            rank: document.getElementById('modalDriverRank').value
        };

        const resp = await fetch('/api/admin/drivers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (resp.ok) {
            showToast('Piloto guardado con éxito');
            addDriverModal.hide();
            await loadDrivers();
        } else {
            const err = await resp.json();
            alert(err.error || 'Error al guardar piloto');
        }
    });

    // Crear Temporada
    createSeasonForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newSeasonName').value.trim();
        const is_active = document.getElementById('newSeasonActive').checked;

        const resp = await fetch('/api/admin/seasons', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, is_active })
        });

        if (resp.ok) {
            showToast('Temporada creada con éxito');
            createSeasonForm.reset();
            await loadSeasons();
        } else {
            const err = await resp.json();
            alert(err.error || 'Error creando temporada');
        }
    });

    // Iniciar carga
    await loadSeasons();
    await loadDrivers();
});
