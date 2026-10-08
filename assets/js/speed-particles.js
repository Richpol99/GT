/**
 * GT ACADEMY - MODERN GEOMETRIC PLEXUS CONSTELLATION
 * High-performance 60fps geometric data network.
 * Features floating telemetry nodes that interconnect with ultra-fine hairlines
 * and react magnetically to the cursor in strict GT Academy Blanco y Negro identity.
 */
(function () {
    'use strict';

    // Respect reduced motion accessibility preferences
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        return;
    }

    const canvas = document.getElementById('gtGlobalParticlesCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const track = document.getElementById('heroTrack') || document.body;

    // Simulation Config
    const NODE_COUNT = 65;
    const MAX_DISTANCE = 115;
    const MOUSE_RADIUS = 145;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let animationFrameId = null;
    let isVisible = true;

    // Mouse & Touch Tracking
    let mouseX = -1000;
    let mouseY = -1000;
    let isMouseOnScreen = false;

    // Pulse Wave Dynamics on Click / Chapter Change
    const pulses = [];

    // Node Object Pool
    const nodes = [];

    class PlexusNode {
        constructor() {
            this.x = Math.random() * (width || window.innerWidth);
            this.y = Math.random() * (height || window.innerHeight);
            
            // Very smooth, subtle floating drift
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.25 + Math.random() * 0.45;
            this.vx = Math.cos(angle) * speed;
            this.vy = Math.sin(angle) * speed;

            // Micro point dimensions
            this.radius = 1.2 + Math.random() * 0.9;
            this.alpha = 0.25 + Math.random() * 0.35;

            // Spring displacement offset (for pulses / interactive force)
            this.ox = 0;
            this.oy = 0;
        }

        update() {
            // Apply drift
            this.x += this.vx;
            this.y += this.vy;

            // Spring relaxation on interactive displacement
            this.ox *= 0.92;
            this.oy *= 0.92;

            // Bounce smoothly off viewport boundaries
            if (this.x < 0) {
                this.x = 0;
                this.vx *= -1;
            } else if (this.x > width) {
                this.x = width;
                this.vx *= -1;
            }

            if (this.y < 0) {
                this.y = 0;
                this.vy *= -1;
            } else if (this.y > height) {
                this.y = height;
                this.vy *= -1;
            }

            // Magnetic response to cursor
            if (isMouseOnScreen) {
                const px = this.x + this.ox;
                const py = this.y + this.oy;
                const dx = px - mouseX;
                const dy = py - mouseY;
                const distSq = dx * dx + dy * dy;

                if (distSq < MOUSE_RADIUS * MOUSE_RADIUS && distSq > 0) {
                    const dist = Math.sqrt(distSq);
                    // Soft push away if too close, gentle attraction if at boundary
                    if (dist < 60) {
                        const push = (1 - dist / 60) * 1.5;
                        this.ox += (dx / dist) * push;
                        this.oy += (dy / dist) * push;
                    }
                }
            }
        }

        draw(context) {
            const renderX = this.x + this.ox;
            const renderY = this.y + this.oy;

            context.save();
            context.fillStyle = `rgba(15, 23, 42, ${this.alpha})`;
            context.beginPath();
            context.arc(renderX, renderY, this.radius, 0, Math.PI * 2);
            context.fill();
            context.restore();
        }
    }

    function resize() {
        const rect = track.getBoundingClientRect();
        width = Math.max(rect.width || window.innerWidth, 320);
        height = Math.max(rect.height || window.innerHeight, 480);

        dpr = Math.min(window.devicePixelRatio || 1, 2);
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';

        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
    }

    function initNodes() {
        nodes.length = 0;
        for (let i = 0; i < NODE_COUNT; i++) {
            nodes.push(new PlexusNode());
        }
    }

    function triggerPulseWave(originX, originY) {
        pulses.push({
            x: originX || width * 0.5,
            y: originY || height * 0.5,
            radius: 5,
            maxRadius: Math.max(width, height) * 0.65,
            speed: 12,
            strength: 10
        });
    }

    function updateAndDrawConnections() {
        ctx.lineWidth = 0.55;

        // 1. Inter-node Connections
        for (let i = 0; i < nodes.length; i++) {
            const na = nodes[i];
            const ax = na.x + na.ox;
            const ay = na.y + na.oy;

            for (let j = i + 1; j < nodes.length; j++) {
                const nb = nodes[j];
                const bx = nb.x + nb.ox;
                const by = nb.y + nb.oy;

                const dx = ax - bx;
                const dy = ay - by;
                const distSq = dx * dx + dy * dy;

                if (distSq < MAX_DISTANCE * MAX_DISTANCE) {
                    const dist = Math.sqrt(distSq);
                    const lineAlpha = (1 - dist / MAX_DISTANCE) * 0.15;

                    ctx.strokeStyle = `rgba(15, 23, 42, ${lineAlpha})`;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(bx, by);
                    ctx.stroke();
                }
            }

            // 2. Cursor Connections
            if (isMouseOnScreen) {
                const cdx = ax - mouseX;
                const cdy = ay - mouseY;
                const cdistSq = cdx * cdx + cdy * cdy;

                if (cdistSq < MOUSE_RADIUS * MOUSE_RADIUS) {
                    const cdist = Math.sqrt(cdistSq);
                    const cursorAlpha = (1 - cdist / MOUSE_RADIUS) * 0.24;

                    ctx.strokeStyle = `rgba(0, 0, 0, ${cursorAlpha})`;
                    ctx.beginPath();
                    ctx.moveTo(ax, ay);
                    ctx.lineTo(mouseX, mouseY);
                    ctx.stroke();
                }
            }
        }
    }

    function updatePulses() {
        for (let p = pulses.length - 1; p >= 0; p--) {
            const pulse = pulses[p];
            pulse.radius += pulse.speed;

            // Push nodes as pulse passes them
            for (let i = 0; i < nodes.length; i++) {
                const n = nodes[i];
                const dx = (n.x + n.ox) - pulse.x;
                const dy = (n.y + n.oy) - pulse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                const ringDist = Math.abs(dist - pulse.radius);
                if (ringDist < 40 && dist > 0) {
                    const force = (1 - ringDist / 40) * (pulse.strength * (1 - pulse.radius / pulse.maxRadius));
                    n.ox += (dx / dist) * force;
                    n.oy += (dy / dist) * force;
                }
            }

            if (pulse.radius >= pulse.maxRadius) {
                pulses.splice(p, 1);
            }
        }
    }

    function render() {
        if (!isVisible) return;

        ctx.clearRect(0, 0, width, height);

        // Update physics
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].update();
        }

        // Process wave pulses
        updatePulses();

        // Draw connections first (behind nodes)
        updateAndDrawConnections();

        // Draw nodes on top of lines
        for (let i = 0; i < nodes.length; i++) {
            nodes[i].draw(ctx);
        }

        animationFrameId = requestAnimationFrame(render);
    }

    // Global Event Listeners
    window.addEventListener('resize', () => {
        resize();
    }, { passive: true });

    window.addEventListener('mousemove', (e) => {
        const rect = canvas.getBoundingClientRect();
        mouseX = e.clientX - rect.left;
        mouseY = e.clientY - rect.top;
        isMouseOnScreen = true;
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
        isMouseOnScreen = false;
        mouseX = -1000;
        mouseY = -1000;
    });

    window.addEventListener('click', (e) => {
        const rect = canvas.getBoundingClientRect();
        triggerPulseWave(e.clientX - rect.left, e.clientY - rect.top);
    });

    // Chapter navigation triggers wave pulse from center
    const prevBtn = document.getElementById('applePrevBtn');
    const nextBtn = document.getElementById('appleNextBtn');
    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            triggerPulseWave(width * 0.5, height * 0.5);
        });
    }
    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            triggerPulseWave(width * 0.5, height * 0.5);
        });
    }

    const indicators = document.querySelectorAll('.apple-indicator');
    indicators.forEach(btn => {
        btn.addEventListener('click', () => {
            triggerPulseWave(width * 0.5, height * 0.5);
        });
    });

    // Energy saving when tab is hidden
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            isVisible = false;
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
                animationFrameId = null;
            }
        } else {
            isVisible = true;
            if (!animationFrameId) {
                animationFrameId = requestAnimationFrame(render);
            }
        }
    });

    // Initialize
    resize();
    initNodes();
    animationFrameId = requestAnimationFrame(render);
})();
