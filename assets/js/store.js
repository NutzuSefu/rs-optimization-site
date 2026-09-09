/* ==========================================================================
   RS OPTIMIZATION — stratul de date, folosit si de site si de admin panel.

   Cum stie de unde citeste:
     1. api/config.php          — daca hostingul are PHP, asta e sursa reala
                                  si modificarile din admin sunt live pentru toata lumea
     2. data/site.json          — fallback pentru hosting pur static
     3. localStorage            — doar ca preview local, in browserul tau

   Nu exista niciun secret in fisierul asta. Parola de admin nu ajunge
   niciodata in JS: se trimite la server, care compara cu un hash.
   ========================================================================== */

(function (global) {
    'use strict';

    var API_CONFIG = 'api/config';
    var API_ADMIN_AUTH = 'api/admin-auth.php';
    var API_SUBSCRIBE = 'api/subscribe.php';
    var JSON_FALLBACK = 'data/site.json';
    var LS_CONFIG = 'rsopt.config.draft';
    var LS_TOKEN = 'rsopt.admin.token';
    var LS_SUBS = 'rsopt.subscribers.local';

    /** Sursa din care s-a citit ultima data: 'api' | 'json' | 'local'. */
    var source = null;
    var cache = null;
    var API_BASE = String(global.RS_SITE_API_BASE || '').replace(/\/$/, '');
    var WORKER_API = !!API_BASE;
    if (WORKER_API) { API_CONFIG = 'site-config'; API_ADMIN_AUTH = 'admin/web-login'; }
    function apiPath(path) { return API_BASE ? API_BASE + '/' + path.replace(/^\//, '') : path; }

    function jsonFetch(url, options) {
        return fetch(url, options).then(function (res) {
            return res.text().then(function (body) {
                var data = null, parsed = false;
                try { data = body ? JSON.parse(body) : null; parsed = true; } catch (e) { /* nu e JSON */ }

                if (!res.ok) {
                    var err = new Error((data && data.error) || ('HTTP ' + res.status));
                    err.status = res.status;
                    throw err;
                }

                // Un hosting fara PHP poate raspunde 200 cu SURSA fisierului .php.
                // Fara verificarea asta l-am lua drept backend functional.
                if (!parsed) {
                    var e2 = new Error('Raspuns care nu este JSON (probabil PHP nu ruleaza pe acest hosting).');
                    e2.status = res.status;
                    e2.notJson = true;
                    throw e2;
                }

                return data;
            });
        });
    }

    // ------------------------------------------------------------------ load

    /**
     * Citeste configuratia. `preferDraft` = true face admin panel-ul sa vada
     * ciorna locala nesalvata, daca exista.
     */
    function load(preferDraft) {
        if (preferDraft) {
            var draft = readDraft();
            if (draft) { source = 'local'; cache = draft; return Promise.resolve(draft); }
        }

        return jsonFetch(apiPath(API_CONFIG) + '?t=' + Date.now())
            .then(function (data) {
                if (!data || !data.config) throw new Error('raspuns invalid');
                source = 'api';
                cache = data.config;
                return cache;
            })
            .catch(function () {
                return jsonFetch(JSON_FALLBACK + '?t=' + Date.now()).then(function (data) {
                    // Fara PHP, o ciorna locala e singurul mod in care admin-ul
                    // vede propriile modificari — dar doar in browserul lui.
                    var draft = readDraft();
                    source = draft ? 'local' : 'json';
                    cache = draft || data;
                    return cache;
                });
            });
    }

    function getSource() { return source; }
    function getCached() { return cache; }

    // ------------------------------------------------------------------ save

    /**
     * Salveaza pe server. Rezolva cu {mode:'api'} cand a mers,
     * sau respinge, ca sa poata admin panel-ul sa ofere descarcarea JSON-ului.
     */
    function save(config, token) {
        config.updatedAt = new Date().toISOString();
        return jsonFetch(apiPath(API_CONFIG), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Token': token || '' },
            body: JSON.stringify({ config: config })
        }).then(function () {
            clearDraft();
            source = 'api';
            cache = config;
            return { mode: 'api' };
        });
    }

    /** Ciorna locala — folosita cand nu exista backend. */
    function saveDraft(config) {
        config.updatedAt = new Date().toISOString();
        try { localStorage.setItem(LS_CONFIG, JSON.stringify(config)); } catch (e) { return false; }
        source = 'local';
        cache = config;
        return true;
    }

    function readDraft() {
        try {
            var raw = localStorage.getItem(LS_CONFIG);
            return raw ? JSON.parse(raw) : null;
        } catch (e) { return null; }
    }

    function clearDraft() {
        try { localStorage.removeItem(LS_CONFIG); } catch (e) { /* ignora */ }
    }

    function hasDraft() { return !!readDraft(); }

    // ------------------------------------------------------------------ auth

    function login(password) {
        return jsonFetch(apiPath(API_ADMIN_AUTH) + '?action=login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        }).then(function (data) {
            if (!data || !data.token) throw new Error('raspuns invalid');
            try { sessionStorage.setItem(LS_TOKEN, data.token); } catch (e) { /* ignora */ }
            return data.token;
        });
    }

    function setup(password) {
        return jsonFetch(API_CONFIG + '?action=setup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: password })
        });
    }

    function status() {
        return WORKER_API ? jsonFetch(apiPath('admin/web-status')) : jsonFetch(apiPath(API_ADMIN_AUTH) + '?action=status');
    }

    function token() {
        try { return sessionStorage.getItem(LS_TOKEN) || ''; } catch (e) { return ''; }
    }

    function logout() {
        try { sessionStorage.removeItem(LS_TOKEN); } catch (e) { /* ignora */ }
    }

    // ------------------------------------------------------------- subscribe

    /**
     * Inregistreaza un email si returneaza cuponul.
     *
     * Incearca pe rand, si se opreste la prima care merge:
     *   1. api/subscribe.php     (hosting cu PHP)
     *   2. Netlify Forms         (daca settings.netlifyForms = true)
     *   3. webhook configurat    (Discord)
     *   4. doar local            — si spune cinstit ca nu a ajuns nicaieri
     */
    function subscribe(email, couponCode, options) {
        options = options || {};

        return jsonFetch(API_SUBSCRIBE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, coupon: couponCode })
        }).then(function (data) {
            return { stored: 'server', coupon: (data && data.coupon) || couponCode };
        }).catch(function () {
            if (options.netlifyForms) {
                return postNetlifyForm(email, couponCode)
                    .then(function () { return { stored: 'netlify', coupon: couponCode }; })
                    .catch(function () { return fallbackStore(email, couponCode, options.webhookUrl); });
            }
            return fallbackStore(email, couponCode, options.webhookUrl);
        });
    }

    function fallbackStore(email, couponCode, webhookUrl) {
        var local = storeSubscriberLocally(email, couponCode);
        if (webhookUrl && /^https:\/\//i.test(webhookUrl)) {
            return postWebhook(webhookUrl, email, couponCode)
                .then(function () { return { stored: 'webhook', coupon: couponCode }; })
                .catch(function () { return { stored: local ? 'local' : 'none', coupon: couponCode }; });
        }
        return Promise.resolve({ stored: local ? 'local' : 'none', coupon: couponCode });
    }

    /**
     * Netlify Forms: se trimite formularul codificat urlencoded catre pagina curenta,
     * cu campul "form-name" egal cu atributul name al formularului din HTML.
     * Netlify il detecteaza la deploy scanand HTML-ul static.
     */
    function postNetlifyForm(email, couponCode) {
        var form = document.getElementById('couponForm');
        if (!form) return Promise.reject(new Error('formularul lipseste'));

        var couponField = document.getElementById('couponField');
        if (couponField) couponField.value = couponCode || '';

        var params = new URLSearchParams();
        new FormData(form).forEach(function (value, key) { params.append(key, value); });
        params.set('email', email);
        if (!params.get('form-name')) params.set('form-name', form.getAttribute('name') || 'rs-coupon');

        return fetch('/', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: params.toString()
        }).then(function (res) {
            if (!res.ok) throw new Error('Netlify a raspuns ' + res.status);
            // Salvam si local, ca sa vezi ceva in tabul Abonati chiar daca
            // lista reala e in dashboard-ul Netlify.
            storeSubscriberLocally(email, couponCode);
            return true;
        });
    }

    function postWebhook(url, email, coupon) {
        // Format compatibil cu Discord; alte servicii ignora ce nu inteleg.
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: 'Abonat nou RS OPTIMIZATION: **' + email + '** (cupon ' + coupon + ')'
            })
        });
    }

    function storeSubscriberLocally(email, coupon) {
        try {
            var list = JSON.parse(localStorage.getItem(LS_SUBS) || '[]');
            if (!list.some(function (s) { return s.email === email; })) {
                list.push({ email: email, coupon: coupon, at: new Date().toISOString() });
                localStorage.setItem(LS_SUBS, JSON.stringify(list));
            }
            return true;
        } catch (e) { return false; }
    }

    function localSubscribers() {
        try { return JSON.parse(localStorage.getItem(LS_SUBS) || '[]'); } catch (e) { return []; }
    }

    function subscribers(tok) {
        return jsonFetch(API_SUBSCRIBE + '?action=list', {
            headers: { 'X-Admin-Token': tok || '' }
        }).then(function (data) {
            return { mode: 'server', list: (data && data.subscribers) || [] };
        }).catch(function () {
            return { mode: 'local', list: localSubscribers() };
        });
    }

    // ------------------------------------------------------------- utilitare

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    /** Acceptam doar http(s) — orice altceva (javascript:, data:) e refuzat. */
    function safeUrl(value) {
        if (!value) return '';
        var v = String(value).trim();
        if (!/^https?:\/\//i.test(v)) return '';
        return v;
    }

    function isEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(value || '').trim());
    }

    function activeCoupon(config, preferredCode) {
        var list = (config && config.coupons) || [];
        var now = Date.now();
        var usable = list.filter(function (c) {
            if (!c || !c.active || !c.code) return false;
            if (c.expiresAt && new Date(c.expiresAt).getTime() < now) return false;
            if (c.maxUses && c.uses >= c.maxUses) return false;
            return true;
        });
        if (preferredCode) {
            var match = usable.find(function (c) { return c.code === preferredCode; });
            if (match) return match;
        }
        return usable[0] || null;
    }

    function couponLabel(coupon) {
        if (!coupon) return '';
        if (coupon.percent) return '-' + coupon.percent + '%';
        if (coupon.amount) return '-' + coupon.amount;
        return coupon.code;
    }

    function applyCoupon(price, coupon) {
        if (!coupon) return price;
        var out = price;
        if (coupon.percent) out = price - (price * coupon.percent / 100);
        else if (coupon.amount) out = price - coupon.amount;
        return Math.max(0, Math.round(out * 100) / 100);
    }

    global.RSStore = {
        load: load, save: save, saveDraft: saveDraft, readDraft: readDraft,
        clearDraft: clearDraft, hasDraft: hasDraft,
        getSource: getSource, getCached: getCached,
        login: login, logout: logout, setup: setup, status: status, token: token,
        subscribe: subscribe, subscribers: subscribers, localSubscribers: localSubscribers,
        escapeHtml: escapeHtml, safeUrl: safeUrl, isEmail: isEmail,
        activeCoupon: activeCoupon, couponLabel: couponLabel, applyCoupon: applyCoupon
    };
})(window);
