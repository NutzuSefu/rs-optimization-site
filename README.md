# RS OPTIMIZATION — site

Site de prezentare + shop + admin panel pentru aplicația RS OPTIMIZATION.
HTML/CSS/JS pur, fără framework, fără build. Îl urci ca atare pe orice hosting.

---

## 1. Vezi-l local, acum

```bash
powershell -ExecutionPolicy Bypass -File .\preview.ps1
```

Se deschide pe `http://localhost:8080`. Admin panel-ul: `http://localhost:8080/admin.html`.

Dacă ai PHP instalat și vrei să testezi și salvarea reală:

```bash
powershell -ExecutionPolicy Bypass -File .\preview.ps1 -Php
```

---

## 2. Structura

```
index.html              pagina publică
admin.html              panoul de administrare
robots.txt              ascunde /admin.html și /api de motoarele de căutare
.htaccess               securitate + cache (Apache)
preview.ps1             server local pentru testare

data/
  site.json             TOT conținutul site-ului: produse, prețuri, cupoane, texte, link-uri

assets/
  css/style.css         designul site-ului
  css/admin.css         designul admin panel-ului
  js/store.js           stratul de date (comun site + admin)
  js/site.js            logica paginii publice
  js/admin.js           logica admin panel-ului
  img/                  logo-uri optimizate pentru web

netlify/                OPȚIONAL — backendul pentru Netlify
  functions/config.mjs  admin panel live, cu datele în Netlify Blobs
netlify.toml            securitate, cache, rute (Netlify)
package.json            doar pentru dependența funcției de mai sus

api/                    OPȚIONAL — alternativa, pentru hosting cu PHP
  config.php            citește/scrie site.json, autentificare admin
  subscribe.php         primește emailurile din popup
  _lib.php              funcții comune
  storage/              parola (hash) + lista de abonați — NU e accesibil public

_source/                NU se urcă pe hosting
  *.png                 logo-urile originale
  make-assets.py        regenerează imaginile din assets/img
```

Backendul e opțional și interschimbabil: pagina cere `api/config.php`, iar pe
Netlify funcția răspunde chiar pe acea rută. Dacă niciunul nu există, site-ul
citește `data/site.json` și merge mai departe.

---

## 3. Publicare

### Varianta A — hosting cu PHP (recomandată)

Aproape orice hosting cu cPanel are PHP. Aici admin panel-ul e **live**: ce salvezi
se vede imediat pentru toți vizitatorii, iar emailurile din popup ajung la tine.

> Necesită **PHP 8.0 sau mai nou** (folosește `str_starts_with`, `match`-style syntax
> și `password_hash`). Verifici versiunea în cPanel → *Select PHP Version*.
> Dacă hostingul are doar PHP 7.x, treci pe Varianta B.

1. Urcă tot **în afară de `_source/`** în `public_html` (sau folderul site-ului).
2. Dă drept de scriere la:
   - folderul `data/` (ca să poată salva `site.json`)
   - folderul `api/storage/` (parola și abonații)

   În cPanel → File Manager → click dreapta → Permissions → `755`.
3. Deschide `https://domeniul-tau.ro/admin.html`.
   La prima intrare îți cere să **îți alegi parola de administrator**.
4. Gata. Editează produsele, prețurile, cupoanele și apasă SALVEAZĂ.

### Varianta B — Netlify, gratuit, cu admin panel live

Pe Netlify nu există PHP, dar site-ul vine cu echivalentul: o **Netlify Function**
(`netlify/functions/config.mjs`) care ține configurația în **Netlify Blobs**.
Rezultatul e același ca pe PHP: **salvezi din admin panel și se vede imediat pe site,
fără redeploy.** Iar emailurile din popup sunt colectate de **Netlify Forms**.

Totul intră în planul gratuit (125.000 apeluri de funcție și 100 de formulare pe lună).

#### Pasul 1 — urcă site-ul prin Git

> **Obligatoriu Git, nu drag & drop.** Deploy-ul manual nu rulează `npm install`,
> deci funcția nu ar avea dependențele și admin panel-ul ar rămâne în „Mod local".

1. Pui folderul într-un repo GitHub (poate fi privat)
2. Netlify → **Add new site** → **Import an existing project** → alegi repo-ul
3. *Build command*: îl lași gol. *Publish directory*: `.`
4. **Deploy**

Nu urca `_source/` și `api/` (varianta PHP). Restul da, inclusiv `admin.html`,
`package.json` și folderul `netlify/`.

#### Pasul 2 — pune parola de admin

Netlify → **Site configuration** → **Environment variables** → **Add a variable**:

| Key | Value |
|---|---|
| `ADMIN_PASSWORD` | parola ta (minim 8 caractere, ceva serios) |

Apoi **Deploys** → **Trigger deploy** → *Deploy site*, ca variabila să fie preluată.

Parola stă doar acolo. Nu e în cod, nu e în repo, nu ajunge niciodată în pagină —
verificarea se face pe server, în funcție.

#### Pasul 3 — intri și administrezi

`https://site-ul-tau.netlify.app/admin.html` → parola → editezi → **SALVEAZĂ**.
Modificarea e live în maximum un minut (atât ține cache-ul răspunsului).

La prima intrare indicatorul din bara de sus arată *„Conectat — încă nimic salvat"*:
se citește `data/site.json` din deploy. După prima salvare devine *„Live pe server"*
și de atunci conținutul vine din Blobs.

#### Emailurile din popup

Le colectează **Netlify Forms** — le vezi în Netlify → **Forms** → `rs-coupon`,
cu export CSV. Din **Forms → Settings → Form notifications** poți primi notificare
pe email sau direct pe Discord la fiecare înscriere.

Comutatorul e în **Admin Panel → Setări → Colectarea emailurilor → Netlify Forms**
(vine deja bifat). Formularul are câmp-capcană anti-boți.

> Netlify detectează formularul **la deploy**, scanând HTML-ul. Dacă nu apare în
> dashboard după primul deploy, verifică în **Forms** că e activat *Form detection*
> și redeployează.

#### Dacă preferi fără funcție (drag & drop simplu)

Merge și așa: urci doar fișierele statice, fără `netlify/` și `package.json`.
Admin panel-ul intră în **„Mod local"** — îl rulezi de pe calculatorul tău cu
`preview.ps1`, editezi, apeși **DESCARCĂ site.json** și înlocuiești fișierul,
apoi redeployezi. În acest caz **nu urca `admin.html`** și pune înapoi în
`netlify.toml` blocul care îl blochează:

```toml
[[redirects]]
  from = "/admin.html"
  to = "/404.html"
  status = 404
  force = true
```

### Varianta C — alt hosting static (Cloudflare Pages, GitHub Pages)

Merge la fel, dar fără colectarea emailurilor. Debifezi *Netlify Forms* din Setări
și pui un webhook de Discord (secțiunea 6). `netlify.toml` va fi ignorat —
pe Cloudflare Pages ai nevoie de fișiere `_headers` și `_redirects` echivalente.

Nu urca folderul `api/` pe hosting static — n-ar face nimic, iar fișierele `.php`
ar fi servite ca text sursă.

---

## 4. Admin panel

Se accesează la `/admin.html`. Nu există link către el nicăieri pe site și e blocat în `robots.txt`.

| Tab | Ce faci acolo |
|---|---|
| **Produse** | Pachetele din secțiunea SHOP: nume, preț, preț tăiat, ce include, link de cumpărare, care e evidențiat, care e ascuns |
| **Cupoane** | Coduri de reducere. Cel activ apare în banner, recalculează prețurile afișate și e cel dat în popup |
| **Popup email** | Textele, după câte secunde apare, ce cupon oferă, la câte zile reapare |
| **Conținut** | Bara de anunț, hero, cifre, beneficii, secțiunile de prezentare, pașii, părerile, întrebările frecvente, footer |
| **Link-uri** | Discord, YouTube, TikTok, Instagram, email, suport, termeni |
| **Abonați** | Emailurile colectate, cu export CSV |
| **Setări** | SEO, monedă, ce secțiuni se afișează, webhook, schimbare parolă, backup JSON |

**Parola.** Nu e scrisă nicăieri în cod și nu ajunge niciodată în pagină.
Verificarea se face pe server, în ambele variante:

| Unde ești | Unde stă parola | Cum o schimbi |
|---|---|---|
| Netlify | variabila de mediu `ADMIN_PASSWORD` | Site configuration → Environment variables → apoi *Trigger deploy* |
| Hosting PHP | hash bcrypt în `api/storage/auth.json` | din panou: Setări → Schimbă parola |
| Local (fără backend) | nu există parolă | panoul nu poate salva online oricum |

Dacă uiți parola: pe Netlify o rescrii în Environment variables; pe PHP ștergi
`api/storage/auth.json` și reiei configurarea.

**Sesiunea** ține 12 ore. Tokenul e semnat HMAC cu parola, deci schimbarea parolei
invalidează automat toate sesiunile deschise.

---

## 5. Cum funcționează cuponul din popup

1. Vizitatorul stă pe site numărul de secunde setat în **Popup email**.
2. Apare popup-ul, își lasă adresa.
3. Adresa se trimite la `api/subscribe.php` și se salvează în `api/storage/subscribers.json`.
4. Cuponul apare cu animație (card care se rotește, sclipire, confetti) și poate fi copiat cu un click.
5. Codul e valabil oriunde îl accepți tu — la plată sau când deschide ticket pe Discord.

Popup-ul nu reapare pentru același vizitator timp de X zile (setabil).

> Site-ul **nu trimite emailuri**. Colectează adresele ca să le poți folosi tu.
> Dacă vrei trimitere automată, ai nevoie de un serviciu de email (Brevo, Mailchimp etc.).

---

## 6. Webhook de Discord (opțional, pentru hosting static)

În **Setări → Webhook pentru emailuri** poți pune un webhook de Discord.
Când cineva se abonează, primești un mesaj pe canal.

Atenție: adresa webhook-ului ajunge în codul paginii, deci e vizibilă pentru oricine.
Cine o găsește îți poate trimite mesaje pe acel canal. Folosește un canal dedicat,
iar dacă începe să fie spamat, îl regenerezi din Discord.

Pe hosting cu PHP nu îți trebuie — `api/subscribe.php` e varianta sigură.

---

## 7. Personalizare

**Logo-uri.** Înlocuiește fișierele din `assets/img/`:

| Fișier | Unde apare |
|---|---|
| `rs-logo-hero.png` | imaginea mare din hero |
| `rs-logo.png` | meniu, footer, admin |
| `fivem-logo.png` | banda „Făcut pentru FiveM" |
| `favicon.png` | iconița din tab |

Dacă vrei să le regenerezi din originale (fundal transparent + optimizare):

```bash
py _source/make-assets.py
```

**Culori.** Toate sunt în `assets/css/style.css`, la început, în `:root`.
Albastrul brandului e `--accent: #29b8ff`. Schimbi acolo și se propagă peste tot.

**Texte.** Nu umbla în HTML — aproape tot conținutul vine din `data/site.json`
și se editează din admin panel.

---

## 8. Securitate

- Tot ce vine din `site.json` e escapat înainte de afișare, deci un text greșit
  introdus în admin nu poate injecta cod în pagină.
- Link-urile acceptă doar `http://` și `https://` — `javascript:` sau `data:` sunt refuzate.
- Parola de admin nu e niciodată în clar și nu ajunge în JavaScript:
  pe PHP e hash bcrypt pe disc, pe Netlify e variabilă de mediu.
- Comparația parolei se face în timp constant (`timingSafeEqual`), ca durata
  răspunsului să nu trădeze cât din parolă e corect.
- Token de sesiune semnat HMAC, valabil 12 ore, invalidat automat la schimbarea parolei.
- Maxim 8 încercări de login la 15 minute per IP (varianta PHP).
- `api/storage/` e blocat din `.htaccess` **și** fișierele din el încep cu `<?php exit;`,
  deci rămân inaccesibile chiar și pe un server care ignoră `.htaccess` (nginx).
- La fiecare salvare se face automat `data/site.json.bak`.

**Pe nginx** trebuie să blochezi manual, `.htaccess` nu e citit:

```nginx
location ~ ^/(api/storage|_source)/ { deny all; }
location = /data/site.json.bak      { deny all; }
```

---

## 9. Ce nu face site-ul

Ca să nu fie surprize:

- **nu procesează plăți.** Butonul CUMPĂRĂ duce unde pui tu link — Discord, o pagină
  de plată, PayPal, orice. Dacă vrei plată automată pe site, e nevoie de integrare
  cu un procesator (Stripe, Netopia, PayU) și de un backend care livrează licența.
- **nu validează cupoanele la plată.** Cuponul e afișat și recalculează prețul pe
  site; verificarea lui la comandă o faci tu (sau procesatorul de plăți).
- **nu trimite emailuri** — vezi secțiunea 5.

---

## 10. Conturi web și licențe

Pagina `account.html` folosește același Cloudflare License API ca aplicația desktop
și botul Discord. Are autentificare cu email, conectare OAuth Discord/Google,
verificare email, sesiune server-side, revendicare de cheie, conexiuni și dispozitive.

Pe Netlify setează `LICENSE_SERVICE_URL` cu URL-ul Worker-ului; funcția
`netlify/functions/auth.mjs` face proxy same-origin. Pentru OAuth configurează în
Worker `WEB_APP_ORIGIN`, `PUBLIC_APP_URL`, `OAUTH_REDIRECT_BASE_URL` și callback-urile:

```text
https://<worker-host>/v1/oauth/discord/callback
https://<worker-host>/v1/oauth/google/callback
```

Aplică migrarea D1 `migrations/0004_web_auth.sql` înainte de publicarea Worker-ului.
Parolele nu sunt stocate în clar, iar ban-ul dat din bot este respectat la următoarea
verificare de sesiune în site și în aplicație.
