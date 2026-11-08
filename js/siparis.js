/* Remble — sipariş formu → PayTR iFrame */
(function () {
  'use strict';
  var ac = document.getElementById('satin-al-ac');
  var form = document.getElementById('siparis');
  var alan = document.getElementById('odeme-alani');
  var hata = document.getElementById('siparis-hata');
  var gonder = document.getElementById('siparis-gonder');
  if (!ac || !form || !alan) return;

  ac.addEventListener('click', function (e) {
    e.preventDefault();
    form.hidden = false;
    ac.hidden = true;
    var ilk = form.querySelector('input');
    if (ilk) ilk.focus({ preventScroll: true });
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  var etiket = { ad: 'ad soyad', eposta: 'e-posta', telefon: 'telefon', adres: 'teslimat adresi', il: 'il', onay: 'sözleşme onayı' };

  function hataGoster(msg) {
    hata.textContent = msg;
    hata.hidden = false;
    gonder.disabled = false;
    gonder.textContent = 'Ödemeye geç · 14.999 TL';
  }

  function odemeEkraniAc(token) {
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
    var veri = {
      ad: form.ad.value, eposta: form.eposta.value, telefon: form.telefon.value,
      adres: form.adres.value, il: form.il.value, fatura: form.fatura.value,
      onay: form.onay.checked
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
