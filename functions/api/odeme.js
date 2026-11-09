/* POST /api/odeme — sipariş formunu alır, PayTR'den iFrame jetonu ister.
   Gizli anahtarlar yalnızca burada (sunucu tarafında) kullanılır. */
import { hmacBase64, json, temizle, siparisNo, b64utf8, sepetCoz, kurusMetin, MAX_ADET } from '../_lib.js';

export async function onRequestPost({ request, env }) {
  if (!env.PAYTR_MERCHANT_ID || !env.PAYTR_MERCHANT_KEY || !env.PAYTR_MERCHANT_SALT) {
    return json({ hata: 'Ödeme altyapısı henüz yapılandırılmadı.' }, 503);
  }

  let body;
  try { body = await request.json(); } catch { return json({ hata: 'Geçersiz istek.' }, 400); }

  const ad     = temizle(body.ad, 60);
  const eposta = temizle(body.eposta, 100).toLowerCase();
  const tel    = temizle(body.telefon, 20).replace(/[^\d+ ]/g, '');
  const adres  = temizle(body.adres, 300);
  const il     = temizle(body.il, 40);
  const fatura = temizle(body.fatura, 300);
  const onay   = body.onay === true;

  const hatalar = [];
  if (ad.length < 3) hatalar.push('ad');
  if (!/^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}$/.test(eposta)) hatalar.push('eposta');
  if (tel.replace(/\D/g, '').length < 10) hatalar.push('telefon');
  if (adres.length < 10) hatalar.push('adres');
  if (!il) hatalar.push('il');
  if (!onay) hatalar.push('onay');
  if (hatalar.length) return json({ hata: 'Eksik ya da hatalı alanlar var.', alanlar: hatalar }, 400);

  // Sepet: ürün ve adet istekten, fiyat yalnızca sunucudaki katalogdan
  const siparis = sepetCoz(body.sepet);
  if (!siparis) return json({ hata: 'Sepetiniz boş ya da geçersiz. Bir siparişte en fazla ' + MAX_ADET + ' adet alınabilir.', alanlar: ['sepet'] }, 400);

  const ip = request.headers.get('CF-Connecting-IP') || '0.0.0.0';
  const oid = siparisNo();
  const site = new URL(request.url).origin;

  const tutar = String(siparis.toplamKurus);
  const sepet = b64utf8(JSON.stringify(siparis.kalemler.map(k => [k.ad, kurusMetin(k.birimKurus), k.adet])));
  const taksitYok = '0';
  const maxTaksit = String(env.PAYTR_MAX_INSTALLMENT || '0');   // 0 = panelde izin verilen en yüksek
  const paraBirimi = 'TL';
  const testModu = String(env.PAYTR_TEST_MODE ?? '1');          // canlıya geçince 0 yapılır

  const imzaMetni = env.PAYTR_MERCHANT_ID + ip + oid + eposta + tutar + sepet + taksitYok + maxTaksit + paraBirimi + testModu;
  const token = await hmacBase64(env.PAYTR_MERCHANT_KEY, imzaMetni + env.PAYTR_MERCHANT_SALT);

  const adresTam = (adres + ', ' + il).slice(0, 400);
  const form = new URLSearchParams({
    merchant_id: env.PAYTR_MERCHANT_ID,
    user_ip: ip,
    merchant_oid: oid,
    email: eposta,
    payment_amount: tutar,
    paytr_token: token,
    user_basket: sepet,
    debug_on: '1',
    no_installment: taksitYok,
    max_installment: maxTaksit,
    user_name: ad,
    user_address: adresTam,
    user_phone: tel,
    merchant_ok_url: site + '/odeme-basarili.html?siparis=' + oid,
    merchant_fail_url: site + '/odeme-basarisiz.html?siparis=' + oid,
    timeout_limit: '30',
    currency: paraBirimi,
    test_mode: testModu,
    lang: 'tr',
  });

  let cevap;
  try {
    const r = await fetch('https://www.paytr.com/odeme/api/get-token', {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: form.toString(),
    });
    cevap = await r.json();
  } catch {
    return json({ hata: 'Ödeme kuruluşuna ulaşılamadı. Lütfen biraz sonra tekrar deneyin.' }, 502);
  }

  if (cevap.status !== 'success') {
    return json({ hata: 'Ödeme ekranı açılamadı.', detay: cevap.reason || '' }, 502);
  }

  // Sipariş kaydı (KV bağlıysa). Ödeme sonucu bildirim adresinden gelince güncellenir.
  if (env.SIPARIS) {
    try {
    await env.SIPARIS.put('siparis:' + oid, JSON.stringify({
      siparisNo: oid, durum: 'beklemede', olusturma: new Date().toISOString(),
      urun: siparis.kalemler.map(k => k.ad + ' × ' + k.adet).join(', '),
      kalemler: siparis.kalemler, tutarKurus: siparis.toplamKurus, testModu,
      musteri: { ad, eposta, telefon: tel, adres, il, fatura },
    }), { expirationTtl: 60 * 60 * 24 * 400 });
    } catch (e) { console.log('KV yazma hatasi:', String(e)); }
  }

  return json({ token: cevap.token, siparisNo: oid });
}

export function onRequest({ request }) {
  return json({ hata: 'Yalnızca POST.' }, 405, { allow: 'POST' });
}
