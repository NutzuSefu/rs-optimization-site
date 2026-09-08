/** Same-origin proxy for the shared Cloudflare license/auth Worker.
 * Set LICENSE_SERVICE_URL in Netlify to the Worker URL. No admin secret is
 * ever sent to the browser; the browser only receives a signed user session.
 */
const allowedMethods = 'GET,POST,OPTIONS';

function response(body, status, headers = {}) {
  return new Response(body, { status, headers: {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': allowedMethods,
    ...headers
  }});
}

export default async (request) => {
  if (request.method === 'OPTIONS') return response('', 204);
  const base = String(process.env.LICENSE_SERVICE_URL || '').trim().replace(/\/+$/, '');
  if (!/^https:\/\//i.test(base)) return response(JSON.stringify({ ok:false, message:'Autentificarea nu este configurată încă pe server.' }), 503);

  const incoming = new URL(request.url);
  const path = incoming.searchParams.get('path') || '/health';
  if (!/^\/v1\/(signup-email|login-email|signup|login|session|claim-key|email\/verify|oauth\/(google|discord)\/(start|callback))$/.test(path)) {
    return response(JSON.stringify({ ok:false, message:'Rută de autentificare invalidă.' }), 400);
  }
  const target = new URL(base + path);
  incoming.searchParams.forEach((value, key) => { if (key !== 'path') target.searchParams.set(key, value); });
  const headers = new Headers();
  const contentType = request.headers.get('content-type'); if (contentType) headers.set('content-type', contentType);
  const authorization = request.headers.get('authorization'); if (authorization) headers.set('authorization', authorization);
  const init = { method: request.method, headers, redirect: 'manual' };
  if (request.method !== 'GET') init.body = await request.arrayBuffer();
  const upstream = await fetch(target, init);
  const outHeaders = new Headers();
  ['content-type','cache-control','location'].forEach((key) => { const value = upstream.headers.get(key); if (value) outHeaders.set(key, value); });
  return new Response(upstream.body, { status: upstream.status, headers: {
    ...Object.fromEntries(outHeaders),
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': allowedMethods
  }});
};

export const config = { path: '/api/auth' };
