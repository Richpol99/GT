/**
 * GT ACADEMY - ENCICLOPEDIA OFICIAL DE CIRCUITOS GRAN TURISMO 6
 * Client-side Controller for Categorized GT6 Tracks, Laser Scan Data, and Motorsport Lore.
 */

(function () {
    'use strict';

    // Application State
    const state = {
        search: '',
        sortBy: 'name_asc',
        tracks: [],
        isLoading: false
    };

    // Category mapping
    const CATEGORIES = [
        { key: 'Real', gridId: 'gridReales', sectionId: 'sec-reales', countId: 'badgeRealesCount', subnavCountId: 'countReales' },
        { key: 'Original', gridId: 'gridOriginales', sectionId: 'sec-originales', countId: 'badgeOriginalesCount', subnavCountId: 'countOriginales' },
        { key: 'Urbano', gridId: 'gridUrbanos', sectionId: 'sec-urbanos', countId: 'badgeUrbanosCount', subnavCountId: 'countUrbanos' },
        { key: 'Tierra y Nieve', gridId: 'gridTierra', sectionId: 'sec-tierra', countId: 'badgeTierraCount', subnavCountId: 'countTierra' },
        { key: 'Especial', gridId: 'gridEspeciales', sectionId: 'sec-especiales', countId: 'badgeEspecialesCount', subnavCountId: 'countEspeciales' }
    ];

    // DOM Elements Cache
    const elements = {
        searchInput: document.getElementById('trackSearchInput'),
        clearSearchBtn: document.getElementById('clearTrackSearchBtn'),
        sortSelect: document.getElementById('trackSortSelect'),
        subnavPills: document.querySelectorAll('.gt-subnav-btn'),
        noTracksGlobal: document.getElementById('noTracksGlobal'),
        resetFiltersBtn: document.getElementById('resetFiltersBtn'),
        totalResultsCount: document.getElementById('totalTracksCount'),
        countAll: document.getElementById('countAll'),
        statTotalTracks: document.getElementById('statTotalTracks'),
        statTotalKm: document.getElementById('statTotalKm'),
        statTotalLayouts: document.getElementById('statTotalLayouts'),
        statLaserScanned: document.getElementById('statLaserScanned'),
        // Mobile Navbar
        pillMobileBtn: document.getElementById('gtPillMobileBtn'),
        pillMobileMenu: document.getElementById('gtPillMobileMenu'),
        // Modal Elements
        modal: document.getElementById('trackTelemetryModal'),
        modalBackdrop: document.getElementById('trackModalBackdrop'),
        closeModalBtn: document.getElementById('closeTrackModalBtn'),
        modalTrackName: document.getElementById('modalTrackName'),
        modalTrackLocation: document.getElementById('modalTrackLocation'),
        modalTrackCountry: document.getElementById('modalTrackCountry'),
        modalTrackCategory: document.getElementById('modalTrackCategory'),
        modalTrackPhoto: document.getElementById('modalTrackPhoto'),
        modalTrackSvg: document.getElementById('modalTrackSvg'),
        modalTrackLength: document.getElementById('modalTrackLength'),
        modalTrackTurns: document.getElementById('modalTrackTurns'),
        modalTrackElevation: document.getElementById('modalTrackElevation'),
        modalTrackStraight: document.getElementById('modalTrackStraight'),
        modalTrackLayouts: document.getElementById('modalTrackLayouts'),
        modalTrackRecord: document.getElementById('modalTrackRecord'),
        modalTrackFirstGame: document.getElementById('modalTrackFirstGame'),
        modalHistoryGt: document.getElementById('modalHistoryGt'),
        modalHistoryReal: document.getElementById('modalHistoryReal'),
        modalDrivingTips: document.getElementById('modalDrivingTips'),
        modalCuriositiesList: document.getElementById('modalCuriositiesList')
    };

    let searchDebounceTimer = null;

    // Helper: Map country string/code to flag HTML
    function getCountryFlagImg(countryCode, countryName) {
        if (!countryCode) return '';
        const code = countryCode.toLowerCase();
        let file = 'gran_turismo.svg';
        if (code === 'uk' || code.includes('brit') || code === 'reino unido') file = 'uk.svg';
        else if (code === 'usa' || code.includes('estados') || code === 'estados unidos') file = 'usa.svg';
        else if (code === 'alemania' || code === 'de') file = 'alemania.svg';
        else if (code === 'belgica' || code === 'be') file = 'belgica.svg';
        else if (code === 'francia' || code === 'fr') file = 'francia.svg';
        else if (code === 'japon' || code === 'jp') file = 'japon.svg';
        else if (code === 'espana' || code === 'es') file = 'espana.png';
        else if (code === 'italia' || code === 'it') file = 'italia.png';
        else if (code === 'australia' || code === 'au') file = 'australia.svg';
        else if (code === 'austria' || code === 'at') file = 'austria.svg';
        else if (code === 'suiza' || code === 'ch') file = 'suiza.svg';
        else if (code === 'moon') file = 'gran_turismo.svg';
        else file = 'gran_turismo.svg';

        return `<img src="assets/country/${file}" alt="${countryName || countryCode}" title="${countryName || countryCode}" class="apple-circuit-flag" width="16" height="11" loading="lazy" onerror="this.src='assets/country/gran_turismo.svg'">`;
    }

    // Load Overview Statistics
    async function loadStats() {
        try {
            const res = await fetch('/api/tracks/stats');
            if (!res.ok) return;
            const data = await res.json();
            if (elements.statTotalTracks) elements.statTotalTracks.textContent = data.total_tracks || 42;
            if (elements.statTotalKm) elements.statTotalKm.textContent = `${data.total_km || 265} km`;
            if (elements.statTotalLayouts) elements.statTotalLayouts.textContent = data.total_layouts || 97;
            if (elements.statLaserScanned) elements.statLaserScanned.textContent = data.laser_scanned_count || 19;
            if (elements.countAll) elements.countAll.textContent = data.total_tracks || 42;
        } catch (err) {
            console.warn('Error loading track stats:', err);
        }
    }

    // Generate Card HTML
    function buildCardHtml(track) {
        const flagHtml = getCountryFlagImg(track.country_code, track.country);
        const photoSrc = track.image_url ? `${track.image_url}?v=gt6_2` : 'assets/tracks/images/silverstone.jpg';
        const svgSrc = track.svg_path || 'assets/tracks/silverstone.svg';

        // Feature Badges
        let featBadges = '';
        if (track.laser_scanned) {
            featBadges += `<span class="gt-track-feat-pill" title="Escaneado con láser LiDAR"><i class="fas fa-satellite"></i> Láser</span>`;
        }
        if (track.weather_change) {
            featBadges += `<span class="gt-track-feat-pill" title="Clima dinámico / Lluvia"><i class="fas fa-cloud-showers-heavy"></i> Lluvia</span>`;
        }
        if (track.time_progression) {
            featBadges += `<span class="gt-track-feat-pill" title="Ciclo Día / Noche"><i class="fas fa-moon"></i> 24h</span>`;
        }

        return `
            <div class="col-sm-6 col-lg-4 col-xl-3">
                <div class="gt-track-card" data-id="${track.id}">
                    <!-- Visual Header Stage -->
                    <div class="gt-track-thumb-wrap">
                        <span class="gt-track-badge-category">${track.category}</span>
                        <img src="${photoSrc}" alt="${track.name}" class="gt-track-photo-img" loading="lazy" onerror="this.onerror=null;this.src='assets/tracks/images/silverstone.jpg'">
                        
                        <!-- Overlaid SVG Map -->
                        <div class="gt-track-svg-overlay" title="Trazado oficial">
                            <img src="${svgSrc}" alt="Mapa ${track.name}" loading="lazy">
                        </div>

                        <!-- Bottom Feature Badges -->
                        <div class="gt-track-features-bar">
                            ${featBadges}
                        </div>
                    </div>

                    <!-- Card Content Body -->
                    <div class="gt-track-body">
                        <div class="gt-track-mfr-meta">
                            ${flagHtml}
                            <span class="gt-track-country-name">${track.country}</span>
                        </div>

                        <h3 class="gt-track-title" title="${track.name}">${track.name}</h3>
                        <p class="gt-track-loc-sub"><i class="fas fa-map-marker-alt me-1 text-muted"></i> ${track.location}</p>

                        <!-- Specs Matrix -->
                        <div class="gt-track-specs-row">
                            <div class="gt-track-spec-box">
                                <span class="gt-track-spec-val">${Number(track.length_km).toFixed(2)}</span>
                                <span class="gt-track-spec-lbl">km</span>
                            </div>
                            <div class="gt-track-spec-box">
                                <span class="gt-track-spec-val">${track.turns}</span>
                                <span class="gt-track-spec-lbl">Curvas</span>
                            </div>
                            <div class="gt-track-spec-box">
                                <span class="gt-track-spec-val">${Math.round(track.elevation_m)}</span>
                                <span class="gt-track-spec-lbl">Desnivel</span>
                            </div>
                            <div class="gt-track-spec-box">
                                <span class="gt-track-spec-val">${Math.round(track.longest_straight_m)}m</span>
                                <span class="gt-track-spec-lbl">Recta</span>
                            </div>
                        </div>

                        <!-- Lore Teaser -->
                        <p class="gt-track-lore-teaser">
                            ${track.history_real || track.history_gt}
                        </p>

                        <!-- Action Inspect Button -->
                        <button type="button" class="gt-track-btn-inspect" data-track-id="${track.id}">
                            <span>Ver Historia & Telemetría</span> <i class="fas fa-arrow-right ms-1"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // Render categorized tracks across the 5 sections
    function renderCategorizedTracks(tracks) {
        let totalRendered = 0;
        const query = state.search.trim().toLowerCase();

        CATEGORIES.forEach(cat => {
            const gridEl = document.getElementById(cat.gridId);
            const secEl = document.getElementById(cat.sectionId);
            const countEl = document.getElementById(cat.countId);
            const subnavCountEl = document.getElementById(cat.subnavCountId);

            if (!gridEl || !secEl) return;

            // Filter tracks for this category and matching search
            const catTracks = tracks.filter(t => {
                if (t.category !== cat.key) return false;
                if (!query) return true;
                const matchName = (t.name || '').toLowerCase().includes(query);
                const matchCountry = (t.country || '').toLowerCase().includes(query);
                const matchLoc = (t.location || '').toLowerCase().includes(query);
                const matchReal = (t.history_real || '').toLowerCase().includes(query);
                const matchGt = (t.history_gt || '').toLowerCase().includes(query);
                const matchTips = (t.driving_tips || '').toLowerCase().includes(query);
                return matchName || matchCountry || matchLoc || matchReal || matchGt || matchTips;
            });

            // Update badge counts
            if (countEl) countEl.textContent = `${catTracks.length} Circuitos`;
            if (subnavCountEl) subnavCountEl.textContent = catTracks.length;

            if (catTracks.length > 0) {
                secEl.style.display = 'block';
                gridEl.innerHTML = catTracks.map(t => buildCardHtml(t)).join('');
                totalRendered += catTracks.length;
            } else {
                gridEl.innerHTML = '';
                secEl.style.display = 'none';
            }
        });

        // Global results counter
        if (elements.totalResultsCount) {
            if (query) {
                elements.totalResultsCount.textContent = `${totalRendered} circuitos encontrados para "${state.search.trim()}"`;
            } else {
                elements.totalResultsCount.textContent = `Mostrando ${totalRendered} circuitos oficiales de Gran Turismo 6`;
            }
        }

        // Global Empty State
        if (elements.noTracksGlobal) {
            if (totalRendered === 0) {
                elements.noTracksGlobal.classList.remove('d-none');
            } else {
                elements.noTracksGlobal.classList.add('d-none');
            }
        }

        // Attach Click Handlers to new cards and buttons
        attachCardListeners();
    }

    // Attach Click Listeners
    function attachCardListeners() {
        const inspectBtns = document.querySelectorAll('button[data-track-id]');
        inspectBtns.forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tid = btn.getAttribute('data-track-id');
                openTrackModal(tid);
            };
        });

        const cards = document.querySelectorAll('.gt-track-card');
        cards.forEach(card => {
            card.onclick = () => {
                const tid = card.getAttribute('data-id');
                openTrackModal(tid);
            };
        });
    }

    // Fetch All Tracks from Database API
    async function fetchTracks() {
        if (state.isLoading) return;
        state.isLoading = true;

        const params = new URLSearchParams({
            sort_by: state.sortBy
        });

        try {
            const res = await fetch(`/api/tracks?${params.toString()}`);
            if (!res.ok) throw new Error('Error al conectar con el servidor');
            const tracks = await res.json();
            state.tracks = tracks;

            renderCategorizedTracks(tracks);
        } catch (err) {
            console.error('Error fetching tracks:', err);
            if (elements.totalResultsCount) {
                elements.totalResultsCount.textContent = 'Error al cargar la base de datos de circuitos.';
            }
        } finally {
            state.isLoading = false;
        }
    }

    // Open Full Telemetry & Lore Modal
    async function openTrackModal(trackId) {
        if (!trackId) return;

        try {
            const res = await fetch(`/api/tracks/${trackId}`);
            if (!res.ok) throw new Error('Circuito no encontrado');
            const track = await res.json();

            // Populate Modal Header
            if (elements.modalTrackName) elements.modalTrackName.textContent = track.name;
            if (elements.modalTrackLocation) elements.modalTrackLocation.textContent = track.location;
            if (elements.modalTrackCountry) {
                elements.modalTrackCountry.innerHTML = `${getCountryFlagImg(track.country_code, track.country)} <span class="ms-1">${track.country}</span>`;
            }
            if (elements.modalTrackCategory) elements.modalTrackCategory.textContent = track.category;

            // Visual Stage
            if (elements.modalTrackPhoto) {
                elements.modalTrackPhoto.src = track.image_url ? `${track.image_url}?v=gt6_2` : 'assets/tracks/images/silverstone.jpg';
                elements.modalTrackPhoto.alt = track.name;
            }
            if (elements.modalTrackSvg) {
                elements.modalTrackSvg.src = track.svg_path || 'assets/tracks/silverstone.svg';
                elements.modalTrackSvg.alt = `Trazado ${track.name}`;
            }

            // Specs Matrix
            if (elements.modalTrackLength) elements.modalTrackLength.textContent = `${Number(track.length_km).toFixed(2)} km`;
            if (elements.modalTrackTurns) elements.modalTrackTurns.textContent = track.turns;
            if (elements.modalTrackElevation) elements.modalTrackElevation.textContent = `${Math.round(track.elevation_m)} m`;
            if (elements.modalTrackStraight) elements.modalTrackStraight.textContent = `${Math.round(track.longest_straight_m)} m`;
            if (elements.modalTrackLayouts) elements.modalTrackLayouts.textContent = `${track.layouts_count} variantes`;
            if (elements.modalTrackRecord) elements.modalTrackRecord.textContent = track.record_lap || 'N/A';
            if (elements.modalTrackFirstGame) elements.modalTrackFirstGame.textContent = track.first_game || 'Gran Turismo';

            // Extended Lore
            if (elements.modalHistoryGt) elements.modalHistoryGt.textContent = track.history_gt;
            if (elements.modalHistoryReal) elements.modalHistoryReal.textContent = track.history_real;
            if (elements.modalDrivingTips) elements.modalDrivingTips.textContent = track.driving_tips;

            // Curiosities List
            if (elements.modalCuriositiesList) {
                if (track.curiosities && track.curiosities.length > 0) {
                    elements.modalCuriositiesList.innerHTML = track.curiosities.map(c => `
                        <li class="gt-lore-item">
                            <i class="fas fa-check-circle text-dark me-2"></i>
                            <span>${c}</span>
                        </li>
                    `).join('');
                } else {
                    elements.modalCuriositiesList.innerHTML = `
                        <li class="gt-lore-item">
                            <i class="fas fa-info-circle text-muted me-2"></i>
                            <span>Trazado oficial recreado con precisión milimétrica en el motor de Gran Turismo 6.</span>
                        </li>
                    `;
                }
            }

            // Show Modal
            if (elements.modal) elements.modal.classList.add('is-open');
            if (elements.modalBackdrop) elements.modalBackdrop.classList.add('is-open');
            document.body.style.overflow = 'hidden';
        } catch (err) {
            console.error('Error opening track modal:', err);
        }
    }

    function closeTrackModal() {
        if (elements.modal) elements.modal.classList.remove('is-open');
        if (elements.modalBackdrop) elements.modalBackdrop.classList.remove('is-open');
        document.body.style.overflow = '';
    }

    function resetAllFilters() {
        state.search = '';
        state.sortBy = 'name_asc';

        if (elements.searchInput) elements.searchInput.value = '';
        if (elements.clearSearchBtn) elements.clearSearchBtn.style.display = 'none';
        if (elements.sortSelect) elements.sortSelect.value = 'name_asc';

        elements.subnavPills.forEach(p => {
            p.classList.toggle('is-active', p.getAttribute('data-section') === 'all');
        });

        renderCategorizedTracks(state.tracks);
    }

    // Event Listeners
    function setupEvents() {
        // Search Input (Real-time debounced)
        if (elements.searchInput) {
            elements.searchInput.addEventListener('input', (e) => {
                clearTimeout(searchDebounceTimer);
                searchDebounceTimer = setTimeout(() => {
                    state.search = e.target.value.trim();
                    renderCategorizedTracks(state.tracks);
                }, 200);

                if (elements.clearSearchBtn) {
                    elements.clearSearchBtn.style.display = e.target.value ? 'inline-flex' : 'none';
                }
            });
        }

        // Clear Search Button
        if (elements.clearSearchBtn) {
            elements.clearSearchBtn.addEventListener('click', () => {
                if (elements.searchInput) elements.searchInput.value = '';
                elements.clearSearchBtn.style.display = 'none';
                state.search = '';
                renderCategorizedTracks(state.tracks);
            });
        }

        // Reset Filters Button (empty state)
        if (elements.resetFiltersBtn) {
            elements.resetFiltersBtn.addEventListener('click', resetAllFilters);
        }

        // Subnav Pills Jump & Filter
        elements.subnavPills.forEach(btn => {
            btn.addEventListener('click', () => {
                elements.subnavPills.forEach(b => b.classList.remove('is-active'));
                btn.classList.add('is-active');

                const targetSec = btn.getAttribute('data-section');
                if (targetSec === 'all') {
                    // Reveal all sections and scroll to controls
                    CATEGORIES.forEach(cat => {
                        const secEl = document.getElementById(cat.sectionId);
                        if (secEl) secEl.style.display = 'block';
                    });
                    const nav = document.getElementById('gtCategoryNav');
                    if (nav) nav.scrollIntoView({ behavior: 'smooth' });
                } else {
                    const sec = document.getElementById(targetSec);
                    if (sec) {
                        sec.style.display = 'block';
                        sec.scrollIntoView({ behavior: 'smooth' });
                    }
                }
            });
        });

        // Sort Select
        if (elements.sortSelect) {
            elements.sortSelect.addEventListener('change', (e) => {
                state.sortBy = e.target.value;
                fetchTracks();
            });
        }

        // Modal Close Handlers
        if (elements.closeModalBtn) elements.closeModalBtn.addEventListener('click', closeTrackModal);
        if (elements.modalBackdrop) elements.modalBackdrop.addEventListener('click', closeTrackModal);

        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') closeTrackModal();
        });

        // Mobile Navbar Toggle (Defensive Guard)
        if (elements.pillMobileBtn && elements.pillMobileMenu) {
            elements.pillMobileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                elements.pillMobileMenu.classList.toggle('open');
                const icon = elements.pillMobileBtn.querySelector('i');
                if (icon) {
                    if (elements.pillMobileMenu.classList.contains('open')) {
                        icon.classList.remove('fa-bars');
                        icon.classList.add('fa-times');
                    } else {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });

            document.addEventListener('click', (e) => {
                if (!elements.pillMobileMenu.contains(e.target) && !elements.pillMobileBtn.contains(e.target)) {
                    elements.pillMobileMenu.classList.remove('open');
                    const icon = elements.pillMobileBtn.querySelector('i');
                    if (icon) {
                        icon.classList.remove('fa-times');
                        icon.classList.add('fa-bars');
                    }
                }
            });
        }
    }

    function init() {
        setupEvents();
        loadStats();
        fetchTracks();
    }

    window.gtCircuits = {
        init,
        fetchTracks,
        openTrackModal,
        resetAllFilters,
        state
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
