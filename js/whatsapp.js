/* Remble — sağ alttaki WhatsApp düğmesi ve zaman zaman açılan soru balonu.
   Numara tek yerden girilir: WA_NUMARA (ülke koduyla, boşluksuz, örn. 905XXXXXXXXX).
   Boşken düğme ve balon görünür ama tıklanınca bir yere gitmez. */
(function () {
  'use strict';

  var WA_NUMARA = '';

  /* Soru balonu HOLD (8 Kasım 2026, psikolog metinleri düşünüyor). Açmak için true yap. */
  var BALON_ACIK = false;

  var ILK = 6000;        // sayfa açıldıktan sonra ilk balon (ms)
  var GORUNME = 7000;    // balonun ekranda kalma süresi
  var ARA = 22000;       // iki balon arasındaki bekleme

  var SORULAR = [
    'Remble’ın kullanımı ile ilgili detaylı bilgi almak ister misiniz?',
    'Remble’ı seans içinde nasıl kullanabileceğinizi konuşalım mı?',
    'Uzmanlık alanınızda Remble’ın nasıl yer alabileceğini merak ediyor musunuz?',
    'Kliniğiniz için birden fazla Remble almayı mı düşünüyorsunuz?',
    'Kutu içeriği hakkında sorunuz var mı?',
    'Taksit seçenekleri hakkında bilgi almak ister misiniz?',
    'Teslimat süreciyle ilgili aklınıza takılan bir şey var mı?'
  ];

  var fab = document.querySelector('.wa-fab');
  var balon = document.querySelector('.wa-bubble');
  if (!fab || !balon) return;
  var metin = balon.querySelector('.wa-bubble-text');
  var kapat = balon.querySelector('.wa-bubble-close');

  var baglanti = function (yazi) {
    return 'https://wa.me/' + WA_NUMARA + (yazi ? '?text=' + encodeURIComponent(yazi) : '');
  };
  if (WA_NUMARA) {
    fab.href = baglanti('Merhaba, Remble hakkında bilgi almak istiyorum.');
    fab.target = '_blank'; fab.rel = 'noopener';
    metin.target = '_blank'; metin.rel = 'noopener';
  }

  /* İlk soru sabit, kalanı her ziyarette karışık sırayla */
  var sira = SORULAR.slice(1);
  for (var i = sira.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1)), t = sira[i]; sira[i] = sira[j]; sira[j] = t;
  }
  sira.unshift(SORULAR[0]);

  var n = 0, zaman = null, durdu = !BALON_ACIK, acik = false;

  var temizle = function () { if (zaman !== null) { clearTimeout(zaman); zaman = null; } };
  var planla = function (fn, ms) { temizle(); if (!durdu) zaman = setTimeout(fn, ms); };

  var gizle = function () {
    acik = false;
    balon.classList.remove('is-on');
    planla(goster, ARA);
  };
  var goster = function () {
    if (document.hidden) { planla(goster, ARA); return; }
    var soru = sira[n++ % sira.length];
    metin.textContent = soru;
    if (WA_NUMARA) metin.href = baglanti('Merhaba, Remble hakkında sormak istiyorum: ' + soru);
    balon.classList.add('is-on');
    acik = true;
    planla(gizle, GORUNME);
  };

  /* Üzerindeyken kapanmasın */
  balon.addEventListener('mouseenter', function () { if (acik) temizle(); });
  balon.addEventListener('mouseleave', function () { if (acik) planla(gizle, 2500); });

  /* Çarpıya basan ziyaretçi bu sayfada bir daha görmez */
  kapat.addEventListener('click', function () {
    durdu = true; acik = false; temizle();
    balon.classList.remove('is-on');
  });

  document.addEventListener('visibilitychange', function () {
    if (durdu) return;
    if (document.hidden) { temizle(); acik = false; balon.classList.remove('is-on'); }
    else planla(goster, ARA);
  });

  planla(goster, ILK);
})();
