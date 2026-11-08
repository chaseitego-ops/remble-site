/* GET /api/siparisler?anahtar=... — ödenmiş siparişlerin listesi (kargo için).
   SIPARIS_ANAHTAR ortam değişkeni tanımlı değilse kapalıdır. */
import { json } from '../_lib.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (!env.SIPARIS_ANAHTAR || url.searchParams.get('anahtar') !== env.SIPARIS_ANAHTAR) return json({ hata: 'Yetkisiz.' }, 401);
  if (!env.SIPARIS) return json({ hata: 'Sipariş deposu bağlı değil.' }, 503);
  const liste = await env.SIPARIS.list({ prefix: 'odendi:' });
  const out = [];
  for (const k of liste.keys.reverse()) {
    const oid = k.name.split(':').pop();
    try { out.push(JSON.parse(await env.SIPARIS.get('siparis:' + oid))); } catch {}
  }
  return json({ adet: out.length, siparisler: out });
}
