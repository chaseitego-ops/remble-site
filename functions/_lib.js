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

/** Ürünler ve fiyatlar tek yerde durur (asıl kaynak burası; js/sepet.js'teki katalog yalnızca gösterim içindir).
    Tutar kuruş cinsinden tam sayı, KDV ve kargo dahil. */
export const URUNLER = {
  origin: { ad: 'Remble Origin', fiyatKurus: 1499900 },   // 14.999,00 TL
};
export const MAX_ADET = 10;   // bir siparişte toplam adet sınırı

export function kurusMetin(k) { return (k / 100).toFixed(2); }

/** İstekle gelen sepeti doğrular ve fiyatları buradan hesaplar.
    Sepet hiç gönderilmemişse (eski sayfa önbelleği) 1 adet Remble Origin sayılır.
    Geçersizse null döner. */
export function sepetCoz(girdi) {
  if (girdi === undefined || girdi === null) girdi = [{ id: 'origin', adet: 1 }];
  if (!Array.isArray(girdi) || girdi.length === 0 || girdi.length > 20) return null;
  const adetler = {};
  for (const k of girdi) {
    if (!k || typeof k.id !== 'string' || !Object.prototype.hasOwnProperty.call(URUNLER, k.id)) return null;
    if (typeof k.adet !== 'number' || !Number.isInteger(k.adet) || k.adet < 1 || k.adet > MAX_ADET) return null;
    adetler[k.id] = (adetler[k.id] || 0) + k.adet;
  }
  let toplamAdet = 0, toplamKurus = 0;
  const kalemler = [];
  for (const id of Object.keys(adetler)) {
    const u = URUNLER[id];
    toplamAdet += adetler[id];
    toplamKurus += u.fiyatKurus * adetler[id];
    kalemler.push({ id, ad: u.ad, adet: adetler[id], birimKurus: u.fiyatKurus });
  }
  if (toplamAdet > MAX_ADET) return null;
  return { kalemler, toplamAdet, toplamKurus };
}

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
