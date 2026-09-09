import { createHmac, timingSafeEqual } from 'node:crypto';

const json = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' }
});

function tokenValid(token) {
  const secret = process.env.ADMIN_PASSWORD || '';
  if (!secret || typeof token !== 'string' || !token.includes('.')) return false;
  const [expires, sig] = token.split('.', 2);
  if (!/^\d+$/.test(expires) || Number(expires) < Date.now()) return false;
  const expected = createHmac('sha256', secret).update(expires).digest('hex');
  return expected.length === sig.length && timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
}

export default async (req) => {
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'Metoda nu este permisă.' }, 405);
  if (!tokenValid(req.headers.get('x-admin-token') || '')) return json({ error: 'Neautentificat.' }, 401);
  const base = String(process.env.LICENSE_SERVICE_URL || process.env.LICENSE_API_URL || 'https://rs-optimization-license-api.radu8781.workers.dev').replace(/\/$/, '');
  const secret = process.env.LICENSE_ADMIN_SECRET || '';
  if (!secret) return json({ error: 'Dashboard-ul staff nu este configurat: adaugă LICENSE_ADMIN_SECRET în Netlify.' }, 503);
  const response = await fetch(`${base}/v1/admin/dashboard`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${secret}` }, body: '{}' });
  const data = await response.json().catch(() => ({ error: 'Răspuns invalid de la License API.' }));
  return json(data, response.status);
};

export const config = { path: '/api/staff.php' };
