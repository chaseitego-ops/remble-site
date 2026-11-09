/* Remble — sepet sayfası: sepet özeti + teslimat formu → PayTR iFrame.
   Sepet js/sepet.js'ten (window.RembleSepet) gelir; tutarı sunucu yeniden hesaplar. */
(function () {
  'use strict';
  var S = window.RembleSepet;
  var bos = document.getElementById('sepet-bos');
  var dolu = document.getElementById('sepet-dolu');
  var kalemler = document.getElementById('sepet-kalemler');
  var ozet = document.getElementById('sepet-ozet');
  var form = document.getElementById('siparis');
  var alan = document.getElementById('odeme-alani');
  var hata = document.getElementById('siparis-hata');
  var gonder = document.getElementById('siparis-gonder');
  if (!S || !form || !alan || !dolu) return;

  var kilitli = false;   // ödeme ekranı açıldıktan sonra sepet değiştirilemez (tutar jetona bağlı)
  var sinir = false;

  var dugmeYazisi = function () { return 'Ödemeye geç · ' + S.tl(S.toplam()); };

  var ciz = function () {
    if (kilitli) return;
    var n = S.adet();
    bos.hidden = n !== 0;
    dolu.hidden = n === 0;
    if (n === 0) return;
    kalemler.innerHTML = S.satirlar() +
      (sinir ? '<p class="cart-limit">Bir siparişte en fazla ' + S.MAX_ADET + ' adet alınabilir. Daha fazlası için bize WhatsApp’tan yazın.</p>' : '');
    ozet.innerHTML =
      '<div class="sum-row"><span>Ürünler (' + n + ' adet)</span><span>' + S.tl(S.toplam()) + '</span></div>' +
      '<div class="sum-row"><span>Kargo</span><span>Ücretsiz</span></div>' +
      '<div class="sum-row sum-row--total"><span>Toplam</span><strong>' + S.tl(S.toplam()) + '</strong></div>' +
      '<p class="sum-note">KDV dahil. Taksit seçenekleri ödeme ekranında, kartınıza göre gösterilir.</p>';
    if (!gonder.disabled) gonder.textContent = dugmeYazisi();
  };
  S.satirOlaylari(kalemler);
  document.addEventListener('sepet:sinir', function () { sinir = true; ciz(); });
  document.addEventListener('sepet:degisti', ciz);
  ciz();

  /* "Hemen satın al" ve "Alışverişi tamamla" doğrudan forma indirir */
  if (location.hash === '#teslimat' && S.adet() > 0) {
    requestAnimationFrame(function () {
      form.scrollIntoView({ block: 'start' });
      var ilk = form.querySelector('input');
      if (ilk) ilk.focus({ preventScroll: true });
    });
  }

  var etiket = { ad: 'ad soyad', eposta: 'e-posta', telefon: 'telefon', adres: 'teslimat adresi', il: 'il', onay: 'sözleşme onayı', sepet: 'sepet' };

  function hataGoster(msg) {
    hata.textContent = msg;
    hata.hidden = false;
    gonder.disabled = false;
    gonder.textContent = dugmeYazisi();
  }

  function odemeEkraniAc(token) {
    kilitli = true;
    dolu.classList.add('is-locked');
    form.hidden = true;
    alan.hidden = false;
    alan.innerHTML = '<p class="payframe-note">Güvenli ödeme ekranı yükleniyor…</p>' +
      '<iframe src="https://www.paytr.com/odeme/guvenli/' + token + '" id="paytriframe" frameborder="0" scrolling="no" style="width:100%;" title="PayTR güvenli ödeme"></iframe>';
    var s = document.createElement('script');
    s.src = 'https://www.paytr.com/js/iframeResizer.min.js';
    s.onload = function () { if (window.iFrameResize) window.iFrameResize({}, '#paytriframe'); };
    document.body.appendChild(s);
    alan.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    hata.hidden = true;
    if (S.adet() === 0) { hataGoster('Sepetiniz boş.'); return; }
    var veri = {
      ad: form.ad.value, eposta: form.eposta.value, telefon: form.telefon.value,
      adres: form.adres.value, il: form.il.value, fatura: form.fatura.value,
      onay: form.onay.checked,
      sepet: S.kalemler().map(function (k) { return { id: k.id, adet: k.adet }; })
    };
    if (!form.checkValidity()) {
      var eksik = [];
      ['ad', 'eposta', 'telefon', 'adres', 'il', 'onay'].forEach(function (k) {
        if (!form[k].checkValidity()) eksik.push(etiket[k]);
      });
      hataGoster('Lütfen şu alanları kontrol edin: ' + eksik.join(', ') + '.');
      return;
    }
    gonder.disabled = true;
    gonder.textContent = 'Ödeme ekranı hazırlanıyor…';
    fetch('/api/odeme', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(veri)
    }).then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (res) {
        if (!res.ok || !res.j.token) {
          var m = res.j && res.j.hata ? res.j.hata : 'Bir sorun oluştu.';
          if (res.j && res.j.alanlar) m += ' (' + res.j.alanlar.map(function (k) { return etiket[k] || k; }).join(', ') + ')';
          if (res.j && res.j.detay) m += ' ' + res.j.detay;
          hataGoster(m);
          return;
        }
        odemeEkraniAc(res.j.token);
      })
      .catch(function () { hataGoster('Bağlantı kurulamadı. Lütfen tekrar deneyin.'); });
  });
})();
