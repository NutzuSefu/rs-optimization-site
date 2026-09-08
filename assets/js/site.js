/* ==========================================================================
   RS OPTIMIZATION — logica paginii publice.
   Tot continutul vine din data/site.json (sau din api/config.php).
   ========================================================================== */

(function () {
    'use strict';

    var S = window.RSStore;
    var $ = function (id) { return document.getElementById(id); };
    var esc = S.escapeHtml;

    var config = null;
    var coupon = null;

    // =========================================================== bootstrap
    document.addEventListener('DOMContentLoaded', function () {
        initNav();
        initFooterYear();
        initProgress();

        S.load().then(function (cfg) {
            config = cfg;
            coupon = S.activeCoupon(cfg, cfg.popup && cfg.popup.couponCode);
            renderAll();
            initReveal();
            initMagnetic();
            initPopup();
        }).catch(function (err) {
            console.error('Nu am putut incarca site.json', err);
            toast('Conținutul nu a putut fi încărcat. Reîncarcă pagina.', 'err');
        });
    });

    // ================================================================ nav
    function initNav() {
        var nav = $('nav'), burger = $('burger'), links = $('navLinks');

        var onScroll = function () {
            nav.classList.toggle('is-stuck', window.scrollY > 8);
            highlightSection();
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();

        burger.addEventListener('click', function () {
            var open = links.classList.toggle('is-open');
            burger.classList.toggle('is-open', open);
            burger.setAttribute('aria-expanded', String(open));
        });

        links.addEventListener('click', function (e) {
            if (e.target.closest('a')) {
                links.classList.remove('is-open');
                burger.classList.remove('is-open');
                burger.setAttribute('aria-expanded', 'false');
            }
        });
    }

    var navAnchors = null;
    function highlightSection() {
        navAnchors = navAnchors || Array.prototype.slice.call(document.querySelectorAll('.nav__links a[href^="#"]'));
        var pos = window.scrollY + 140, current = '';
        navAnchors.forEach(function (a) {
            var el = document.querySelector(a.getAttribute('href'));
            if (el && el.offsetTop <= pos) current = a.getAttribute('href');
        });
        navAnchors.forEach(function (a) { a.classList.toggle('is-active', a.getAttribute('href') === current); });
    }

    function initFooterYear() { $('year').textContent = new Date().getFullYear(); }

    /** Linia subțire din capul paginii, care arată cât ai parcurs. */
    function initProgress() {
        var bar = $('progress');
        if (!bar) return;

        var queued = false;
        function update() {
            queued = false;
            var max = document.documentElement.scrollHeight - window.innerHeight;
            bar.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : 0);
        }
        window.addEventListener('scroll', function () {
            if (queued) return;
            queued = true;
            requestAnimationFrame(update);
        }, { passive: true });
        window.addEventListener('resize', update);
        update();
    }

    /**
     * Butoanele principale se lasă puțin atrase de cursor. Deplasarea e mică
     * (max 5px) — cât să se simtă, nu cât să deranjeze.
     */
    function initMagnetic() {
        if (window.matchMedia('(hover: none)').matches) return;

        document.querySelectorAll('.shiny, .btn--primary').forEach(function (btn) {
            var frame = null;

            btn.addEventListener('pointermove', function (e) {
                if (frame) return;
                frame = requestAnimationFrame(function () {
                    frame = null;
                    var r = btn.getBoundingClientRect();
                    var dx = clamp((e.clientX - r.left) / r.width - .5, -.5, .5) * 10;
                    var dy = clamp((e.clientY - r.top) / r.height - .5, -.5, .5) * 6;
                    btn.style.transform = 'translate(' + dx.toFixed(1) + 'px,' + dy.toFixed(1) + 'px)';
                });
            });

            btn.addEventListener('pointerleave', function () { btn.style.transform = ''; });
        });
    }

    // ============================================================= render
    function renderAll() {
        renderMeta();
        renderAnnounce();
        renderHero();
        renderStats();
        renderIntro();
        renderFeatures();
        renderShowcase();
        renderSteps();
        renderCouponBanner();
        renderPlans();
        renderReviews();
        renderFaq();
        renderDiscord();
        renderFooter();
        renderLinks();
    }

    function renderMeta() {
        var seo = config.seo || {};
        if (seo.title) document.title = seo.title;
        var d = document.querySelector('meta[name="description"]');
        if (d && seo.description) d.setAttribute('content', seo.description);
    }

    function renderAnnounce() {
        var a = config.announcement || {};
        if (!a.enabled || !a.text) return;
        if (sessionStorage.getItem('rsopt.announce.hidden') === '1') return;

        var box = $('announce'), href = S.safeUrl(a.href);
        $('announceText').innerHTML = href
            ? '<a href="' + esc(href) + '" target="_blank" rel="noopener">' + esc(a.text) + '</a>'
            : esc(a.text);
        box.hidden = false;

        $('announceClose').addEventListener('click', function () {
            box.hidden = true;
            try { sessionStorage.setItem('rsopt.announce.hidden', '1'); } catch (e) { /* ignora */ }
        });
    }

    function renderHero() {
        var h = config.hero || {};
        setText('heroBadge', h.badge);
        setText('heroTitle', h.title);
        setText('heroSub', h.subtitle);
        setText('heroNote', h.note);

        startRotator(h.words && h.words.length ? h.words : [h.titleAccent || 'optimizat.']);

        if (h.ctaPrimary) {
            var c1 = $('heroCta1');
            // butonul are un <span> interior de care depinde efectul de bordură
            var label = c1.querySelector('span') || c1;
            label.textContent = h.ctaPrimary.label || 'Vezi pachetele';
            c1.href = h.ctaPrimary.href || '#shop';
        }
        if (h.ctaSecondary) {
            var c2 = $('heroCta2');
            c2.textContent = h.ctaSecondary.label || 'INTRĂ PE DISCORD';
            c2.href = h.ctaSecondary.href || '#discord';
        }
    }

    /**
     * Cuvântul care se schimbă în titlu. Un singur element vizibil la un moment
     * dat; înălțimea rândului e fixată în CSS, ca titlul să nu salte.
     */
    function startRotator(words) {
        var host = $('heroRotator');
        if (!host) return;

        host.innerHTML = words.map(function (w, i) {
            return '<span class="rotator__word' + (i === 0 ? ' is-in' : '') + '">' + esc(w) + '</span>';
        }).join('');

        if (words.length < 2) {
            host.firstChild.classList.add('is-in');
            return;
        }

        var items = host.querySelectorAll('.rotator__word');
        var index = 0;

        setInterval(function () {
            var current = items[index];
            index = (index + 1) % items.length;
            var next = items[index];

            current.classList.remove('is-in');
            current.classList.add('is-out');
            next.classList.remove('is-out');
            next.classList.add('is-in');
        }, 2600);
    }

    function renderStats() {
        var stats = config.stats || [];
        var show = !config.settings || config.settings.showStats !== false;
        if (!show || !stats.length) { $('statsSection').hidden = true; return; }

        $('statsGrid').innerHTML = stats.map(function (s) {
            return '<div class="stats__item">' +
                '<div class="stats__value" data-count="' + esc(s.value) + '">' + esc(s.value) + '</div>' +
                '<div class="stats__label">' + esc(s.label) + '</div>' +
                '</div>';
        }).join('');

        $('statsGrid').classList.add('reveal-up');
    }

    /**
     * Cifrele urcă de la zero când bara intră în ecran. Partea numerică e
     * extrasă din text, iar prefixul/sufixul („10.000+", „24/7") se păstrează.
     */
    function animateCounters() {
        document.querySelectorAll('.stats__value[data-count]').forEach(function (el) {
            var raw = el.getAttribute('data-count') || '';
            var match = raw.match(/[\d.,]+/);
            if (!match) return;

            var numText = match[0];
            var target = parseFloat(numText.replace(/\./g, '').replace(',', '.'));
            if (!isFinite(target) || target <= 0) return;

            var before = raw.slice(0, match.index);
            var after = raw.slice(match.index + numText.length);
            var hasThousands = numText.indexOf('.') > -1;
            var start = performance.now();
            var dur = 1400;

            function tick(now) {
                var t = Math.min((now - start) / dur, 1);
                var eased = 1 - Math.pow(1 - t, 3);
                var v = Math.round(target * eased);
                el.textContent = before + (hasThousands ? v.toLocaleString('ro-RO') : v) + after;
                if (t < 1) requestAnimationFrame(tick);
                else el.textContent = raw;
            }
            requestAnimationFrame(tick);
        });
    }

    function renderFeatures() {
        var items = config.features || [];
        $('featuresGrid').innerHTML = items.map(function (f) {
            return '<article class="card feature reveal-pop">' +
                '<div class="feature__icon"><svg width="26" height="26"><use href="#i-' + esc(f.icon || 'bolt') + '"/></svg></div>' +
                '<h3>' + esc(f.title) + '</h3>' +
                '<p>' + esc(f.text) + '</p>' +
                '</article>';
        }).join('');
        bindCardGlow();
    }

    /** Secțiunea „Ce facem": text centrat + carduri stivuite lângă fereastra aplicației. */
    function renderIntro() {
        var intro = config.intro || {};
        setText('introEyebrow', intro.eyebrow);
        setText('introTitle', intro.title);
        setText('introText', intro.text);

        var highlights = config.highlights || [];
        $('highlightStack').innerHTML = highlights.map(function (h) {
            return '<div class="stack__card">' +
                '<div class="stack__label">' +
                    '<svg width="14" height="14"><use href="#i-check"/></svg>' + esc(h.label) +
                '</div>' +
                '<div class="stack__title">' + esc(h.title) + '</div>' +
                '<div class="stack__meta">' + esc(h.meta) + '</div>' +
                '</div>';
        }).join('');

        $('splitMockup').innerHTML = '<div class="stage">' + mockupMonitor() + '</div>';
    }

    function renderShowcase() {
        var intro = config.showcaseIntro || {};
        setText('showcaseEyebrow', intro.eyebrow);
        setText('showcaseTitle', intro.title);
        setText('showcaseText', intro.text);

        var rows = config.showcase || [];
        var mock = [mockupMod, mockupRestore, mockupOptimize];

        $('showcase').innerHTML = rows.map(function (r, i) {
            var bullets = (r.bullets || []).map(function (b) {
                // Convenție: „Titlu — descriere". Fără liniuță, se afișează doar titlul.
                var parts = String(b).split(' — ');
                var head = parts.shift();
                var rest = parts.join(' — ');

                return '<li>' +
                    '<span class="feature-list__icon"><svg width="13" height="13"><use href="#i-check"/></svg></span>' +
                    '<div><strong>' + esc(head) + '</strong>' +
                    (rest ? '<span>' + esc(rest) + '</span>' : '') + '</div>' +
                    '</li>';
            }).join('');

            return '<div class="showcase__row">' +
                '<div class="showcase__media stage">' + (mock[i] || mock[0])() + '</div>' +
                '<div class="showcase__copy reveal-side">' +
                    (r.eyebrow ? '<p class="eyebrow">' + esc(r.eyebrow) + '</p>' : '') +
                    '<h3>' + esc(r.title) + '</h3>' +
                    '<p>' + esc(r.text) + '</p>' +
                    '<ul class="feature-list">' + bullets + '</ul>' +
                '</div>' +
                '</div>';
        }).join('');
    }

    /* ============================================ ferestrele aplicației ==
       Reconstrucție în HTML a interfeței RS OPTIMIZATION. Fiecare secțiune
       arată alt ecran, cu meniul lateral evidențiat corespunzător.
       ==================================================================== */

    var NAV = ['Home', 'Quick Optimize', 'FiveM', 'Graphics Mode', 'System Monitor', 'Restore Center'];

    function appFrame(title, activeNav, body) {
        var nav = NAV.map(function (n) {
            return '<div class="app__nav' + (n === activeNav ? ' is-on' : '') + '"><b></b>' + esc(n) + '</div>';
        }).join('');

        return '<div class="mockup">' +
            '<div class="mockup__bar">' +
                '<span class="mockup__dot mockup__dot--live"></span>' +
                '<span class="mockup__dot"></span><span class="mockup__dot"></span>' +
                '<span class="mockup__title">' + esc(title) + '</span>' +
            '</div>' +
            '<div class="app">' +
                '<aside class="app__side">' +
                    '<div class="app__brand"><i></i><span>RS OPT</span></div>' + nav +
                '</aside>' +
                '<main class="app__main">' + body + '</main>' +
            '</div>' +
            '</div>';
    }

    function head(title, sub, chip) {
        return '<div class="app__head"><div>' +
            '<div class="app__h">' + esc(title) + '</div>' +
            (sub ? '<div class="app__sub">' + esc(sub) + '</div>' : '') +
            '</div>' + (chip || '') + '</div>';
    }

    function chip(kind, text) { return '<span class="chip chip--' + kind + '">' + esc(text) + '</span>'; }

    function taskRow(label, value, kind) {
        return '<div class="row">' +
            '<span class="row__i"><svg width="10" height="10"><use href="#i-check"/></svg></span>' +
            '<span class="row__t">' + esc(label) + '</span>' +
            (value ? '<span class="row__v">' + esc(value) + '</span>' : '') +
            (kind ? chip(kind[0], kind[1]) : '') +
            '</div>';
    }

    function progress(pct) { return '<div class="pbar"><i style="--w:' + pct + '%"></i></div>'; }

    /** Inel de măsurare: circumferința e fixă, iar offset-ul dă procentul. */
    function gauge(label, pct, value) {
        var r = 20, c = 2 * Math.PI * r;
        var off = c - (c * pct / 100);
        return '<div class="gauge">' +
            '<div class="gauge__w">' +
                '<svg viewBox="0 0 48 48">' +
                    '<circle class="track" cx="24" cy="24" r="' + r + '"/>' +
                    '<circle class="arc" cx="24" cy="24" r="' + r + '" style="--c:' + c.toFixed(1) + ';--off:' + off.toFixed(1) + '"/>' +
                '</svg>' +
                '<span class="gauge__v">' + esc(value) + '</span>' +
            '</div>' +
            '<span class="gauge__l">' + esc(label) + '</span>' +
            '</div>';
    }

    /** Grafic mic, generat dintr-un șir de valori 0-100. */
    function spark(values) {
        var w = 260, h = 44, step = w / (values.length - 1);
        var pts = values.map(function (v, i) { return [i * step, h - (v / 100) * (h - 6) - 3]; });
        var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
        return '<svg class="spark" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
            '<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">' +
                '<stop offset="0%" stop-color="#29b8ff" stop-opacity=".35"/>' +
                '<stop offset="100%" stop-color="#29b8ff" stop-opacity="0"/>' +
            '</linearGradient></defs>' +
            '<path class="fill" d="' + d + ' L' + w + ' ' + h + ' L0 ' + h + ' Z"/>' +
            '<path class="line" d="' + d + '"/>' +
            '</svg>';
    }

    function mockupOptimize() {
        return appFrame('RS Optimization', 'Quick Optimize',
            head('Quick Optimize', 'Preset GAMING · 6 operațiuni', chip('run', 'ÎN LUCRU')) +
            progress(72) +
            '<div class="rows">' +
                taskRow('Curățare cache FiveM', '8,4 GB', ['ok', 'GATA']) +
                taskRow('Fișiere temporare', '2,1 GB', ['ok', 'GATA']) +
                taskRow('Windows Game Mode', '', ['run', 'RULEAZĂ']) +
                taskRow('Plan de alimentare', '', ['idle', 'ÎN AȘTEPTARE']) +
            '</div>');
    }

    function mockupMod() {
        return appFrame('RS Optimization', 'Graphics Mode',
            head('Custom Graphics Mode', 'RS Graphics Mod 1.0', chip('ok', 'VERIFICAT')) +
            '<div class="rows">' +
                taskRow('Descărcare', '214 MB · 12,4 MB/s', ['ok', 'OK']) +
                taskRow('Verificare SHA-256', '', ['ok', 'OK']) +
                taskRow('Backup fișiere originale', '186 fișiere', ['run', 'RULEAZĂ']) +
            '</div>' +
            progress(88) +
            '<div class="app__sub">Se copiază în GTA V — orice fișier înlocuit e salvat înainte.</div>');
    }

    function mockupRestore() {
        return appFrame('RS Optimization', 'Restore Center',
            head('Restore Center', '4 modificări înregistrate', chip('ok', 'REVERSIBIL')) +
            '<div class="tbl">' +
                '<div class="tbl__r"><span>GameDVR_Enabled → 0</span><code>REGISTRU</code></div>' +
                '<div class="tbl__r"><span>Plan alimentare → Balanced</span><code>ENERGIE</code></div>' +
                '<div class="tbl__r"><span>Mod grafic → 214 fișiere</span><code>FIȘIERE</code></div>' +
                '<div class="tbl__r"><span>Curățare cache · 8,4 GB</span><code>ISTORIC</code></div>' +
            '</div>' +
            '<div class="app__sub">Un click restaurează valoarea anterioară pentru oricare dintre ele.</div>');
    }

    function mockupMonitor() {
        return appFrame('RS Optimization', 'System Monitor',
            head('System Monitor', 'Actualizare la fiecare secundă') +
            '<div class="gauges">' +
                gauge('CPU', 34, '34%') +
                gauge('GPU', 61, '61%') +
                gauge('RAM', 47, '47%') +
            '</div>' +
            spark([30, 42, 38, 55, 48, 62, 57, 71, 64, 58, 66, 52, 60, 45, 51]));
    }

    function renderSteps() {
        var steps = config.steps || [];
        $('stepsGrid').innerHTML = steps.map(function (s, i) {
            return '<div class="step reveal-pop">' +
                '<div class="step__num">' + (i + 1) + '</div>' +
                '<h3>' + esc(s.title) + '</h3>' +
                '<p>' + esc(s.text) + '</p>' +
                '</div>';
        }).join('');
    }

    function renderCouponBanner() {
        var show = !config.settings || config.settings.showCouponBanner !== false;
        if (!show || !coupon) return;
        $('couponBannerCode').textContent = coupon.code;
        $('couponBannerDesc').textContent = coupon.description ? '— ' + coupon.description : '';
        $('couponBanner').hidden = false;
    }

    function renderPlans() {
        var products = (config.products || []).filter(function (p) { return p.enabled !== false; });
        var cur = (config.settings && config.settings.currencySymbol) || 'RON';

        if (!products.length) {
            $('plansGrid').innerHTML = '<p style="grid-column:1/-1;text-align:center;color:var(--text-3)">' +
                'Momentan nu există pachete publicate.</p>';
            return;
        }

        $('plansGrid').innerHTML = products.map(function (p) {
            var features = (p.features || []).map(function (f) {
                return '<li><svg width="16" height="16"><use href="#i-check"/></svg><span>' + esc(f) + '</span></li>';
            }).join('');

            var discounted = '';
            if (coupon) {
                var final = S.applyCoupon(Number(p.price) || 0, coupon);
                if (final < (Number(p.price) || 0)) {
                    discounted = '<div class="plan__discounted">' +
                        '<svg width="15" height="15"><use href="#i-tag"/></svg>' +
                        'cu <b>' + esc(coupon.code) + '</b> plătești <b>' + fmt(final) + ' ' + esc(p.currency || cur) + '</b>' +
                        '</div>';
                }
            }

            var href = S.safeUrl(p.buyUrl) || S.safeUrl(config.links && config.links.discord) || '#discord';
            var external = /^https?:/i.test(href);

            return '<article class="card plan reveal-pop' + (p.popular ? ' plan--popular' : '') + '">' +
                (p.badge ? '<div class="plan__badge">' + esc(p.badge) + '</div>' : '') +
                '<div class="plan__name">' + esc(p.name) + '</div>' +
                '<p class="plan__desc">' + esc(p.description) + '</p>' +
                '<div class="plan__price">' +
                    '<span class="plan__amount chrome">' + fmt(p.price) + '</span>' +
                    '<span class="plan__cur">' + esc(p.currency || cur) + '</span>' +
                    (Number(p.oldPrice) > 0 ? '<span class="plan__old">' + fmt(p.oldPrice) + '</span>' : '') +
                '</div>' +
                '<div class="plan__period">' + esc(p.period || '') + '</div>' +
                discounted +
                '<ul class="plan__features">' + features + '</ul>' +
                '<a class="btn ' + (p.popular ? 'btn--primary' : '') + ' btn--block" href="' + esc(href) + '"' +
                    (external ? ' target="_blank" rel="noopener"' : '') + '>' +
                    esc(p.buyLabel || 'CUMPĂRĂ') +
                '</a>' +
                '</article>';
        }).join('');
        bindCardGlow();
    }

    function renderReviews() {
        var items = config.testimonials || [];
        var show = !config.settings || config.settings.showTestimonials !== false;
        if (!show || !items.length) { document.getElementById('reviews').hidden = true; return; }

        // Lista e dublată: animația mută exact jumătate, deci bucla e continuă.
        var cards = items.concat(items).map(function (t) {
            var stars = '';
            for (var i = 0; i < (Number(t.rating) || 5); i++) stars += '<svg width="15" height="15"><use href="#i-star"/></svg>';
            var initials = String(t.name || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

            return '<article class="card quote">' +
                '<div class="quote__stars">' + stars + '</div>' +
                '<p>&ldquo;' + esc(t.text) + '&rdquo;</p>' +
                '<div class="quote__who">' +
                    '<div class="quote__avatar">' + esc(initials) + '</div>' +
                    '<div><div class="quote__name">' + esc(t.name) + '</div>' +
                    '<div class="quote__role">' + esc(t.role) + '</div></div>' +
                '</div>' +
                '</article>';
        }).join('');

        $('reviewsGrid').className = 'marquee';
        $('reviewsGrid').innerHTML = '<div class="marquee__track">' + cards + '</div>';
        bindCardGlow();
    }

    function renderFaq() {
        var items = config.faq || [];
        var visible = Number(config.settings && config.settings.faqVisibleCount) || 4;

        $('faqList').innerHTML = items.map(function (f, i) {
            return '<div class="faq__item reveal-up"' + (i >= visible ? ' hidden' : '') + '>' +
                '<button class="faq__q" aria-expanded="false" aria-controls="faq-a-' + i + '">' +
                    '<span>' + esc(f.q) + '</span>' +
                    '<span class="faq__sign"><svg width="13" height="13"><use href="#i-plus"/></svg></span>' +
                '</button>' +
                '<div class="faq__a" id="faq-a-' + i + '"><div><p>' + esc(f.a) + '</p></div></div>' +
                '</div>';
        }).join('');

        $('faqList').addEventListener('click', function (e) {
            var btn = e.target.closest('.faq__q');
            if (!btn) return;
            var item = btn.parentElement;
            var open = item.classList.toggle('is-open');
            btn.setAttribute('aria-expanded', String(open));
        });

        // „Vezi mai multe" apare doar dacă sunt întrebări ascunse.
        var more = $('faqMore');
        var hidden = items.length - visible;
        if (hidden <= 0) return;

        more.hidden = false;
        more.textContent = 'Vezi toate întrebările (' + hidden + ')';
        more.addEventListener('click', function () {
            var rest = $('faqList').querySelectorAll('.faq__item[hidden]');
            rest.forEach(function (el) { el.hidden = false; el.classList.add('is-in'); });
            more.hidden = true;
        });
    }

    function renderDiscord() {
        var d = config.discordCta || {};
        setText('discordEyebrow', d.eyebrow);
        setText('discordTitle', d.title);
        setText('discordText', d.text);
        if (d.buttonLabel) $('discordBtn').textContent = d.buttonLabel;
    }

    function renderFooter() {
        setText('footerAbout', (config.footer && config.footer.about) || '');
        setText('footerBrand', (config.brand && config.brand.name) || 'RS OPTIMIZATION');
    }

    /** Leaga toate elementele cu data-link de URL-urile din config. */
    function renderLinks() {
        var links = config.links || {};
        document.querySelectorAll('[data-link]').forEach(function (el) {
            var key = el.getAttribute('data-link');
            var url = key === 'email' && links.email ? 'mailto:' + links.email : S.safeUrl(links[key]);
            if (url) {
                el.href = url;
                if (/^https?:/i.test(url)) { el.target = '_blank'; el.rel = 'noopener'; }
                // Butonul flotant apare doar dacă are unde să ducă.
                if (el.id === 'discordFab') el.hidden = false;
            } else {
                // Fara link configurat, nu lasam un buton care nu duce nicaieri.
                el.href = '#';
                el.addEventListener('click', function (e) {
                    e.preventDefault();
                    toast('Linkul pentru „' + key + '” nu este încă setat în Admin Panel.', 'err');
                });
            }
        });

        var social = [
            { key: 'discord', icon: 'i-discord', label: 'Discord' },
            { key: 'youtube', icon: 'i-yt', label: 'YouTube' },
            { key: 'tiktok', icon: 'i-tiktok', label: 'TikTok' },
            { key: 'instagram', icon: 'i-ig', label: 'Instagram' },
            { key: 'email', icon: 'i-mail', label: 'Email' }
        ].filter(function (s) { return s.key === 'email' ? links.email : S.safeUrl(links[s.key]); });

        $('social').innerHTML = social.map(function (s) {
            var url = s.key === 'email' ? 'mailto:' + links.email : S.safeUrl(links[s.key]);
            return '<a href="' + esc(url) + '" aria-label="' + esc(s.label) + '"' +
                (s.key === 'email' ? '' : ' target="_blank" rel="noopener"') + '>' +
                '<svg width="17" height="17"><use href="#' + s.icon + '"/></svg></a>';
        }).join('');
    }

    // ========================================================= interactiune
    /** Glow care urmareste cursorul peste carduri. */
    function bindCardGlow() {
        document.querySelectorAll('.card:not([data-glow])').forEach(function (card) {
            card.setAttribute('data-glow', '1');
            card.addEventListener('pointermove', function (e) {
                var r = card.getBoundingClientRect();
                card.style.setProperty('--mx', (e.clientX - r.left) + 'px');
                card.style.setProperty('--my', (e.clientY - r.top) + 'px');
            });
        });
    }

    var REVEAL_SELECTOR = '.reveal-up, .reveal-side, .reveal-pop, .stack, .stage';

    /**
     * Revelarea la scroll se face prin măsurare directă, nu prin
     * IntersectionObserver. Motivul e simplu: dacă observerul nu pornește
     * dintr-un motiv oarecare, tot conținutul ar rămâne la opacity 0 —
     * adică pagina ar arăta goală. Aici, în cel mai rău caz, elementele
     * apar fără animație.
     */
    function initReveal() {
        var pending = Array.prototype.slice.call(document.querySelectorAll(REVEAL_SELECTOR));
        if (!pending.length) return;

        var queued = false;

        function sweep() {
            queued = false;
            var h = window.innerHeight || document.documentElement.clientHeight;
            var shown = 0;

            for (var i = pending.length - 1; i >= 0; i--) {
                var el = pending[i];
                var r = el.getBoundingClientRect();

                // vizibil dacă a intrat cu 80px peste marginea de jos a ecranului
                if (r.top < h - 80 && r.bottom > 0) {
                    (function (node, delay) {
                        setTimeout(function () {
                            node.classList.add('is-in');
                            // cifrele pornesc exact când bara de statistici apare
                            if (node.id === 'statsGrid') animateCounters();
                        }, delay);
                    })(el, Math.min(shown * 80, 320));
                    shown++;
                    pending.splice(i, 1);
                }
            }

            if (!pending.length) {
                window.removeEventListener('scroll', request);
                window.removeEventListener('resize', request);
            }
        }

        function request() {
            if (queued) return;
            queued = true;
            requestAnimationFrame(sweep);
        }

        window.addEventListener('scroll', request, { passive: true });
        window.addEventListener('resize', request);

        sweep();                       // ce e deja pe ecran apare imediat
        setTimeout(sweep, 400);        // încă o trecere după ce se așază fonturile

        initTilt();
    }

    /**
     * Ferestrele aplicației se înclină ușor după cursor. Rulează pe pointermove
     * doar cât timp mouse-ul e deasupra, iar actualizarea se face în rAF.
     */
    function initTilt() {
        if (window.matchMedia('(hover: none)').matches) return;

        document.querySelectorAll('.stage').forEach(function (stage) {
            var frame = null;

            stage.addEventListener('pointermove', function (e) {
                if (frame) return;
                frame = requestAnimationFrame(function () {
                    frame = null;
                    var r = stage.getBoundingClientRect();
                    if (!r.width || !r.height) return;

                    // Plafonăm la ±0.5: un eveniment venit când elementul e în
                    // afara ecranului ar da altfel rotații de sute de grade.
                    var px = clamp((e.clientX - r.left) / r.width - .5, -.5, .5);
                    var py = clamp((e.clientY - r.top) / r.height - .5, -.5, .5);

                    stage.style.setProperty('--ry', (px * 9).toFixed(2) + 'deg');
                    stage.style.setProperty('--rx', (-py * 7).toFixed(2) + 'deg');
                    stage.style.setProperty('--sc', '1.015');
                });
            });

            stage.addEventListener('pointerleave', function () {
                stage.style.setProperty('--ry', '0deg');
                stage.style.setProperty('--rx', '0deg');
                stage.style.setProperty('--sc', '1');
            });
        });
    }

    // =============================================================== popup
    function initPopup() {
        var p = config.popup || {};
        var modal = $('couponModal');

        setText('modalEyebrow', p.eyebrow);
        setText('modalTitle', p.title);
        setText('modalText', p.text);
        setText('modalConsent', p.consentText);
        setText('doneTitle', p.successTitle);
        setText('doneText', p.successText);
        if (p.buttonLabel) $('couponSubmit').textContent = p.buttonLabel;
        if (p.placeholder) $('emailInput').placeholder = p.placeholder;

        modal.addEventListener('click', function (e) {
            if (e.target.closest('[data-close]')) closeModal();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && modal.classList.contains('is-open')) closeModal();
        });

        $('couponForm').addEventListener('submit', onSubmit);
        $('copyCode').addEventListener('click', function () {
            var code = $('doneCode').textContent;
            navigator.clipboard.writeText(code).then(function () {
                toast('Codul ' + code + ' a fost copiat.', 'ok');
            }).catch(function () { toast('Nu am putut copia codul.', 'err'); });
        });

        // Orice link catre #coupon deschide popup-ul manual.
        document.querySelectorAll('a[href="#coupon"]').forEach(function (a) {
            a.addEventListener('click', function (e) { e.preventDefault(); openModal(); });
        });

        if (!p.enabled || !coupon) return;
        if (alreadySubscribed(p)) return;

        if (p.trigger === 'exit') {
            var armed = true;
            document.addEventListener('mouseout', function (e) {
                if (armed && !e.relatedTarget && e.clientY < 12) { armed = false; openModal(); }
            });
        } else {
            setTimeout(openModal, Math.max(2, Number(p.delaySeconds) || 12) * 1000);
        }
    }

    function alreadySubscribed(p) {
        try {
            var raw = localStorage.getItem('rsopt.popup.seen');
            if (!raw) return false;
            var days = Number(p.showAgainAfterDays) || 7;
            return (Date.now() - Number(raw)) < days * 86400000;
        } catch (e) { return false; }
    }

    function markSeen() {
        try { localStorage.setItem('rsopt.popup.seen', String(Date.now())); } catch (e) { /* ignora */ }
    }

    function openModal() {
        var modal = $('couponModal');
        if (modal.classList.contains('is-open')) return;
        modal.classList.add('is-open');
        document.body.classList.add('no-scroll');
        setTimeout(function () { $('emailInput').focus(); }, 380);
    }

    function closeModal() {
        $('couponModal').classList.remove('is-open');
        document.body.classList.remove('no-scroll');
        markSeen();
    }

    function onSubmit(e) {
        e.preventDefault();
        var input = $('emailInput'), errBox = $('emailError'), btn = $('couponSubmit');
        var email = input.value.trim();

        if (!S.isEmail(email)) {
            input.classList.add('is-error');
            errBox.textContent = 'Introdu o adresă de email validă.';
            input.focus();
            return;
        }

        input.classList.remove('is-error');
        errBox.textContent = '';
        btn.disabled = true;
        btn.textContent = 'SE TRIMITE...';

        var settings = config.settings || {};

        S.subscribe(email, coupon.code, {
            webhookUrl: settings.webhookUrl || '',
            netlifyForms: settings.netlifyForms === true
        }).then(function (res) {
            showCoupon(res.coupon || coupon.code);
            if (res.stored === 'none') {
                console.warn('Emailul nu a fost salvat nicăieri: fără api/subscribe.php, fără Netlify Forms ' +
                             'și fără webhook. Activează una dintre ele din Admin Panel → Setări.');
            }
        }).catch(function () {
            showCoupon(coupon.code);
        }).then(function () {
            btn.disabled = false;
            btn.textContent = (config.popup && config.popup.buttonLabel) || 'VREAU CUPONUL';
            markSeen();
        });
    }

    function showCoupon(code) {
        $('modalStepForm').hidden = true;
        $('modalStepDone').hidden = false;
        $('doneCode').textContent = code;
        $('doneDesc').textContent = coupon && coupon.description ? coupon.description : '';
        fireConfetti();
    }

    function fireConfetti() {
        var host = $('confetti');
        var colors = ['#29b8ff', '#8fe0ff', '#0a72d4', '#ffffff', '#2ee07a'];
        var html = '';
        for (var i = 0; i < 42; i++) {
            var left = Math.random() * 100;
            var delay = Math.random() * .5;
            var dur = 1.5 + Math.random() * 1.4;
            var color = colors[i % colors.length];
            var w = 5 + Math.random() * 5;
            html += '<i style="left:' + left.toFixed(1) + '%;width:' + w.toFixed(0) + 'px;background:' + color +
                ';animation-delay:' + delay.toFixed(2) + 's;animation-duration:' + dur.toFixed(2) + 's"></i>';
        }
        host.innerHTML = html;
        setTimeout(function () { host.innerHTML = ''; }, 3400);
    }

    // =============================================================== toast
    function toast(message, kind) {
        var host = $('toasts');
        var el = document.createElement('div');
        el.className = 'toast' + (kind ? ' toast--' + kind : '');
        el.textContent = message;
        host.appendChild(el);
        setTimeout(function () {
            el.classList.add('is-out');
            setTimeout(function () { el.remove(); }, 320);
        }, 4200);
    }

    // ============================================================ utilitare
    function setText(id, value) {
        var el = $(id);
        if (el && value != null && value !== '') el.textContent = value;
    }

    function clamp(v, min, max) { return v < min ? min : (v > max ? max : v); }

    function fmt(n) {
        var v = Number(n) || 0;
        return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
    }
})();
