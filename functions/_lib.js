/* Remble — PayTR yardımcıları (Cloudflare Pages Functions) */

const enc = new TextEncoder();

/** HMAC-SHA256(key, message) → base64 (PayTR imza biçimi) */
export async function hmacBase64(key, message) {
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(message));
  let s = '';
  for (const b of new Uint8Array(sig)) s += String.fromCharCode(b);
  return btoa(s);
}

export function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...extra },
  });
}

export function text(body, status = 200) {
  return new Response(body, { status, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' } });
}

/** Ürün ve fiyat tek yerde durur. Tutar kuruş cinsinden tam sayı. */
export const URUN = {
  ad: 'Remble',
  fiyatKurus: 1499900,          // 14.999,00 TL — KDV ve kargo dahil
  fiyatMetin: '14999.00',
};

/** UTF-8 metni base64'e çevirir (user_basket için) */
export function b64utf8(str) {
  let s = '';
  for (const b of enc.encode(str)) s += String.fromCharCode(b);
  return btoa(s);
}

export function temizle(v, max) {
  return String(v == null ? '' : v).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function siparisNo() {
  // PayTR: alfanümerik, en fazla 64 karakter, işlem başına benzersiz
  const t = Date.now().toString(36).toUpperCase();
  const r = Array.from(crypto.getRandomValues(new Uint8Array(4)), b => (b % 36).toString(36).toUpperCase()).join('');
  return 'RMB' + t + r;
}
