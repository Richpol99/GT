/**
 * GT ACADEMY - GARAJE OFICIAL GRAN TURISMO 6
 * Client-side Controller for the 1,280 GT6 Cars Database & Telemetry Encyclopedia.
 */

(function () {
    'use strict';

    // Application State
    const state = {
        search: '',
        manufacturer: 'all',
        drivetrain: 'all',
        category: 'all',
        sortBy: 'pp_desc',
        page: 1,
        limit: 24,
        totalPages: 1,
        totalCars: 0,
        isLoading: false
    };

    // DOM Elements
    const elements = {
        searchInput: document.getElementById('carSearchInput'),
        clearSearchBtn: document.getElementById('clearSearchBtn'),
        manufacturerSelect: document.getElementById('manufacturerSelect'),
        drivetrainPills: document.querySelectorAll('.gt-drivetrain-pill'),
        categoryPills: document.querySelectorAll('.gt-category-pill'),
        sortSelect: document.getElementById('sortSelect'),
        carsGrid: document.getElementById('carsGrid'),
        paginationWrap: document.getElementById('paginationWrap'),
        totalResultsCount: document.getElementById('totalResultsCount'),
        statTotalCars: document.getElementById('statTotalCars'),
        statTotalMfrs: document.getElementById('statTotalMfrs'),
        statMaxHp: document.getElementById('statMaxHp'),
        statAvgPp: document.getElementById('statAvgPp'),
        // Modal
        carModal: document.getElementById('carTelemetryModal'),
        modalBackdrop: document.getElementById('modalBackdrop'),
        closeModalBtn: document.getElementById('closeModalBtn'),
        modalCarName: document.getElementById('modalCarName'),
        modalCarManufacturer: document.getElementById('modalCarManufacturer'),
        modalCarCountry: document.getElementById('modalCarCountry'),
        modalCarImage: document.getElementById('modalCarImage'),
        modalCarPp: document.getElementById('modalCarPp'),
        modalCarHp: document.getElementById('modalCarHp'),
        modalCarWeight: document.getElementById('modalCarWeight'),
        modalCarRatio: document.getElementById('modalCarRatio'),
        modalCarDrivetrain: document.getElementById('modalCarDrivetrain'),
        modalCarAspiration: document.getElementById('modalCarAspiration'),
        modalCarCategory: document.getElementById('modalCarCategory'),
        modalCarYear: document.getElementById('modalCarYear'),
        modalCarInterior: document.getElementById('modalCarInterior'),
        modalCuriositiesList: document.getElementById('modalCuriositiesList'),
        modalSetupTip: document.getElementById('modalSetupTip')
    };

    let searchDebounceTimer = null;

    // Helper: Map country string to flag SVG/PNG
    function getCountryFlagImg(countryName) {
        if (!countryName) return '';
        const c = countryName.toLowerCase();
        let file = 'gran_turismo.svg';
        if (c.includes('japan') || c.includes('japón')) file = 'japon.svg';
        else if (c.includes('united kingdom') || c.includes('uk') || c.includes('britain')) file = 'uk.svg';
        else if (c.includes('united states') || c.includes('usa')) file = 'usa.svg';
        else if (c.includes('germany') || c.includes('alemania')) file = 'alemania.svg';
        else if (c.includes('italy') || c.includes('italia')) file = 'italia.png';
        else if (c.includes('france') || c.includes('francia')) file = 'francia.svg';
        else if (c.includes('belgium') || c.includes('bélgica')) file = 'belgica.svg';
        else if (c.includes('spain') || c.includes('españa')) file = 'espana.png';
        else if (c.includes('sweden') || c.includes('suecia')) file = 'pdi.png';
        else if (c.includes('korea')) file = 'pdi.png';
        else if (c.includes('australia')) file = 'pdi.png';
        
        return `<img src="assets/country/${file}" alt="${countryName}" title="${countryName}" class="apple-circuit-flag" width="11" height="8" loading="lazy" onerror="this.src='assets/country/gran_turismo.svg'">`;
    }

    // Load Overview Statistics
    async function loadStats() {
        try {
            const res = await fetch('/api/cars/stats');
            if (!res.ok) return;
            const data = await res.json();
            if (elements.statTotalCars) elements.statTotalCars.textContent = (data.total_cars || 1280).toLocaleString();
            if (elements.statTotalMfrs) elements.statTotalMfrs.textContent = data.total_manufacturers || 111;
            if (elements.statMaxHp) elements.statMaxHp.textContent = `${data.max_hp || 1001} CV`;
            if (elements.statAvgPp) elements.statAvgPp.textContent = `${data.avg_pp || 452} PR`;
        } catch (err) {
            console.warn('Error loading car stats:', err);
        }
    }

    // Load Manufacturers Dropdown
    async function loadManufacturers() {
        if (!elements.manufacturerSelect) return;
        try {
            const res = await fetch('/api/cars/manufacturers');
            if (!res.ok) return;
            const list = await res.json();
            
            elements.manufacturerSelect.innerHTML = `<option value="all">Todos los Fabricantes (${list.length})</option>`;
            list.forEach(m => {
                const opt = document.createElement('option');
                opt.value = m.manufacturer;
                opt.textContent = `${m.manufacturer} (${m.car_count})`;
                elements.manufacturerSelect.appendChild(opt);
            });
        } catch (err) {
            console.warn('Error loading manufacturers:', err);
        }
    }

    // Fetch and Render Cars
    async function fetchCars() {
        if (state.isLoading) return;
        state.isLoading = true;

        if (elements.carsGrid) {
            elements.carsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-dark" role="status" style="width: 2.5rem; height: 2.5rem;">
                        <span class="visually-hidden">Cargando autos...</span>
                    </div>
                    <div class="mt-3 text-muted small" style="font-family: 'JetBrains Mono', monospace;">
                        Consultando telemetría de 1,280 autos en base de datos...
                    </div>
                </div>
            `;
        }

        const params = new URLSearchParams({
            page: state.page,
            limit: state.limit,
            sort_by: state.sortBy
        });

        if (state.search.trim()) params.append('search', state.search.trim());
        if (state.manufacturer !== 'all') params.append('manufacturer', state.manufacturer);
        if (state.drivetrain !== 'all') params.append('drivetrain', state.drivetrain);
        if (state.category !== 'all') params.append('category', state.category);

        try {
            const res = await fetch(`/api/cars?${params.toString()}`);
            if (!res.ok) throw new Error('Error en respuesta del servidor');
            const data = await res.json();

            state.totalPages = data.total_pages || 1;
            state.totalCars = data.total || 0;

            if (elements.totalResultsCount) {
                elements.totalResultsCount.textContent = `${state.totalCars.toLocaleString()} autos encontrados`;
            }

            renderCarsList(data.cars || []);
            renderPagination();
        } catch (err) {
            console.error('Error fetching cars:', err);
            if (elements.carsGrid) {
                elements.carsGrid.innerHTML = `
                    <div class="col-12 text-center py-5">
                        <i class="fas fa-exclamation-triangle fa-2x text-warning mb-3"></i>
                        <p class="text-muted">No se pudo conectar con la base de datos de autos.</p>
                        <button class="hero-btn-primary btn-sm" onclick="window.gtGarage.fetchCars()">Reintentar</button>
                    </div>
                `;
            }
        } finally {
            state.isLoading = false;
        }
    }

    // Render Grid of Car Cards
    function renderCarsList(cars) {
        if (!elements.carsGrid) return;

        if (!cars || cars.length === 0) {
            elements.carsGrid.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="py-4">
                        <i class="fas fa-search fa-2x text-muted mb-3 opacity-50"></i>
                        <h4 style="font-family: var(--wec-sans); font-weight: 700; color: #0f172a;">No se encontraron vehículos</h4>
                        <p class="text-muted small mx-auto" style="max-width: 420px;">
                            Intenta ajustar los términos de búsqueda o restablecer los filtros de tracción y fabricante.
                        </p>
                        <button type="button" class="hero-btn-secondary mt-2" id="resetFiltersBtn">
                            <i class="fas fa-undo me-1"></i> Restablecer Filtros
                        </button>
                    </div>
                </div>
            `;
            const rBtn = document.getElementById('resetFiltersBtn');
            if (rBtn) rBtn.addEventListener('click', resetAllFilters);
            return;
        }

        let html = '';
        cars.forEach(car => {
            const flagHtml = getCountryFlagImg(car.country);
            const imgSrc = car.local_image || `/api/car-image/${car.id}`;
            const curiositySnippet = (car.curiosities && car.curiosities.length > 0)
                ? car.curiosities[0]
                : `Ingeniería oficial de ${car.manufacturer} en Gran Turismo 6.`;

            const ratio = (car.weight_kg / (car.power_hp || 1)).toFixed(2);

            html += `
                <div class="col-sm-6 col-lg-4 col-xl-3">
                    <div class="gt-car-card" data-id="${car.id}">
                        <!-- Car Thumbnail Visual Stage -->
                        <div class="gt-car-thumb-wrap">
                            <span class="gt-car-badge-pp">${car.pp} PR</span>
                            <span class="gt-car-badge-drive">${car.drivetrain}</span>
                            <img src="${imgSrc}" 
                                 alt="${car.name}" 
                                 class="gt-car-thumb-img" 
                                 loading="lazy" 
                                 referrerpolicy="no-referrer"
                                 onerror="this.onerror=null;this.src='assets/cars/default.jpg'">
                        </div>

                        <!-- Car Card Content Body -->
                        <div class="gt-car-body">
                            <div class="gt-car-mfr-meta">
                                ${flagHtml}
                                <span class="gt-car-mfr-name">${car.manufacturer}</span>
                                <span class="gt-car-cat-tag">${car.category}</span>
                            </div>

                            <h3 class="gt-car-title" title="${car.name}">${car.name}</h3>

                            <!-- Technical Specs Matrix -->
                            <div class="gt-car-specs-row">
                                <div class="gt-car-spec-box">
                                    <span class="gt-car-spec-val">${car.power_hp} <small>CV</small></span>
                                    <span class="gt-car-spec-lbl">Potencia</span>
                                </div>
                                <div class="gt-car-spec-box">
                                    <span class="gt-car-spec-val">${car.weight_kg} <small>kg</small></span>
                                    <span class="gt-car-spec-lbl">Peso</span>
                                </div>
                                <div class="gt-car-spec-box">
                                    <span class="gt-car-spec-val">${ratio}</span>
                                    <span class="gt-car-spec-lbl">kg/CV</span>
                                </div>
                            </div>

                            <!-- Curious Fact Lore Teaser -->
                            <p class="gt-car-lore-teaser">
                                <i class="fas fa-lightbulb text-warning me-1"></i> ${curiositySnippet}
                            </p>

                            <!-- Action Button -->
                            <button type="button" class="gt-car-btn-inspect" data-car-id="${car.id}">
                                <span>Ver Ficha & Setup</span> <i class="fas fa-arrow-right ms-1"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });

        elements.carsGrid.innerHTML = html;

        // Attach modal trigger listeners
        const buttons = elements.carsGrid.querySelectorAll('.gt-car-btn-inspect');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.getAttribute('data-car-id');
                openCarModal(id);
            });
        });

        const cards = elements.carsGrid.querySelectorAll('.gt-car-card');
        cards.forEach(card => {
            card.addEventListener('click', () => {
                const id = card.getAttribute('data-id');
                openCarModal(id);
            });
        });
    }

    // Render Pagination Controls
    function renderPagination() {
        if (!elements.paginationWrap) return;
        if (state.totalPages <= 1) {
            elements.paginationWrap.innerHTML = '';
            return;
        }

        let html = `
            <div class="gt-pagination-container">
                <button type="button" class="gt-page-btn prev" ${state.page === 1 ? 'disabled' : ''} data-page="${state.page - 1}">
                    <i class="fas fa-chevron-left me-1"></i> Anterior
                </button>
        `;

        const cur = state.page;
        const total = state.totalPages;

        // Window of visible page numbers
        let startPage = Math.max(1, cur - 2);
        let endPage = Math.min(total, cur + 2);

        if (startPage > 1) {
            html += `<button type="button" class="gt-page-num" data-page="1">1</button>`;
            if (startPage > 2) html += `<span class="gt-page-dots">…</span>`;
        }

        for (let p = startPage; p <= endPage; p++) {
            html += `<button type="button" class="gt-page-num ${p === cur ? 'is-active' : ''}" data-page="${p}">${p}</button>`;
        }

        if (endPage < total) {
            if (endPage < total - 1) html += `<span class="gt-page-dots">…</span>`;
            html += `<button type="button" class="gt-page-num" data-page="${total}">${total}</button>`;
        }

        html += `
                <button type="button" class="gt-page-btn next" ${cur === total ? 'disabled' : ''} data-page="${cur + 1}">
                    Siguiente <i class="fas fa-chevron-right ms-1"></i>
                </button>
            </div>
        `;

        elements.paginationWrap.innerHTML = html;

        // Attach listeners
        const pageBtns = elements.paginationWrap.querySelectorAll('button[data-page]');
        pageBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const p = parseInt(btn.getAttribute('data-page'), 10);
                if (p && p !== state.page && p >= 1 && p <= state.totalPages) {
                    state.page = p;
                    fetchCars();
                    window.scrollTo({ top: elements.carsGrid.offsetTop - 140, behavior: 'smooth' });
                }
            });
        });
    }

    // Open Full Telemetry & Lore Modal
    async function openCarModal(carId) {
        if (!carId) return;

        try {
            const res = await fetch(`/api/cars/${carId}`);
            if (!res.ok) throw new Error('Auto no encontrado');
            const car = await res.json();

            // Populate Modal Fields
            if (elements.modalCarName) elements.modalCarName.textContent = car.name;
            if (elements.modalCarManufacturer) elements.modalCarManufacturer.textContent = car.manufacturer;
            if (elements.modalCarCountry) {
                elements.modalCarCountry.innerHTML = `${getCountryFlagImg(car.country)} <span class="ms-1">${car.country}</span>`;
            }

            const imgSrc = car.local_image || `/api/car-image/${car.id}`;
            if (elements.modalCarImage) {
                elements.modalCarImage.src = imgSrc;
                elements.modalCarImage.alt = car.name;
                elements.modalCarImage.setAttribute('referrerpolicy', 'no-referrer');
                elements.modalCarImage.onerror = function () {
                    this.onerror = null;
                    this.src = 'assets/cars/default.jpg';
                };
            }

            if (elements.modalCarPp) elements.modalCarPp.textContent = `${car.pp} PR`;
            if (elements.modalCarHp) elements.modalCarHp.textContent = `${car.power_hp} CV`;
            if (elements.modalCarWeight) elements.modalCarWeight.textContent = `${car.weight_kg} kg`;
            
            const ratio = (car.weight_kg / (car.power_hp || 1)).toFixed(2);
            if (elements.modalCarRatio) elements.modalCarRatio.textContent = `${ratio} kg/CV`;

            if (elements.modalCarDrivetrain) elements.modalCarDrivetrain.textContent = car.drivetrain;
            if (elements.modalCarAspiration) elements.modalCarAspiration.textContent = car.aspiration || 'NA';
            if (elements.modalCarCategory) elements.modalCarCategory.textContent = car.category;
            if (elements.modalCarYear) elements.modalCarYear.textContent = car.year || 'N/A';
            if (elements.modalCarInterior) {
                elements.modalCarInterior.textContent = car.interior === 'Detailed' ? 'Premium (Cabina Completa)' : 'Standard';
            }

            // Render Curiosities & Lore List
            if (elements.modalCuriositiesList) {
                if (car.curiosities && car.curiosities.length > 0) {
                    elements.modalCuriositiesList.innerHTML = car.curiosities.map(c => `
                        <li class="gt-lore-item">
                            <i class="fas fa-check-circle text-dark me-2"></i>
                            <span>${c}</span>
                        </li>
                    `).join('');
                } else {
                    elements.modalCuriositiesList.innerHTML = `
                        <li class="gt-lore-item">
                            <i class="fas fa-info-circle text-muted me-2"></i>
                            <span>Vehículo icónico modelado en el motor de físicas de Gran Turismo 6 (PS3).</span>
                        </li>
                    `;
                }
            }

            // Render Setup Tip
            if (elements.modalSetupTip) {
                elements.modalSetupTip.textContent = car.setup_tip || 'Ajustar distribución de frenos y convergencia delantera según el circuito.';
            }

            // Show Modal
            if (elements.carModal) elements.carModal.classList.add('is-open');
            if (elements.modalBackdrop) elements.modalBackdrop.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('Error opening car modal:', err);
        }
    }

    function closeCarModal() {
        if (elements.carModal) elements.carModal.classList.remove('is-open');
        if (elements.modalBackdrop) elements.modalBackdrop.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function resetAllFilters() {
        state.search = '';
        state.manufacturer = 'all';
        state.drivetrain = 'all';
        state.category = 'all';
        state.sortBy = 'pp_desc';
        state.page = 1;

        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.manufacturerSelect) elements.manufacturerSelect.value = 'all';
        if (elements.sortSelect) elements.sortSelect.value = 'pp_desc';

        elements.drivetrainPills.forEach(p => {
            p.classList.toggle('is-active', p.getAttribute('data-drivetrain') === 'all');
        });

        elements.categoryPills.forEach(p => {
            p.classList.toggle('is-active', p.getAttribute('data-category') === 'all');
        });

        fetchCars();
    }

    // Setup Event Listeners
    function setupEvents() {
        // Search Input with Debounce
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    state.search = e.target.value.trim();
                    state.page = 1;
                    fetchCars();
                }, 260);

                if (elements.clearSearchBtn) {
                    elements.clearSearchBtn.style.display = e.target.value ? 'inline-flex' : 'none';
                }
            });
        }

        if (elements.clearSearchBtn) {
            elements.clearSearchBtn.addEventListener('click', () => {
                if (elements.searchInput) elements.searchInput.value = '';
                elements.clearSearchBtn.style.display = 'none';
                state.search = '';
                state.page = 1;
                fetchCars();
            });
        }

        // Manufacturer Filter Dropdown
        if (elements.manufacturerSelect) {
            elements.manufacturerSelect.addEventListener('change', (e) => {
                state.manufacturer = e.target.value;
                state.page = 1;
                fetchCars();
            });
        }

        // Drivetrain Filter Pills
        elements.drivetrainPills.forEach(pill => {
            pill.addEventListener('click', () => {
                elements.drivetrainPills.forEach(p => p.classList.remove('is-active'));
                pill.classList.add('is-active');
                state.drivetrain = pill.getAttribute('data-drivetrain') || 'all';
                state.page = 1;
                fetchCars();
            });
        });

        // Category Filter Pills
        elements.categoryPills.forEach(pill => {
            pill.addEventListener('click', () => {
                elements.categoryPills.forEach(p => p.classList.remove('is-active'));
                pill.classList.add('is-active');
                state.category = pill.getAttribute('data-category') || 'all';
                state.page = 1;
                fetchCars();
            });
        });

        // Sort Select
        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                state.page = 1;
                fetchCars();
            });
        }

        // Modal Close handlers
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeCarModal);
        if (elements.modalBackdrop) elements.modalBackdrop.addEventListener('click', closeCarModal);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeCarModal();
        });
    }

    // Initialize
    function init() {
        setupEvents();
        loadStats();
        loadManufacturers();
        fetchCars();
    }

    // Expose for debugging / global access
    window.gtGarage = {
        init,
        fetchCars,
        openCarModal,
        resetAllFilters,
        state
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
