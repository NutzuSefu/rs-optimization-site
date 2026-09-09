/**
 * RS OPTIMIZATION — backend pentru admin panel, rulat ca Netlify Function.
 *
 * Inlocuieste api/config.php pe Netlify, unde nu exista PHP. Configuratia se
 * pastreaza in Netlify Blobs, deci admin panel-ul salveaza LIVE: modificarile
 * se vad pe site fara redeploy.
 *
 * Parola sta in variabila de mediu ADMIN_PASSWORD, setata din dashboard-ul
 * Netlify. Nu ajunge niciodata in pagina si nu e in cod.
 *
 * Rute (functia isi declara singura calea, vezi `config` la final):
 *   GET  /api/config.php?action=status   -> { configured, reason? }
 *   GET  /api/config.php                 -> { config }        (public)
 *   POST /api/config.php?action=login    -> { token }
 *   POST /api/config.php                 -> salveaza          (necesita token)
 */

import { createHmac, timingSafeEqual } from 'node:crypto';

const STORE_NAME = 'rs-optimization';
const CONFIG_KEY = 'site-config';
const TOKEN_TTL_MS = 12 * 60 * 60 * 1000;   // 12 ore
const MAX_CONFIG_BYTES = 1024 * 1024;       // 1 MB

// ------------------------------------------------------------------ raspunsuri

const json = (data, status = 200, headers = {}) =>
    new Response(JSON.stringify(data), {
        status,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'X-Content-Type-Options': 'nosniff',
            ...headers,
        },
    });

const fail = (message, status = 400) => json({ error: message }, status);

// ----------------------------------------------------------------------- auth

const password = () => process.env.ADMIN_PASSWORD || '';

/** Comparatie in timp constant, ca sa nu se poata ghici parola dupa durata raspunsului. */
function samePassword(candidate) {
    const secret = password();
    if (!secret) return false;

    // Hash-uim ambele valori ca sa avem lungimi egale pentru timingSafeEqual.
    const a = createHmac('sha256', secret).update(String(candidate ?? '')).digest();
    const b = createHmac('sha256', secret).update(secret).digest();
    return timingSafeEqual(a, b);
}

function makeToken() {
    const expires = Date.now() + TOKEN_TTL_MS;
    const sig = createHmac('sha256', password()).update(String(expires)).digest('hex');
    return `${expires}.${sig}`;
}

function tokenValid(token) {
    const secret = password();
    if (!secret || typeof token !== 'string' || !token.includes('.')) return false;

    const [expires, sig] = token.split('.', 2);
    if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;

    const expected = createHmac('sha256', secret).update(expires).digest('hex');
    if (expected.length !== sig.length) return false;

    return timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

// -------------------------------------------------------------------- handler

async function handleConfig(req) {
    let url;
    try { url = new URL(String(req.url || ''), 'https://netlify.local'); }
    catch { return fail('Cerere invalidă.', 400); }
    const action = url.searchParams.get('action') || '';
    // ---------------------------------------------------------------- status
    if (req.method === 'GET' && action === 'status') {
        return json(
            password()
                ? { configured: true, backend: 'netlify' }
                : {
                      configured: false,
                      backend: 'netlify',
                      reason: 'env-missing',
                      message:
                          'Setează variabila ADMIN_PASSWORD în Netlify: Site configuration → ' +
                          'Environment variables → Add a variable. Apoi redeployează site-ul.',
                  },
            200,
            { 'Cache-Control': 'no-store' },
        );
    }

    // Blobs is initialized lazily. This keeps the status/login route healthy
    // even when a deploy has not provisioned a Blobs store yet.
    let store;
    try {
        const blobs = await import('@netlify/blobs');
        store = blobs.getStore(STORE_NAME);
    }
    catch (error) { return fail('Stocarea Netlify Blobs nu este disponibilă pe acest deploy.', 503); }

    // -------------------------------------------------- citirea configuratiei
    if (req.method === 'GET') {
        let config = null;
        try {
            config = await store.get(CONFIG_KEY, { type: 'json' });
        } catch {
            // Blob-ul inca nu exista sau nu e disponibil.
        }

        // Fara nimic salvat, pagina cade inapoi pe data/site.json (fisierul din deploy).
        if (!config) return fail('Nicio configurație salvată încă.', 404);

        return json({ config }, 200, {
            // Scurt, ca sa nu consume invocari degeaba, dar destul de scurt
            // cat sa vezi modificarile aproape imediat.
            'Cache-Control': 'public, max-age=60, stale-while-revalidate=300',
        });
    }

    if (req.method !== 'POST') {
        return fail('Metoda nu este permisă.', 405);
    }

    // ----------------------------------------------------------------- body
    let body;
    try {
        const raw = await req.text();
        if (raw.length > MAX_CONFIG_BYTES) return fail('Datele trimise sunt prea mari.', 413);
        body = raw ? JSON.parse(raw) : {};
    } catch {
        return fail('Corpul cererii nu este JSON valid.', 400);
    }

    // ----------------------------------------------------------------- login
    if (action === 'login') {
        if (!password()) {
            return fail(
                'ADMIN_PASSWORD nu este setată în Netlify. Adaug-o din Site configuration → ' +
                    'Environment variables, apoi redeployează.',
                409,
            );
        }
        if (!samePassword(body.password)) {
            return fail('Parolă greșită.', 401);
        }
        return json({ token: makeToken(), expiresIn: TOKEN_TTL_MS / 1000 }, 200, {
            'Cache-Control': 'no-store',
        });
    }

    // Schimbarea parolei se face din Netlify, nu din pagina.
    if (action === 'password') {
        return fail(
            'Pe Netlify parola se schimbă din Site configuration → Environment variables → ADMIN_PASSWORD.',
            501,
        );
    }

    if (action === 'setup') {
        return fail(
            'Pe Netlify nu există configurare din pagină. Setează ADMIN_PASSWORD în Environment variables.',
            501,
        );
    }

    // ------------------------------------------------------------- salvarea
    if (!tokenValid(req.headers.get('x-admin-token'))) {
        return fail('Neautentificat.', 401);
    }

    const config = body.config;
    if (!config || typeof config !== 'object' || Array.isArray(config)) {
        return fail('Lipsește configurația.', 422);
    }

    for (const key of ['products', 'coupons', 'stats', 'features', 'showcase', 'steps', 'testimonials', 'faq']) {
        if (key in config && !Array.isArray(config[key])) {
            return fail(`Câmpul "${key}" trebuie să fie o listă.`, 422);
        }
    }

    const encoded = JSON.stringify(config);
    if (encoded.length > MAX_CONFIG_BYTES) return fail('Configurația este prea mare.', 413);

    try {
        // Pastram versiunea precedenta, ca sa se poata reveni daca se strica ceva.
        const previous = await store.get(CONFIG_KEY, { type: 'json' }).catch(() => null);
        if (previous) await store.setJSON(`${CONFIG_KEY}.bak`, previous);

        await store.setJSON(CONFIG_KEY, config);
    } catch (err) {
        return fail('Nu am putut salva configurația: ' + (err?.message || 'eroare necunoscută'), 500);
    }

    return json({ ok: true, savedAt: new Date().toISOString() }, 200, { 'Cache-Control': 'no-store' });
}

export default async (req) => {
    try { return await handleConfig(req); }
    catch (error) {
        console.error('Config function failed:', error?.message || error);
        return fail('Backend config error: ' + (error?.message || 'eroare necunoscută'), 500);
    }
};

/** Functia raspunde direct pe calea folosita si de varianta cu PHP. */
export const config = { path: '/api/config' };
