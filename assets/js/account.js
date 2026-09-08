(function () {
  'use strict';

  // Netlify can proxy this through /api/auth; the Worker fallback also keeps
  // the account page usable on the existing static/PHP hosting.
  var API = String(window.RS_AUTH_API_URL || '').trim() || 'https://rs-optimization-license-api.radu8781.workers.dev';
  var TOKEN_KEY = 'rsopt.account.session';
  var $ = function (id) { return document.getElementById(id); };
  var currentUser = null;

  function apiPath(path, extra) {
    var params = new URLSearchParams();
    Object.keys(extra || {}).forEach(function (key) { if (extra[key] != null) params.set(key, extra[key]); });
    // The Netlify function is a query-based proxy; the Worker itself routes
    // by pathname. Keep both deployments compatible with the same adapter.
    if (/\/\.netlify\/functions\/auth(?:\?|$)/i.test(API)) {
      params.set('path', path);
      return API + (API.indexOf('?') >= 0 ? '&' : '?') + params.toString();
    }
    var base = API.replace(/\/+$/, '');
    return base + path + (params.toString() ? '?' + params.toString() : '');
  }

  function request(path, options) {
    options = options || {};
    options.headers = Object.assign({ 'Content-Type': 'application/json', Accept: 'application/json' }, options.headers || {});
    var token = sessionToken();
    if (token) options.headers.Authorization = 'Bearer ' + token;
    return fetch(apiPath(path), options).then(function (res) {
      return res.text().then(function (body) {
        var data = {}; try { data = body ? JSON.parse(body) : {}; } catch (e) {}
        if (!res.ok) { var err = new Error(data.message || 'Cererea nu a putut fi finalizată.'); err.data = data; err.status = res.status; throw err; }
        return data;
      });
    });
  }

  function sessionToken() { try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } }
  function saveToken(value) { try { sessionStorage.setItem(TOKEN_KEY, value); } catch (e) {} }
  function clearToken() { try { sessionStorage.removeItem(TOKEN_KEY); } catch (e) {} }
  function esc(value) { return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) { return ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' })[c]; }); }
  function setStatus(text, kind, id) { var el = $(id || 'authStatus'); if (!el) return; el.textContent = text || ''; el.className = 'auth-status' + (kind ? ' is-' + kind : ''); }
  function formatDate(value) { var date = new Date(value); return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('ro-RO', { day:'numeric', month:'long', year:'numeric' }); }

  function providerUrl(provider) {
    var returnTo = location.origin + location.pathname;
    var path = '/v1/oauth/' + provider + '/start';
    return apiPath(path, { return_to: returnTo });
  }

  function bindOAuthLink(id, provider) {
    var link = $(id);
    if (!link) return;
    link.href = providerUrl(provider);
    link.addEventListener('click', function (event) {
      // OAuth callbacks cannot return to a file:// page. Keep local testing
      // from opening the Worker JSON error page and explain the requirement.
      if (location.protocol === 'file:') {
        event.preventDefault();
        setStatus('Pagina este deschisă local. Deschide site-ul prin URL-ul public pentru autentificarea cu Discord sau Google.', 'error');
      }
    });
  }

  function setAuthMode(mode) {
    var signup = mode === 'signup';
    $('loginTab').classList.toggle('is-active', !signup); $('signupTab').classList.toggle('is-active', signup);
    $('loginTab').setAttribute('aria-selected', String(!signup)); $('signupTab').setAttribute('aria-selected', String(signup));
    $('loginForm').hidden = signup; $('signupForm').hidden = !signup;
    setStatus('');
  }

  function validateForm(form) {
    if (!form.checkValidity()) { form.reportValidity(); return false; }
    if (form.id === 'signupForm' && form.elements.password.value !== form.elements.passwordConfirm.value) { setStatus('Parolele nu coincid.', 'error'); return false; }
    return true;
  }

  function showAccount(data) {
    currentUser = data.user || data;
    $('authView').hidden = true; $('accountView').hidden = false;
    $('pageTitle').textContent = 'Bine ai venit, ' + (currentUser.displayName || currentUser.username || 'înapoi');
    $('pageSubtitle').textContent = 'Gestionează contul, conexiunile și licența ta RS OPTIMIZATION.';
    $('detailName').textContent = currentUser.displayName || currentUser.username || '—';
    $('detailUsername').textContent = currentUser.username || '—'; $('detailEmail').textContent = currentUser.email || '—';
    $('detailMethod').textContent = currentUser.authProvider === 'google' ? 'Google' : currentUser.authProvider === 'discord' ? 'Discord' : 'Email';
    $('detailCreated').textContent = formatDate(currentUser.registeredUtc);
    if (currentUser.avatarUrl) $('profileAvatar').innerHTML = '<img src="' + esc(currentUser.avatarUrl) + '" alt="Avatar Discord">';
    $('emailBadge').hidden = !currentUser.emailVerified;
    $('connectionEmail').textContent = currentUser.email || '—';
    $('connectionDiscord').textContent = currentUser.discordConnected ? 'conectat' : 'nu este conectat';
    $('connectionGoogle').textContent = currentUser.googleConnected ? 'conectat' : 'nu este conectat';
    $('connectDiscord').hidden = Boolean(currentUser.discordConnected); $('connectGoogle').hidden = Boolean(currentUser.googleConnected);
    $('discordConnectLarge').hidden = Boolean(currentUser.discordConnected);
    if (currentUser.registeredMachineName) { $('devicesPanel').innerHTML = '<strong>' + esc(currentUser.registeredMachineName) + '</strong><br>Dispozitivul principal este asociat licenței tale.'; }
    if (data.license && data.license.active) { $('licenseState').innerHTML = '<span class="license-dot"></span><div><strong>Licență activă</strong><small>Cheie asociată contului — activarea se face din aplicație.</small></div>'; $('licenseState').parentElement.classList.add('is-active'); $('claimLicense').hidden = true; }
  }

  function loadSession() {
    var hash = new URLSearchParams(location.hash.slice(1));
    var oauthError = hash.get('oauth_error');
    if (oauthError) { clearToken(); setStatus(oauthError === 'already_linked' ? 'Acest provider este deja legat de alt cont.' : oauthError === 'provider_not_configured' ? 'Conectarea externă nu este configurată încă pe server.' : 'Autentificarea externă nu a putut fi finalizată.', 'error'); history.replaceState(null, '', location.pathname + location.search); }
    if (hash.get('session')) { saveToken(hash.get('session')); history.replaceState(null, '', location.pathname + location.search); }
    var verify = new URLSearchParams(location.search).get('verify');
    if (verify) request('/v1/email/verify', { method:'POST', body:JSON.stringify({ token: verify }) }).then(function () { setAuthMode('login'); setStatus('Email verificat. Te poți autentifica acum.', 'ok'); history.replaceState(null, '', location.pathname); }).catch(function (e) { setStatus(e.message, 'error'); });
    if (!sessionToken()) return Promise.resolve(false);
    return request('/v1/session', { method:'POST', body:'{}' }).then(showAccount).then(function () { return true; }).catch(function () { clearToken(); return false; });
  }

  document.addEventListener('DOMContentLoaded', function () {
    $('loginTab').addEventListener('click', function () { setAuthMode('login'); }); $('signupTab').addEventListener('click', function () { setAuthMode('signup'); });
    ['discordOAuth','connectDiscord','discordConnectLarge'].forEach(function (id) { bindOAuthLink(id, 'discord'); }); ['googleOAuth','connectGoogle'].forEach(function (id) { bindOAuthLink(id, 'google'); });
    $('loginForm').addEventListener('submit', function (event) { event.preventDefault(); if (!validateForm(this)) return; var btn = this.querySelector('button[type=submit]'); btn.disabled = true; setStatus('Se verifică datele…'); request('/v1/login-email', { method:'POST', body:JSON.stringify({ email:this.elements.email.value.trim(), password:this.elements.password.value }) }).then(function (data) { saveToken(data.sessionToken); showAccount(data); }).catch(function (e) { setStatus(e.message, 'error'); }).finally(function () { btn.disabled = false; }); });
    $('signupForm').addEventListener('submit', function (event) { event.preventDefault(); if (!validateForm(this)) return; var btn = this.querySelector('button[type=submit]'); btn.disabled = true; setStatus('Se creează contul…'); request('/v1/signup-email', { method:'POST', body:JSON.stringify({ displayName:this.elements.displayName.value.trim(), username:this.elements.username.value.trim(), email:this.elements.email.value.trim(), password:this.elements.password.value }) }).then(function (data) { saveToken(data.sessionToken); showAccount(data); $('pageSubtitle').textContent = data.emailVerificationSent ? 'Cont creat. Verifică emailul pentru a confirma adresa.' : 'Cont creat. Poți conecta Discord și revendica licența.'; }).catch(function (e) { setStatus(e.message, 'error'); }).finally(function () { btn.disabled = false; }); });
    $('logoutBtn').addEventListener('click', function () { clearToken(); currentUser = null; $('accountView').hidden = true; $('authView').hidden = false; $('pageTitle').textContent = 'Bine ai venit'; $('pageSubtitle').textContent = 'Intră în cont pentru a-ți gestiona licența RS OPTIMIZATION.'; setAuthMode('login'); setStatus('Ai fost deconectat.', 'ok'); });
    $('forgotPassword').addEventListener('click', function () { setStatus('Pentru resetarea parolei, deschide un ticket pe Discord.'); });
    $('claimLicense').addEventListener('click', function () { $('claimModal').hidden = false; $('claimForm').elements.key.focus(); }); document.querySelectorAll('[data-close]').forEach(function (el) { el.addEventListener('click', function () { $('claimModal').hidden = true; }); });
    $('claimForm').addEventListener('submit', function (event) { event.preventDefault(); var key = this.elements.key.value.trim(); if (!key) return; setStatus('Se verifică cheia…', '', 'claimStatus'); request('/v1/claim-key', { method:'POST', body:JSON.stringify({ key:key }) }).then(function (data) { $('claimModal').hidden = true; showAccount(data); }).catch(function (e) { setStatus(e.message, 'error', 'claimStatus'); }); });
    loadSession();
  });
})();
