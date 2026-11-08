/* POST /api/paytr-bildirim — PayTR ödeme sonucunu buraya bildirir.
   İmza doğrulanır, sipariş kaydı güncellenir, gövdede yalnızca "OK" döner. */
import { hmacBase64, text } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  const p = Object.fromEntries((await request.formData()).entries());
  const oid = String(p.merchant_oid || '');
  const durum = String(p.status || '');
  const toplam = String(p.total_amount || '');

  if (!env.PAYTR_MERCHANT_KEY || !env.PAYTR_MERCHANT_SALT) return text('PAYTR notification failed: config', 500);

  const beklenen = await hmacBase64(env.PAYTR_MERCHANT_KEY, oid + env.PAYTR_MERCHANT_SALT + durum + toplam);
  if (!oid || beklenen !== String(p.hash || '')) return text('PAYTR notification failed: bad hash', 400);

  if (env.SIPARIS) {
    const anahtar = 'siparis:' + oid;
    let kayit = null;
    try { kayit = JSON.parse(await env.SIPARIS.get(anahtar)); } catch { kayit = null; }
    if (!kayit) kayit = { siparisNo: oid, durum: 'beklemede', musteri: null };

    if (kayit.durum === 'odendi') return text('OK');   // aynı bildirim ikinci kez geldi

    kayit.durum = durum === 'success' ? 'odendi' : 'basarisiz';
    kayit.sonuc = {
      zaman: new Date().toISOString(),
      toplamKurus: toplam,
      odemeTuru: p.payment_type || '',
      taksit: p.installment_count || '',
      testModu: p.test_mode || '0',
      hataKodu: p.failed_reason_code || '',
      hataMesaji: p.failed_reason_msg || '',
    };
    await env.SIPARIS.put(anahtar, JSON.stringify(kayit));
    if (kayit.durum === 'odendi') {
      await env.SIPARIS.put('odendi:' + kayit.sonuc.zaman + ':' + oid, '1');   // listeleme için indeks
    }
  }

  return text('OK');
}

export function onRequest() {
  return text('PAYTR notification endpoint', 405);
}
