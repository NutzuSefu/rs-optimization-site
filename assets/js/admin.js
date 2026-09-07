/* ==========================================================================
   RS OPTIMIZATION — Admin Panel
   Formularele sunt generate din scheme, ca sa fie usor de adaugat campuri noi.
   ========================================================================== */

(function () {
    'use strict';

    var S = window.RSStore;
    var $ = function (id) { return document.getElementById(id); };

    var config = null;
    var dirty = false;
    var hasBackend = false;
    var backendKind = 'none';   // 'php' | 'netlify' | 'none'

    // ================================================================ scheme
    var SCHEMA = {
        product: {
            title: function (p) { return p.name || 'Pachet fără nume'; },
            meta: function (p) { return (p.price || 0) + ' ' + (p.currency || 'RON'); },
            enabledKey: 'enabled',
            badges: function (p) {
                var out = [];
                if (p.popular) out.push(['pop', 'POPULAR']);
                out.push(p.enabled === false ? ['off', 'ASCUNS'] : ['on', 'VIZIBIL']);
                return out;
            },
            fields: [
                { key: 'name', label: 'Nume pachet', type: 'text', placeholder: 'PRO' },
                { key: 'description', label: 'Descriere scurtă', type: 'text' },
                { row: [
                    { key: 'price', label: 'Preț', type: 'number' },
                    { key: 'oldPrice', label: 'Preț tăiat (0 = fără)', type: 'number' },
                    { key: 'currency', label: 'Monedă', type: 'text', placeholder: 'RON' }
                ] },
                { row: [
                    { key: 'period', label: 'Sub preț', type: 'text', placeholder: 'licență permanentă' },
                    { key: 'badge', label: 'Etichetă colț', type: 'text', placeholder: 'CEL MAI POPULAR' }
                ] },
                { key: 'features', label: 'Ce include (câte unul pe rând)', type: 'lines' },
                { row: [
                    { key: 'buyUrl', label: 'Link cumpărare (https://)', type: 'url' },
                    { key: 'buyLabel', label: 'Text buton', type: 'text', placeholder: 'CUMPĂRĂ' }
                ] },
                { key: 'popular', label: 'Evidențiază acest pachet', type: 'checkbox' },
                { key: 'enabled', label: 'Vizibil pe site', type: 'checkbox' }
            ]
        },

        coupon: {
            title: function (c) { return c.code || 'COD'; },
            meta: function (c) { return c.percent ? '-' + c.percent + '%' : (c.amount ? '-' + c.amount : ''); },
            enabledKey: 'active',
            badges: function (c) { return [c.active ? ['on', 'ACTIV'] : ['off', 'INACTIV']]; },
            fields: [
                { key: 'code', label: 'Cod', type: 'text', placeholder: 'RS10', help: 'Se afișează exact așa cum îl scrii.' },
                { row: [
                    { key: 'percent', label: 'Reducere procentuală (%)', type: 'number' },
                    { key: 'amount', label: 'SAU reducere fixă', type: 'number' }
                ] },
                { key: 'description', label: 'Descriere', type: 'text', placeholder: '10% reducere la orice pachet' },
                { row: [
                    { key: 'expiresAt', label: 'Expiră la (gol = niciodată)', type: 'date' },
                    { key: 'maxUses', label: 'Utilizări maxime (0 = nelimitat)', type: 'number' }
                ] },
                { key: 'active', label: 'Cupon activ', type: 'checkbox' }
            ]
        },

        stat: {
            title: function (s) { return s.value || '—'; },
            meta: function (s) { return s.label || ''; },
            fields: [
                { row: [
                    { key: 'value', label: 'Cifra', type: 'text', placeholder: '10.000+' },
                    { key: 'label', label: 'Sub cifră', type: 'text', placeholder: 'curățări de cache' }
                ] }
            ]
        },

        feature: {
            title: function (f) { return f.title || 'Beneficiu'; },
            fields: [
                { key: 'title', label: 'Titlu', type: 'text' },
                { key: 'text', label: 'Text', type: 'textarea' },
                { key: 'icon', label: 'Iconiță', type: 'select', options: [
                    ['broom', 'Mătură (curățare)'], ['gauge', 'Turometru (performanță)'],
                    ['disk', 'Disc (spațiu)'], ['palette', 'Paletă (grafică)'],
                    ['chart', 'Grafic (monitorizare)'], ['shield', 'Scut (siguranță)'],
                    ['bolt', 'Fulger (viteză)']
                ] }
            ]
        },

        showcaseRow: {
            title: function (r) { return r.title || 'Secțiune'; },
            fields: [
                { key: 'title', label: 'Titlu', type: 'text' },
                { key: 'text', label: 'Text', type: 'textarea' },
                { key: 'bullets', label: 'Puncte (câte unul pe rând)', type: 'lines' }
            ]
        },

        step: {
            title: function (s) { return s.title || 'Pas'; },
            fields: [
                { key: 'title', label: 'Titlu', type: 'text' },
                { key: 'text', label: 'Text', type: 'textarea' }
            ]
        },

        testimonial: {
            title: function (t) { return t.name || 'Părere'; },
            meta: function (t) { return '★'.repeat(Number(t.rating) || 5); },
            fields: [
                { row: [
                    { key: 'name', label: 'Nume', type: 'text' },
                    { key: 'role', label: 'Rol', type: 'text', placeholder: 'Jucător FiveM' },
                    { key: 'rating', label: 'Stele (1-5)', type: 'number' }
                ] },
                { key: 'text', label: 'Textul părerii', type: 'textarea' }
            ]
        },

        faq: {
            title: function (f) { return f.q || 'Întrebare'; },
            fields: [
                { key: 'q', label: 'Întrebare', type: 'text' },
                { key: 'a', label: 'Răspuns', type: 'textarea' }
            ]
        }
    };

    // ============================================================= bootstrap
    document.addEventListener('DOMContentLoaded', function () {
        bindLogin();
        bindShell();
        checkBackend();
    });

    function checkBackend() {
        S.status().then(function (st) {
            hasBackend = true;
            backendKind = (st && st.backend) || 'php';

            // Pe Netlify parola vine dintr-o variabila de mediu. Daca nu e setata,
            // nu oferim configurare din pagina: oricine ar putea sa si-o seteze primul.
            if (st && st.reason === 'env-missing') showEnvMissing(st.message);
            else if (st && st.configured === false) showSetup();
            else showLogin();
        }).catch(function () {
            // Fara backend: admin panel-ul merge local, dar modificarile raman in browserul asta.
            hasBackend = false;
            backendKind = 'none';
            showLocalMode();
        });
    }

    function showEnvMissing(message) {
        $('loginTitle').textContent = 'Mai e un pas';
        $('loginSub').textContent = 'Parola de admin nu este setată';
        $('loginPass').hidden = true;
        $('loginPass').required = false;
        $('loginPass2').hidden = true;
        $('loginPass2').required = false;
        $('loginBtn').textContent = 'AM SETAT-O, REÎNCARCĂ';
        $('loginHint').innerHTML = S.escapeHtml(message ||
            'Setează ADMIN_PASSWORD în Netlify, apoi redeployează.') +
            '<br><br>Netlify → <b>Site configuration</b> → <b>Environment variables</b> → ' +
            '<b>Add a variable</b> → cheia <code>ADMIN_PASSWORD</code>, valoarea = parola ta. ' +
            'Apoi <b>Deploys</b> → <b>Trigger deploy</b>.';
        $('loginForm').dataset.mode = 'env-missing';
    }

    // ================================================================= login
    function showLogin() {
        $('loginTitle').textContent = 'Admin Panel';
        $('loginSub').textContent = 'Autentifică-te ca să administrezi site-ul';
        $('loginBtn').textContent = 'INTRĂ';
        $('loginPass2').hidden = true;
        $('loginHint').textContent = '';
        $('loginForm').dataset.mode = 'login';

        if (S.token()) enterAdmin();
    }

    function showSetup() {
        $('loginTitle').textContent = 'Prima configurare';
        $('loginSub').textContent = 'Alege parola de administrator';
        $('loginBtn').textContent = 'SETEAZĂ PAROLA';
        $('loginPass').placeholder = 'parolă nouă (minim 8 caractere)';
        $('loginPass2').hidden = false;
        $('loginHint').textContent = 'Parola nu se salvează nicăieri în clar. Serverul păstrează doar un hash, iar dacă o pierzi ștergi fișierul api/auth.json și reiei configurarea.';
        $('loginForm').dataset.mode = 'setup';
    }

    function showLocalMode() {
        $('loginTitle').textContent = 'Mod local';
        $('loginSub').textContent = 'Hostingul nu are PHP';
        $('loginHint').innerHTML = 'Poți edita tot conținutul, dar modificările rămân <b>doar în acest browser</b>. ' +
            'Ca să fie live pentru toți vizitatorii, folosește la final <b>DESCARCĂ site.json</b> din Setări ' +
            'și urcă fișierul peste <code>data/site.json</code> pe hosting.';
        $('loginPass').hidden = true;
        // Un camp "required" ascuns blocheaza trimiterea formularului: browserul
        // nu poate focusa un control invizibil ca sa arate mesajul de validare.
        $('loginPass').required = false;
        $('loginPass2').hidden = true;
        $('loginPass2').required = false;
        $('loginBtn').textContent = 'CONTINUĂ';
        $('loginForm').dataset.mode = 'local';
    }

    function bindLogin() {
        $('loginForm').addEventListener('submit', function (e) {
            e.preventDefault();
            var mode = $('loginForm').dataset.mode;
            var err = $('loginErr');
            err.textContent = '';

            if (mode === 'local') { enterAdmin(); return; }
            if (mode === 'env-missing') { location.reload(); return; }

            var pass = $('loginPass').value;

            if (mode === 'setup') {
                if (pass.length < 8) { err.textContent = 'Parola trebuie să aibă minim 8 caractere.'; return; }
                if (pass !== $('loginPass2').value) { err.textContent = 'Parolele nu coincid.'; return; }
                S.setup(pass)
                    .then(function () { return S.login(pass); })
                    .then(enterAdmin)
                    .catch(function (e2) { err.textContent = e2.message || 'Configurarea a eșuat.'; });
                return;
            }

            S.login(pass).then(enterAdmin).catch(function (e2) {
                err.textContent = e2.message || 'Parolă greșită.';
                $('loginPass').value = '';
                $('loginPass').focus();
            });
        });
    }

    function enterAdmin() {
        $('loginWrap').style.display = 'none';
        $('admin').classList.add('is-ready');

        // Fara backend, descarcarea fisierului e pasul final al fluxului de lucru,
        // deci il scoatem la vedere, nu ascuns in Setari.
        $('downloadBtn').hidden = hasBackend;

        // Pe Netlify parola e o variabila de mediu, nu se schimba din pagina.
        if (backendKind === 'netlify') {
            $('pwFieldset').innerHTML =
                '<h3>Parola de admin</h3>' +
                '<p class="hint">Pe Netlify parola este variabila de mediu <code>ADMIN_PASSWORD</code>.</p>' +
                '<div class="note"><svg width="18" height="18"><use href="#a-info"/></svg><div>' +
                'Ca să o schimbi: Netlify → <b>Site configuration</b> → <b>Environment variables</b> → ' +
                'editezi <code>ADMIN_PASSWORD</code> → apoi <b>Deploys</b> → <b>Trigger deploy</b>. ' +
                'Sesiunile deschise rămân valabile până expiră (12 ore).</div></div>';
        }

        S.load(true).then(function (cfg) {
            config = cfg;
            normalise(config);
            renderSource();
            renderAll();
            switchTab('products');
        }).catch(function () {
            toast('Nu am putut încărca configurația.', 'err');
        });
    }

    /** Se asigura ca toate colectiile exista, ca sa nu crape editoarele. */
    function normalise(c) {
        ['products', 'coupons', 'stats', 'features', 'showcase', 'steps', 'testimonials', 'faq']
            .forEach(function (k) { if (!Array.isArray(c[k])) c[k] = []; });
        ['brand', 'links', 'hero', 'popup', 'announcement', 'discordCta', 'footer', 'settings', 'seo']
            .forEach(function (k) { if (!c[k] || typeof c[k] !== 'object') c[k] = {}; });
        if (!c.hero.ctaPrimary) c.hero.ctaPrimary = { label: '', href: '#shop' };
        if (!c.hero.ctaSecondary) c.hero.ctaSecondary = { label: '', href: '#discord' };
    }

    // ================================================================= shell
    function bindShell() {
        $('tabs').addEventListener('click', function (e) {
            var b = e.target.closest('button[data-tab]');
            if (b) switchTab(b.dataset.tab);
        });

        $('saveBtn').addEventListener('click', save);
        $('saveBtn2').addEventListener('click', save);

        $('logoutBtn').addEventListener('click', function () {
            if (dirty && !confirm('Ai modificări nesalvate. Sigur ieși?')) return;
            S.logout();
            location.reload();
        });

        $('addProduct').addEventListener('click', function () {
            config.products.push({
                id: 'p' + Date.now(), name: 'PACHET NOU', description: '', price: 0, oldPrice: 0,
                currency: (config.settings && config.settings.currencySymbol) || 'RON',
                period: 'licență permanentă', badge: '', features: [], buyUrl: '',
                buyLabel: 'CUMPĂRĂ', popular: false, enabled: true
            });
            markDirty(); renderProducts(); openLast('repProducts');
        });

        $('addCoupon').addEventListener('click', function () {
            config.coupons.push({
                code: 'COD' + Math.floor(Math.random() * 90 + 10), percent: 10, amount: 0,
                description: '', active: true, expiresAt: '', maxUses: 0, uses: 0
            });
            markDirty(); renderCoupons(); openLast('repCoupons');
        });

        $('changePw').addEventListener('click', changePassword);
        $('exportJson').addEventListener('click', exportJson);
        $('downloadBtn').addEventListener('click', exportJson);
        $('importJson').addEventListener('click', function () { $('importFile').click(); });
        $('importFile').addEventListener('change', importJson);
        $('refreshSubs').addEventListener('click', loadSubs);
        $('exportSubs').addEventListener('click', exportSubs);

        window.addEventListener('beforeunload', function (e) {
            if (!dirty) return;
            e.preventDefault();
            e.returnValue = '';
        });
    }

    var TAB_TITLES = {
        products: 'Produse', coupons: 'Cupoane', popup: 'Popup email',
        content: 'Conținut site', links: 'Link-uri', subs: 'Abonați', settings: 'Setări'
    };

    function switchTab(name) {
        document.querySelectorAll('#tabs button').forEach(function (b) {
            b.classList.toggle('is-active', b.dataset.tab === name);
        });
        document.querySelectorAll('.panel').forEach(function (p) {
            p.classList.toggle('is-active', p.dataset.panel === name);
        });
        $('panelTitle').textContent = TAB_TITLES[name] || name;
        if (name === 'subs') loadSubs();
    }

    function renderSource() {
        var src = S.getSource();
        var pill = $('srcPill'), text = $('srcText');
        pill.className = 'srcpill';

        if (src === 'api') {
            pill.classList.add('srcpill--api');
            text.textContent = 'Live pe server';
        } else if (hasBackend) {
            // Exista backend, dar inca nu s-a salvat nimic prin el: se citeste
            // fisierul din deploy. Prima salvare comuta pe live.
            pill.classList.add('srcpill--api');
            text.textContent = 'Conectat — încă nimic salvat';
        } else if (src === 'local') {
            pill.classList.add('srcpill--local');
            text.textContent = 'Ciornă locală';
        } else {
            text.textContent = 'Doar citire (data/site.json)';
        }
    }

    function markDirty() {
        dirty = true;
        $('saveBar').classList.add('is-up');
    }

    function clearDirty() {
        dirty = false;
        $('saveBar').classList.remove('is-up');
    }

    // ================================================================ render
    function renderAll() {
        renderProducts();
        renderCoupons();
        renderPopup();
        renderContent();
        renderLinks();
        renderSettings();
        updateCounts();
    }

    function updateCounts() {
        $('cProducts').textContent = config.products.length;
        $('cCoupons').textContent = config.coupons.length;
    }

    function renderProducts() {
        repeater($('repProducts'), config.products, SCHEMA.product, renderProducts);
        updateCounts();
    }

    function renderCoupons() {
        repeater($('repCoupons'), config.coupons, SCHEMA.coupon, renderCoupons);
        updateCounts();
    }

    function renderPopup() {
        var host = $('popupForm');
        host.innerHTML = '';
        host.appendChild(objectForm('Popup de colectare email', '', config.popup, [
            { key: 'enabled', label: 'Popup activ', type: 'checkbox' },
            { row: [
                { key: 'trigger', label: 'Când apare', type: 'select', options: [['delay', 'După câteva secunde'], ['exit', 'Când vrea să plece de pe pagină']] },
                { key: 'delaySeconds', label: 'După câte secunde', type: 'number' },
                { key: 'showAgainAfterDays', label: 'Nu reapare (zile)', type: 'number' }
            ] },
            { key: 'couponCode', label: 'Cuponul oferit', type: 'select', options: couponOptions(), help: 'Trebuie să fie un cupon activ din tabul Cupoane.' },
            { key: 'eyebrow', label: 'Text mic deasupra', type: 'text' },
            { key: 'title', label: 'Titlu', type: 'text' },
            { key: 'text', label: 'Text', type: 'textarea' },
            { row: [
                { key: 'placeholder', label: 'Placeholder câmp email', type: 'text' },
                { key: 'buttonLabel', label: 'Text buton', type: 'text' }
            ] },
            { key: 'successTitle', label: 'Titlu după trimitere', type: 'text' },
            { key: 'successText', label: 'Text după trimitere', type: 'textarea' },
            { key: 'consentText', label: 'Text de consimțământ (GDPR)', type: 'textarea' }
        ]));
    }

    function couponOptions() {
        var opts = config.coupons.map(function (c) { return [c.code, c.code + (c.active ? '' : ' (inactiv)')]; });
        return opts.length ? opts : [['', 'niciun cupon definit']];
    }

    function renderContent() {
        var host = $('contentForms');
        host.innerHTML = '';

        host.appendChild(objectForm('Bara de anunț', 'Banda colorată din capul paginii.', config.announcement, [
            { key: 'enabled', label: 'Afișează bara', type: 'checkbox' },
            { key: 'text', label: 'Text', type: 'text' },
            { key: 'href', label: 'Link (opțional)', type: 'url' }
        ]));

        host.appendChild(objectForm('Hero (prima secțiune)', '', config.hero, [
            { key: 'badge', label: 'Eticheta de sus', type: 'text' },
            { row: [
                { key: 'title', label: 'Titlu (partea argintie)', type: 'text' },
                { key: 'titleAccent', label: 'Titlu (cuvântul albastru)', type: 'text' }
            ] },
            { key: 'subtitle', label: 'Subtitlu', type: 'textarea' },
            { key: 'note', label: 'Nota de sub butoane', type: 'text' }
        ]));

        host.appendChild(nestedForm('Butoanele din hero', [
            { obj: config.hero.ctaPrimary, fields: [
                { row: [
                    { key: 'label', label: 'Buton principal — text', type: 'text' },
                    { key: 'href', label: 'Buton principal — link', type: 'text' }
                ] }
            ] },
            { obj: config.hero.ctaSecondary, fields: [
                { row: [
                    { key: 'label', label: 'Buton secundar — text', type: 'text' },
                    { key: 'href', label: 'Buton secundar — link', type: 'text' }
                ] }
            ] }
        ]));

        host.appendChild(listSection('Cifre (bara de statistici)', config.stats, SCHEMA.stat,
            function () { return { value: '0', label: 'etichetă' }; }));

        host.appendChild(listSection('Beneficii („Cu ce te ajută")', config.features, SCHEMA.feature,
            function () { return { icon: 'bolt', title: 'Beneficiu nou', text: '' }; }));

        host.appendChild(listSection('Secțiuni de prezentare', config.showcase, SCHEMA.showcaseRow,
            function () { return { title: 'Secțiune nouă', text: '', bullets: [] }; }));

        host.appendChild(listSection('Pașii („Trei pași")', config.steps, SCHEMA.step,
            function () { return { title: 'Pas nou', text: '' }; }));

        host.appendChild(listSection('Păreri clienți', config.testimonials, SCHEMA.testimonial,
            function () { return { name: '', role: '', rating: 5, text: '' }; }));

        host.appendChild(listSection('Întrebări frecvente', config.faq, SCHEMA.faq,
            function () { return { q: 'Întrebare nouă', a: '' }; }));

        host.appendChild(objectForm('Banda de Discord', '', config.discordCta, [
            { key: 'eyebrow', label: 'Text mic', type: 'text' },
            { key: 'title', label: 'Titlu', type: 'text' },
            { key: 'text', label: 'Text', type: 'textarea' },
            { key: 'buttonLabel', label: 'Text buton', type: 'text' }
        ]));

        host.appendChild(objectForm('Footer', '', config.footer, [
            { key: 'about', label: 'Text despre', type: 'textarea' }
        ]));
    }

    function renderLinks() {
        var host = $('linksForm');
        host.innerHTML = '';

        var note = document.createElement('div');
        note.className = 'note';
        note.innerHTML = '<svg width="18" height="18"><use href="#a-info"/></svg>' +
            '<div>Link-urile goale nu apar pe site, iar butoanele care depind de ele îi spun vizitatorului ' +
            'că nu sunt încă setate. Toate trebuie să înceapă cu <code>https://</code>.</div>';
        host.appendChild(note);

        host.appendChild(objectForm('Link-uri', '', config.links, [
            { key: 'discord', label: 'Discord (invite)', type: 'url', placeholder: 'https://discord.gg/...' },
            { key: 'download', label: 'Link descărcare aplicație', type: 'url' },
            { row: [
                { key: 'youtube', label: 'YouTube', type: 'url' },
                { key: 'tiktok', label: 'TikTok', type: 'url' },
                { key: 'instagram', label: 'Instagram', type: 'url' }
            ] },
            { row: [
                { key: 'email', label: 'Email de contact', type: 'text', placeholder: 'contact@domeniu.ro' },
                { key: 'support', label: 'Pagină de suport', type: 'url' }
            ] },
            { row: [
                { key: 'terms', label: 'Termeni și condiții', type: 'url' },
                { key: 'privacy', label: 'Politica de confidențialitate', type: 'url' }
            ] }
        ]));
    }

    function renderSettings() {
        var host = $('settingsForm');
        host.innerHTML = '';

        host.appendChild(objectForm('SEO', 'Ce apare în Google și când dai link pe Discord.', config.seo, [
            { key: 'title', label: 'Titlu pagină', type: 'text' },
            { key: 'description', label: 'Descriere', type: 'textarea' },
            { key: 'keywords', label: 'Cuvinte cheie', type: 'text' }
        ]));

        host.appendChild(objectForm('Afișare', '', config.settings, [
            { key: 'currencySymbol', label: 'Monedă implicită', type: 'text' },
            { key: 'showStats', label: 'Arată bara de cifre', type: 'checkbox' },
            { key: 'showTestimonials', label: 'Arată părerile clienților', type: 'checkbox' },
            { key: 'showCouponBanner', label: 'Arată bannerul de cupon în shop', type: 'checkbox' }
        ]));

        host.appendChild(objectForm('Colectarea emailurilor', 'Unde ajung adresele lăsate în popup-ul de cupon.', config.settings, [
            { key: 'netlifyForms', label: 'Netlify Forms', type: 'checkbox',
              help: 'Bifează dacă site-ul e găzduit pe Netlify. Emailurile ajung în Netlify → Forms → rs-coupon (100 pe lună gratis). Pe alt hosting lasă nebifat.' },
            { key: 'webhookUrl', label: 'Webhook Discord (rezervă)', type: 'url',
              help: 'Folosit doar dacă nu merg nici PHP, nici Netlify Forms. Atenție: adresa webhook-ului e vizibilă în codul paginii, deci oricine o poate folosi ca să-ți spameze canalul.' }
        ]));
    }

    // ============================================================== repeater
    function listSection(title, arr, schema, factory) {
        var box = document.createElement('div');
        box.className = 'fieldset';

        var head = document.createElement('div');
        head.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px';
        head.innerHTML = '<h3 style="flex:1">' + S.escapeHtml(title) + '</h3>';

        var add = document.createElement('button');
        add.className = 'btn btn--ghost btn--sm';
        add.textContent = '+ ADAUGĂ';
        head.appendChild(add);
        box.appendChild(head);

        var rep = document.createElement('div');
        rep.className = 'rep';
        box.appendChild(rep);

        var draw = function () { repeater(rep, arr, schema, draw); };
        add.addEventListener('click', function () {
            arr.push(factory());
            markDirty(); draw();
            var items = rep.querySelectorAll('.rep__item');
            if (items.length) items[items.length - 1].classList.add('is-open');
        });

        draw();
        return box;
    }

    function repeater(host, arr, schema, redraw) {
        host.innerHTML = '';

        if (!arr.length) {
            var empty = document.createElement('div');
            empty.className = 'rep__empty';
            empty.textContent = 'Nimic aici încă. Apasă butonul de adăugare.';
            host.appendChild(empty);
            return;
        }

        arr.forEach(function (item, index) {
            host.appendChild(repeaterItem(item, index, arr, schema, redraw));
        });
    }

    function repeaterItem(item, index, arr, schema, redraw) {
        var wrap = document.createElement('div');
        wrap.className = 'rep__item';
        if (schema.enabledKey && item[schema.enabledKey] === false) wrap.classList.add('is-off');

        // ---- cap
        var head = document.createElement('div');
        head.className = 'rep__head';

        var grab = document.createElement('span');
        grab.className = 'rep__grab';
        grab.textContent = String(index + 1).padStart(2, '0');

        var title = document.createElement('span');
        title.className = 'rep__title';
        title.textContent = schema.title(item);

        head.appendChild(grab);
        head.appendChild(title);

        var badgeHost = document.createElement('span');
        badgeHost.style.cssText = 'display:flex;gap:6px;align-items:center';
        head.appendChild(badgeHost);

        var meta = document.createElement('span');
        meta.className = 'rep__meta';
        head.appendChild(meta);

        var refreshHead = function () {
            title.textContent = schema.title(item);
            meta.textContent = schema.meta ? schema.meta(item) : '';
            badgeHost.innerHTML = '';
            (schema.badges ? schema.badges(item) : []).forEach(function (b) {
                var el = document.createElement('span');
                el.className = 'badge-mini badge-mini--' + b[0];
                el.textContent = b[1];
                badgeHost.appendChild(el);
            });
            wrap.classList.toggle('is-off', !!schema.enabledKey && item[schema.enabledKey] === false);
        };
        refreshHead();

        // ---- unelte
        var tools = document.createElement('span');
        tools.className = 'rep__tools';

        tools.appendChild(toolBtn('a-up', 'Mută mai sus', function (e) {
            e.stopPropagation();
            if (index === 0) return;
            arr.splice(index - 1, 0, arr.splice(index, 1)[0]);
            markDirty(); redraw();
        }));
        tools.appendChild(toolBtn('a-down', 'Mută mai jos', function (e) {
            e.stopPropagation();
            if (index === arr.length - 1) return;
            arr.splice(index + 1, 0, arr.splice(index, 1)[0]);
            markDirty(); redraw();
        }));
        tools.appendChild(toolBtn('a-trash', 'Șterge', function (e) {
            e.stopPropagation();
            if (!confirm('Sigur ștergi „' + schema.title(item) + '”?')) return;
            arr.splice(index, 1);
            markDirty(); redraw();
        }, true));

        head.appendChild(tools);
        head.addEventListener('click', function () { wrap.classList.toggle('is-open'); });
        wrap.appendChild(head);

        // ---- corp
        var body = document.createElement('div');
        body.className = 'rep__body';
        schema.fields.forEach(function (spec) { body.appendChild(buildField(spec, item, refreshHead)); });
        wrap.appendChild(body);

        return wrap;
    }

    function toolBtn(icon, label, onClick, danger) {
        var b = document.createElement('button');
        b.type = 'button';
        b.title = label;
        b.setAttribute('aria-label', label);
        if (danger) b.className = 'danger';
        b.innerHTML = '<svg width="15" height="15"><use href="#' + icon + '"/></svg>';
        b.addEventListener('click', onClick);
        return b;
    }

    function openLast(hostId) {
        var items = $(hostId).querySelectorAll('.rep__item');
        if (items.length) {
            items[items.length - 1].classList.add('is-open');
            items[items.length - 1].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    // ================================================================ campuri
    function objectForm(title, hint, obj, specs) {
        var box = document.createElement('div');
        box.className = 'fieldset';
        if (title) box.innerHTML = '<h3>' + S.escapeHtml(title) + '</h3>' +
            (hint ? '<p class="hint">' + S.escapeHtml(hint) + '</p>' : '');
        specs.forEach(function (spec) { box.appendChild(buildField(spec, obj)); });
        return box;
    }

    function nestedForm(title, groups) {
        var box = document.createElement('div');
        box.className = 'fieldset';
        box.innerHTML = '<h3>' + S.escapeHtml(title) + '</h3>';
        groups.forEach(function (g) {
            g.fields.forEach(function (spec) { box.appendChild(buildField(spec, g.obj)); });
        });
        return box;
    }

    function buildField(spec, obj, onChange) {
        if (spec.row) {
            var row = document.createElement('div');
            row.className = 'f--row';
            spec.row.forEach(function (s) { row.appendChild(buildField(s, obj, onChange)); });
            return row;
        }

        if (spec.type === 'checkbox') {
            var lab = document.createElement('label');
            lab.className = 'f-check';
            var cb = document.createElement('input');
            cb.type = 'checkbox';
            cb.checked = obj[spec.key] !== false && !!obj[spec.key];
            // pentru cheile care implicit sunt "true", trateaza undefined ca activ
            if (obj[spec.key] === undefined && (spec.key === 'enabled' || spec.key === 'active')) cb.checked = true;
            cb.addEventListener('change', function () {
                obj[spec.key] = cb.checked;
                markDirty();
                if (onChange) onChange();
            });
            lab.appendChild(cb);
            var box = document.createElement('span');
            box.className = 'box';
            lab.appendChild(box);
            var txt = document.createElement('span');
            txt.className = 'lbl';
            txt.textContent = spec.label;
            if (spec.help) txt.innerHTML += '<span class="sub">' + S.escapeHtml(spec.help) + '</span>';
            lab.appendChild(txt);
            return lab;
        }

        var wrap = document.createElement('div');
        wrap.className = 'f';

        var label = document.createElement('label');
        label.textContent = spec.label;
        wrap.appendChild(label);

        var input;
        if (spec.type === 'textarea' || spec.type === 'lines') {
            input = document.createElement('textarea');
            input.className = 'field';
            input.value = spec.type === 'lines'
                ? (Array.isArray(obj[spec.key]) ? obj[spec.key].join('\n') : '')
                : (obj[spec.key] || '');
        } else if (spec.type === 'select') {
            input = document.createElement('select');
            input.className = 'field';
            (spec.options || []).forEach(function (o) {
                var opt = document.createElement('option');
                opt.value = o[0];
                opt.textContent = o[1];
                input.appendChild(opt);
            });
            input.value = obj[spec.key] || (spec.options && spec.options[0] ? spec.options[0][0] : '');
        } else {
            input = document.createElement('input');
            input.className = 'field';
            input.type = spec.type === 'number' ? 'number' : (spec.type === 'date' ? 'date' : 'text');
            if (spec.type === 'number') input.step = 'any';
            input.value = obj[spec.key] == null ? '' : obj[spec.key];
        }

        if (spec.placeholder) input.placeholder = spec.placeholder;

        var commit = function () {
            if (spec.type === 'lines') {
                obj[spec.key] = input.value.split('\n').map(function (l) { return l.trim(); }).filter(Boolean);
            } else if (spec.type === 'number') {
                obj[spec.key] = input.value === '' ? 0 : Number(input.value);
            } else {
                obj[spec.key] = input.value;
            }
            markDirty();
            if (onChange) onChange();
        };

        input.addEventListener('input', commit);
        input.addEventListener('change', commit);

        wrap.appendChild(input);

        if (spec.help) {
            var help = document.createElement('div');
            help.className = 'help';
            help.textContent = spec.help;
            wrap.appendChild(help);
        }

        return wrap;
    }

    // ================================================================ salvare
    function save() {
        if (!config) return;

        if (!hasBackend) {
            S.saveDraft(config);
            clearDirty();
            renderSource();
            toast('Salvat. Când ai terminat toate modificările, apasă DESCARCĂ site.json și urcă fișierul pe hosting.', 'ok');
            return;
        }

        $('saveBtn').disabled = true;
        S.save(config, S.token()).then(function () {
            clearDirty();
            renderSource();
            toast('Configurația a fost salvată. Site-ul e actualizat.', 'ok');
        }).catch(function (e) {
            if (e.status === 401) {
                toast('Sesiunea a expirat. Autentifică-te din nou.', 'err');
                S.logout();
                setTimeout(function () { location.reload(); }, 1500);
                return;
            }
            S.saveDraft(config);
            renderSource();
            toast('Serverul a refuzat salvarea (' + e.message + '). Am păstrat o ciornă locală.', 'err');
        }).then(function () {
            $('saveBtn').disabled = false;
        });
    }

    function changePassword() {
        if (!hasBackend) { toast('Schimbarea parolei are nevoie de PHP pe hosting.', 'err'); return; }

        var oldPw = $('pwOld').value, newPw = $('pwNew').value, newPw2 = $('pwNew2').value;
        if (newPw.length < 8) { toast('Parola nouă trebuie să aibă minim 8 caractere.', 'err'); return; }
        if (newPw !== newPw2) { toast('Parolele noi nu coincid.', 'err'); return; }

        fetch('api/config.php?action=password', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': S.token() },
            body: JSON.stringify({ current: oldPw, next: newPw })
        }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
            .then(function (res) {
                if (!res.ok) throw new Error((res.d && res.d.error) || 'eroare');
                $('pwOld').value = $('pwNew').value = $('pwNew2').value = '';
                toast('Parola a fost schimbată.', 'ok');
            })
            .catch(function (e) { toast('Nu am putut schimba parola: ' + e.message, 'err'); });
    }

    // =============================================================== abonati
    function loadSubs() {
        var host = $('subsTable'), note = $('subsNote');
        host.innerHTML = '<p style="color:var(--text-3)">Se încarcă...</p>';

        S.subscribers(S.token()).then(function (res) {
            var netlify = config && config.settings && config.settings.netlifyForms === true;

            if (res.mode === 'server') {
                note.innerHTML = '';
            } else if (netlify) {
                note.innerHTML = '<div class="note"><svg width="18" height="18"><use href="#a-info"/></svg>' +
                    '<div><b>Netlify Forms este activ.</b> Lista completă a emailurilor este în ' +
                    'dashboard-ul Netlify → <b>Forms</b> → <code>rs-coupon</code>, de unde o poți exporta ca CSV. ' +
                    'Tabelul de mai jos arată doar ce s-a colectat în acest browser, ca verificare rapidă.</div></div>';
            } else {
                note.innerHTML = '<div class="note note--warn"><svg width="18" height="18"><use href="#a-warn"/></svg>' +
                    '<div>Emailurile <b>nu ajung la tine</b> — se salvează doar în browserul vizitatorului. ' +
                    'Activează <b>Netlify Forms</b> în Setări (dacă ești pe Netlify), urcă folderul ' +
                    '<code>api/</code> pe un hosting cu PHP, sau pune un webhook de Discord.</div></div>';
            }

            var list = res.list || [];
            if (!list.length) {
                host.innerHTML = '<p style="color:var(--text-3)">Niciun email colectat încă.</p>';
                $('cSubs').textContent = '0';
                return;
            }

            $('cSubs').textContent = list.length;
            host.innerHTML = '<table class="table"><thead><tr><th>#</th><th>Email</th><th>Cupon</th><th>Data</th></tr></thead><tbody>' +
                list.slice().reverse().map(function (s, i) {
                    var d = s.at ? new Date(s.at) : null;
                    return '<tr><td>' + (list.length - i) + '</td>' +
                        '<td>' + S.escapeHtml(s.email) + '</td>' +
                        '<td><code>' + S.escapeHtml(s.coupon || '—') + '</code></td>' +
                        '<td>' + (d && !isNaN(d) ? d.toLocaleString('ro-RO') : '—') + '</td></tr>';
                }).join('') + '</tbody></table>';
        });
    }

    function exportSubs() {
        S.subscribers(S.token()).then(function (res) {
            var list = res.list || [];
            if (!list.length) { toast('Nu există emailuri de exportat.', 'err'); return; }
            var csv = 'email,cupon,data\n' + list.map(function (s) {
                return '"' + String(s.email).replace(/"/g, '""') + '","' +
                    String(s.coupon || '').replace(/"/g, '""') + '","' + (s.at || '') + '"';
            }).join('\n');
            download(csv, 'abonati-rs-optimization.csv', 'text/csv;charset=utf-8');
        });
    }

    // ================================================================ backup
    function exportJson() {
        download(JSON.stringify(config, null, 2), 'site.json', 'application/json');
        toast('Descărcat. Înlocuiește data/site.json din folderul site-ului, apoi redeployează pe Netlify.', 'ok');
    }

    function importJson(e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function () {
            try {
                var parsed = JSON.parse(reader.result);
                if (!parsed || typeof parsed !== 'object') throw new Error('format invalid');
                config = parsed;
                normalise(config);
                renderAll();
                markDirty();
                toast('Fișier încărcat. Apasă SALVEAZĂ ca să îl aplici.', 'ok');
            } catch (err) {
                toast('Fișierul nu este un JSON valid.', 'err');
            }
            e.target.value = '';
        };
        reader.readAsText(file);
    }

    function download(text, filename, mime) {
        var blob = new Blob([text], { type: mime });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    }

    // ================================================================= toast
    function toast(message, kind) {
        var host = $('toasts');
        var el = document.createElement('div');
        el.className = 'toast' + (kind ? ' toast--' + kind : '');
        el.textContent = message;
        host.appendChild(el);
        setTimeout(function () {
            el.classList.add('is-out');
            setTimeout(function () { el.remove(); }, 320);
        }, 5200);
    }
})();
