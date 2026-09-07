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

        S.load().then(function (cfg) {
            config = cfg;
            coupon = S.activeCoupon(cfg, cfg.popup && cfg.popup.couponCode);
            renderAll();
            initReveal();
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

    // ============================================================= render
    function renderAll() {
        renderMeta();
        renderAnnounce();
        renderHero();
        renderStats();
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
        setText('heroAccent', h.titleAccent);
        setText('heroSub', h.subtitle);
        setText('heroNote', h.note);

        if (h.ctaPrimary) {
            var c1 = $('heroCta1');
            c1.textContent = h.ctaPrimary.label || 'VEZI PACHETELE';
            c1.href = h.ctaPrimary.href || '#shop';
        }
        if (h.ctaSecondary) {
            var c2 = $('heroCta2');
            c2.textContent = h.ctaSecondary.label || 'INTRĂ PE DISCORD';
            c2.href = h.ctaSecondary.href || '#discord';
        }
    }

    function renderStats() {
        var stats = config.stats || [];
        var show = !config.settings || config.settings.showStats !== false;
        if (!show || !stats.length) { $('statsSection').hidden = true; return; }

        $('statsGrid').innerHTML = stats.map(function (s) {
            return '<div class="stats__item">' +
                '<div class="stats__value chrome" data-count="' + esc(s.value) + '">' + esc(s.value) + '</div>' +
                '<div class="stats__label">' + esc(s.label) + '</div>' +
                '</div>';
        }).join('');
    }

    function renderFeatures() {
        var items = config.features || [];
        $('featuresGrid').innerHTML = items.map(function (f) {
            return '<article class="card feature reveal-up">' +
                '<div class="feature__icon"><svg width="26" height="26"><use href="#i-' + esc(f.icon || 'bolt') + '"/></svg></div>' +
                '<h3>' + esc(f.title) + '</h3>' +
                '<p>' + esc(f.text) + '</p>' +
                '</article>';
        }).join('');
        bindCardGlow();
    }

    function renderShowcase() {
        var rows = config.showcase || [];
        var mock = [mockupOptimize, mockupMod, mockupRestore];

        $('showcase').innerHTML = rows.map(function (r, i) {
            var bullets = (r.bullets || []).map(function (b) {
                return '<li><svg width="17" height="17"><use href="#i-check"/></svg><span>' + esc(b) + '</span></li>';
            }).join('');

            return '<div class="showcase__row">' +
                '<div class="showcase__copy reveal-up">' +
                    '<div class="eyebrow">0' + (i + 1) + '</div>' +
                    '<h3 class="chrome">' + esc(r.title) + '</h3>' +
                    '<p>' + esc(r.text) + '</p>' +
                    '<ul class="checklist">' + bullets + '</ul>' +
                '</div>' +
                '<div class="showcase__media reveal-up">' + (mock[i] || mock[0])() + '</div>' +
                '</div>';
        }).join('');
    }

    // Mockup-uri ale ferestrei aplicatiei, desenate in HTML (fara screenshot-uri).
    function mockupOptimize() {
        return frame('QUICK OPTIMIZE',
            row('Curățare cache FiveM', 'ok', 'DONE') +
            row('Curățare fișiere temporare', 'ok', 'DONE') +
            row('Windows Game Mode', 'run', 'RUNNING') +
            bar(72) +
            row('Plan de alimentare', 'idle', 'PENDING') +
            row('Flush DNS', 'idle', 'PENDING'));
    }
    function mockupMod() {
        return frame('CUSTOM GRAPHICS MODE',
            row('Download', 'ok', 'OK') +
            row('Verificare SHA-256', 'ok', 'OK') +
            row('Extragere', 'ok', 'OK') +
            row('Backup fișiere originale', 'run', 'RUNNING') +
            bar(88) +
            row('Instalare în GTA V', 'idle', 'PENDING'));
    }
    function mockupRestore() {
        return frame('RESTORE CENTER',
            row('GameDVR_Enabled → 0', 'ok', 'RESTORE') +
            row('Plan alimentare → Balanced', 'ok', 'RESTORE') +
            row('Mod grafic → 214 fișiere', 'ok', 'RESTORE') +
            row('Curățare cache (istoric)', 'idle', 'HISTORY'));
    }
    function frame(title, body) {
        return '<div class="mockup">' +
            '<div class="mockup__bar">' +
                '<span class="mockup__dot mockup__dot--live"></span>' +
                '<span class="mockup__dot"></span><span class="mockup__dot"></span>' +
                '<span class="mockup__title">' + esc(title) + '</span>' +
            '</div>' +
            '<div class="mockup__body">' + body + '</div>' +
            '</div>';
    }
    function row(label, kind, pill) {
        return '<div class="mrow"><span class="mrow__label">' + esc(label) + '</span>' +
            '<span class="mrow__pill mrow__pill--' + kind + '">' + esc(pill) + '</span></div>';
    }
    function bar(pct) { return '<div class="mbar"><i style="width:' + pct + '%"></i></div>'; }

    function renderSteps() {
        var steps = config.steps || [];
        $('stepsGrid').innerHTML = steps.map(function (s, i) {
            return '<div class="step reveal-up">' +
                '<div class="step__num">0' + (i + 1) + '</div>' +
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

            return '<article class="card plan reveal-up' + (p.popular ? ' plan--popular' : '') + '">' +
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

        $('reviewsGrid').innerHTML = items.map(function (t) {
            var stars = '';
            for (var i = 0; i < (Number(t.rating) || 5); i++) stars += '<svg width="15" height="15"><use href="#i-star"/></svg>';
            var initials = String(t.name || '?').trim().split(/\s+/).map(function (w) { return w[0]; }).join('').slice(0, 2).toUpperCase();

            return '<article class="card quote reveal-up">' +
                '<div class="quote__stars">' + stars + '</div>' +
                '<p>&ldquo;' + esc(t.text) + '&rdquo;</p>' +
                '<div class="quote__who">' +
                    '<div class="quote__avatar">' + esc(initials) + '</div>' +
                    '<div><div class="quote__name">' + esc(t.name) + '</div>' +
                    '<div class="quote__role">' + esc(t.role) + '</div></div>' +
                '</div>' +
                '</article>';
        }).join('');
        bindCardGlow();
    }

    function renderFaq() {
        var items = config.faq || [];
        $('faqList').innerHTML = items.map(function (f, i) {
            return '<div class="faq__item reveal-up">' +
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

    function initReveal() {
        if (!('IntersectionObserver' in window)) {
            document.querySelectorAll('.reveal-up').forEach(function (el) { el.classList.add('is-in'); });
            return;
        }
        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry, i) {
                if (!entry.isIntersecting) return;
                var el = entry.target;
                setTimeout(function () { el.classList.add('is-in'); }, Math.min(i * 70, 280));
                io.unobserve(el);
            });
        }, { rootMargin: '0px 0px -60px 0px', threshold: .12 });

        document.querySelectorAll('.reveal-up').forEach(function (el) { io.observe(el); });
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

    function fmt(n) {
        var v = Number(n) || 0;
        return Number.isInteger(v) ? String(v) : v.toFixed(2).replace('.', ',');
    }
})();
