/* ==========================================================================
   RS OPTIMIZATION — stratul de efecte.

   Rulează după site.js și e complet opțional: dacă acest fișier nu se
   încarcă, pagina rămâne funcțională, doar fără preloader, cursor propriu,
   particule, demo cu taburi și grafic.

   Regula pe care o respectă tot ce e aici:
   nimic nu ascunde conținut fără să îl arate înapoi garantat.
   ========================================================================== */

(function () {
    'use strict';

    var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var A = window.RSApp || null;

    var esc = (A && A.esc) || function (s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
            return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
        });
    };

    document.addEventListener('DOMContentLoaded', function () {
        initTicker();
        initPreloader();
        initCursor();
        initParticles();
        initSplitTitle();
        initDemo();
        initBench();
        initNavScramble();
        initRevealSafety();
        watchPlans();
    });

    /* ======================================================== ticker ==
       Lista se scrie de doua ori la rand. Animatia muta banda cu exact
       jumatate din latimea ei, deci a doua copie ajunge fix unde era prima
       cand bucla o ia de la capat - de aici lipsa cusaturii. */
    function initTicker() {
        var host = document.getElementById('tickerTrack');
        if (!host) return;

        var WORDS = [
            'Cache FiveM', 'Fisiere temporare', 'Cache DNS', 'Game Mode',
            'Plan de alimentare', 'GameDVR', 'Cos de reciclare', 'Prefetch',
            'Cache subprocess', 'Server cache', 'Pornire automata', 'Memorie RAM',
            'Mod grafic', 'Verificare SHA-256', 'Backup automat', 'Restore Center'
        ];

        var one = WORDS.map(function (w) {
            return '<span class="ticker__i">' + esc(w) + '</span>';
        }).join('');

        host.innerHTML = one + one;
    }

    /* ====================================================== preloader ==
       Bara se umple în funcție de câte resurse s-au încărcat, nu pe un
       timer inventat. Dacă `load` nu se declanșează niciodată (imagine
       moartă, rețea proastă), plasa de siguranță din <head> scoate oricum
       ecranul după 4,5 secunde. */
    function initPreloader() {
        var el = document.getElementById('preload');
        if (!el) return;

        var arc = el.querySelector('.a');
        var num = el.querySelector('.preload__num');
        var CIRC = 396;
        var shown = 0;
        var target = 0;
        var loaded = false;
        var done = false;
        var t0 = Date.now();

        // Cat s-a incarcat efectiv din imaginile paginii.
        function realProgress() {
            var imgs = document.images;
            if (!imgs.length) return 1;
            var ok = 0;
            for (var i = 0; i < imgs.length; i++) if (imgs[i].complete) ok++;
            return ok / imgs.length;
        }

        window.addEventListener('load', function () { loaded = true; });
        if (document.readyState === 'complete') loaded = true;

        /* Bucla merge pe setInterval, nu pe requestAnimationFrame. Motivul:
           intr-un tab de fundal rAF e oprit complet, iar preloaderul ar
           ramane inghetat pana cand utilizatorul revine la pagina. */
        var timer = setInterval(function () {
            // Pana la `load` ne oprim la 92%, ca ultimul salt sa insemne ceva.
            target = loaded ? 1 : Math.min(.92, realProgress() * .92);
            shown += (target - shown) * .22;

            var elapsed = Date.now() - t0;
            if (loaded && (shown > .99 || elapsed > 2600)) shown = 1;

            var pct = Math.round(shown * 100);
            if (num) num.textContent = pct < 100 ? ('00' + pct).slice(-3) : '100';
            if (arc) arc.style.strokeDashoffset = String(CIRC - CIRC * shown);

            if (shown >= 1 && !done) { done = true; clearInterval(timer); finish(); }
        }, 40);

        function finish() {
            el.dataset.done = '1';
            setTimeout(function () {
                el.classList.add('is-done');
                document.body.classList.remove('is-loading');
                document.body.classList.add('is-lit');       // porneste titlul
                // Elementul se scoate din DOM ca sa nu blocheze click-uri.
                setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 1000);
            }, 260);
        }

        // Dacă preloaderul e sărit de plasa de siguranță, titlul tot trebuie pornit.
        setTimeout(function () { document.body.classList.add('is-lit'); }, 4600);
    }

    /* ========================================================= cursor ==
       Punctul urmărește exact poziția, inelul se apropie cu 18% pe cadru —
       de aici întârzierea. Bucla se oprește singură când mouse-ul stă. */
    function initCursor() {
        if (!fine || reduced) return;

        var dot = document.createElement('div');
        var ring = document.createElement('div');
        dot.className = 'cur';
        ring.className = 'cur-ring';
        document.body.appendChild(dot);
        document.body.appendChild(ring);
        document.body.classList.add('has-cursor');

        var mx = window.innerWidth / 2, my = window.innerHeight / 2;
        var rx = mx, ry = my;
        var running = false;

        function loop() {
            rx += (mx - rx) * .18;
            ry += (my - ry) * .18;
            ring.style.transform = 'translate(' + rx.toFixed(1) + 'px,' + ry.toFixed(1) + 'px)';

            // Sub jumătate de pixel diferență nu se mai vede — oprim bucla.
            if (Math.abs(mx - rx) < .5 && Math.abs(my - ry) < .5) { running = false; return; }
            requestAnimationFrame(loop);
        }

        document.addEventListener('pointermove', function (e) {
            mx = e.clientX; my = e.clientY;
            dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
            if (!running) { running = true; requestAnimationFrame(loop); }
        }, { passive: true });

        var HOT = 'a,button,input,select,textarea,summary,.card,.demo__tab,.faq__q,[role="button"]';
        document.addEventListener('pointerover', function (e) {
            if (e.target.closest && e.target.closest(HOT)) ring.classList.add('is-hot');
        });
        document.addEventListener('pointerout', function (e) {
            if (e.target.closest && e.target.closest(HOT)) ring.classList.remove('is-hot');
        });
        document.addEventListener('pointerdown', function () { ring.classList.add('is-down'); });
        document.addEventListener('pointerup', function () { ring.classList.remove('is-down'); });

        // Când cursorul iese din fereastră, ascundem ambele piese.
        document.addEventListener('mouseleave', function () { dot.style.opacity = ring.style.opacity = '0'; });
        document.addEventListener('mouseenter', function () { dot.style.opacity = ring.style.opacity = '1'; });
    }

    /* ====================================================== particule ==
       Rețea de puncte legate între ele când sunt suficient de apropiate.
       Numărul de particule vine din suprafață, nu e fix — pe telefon ies
       vreo 20, pe un monitor mare vreo 90.

       Bucla se oprește complet când hero-ul iese de pe ecran sau când
       fereastra e în fundal. Fără asta, ar mânca baterie degeaba. */
    function initParticles() {
        if (reduced) return;

        var cv = document.getElementById('heroCanvas');
        if (!cv || !cv.getContext) return;

        var ctx = cv.getContext('2d');
        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = 0, h = 0;
        var pts = [];
        var mouse = { x: -9999, y: -9999 };
        var frame = null;
        var visible = true;

        function size() {
            var r = cv.getBoundingClientRect();
            w = r.width; h = r.height;
            if (!w || !h) return false;

            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            var want = Math.round(Math.min(90, Math.max(18, (w * h) / 15000)));
            pts = [];
            for (var i = 0; i < want; i++) {
                pts.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - .5) * .28,
                    vy: (Math.random() - .5) * .28,
                    r: Math.random() * 1.5 + .7
                });
            }
            return true;
        }

        var LINK = 132;          // distanța sub care se trage o linie
        var PUSH = 150;          // raza în care cursorul împinge punctele

        function draw() {
            frame = null;
            ctx.clearRect(0, 0, w, h);

            for (var i = 0; i < pts.length; i++) {
                var p = pts[i];
                p.x += p.vx; p.y += p.vy;

                // Marginile întorc punctul înapoi, nu îl teleportează.
                if (p.x < 0 || p.x > w) { p.vx *= -1; p.x = Math.max(0, Math.min(w, p.x)); }
                if (p.y < 0 || p.y > h) { p.vy *= -1; p.y = Math.max(0, Math.min(h, p.y)); }

                var dx = p.x - mouse.x, dy = p.y - mouse.y;
                var d2 = dx * dx + dy * dy;
                if (d2 < PUSH * PUSH && d2 > .01) {
                    var d = Math.sqrt(d2);
                    var f = (1 - d / PUSH) * 1.1;
                    p.x += (dx / d) * f;
                    p.y += (dy / d) * f;
                }

                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, 6.2832);
                ctx.fillStyle = 'rgba(41,184,255,.55)';
                ctx.fill();

                for (var j = i + 1; j < pts.length; j++) {
                    var q = pts[j];
                    var ax = p.x - q.x, ay = p.y - q.y;
                    var dist = Math.sqrt(ax * ax + ay * ay);
                    if (dist > LINK) continue;

                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(q.x, q.y);
                    ctx.strokeStyle = 'rgba(41,184,255,' + (.16 * (1 - dist / LINK)).toFixed(3) + ')';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }

            if (visible) frame = requestAnimationFrame(draw);
        }

        function start() { if (!frame && visible) frame = requestAnimationFrame(draw); }
        function stop() { if (frame) { cancelAnimationFrame(frame); frame = null; } }

        if (!size()) return;
        start();

        window.addEventListener('resize', function () { if (size()) start(); });

        window.addEventListener('pointermove', function (e) {
            var r = cv.getBoundingClientRect();
            mouse.x = e.clientX - r.left;
            mouse.y = e.clientY - r.top;
        }, { passive: true });

        document.addEventListener('visibilitychange', function () {
            visible = !document.hidden;
            visible ? start() : stop();
        });

        // Hero-ul iese de pe ecran -> nu mai desenăm nimic.
        window.addEventListener('scroll', function () {
            var r = cv.getBoundingClientRect();
            var on = r.bottom > 0 && r.top < window.innerHeight;
            if (on === visible) return;
            visible = on && !document.hidden;
            visible ? start() : stop();
        }, { passive: true });
    }

    /* ==================================================== titlu spart ==
       h1-ul e umplut de site.js din config, deci așteptăm până apare text
       în el, apoi îl rescriem literă cu literă. Spațiile rămân spații
       normale ca să nu se strice ruperea rândurilor. */
    function initSplitTitle() {
        if (reduced) return;

        var el = document.getElementById('heroTitle');
        if (!el) return;

        /* site.js scrie titlul din config dupa ce se incarca site.json, iar
           in HTML exista deja un text implicit. Daca am sparge textul imediat,
           randarea urmatoare l-ar sterge. Asteptam pana cand subtitlul — care
           in HTML e gol — primeste continut: atunci hero-ul e gata scris. */
        var sub = document.getElementById('heroSub');
        var tries = 0;

        (function wait() {
            var ready = sub && (sub.textContent || '').trim().length > 0;
            var txt = (el.textContent || '').trim();

            if (!ready || !txt) {
                if (tries++ < 60) return setTimeout(wait, 60);
                if (!txt) return;                 // n-avem ce sparge
            }

            /* Gradientul decupat pe text (`chrome`) si literele separate nu pot
               coexista: fiecare litera isi face propriul strat si iese din
               decupare, deci textul ar disparea complet. Il scoatem, iar
               stralucirea o preia animatia `charWave` din CSS. */
            el.classList.remove('chrome');

            var out = '';
            for (var i = 0; i < txt.length; i++) {
                out += '<span class="sp sp--anim" style="--i:' + i + '">' +
                    esc(txt[i]) + '</span>';
            }
            el.innerHTML = out;
        })();
    }

    /* ================================================ demo cu taburi ==
       Un singur ecran de aplicație care se schimbă. Trece singur la
       următorul la 6 secunde; din clipa în care utilizatorul apasă un tab,
       rotația se oprește definitiv — nu îi mutăm ecranul sub mână. */
    function initDemo() {
        var tabsHost = document.getElementById('demoTabs');
        var screen = document.getElementById('demoScreen');
        if (!tabsHost || !screen || !A) return;

        var SCREENS = [
            { key: 'home',    label: 'Dashboard',      icon: 'i-gauge',   build: scrHome },
            { key: 'quick',   label: 'Quick Optimize', icon: 'i-bolt',    build: scrQuick },
            { key: 'fivem',   label: 'FiveM',          icon: 'i-broom',   build: scrFivem },
            { key: 'mod',     label: 'Graphics Mode',  icon: 'i-palette', build: scrMod },
            { key: 'monitor', label: 'System Monitor', icon: 'i-chart',   build: scrMonitor },
            { key: 'restore', label: 'Restore Center', icon: 'i-shield',  build: scrRestore }
        ];

        tabsHost.innerHTML = SCREENS.map(function (s, i) {
            return '<button class="demo__tab' + (i === 0 ? ' is-on' : '') + '" data-i="' + i + '" type="button">' +
                '<svg width="17" height="17"><use href="#' + s.icon + '"/></svg>' +
                esc(s.label) + '<i></i></button>';
        }).join('');

        var tabs = tabsHost.querySelectorAll('.demo__tab');
        var current = 0;
        var held = false;
        var timer = null;

        function show(i) {
            current = i;
            for (var k = 0; k < tabs.length; k++) tabs[k].classList.toggle('is-on', k === i);

            screen.innerHTML = SCREENS[i].build();
            // Fereastra nouă trebuie marcată vizibilă, altfel barele și
            // inelele (care pornesc de la `.is-in`) rămân la zero.
            var m = screen.querySelector('.mockup');
            if (m) requestAnimationFrame(function () { screen.classList.add('is-in'); });
        }

        function schedule() {
            clearTimeout(timer);
            if (held || reduced) return;
            timer = setTimeout(function () { show((current + 1) % SCREENS.length); schedule(); }, 6000);
        }

        tabsHost.addEventListener('click', function (e) {
            var b = e.target.closest('.demo__tab');
            if (!b) return;
            held = true;
            tabsHost.classList.add('is-held');
            clearTimeout(timer);
            show(Number(b.dataset.i));
        });

        // Rotația pornește doar când secțiunea e chiar pe ecran.
        var started = false;
        function maybeStart() {
            if (started) return;
            var r = screen.getBoundingClientRect();
            if (r.top > window.innerHeight || r.bottom < 0) return;
            started = true;
            schedule();
            window.removeEventListener('scroll', maybeStart);
        }

        show(0);
        window.addEventListener('scroll', maybeStart, { passive: true });
        maybeStart();

        /* ---- ecranele */

        function scrHome() {
            return A.frame('RS Optimization', 'Home',
                A.head('Dashboard', 'Intel i5-12400F · RTX 3060 · 16 GB', A.chip('ok', 'PC OPTIMIZAT')) +
                '<div class="gauges">' +
                    A.gauge('CPU', 22, '22%') + A.gauge('RAM', 41, '41%') + A.gauge('DISC', 68, '68%') +
                '</div>' +
                '<div class="rows">' +
                    A.row('FiveM detectat', 'C:\\Users\\...\\FiveM', ['ok', 'GĂSIT']) +
                    A.row('GTA V detectat', 'Steam', ['ok', 'GĂSIT']) +
                    A.row('Ultima optimizare', 'acum 2 zile', ['idle', 'ISTORIC']) +
                '</div>');
        }

        function scrQuick() {
            return A.frame('RS Optimization', 'Quick Optimize',
                A.head('Quick Optimize', 'Preset GAMING · 6 operațiuni', A.chip('run', 'ÎN LUCRU')) +
                A.pbar(72) +
                '<div class="rows">' +
                    A.row('Curățare cache FiveM', '8,4 GB', ['ok', 'GATA']) +
                    A.row('Fișiere temporare', '2,1 GB', ['ok', 'GATA']) +
                    A.row('Windows Game Mode', '', ['run', 'RULEAZĂ']) +
                    A.row('Plan de alimentare', '', ['idle', 'ÎN AȘTEPTARE']) +
                    A.row('Golire cache DNS', '', ['idle', 'ÎN AȘTEPTARE']) +
                '</div>');
        }

        function scrFivem() {
            return A.frame('RS Optimization', 'FiveM',
                A.head('FiveM', 'Cache, fișiere temporare și DNS', A.chip('ok', 'CURAT')) +
                '<div class="rows">' +
                    A.row('cache/priv', '5,9 GB', ['ok', 'ȘTERS']) +
                    A.row('cache/subprocess', '1,4 GB', ['ok', 'ȘTERS']) +
                    A.row('server-cache', '1,1 GB', ['ok', 'ȘTERS']) +
                    A.row('Cache DNS Windows', '', ['ok', 'GOLIT']) +
                '</div>' +
                '<div class="app__sub">Setările, temele și cheile de licență FiveM nu se ating.</div>');
        }

        function scrMod() {
            return A.frame('RS Optimization', 'Graphics Mode',
                A.head('Custom Graphics Mode', 'RS Graphics Mod 1.0', A.chip('ok', 'VERIFICAT')) +
                '<div class="rows">' +
                    A.row('Descărcare', '214 MB · 12,4 MB/s', ['ok', 'OK']) +
                    A.row('Verificare SHA-256', '', ['ok', 'OK']) +
                    A.row('Backup fișiere originale', '186 fișiere', ['run', 'RULEAZĂ']) +
                '</div>' +
                A.pbar(88) +
                '<div class="app__sub">Nimic din arhivă nu se execută. Se copiază doar fișiere de configurare.</div>');
        }

        function scrMonitor() {
            return A.frame('RS Optimization', 'System Monitor',
                A.head('System Monitor', 'Actualizare la fiecare secundă') +
                '<div class="gauges">' +
                    A.gauge('CPU', 34, '34%') + A.gauge('GPU', 61, '61%') + A.gauge('RAM', 47, '47%') +
                '</div>' +
                A.spark([30, 42, 38, 55, 48, 62, 57, 71, 64, 58, 66, 52, 60, 45, 51]));
        }

        function scrRestore() {
            return A.frame('RS Optimization', 'Restore Center',
                A.head('Restore Center', '4 modificări înregistrate', A.chip('ok', 'REVERSIBIL')) +
                '<div class="tbl">' +
                    '<div class="tbl__r"><span>GameDVR_Enabled → 0</span><code>REGISTRU</code></div>' +
                    '<div class="tbl__r"><span>Plan alimentare → Balanced</span><code>ENERGIE</code></div>' +
                    '<div class="tbl__r"><span>Mod grafic → 214 fișiere</span><code>FIȘIERE</code></div>' +
                    '<div class="tbl__r"><span>Curățare cache · 8,4 GB</span><code>ISTORIC</code></div>' +
                '</div>' +
                '<div class="app__sub">Un click restaurează valoarea anterioară pentru oricare dintre ele.</div>');
        }
    }

    /* ======================================================== grafic ==
       Grafic de timp per cadru: linia roșie are vârfuri (micro-freeze),
       linia albastră e stabilă. Valorile sunt generate dintr-o formulă
       fixă — e o ilustrație a formei, nu o măsurătoare, iar textul de sub
       grafic spune exact asta. */
    function initBench() {
        var cv = document.getElementById('benchChart');
        if (!cv || !cv.getContext) return;

        var ctx = cv.getContext('2d');
        var N = 90;

        // Aceeași secvență la fiecare încărcare: pseudo-aleator determinist.
        function noise(i, seed) {
            var x = Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453;
            return x - Math.floor(x);
        }

        var before = [], after = [];
        for (var i = 0; i < N; i++) {
            var base = 16.7 + Math.sin(i / 7) * 1.2;
            var spike = noise(i, 3) > .84 ? 14 + noise(i, 9) * 22 : 0;
            before.push(base + 6 + noise(i, 1) * 7 + spike);
            after.push(base + noise(i, 5) * 1.8);
        }

        var MAX = 56;
        var prog = 0;
        var running = false;

        function paint() {
            var r = cv.getBoundingClientRect();
            var dpr = Math.min(window.devicePixelRatio || 1, 2);
            var w = r.width, h = r.height;
            if (!w || !h) return;

            cv.width = Math.round(w * dpr);
            cv.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
            ctx.clearRect(0, 0, w, h);

            var pad = 6;
            var y = function (v) { return h - pad - (v / MAX) * (h - pad * 2); };
            var x = function (i) { return (i / (N - 1)) * w; };

            // caroiaj + praguri
            ctx.font = '10px Inter, system-ui, sans-serif';
            [16.7, 33.3, 50].forEach(function (v) {
                ctx.beginPath();
                ctx.setLineDash([3, 5]);
                ctx.moveTo(0, y(v)); ctx.lineTo(w, y(v));
                ctx.strokeStyle = 'rgba(255,255,255,.08)';
                ctx.lineWidth = 1;
                ctx.stroke();
                ctx.setLineDash([]);

                ctx.fillStyle = 'rgba(255,255,255,.28)';
                ctx.fillText(Math.round(v) + ' ms', 4, y(v) - 4);
            });

            var upTo = Math.max(2, Math.round(N * prog));

            function line(data, color, width, glow) {
                ctx.beginPath();
                for (var i = 0; i < upTo; i++) {
                    var px = x(i), py = y(data[i]);
                    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
                }
                ctx.strokeStyle = color;
                ctx.lineWidth = width;
                ctx.lineJoin = 'round';
                ctx.lineCap = 'round';
                if (glow) { ctx.shadowColor = color; ctx.shadowBlur = 10; }
                ctx.stroke();
                ctx.shadowBlur = 0;
            }

            line(before, 'rgba(248,113,113,.85)', 1.4, false);
            line(after, '#29b8ff', 2, true);

            // capul liniei albastre, cât timp se desenează
            if (prog < 1) {
                var lx = x(upTo - 1), ly = y(after[upTo - 1]);
                ctx.beginPath();
                ctx.arc(lx, ly, 3, 0, 6.2832);
                ctx.fillStyle = '#29b8ff';
                ctx.fill();
            }
        }

        function run() {
            if (running) return;
            running = true;

            if (reduced) { prog = 1; paint(); return; }

            var t0 = performance.now();
            (function step(now) {
                var e = Math.min(1, (now - t0) / 1500);
                prog = 1 - Math.pow(1 - e, 3);
                paint();
                if (e < 1) requestAnimationFrame(step);
            })(t0);
        }

        // Pornim când graficul intră pe ecran; la redimensionare doar redesenăm.
        function check() {
            var r = cv.getBoundingClientRect();
            if (r.top < window.innerHeight - 40 && r.bottom > 0) {
                run();
                window.removeEventListener('scroll', check);
            }
        }

        paint();
        window.addEventListener('scroll', check, { passive: true });
        window.addEventListener('resize', paint);
        check();
    }

    /* ============================================ nav: text amestecat ==
       La hover, litera se schimbă de câteva ori înainte să se așeze.
       Efectul durează 260 ms și se anulează dacă mouse-ul pleacă. */
    function initNavScramble() {
        if (reduced || !fine) return;

        var CH = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#$%&';

        document.querySelectorAll('.nav__links a').forEach(function (a) {
            var real = a.textContent;
            var timer = null;

            a.addEventListener('pointerenter', function () {
                clearInterval(timer);
                var f = 0;
                var total = 9;

                timer = setInterval(function () {
                    f++;
                    var out = '';
                    for (var i = 0; i < real.length; i++) {
                        // Literele se fixează de la stânga la dreapta.
                        out += (i < (f / total) * real.length || real[i] === ' ')
                            ? real[i]
                            : CH[Math.floor(Math.random() * CH.length)];
                    }
                    a.textContent = out;
                    if (f >= total) { clearInterval(timer); a.textContent = real; }
                }, 28);
            });

            a.addEventListener('pointerleave', function () {
                clearInterval(timer);
                a.textContent = real;
            });
        });
    }

    /* ============================================== plasa de siguranta ==
       Revelarea la scroll din site.js merge pe requestAnimationFrame. Intr-un
       tab de fundal rAF e oprit, iar acolo mecanismul se blocheaza definitiv:
       o cerere ramane marcata ca "in asteptare" si nu mai vine niciodata
       cadrul care sa o rezolve. Cine ar reveni la tab ar gasi jumatate din
       pagina goala.

       Aici masuram pe un interval simplu, care ruleaza si cand rAF nu ruleaza,
       si ne oprim singuri cand nu mai are ce sa apara. */
    function initRevealSafety() {
        var SEL = '.reveal-up:not(.is-in), .reveal-side:not(.is-in), ' +
                  '.reveal-pop:not(.is-in), .stack:not(.is-in)';
        var timer = null;

        function sweep() {
            var h = window.innerHeight || document.documentElement.clientHeight;
            var left = document.querySelectorAll(SEL);

            for (var i = 0; i < left.length; i++) {
                // Deliberat fara conditie pe marginea de jos: daca elementul a
                // ajuns cel putin pana la marginea de sus a ecranului, il
                // aratam, chiar daca intre timp a fost depasit prin scroll
                // rapid. Altfel ar ramane ascuns definitiv pana cand cineva
                // s-ar intoarce fix peste el.
                if (left[i].getBoundingClientRect().top < h - 40) left[i].classList.add('is-in');
            }

            // Nimic ramas nicaieri in pagina -> oprim verificarea.
            if (!document.querySelector(SEL)) {
                clearInterval(timer);
                window.removeEventListener('scroll', onScroll);
            }
        }

        var last = 0;
        function onScroll() {
            var now = Date.now();
            if (now - last < 140) return;
            last = now;
            sweep();
        }

        window.addEventListener('scroll', onScroll, { passive: true });
        window.addEventListener('resize', sweep);
        timer = setInterval(sweep, 700);
        setTimeout(sweep, 300);
    }

    /* ================================== prețuri: numărare + înclinare ==
       Cardurile sunt generate de site.js după ce se încarcă config-ul, deci
       le așteptăm cu un MutationObserver în loc să presupunem că există. */
    function watchPlans() {
        var host = document.getElementById('plansGrid');
        if (!host) return;

        var done = false;

        function enhance() {
            if (done || !host.children.length) return;
            done = true;

            if (fine && !reduced) tiltCards(host.querySelectorAll('.plan'));
            countPrices(host);
        }

        var mo = new MutationObserver(enhance);
        mo.observe(host, { childList: true });
        enhance();
        setTimeout(enhance, 1500);
    }

    function countPrices(host) {
        if (reduced) return;

        var els = host.querySelectorAll('.plan__amount');
        if (!els.length) return;

        var fired = false;

        function go() {
            if (fired) return;
            var r = host.getBoundingClientRect();
            if (r.top > window.innerHeight - 60 || r.bottom < 0) return;
            fired = true;
            window.removeEventListener('scroll', go);

            els.forEach(function (el) {
                var raw = el.textContent.trim();
                var target = parseFloat(raw.replace(/\s/g, '').replace(',', '.'));
                if (!isFinite(target)) return;

                var dec = raw.indexOf(',') >= 0 ? 2 : 0;
                var t0 = performance.now();

                (function step(now) {
                    var e = Math.min(1, (now - t0) / 900);
                    var v = target * (1 - Math.pow(1 - e, 3));
                    el.textContent = dec ? v.toFixed(2).replace('.', ',') : String(Math.round(v));
                    if (e < 1) requestAnimationFrame(step);
                    else el.textContent = raw;          // punem înapoi exact ce era
                })(t0);
            });
        }

        window.addEventListener('scroll', go, { passive: true });
        go();
    }

    function tiltCards(cards) {
        cards.forEach(function (card) {
            var frame = null;
            card.style.transformStyle = 'preserve-3d';

            card.addEventListener('pointermove', function (e) {
                if (frame) return;
                frame = requestAnimationFrame(function () {
                    frame = null;
                    var r = card.getBoundingClientRect();
                    if (!r.width || !r.height) return;

                    // Plafonat la ±0.5, ca un eveniment venit din afara
                    // ecranului să nu producă rotații absurde.
                    var px = Math.max(-.5, Math.min(.5, (e.clientX - r.left) / r.width - .5));
                    var py = Math.max(-.5, Math.min(.5, (e.clientY - r.top) / r.height - .5));

                    card.style.transform =
                        'perspective(900px) translateY(-6px) rotateY(' + (px * 6).toFixed(2) +
                        'deg) rotateX(' + (-py * 5).toFixed(2) + 'deg)';
                });
            });

            card.addEventListener('pointerleave', function () { card.style.transform = ''; });
        });
    }
})();
