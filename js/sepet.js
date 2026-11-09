/* Remble — sepet.
   Sepet tarayıcıda saklanır (localStorage); fiyatın asıl kaynağı sunucudur (functions/_lib.js → URUNLER).
   Buradaki katalog yalnızca gösterim içindir; yeni ürün eklenince iki yer birlikte güncellenir.
   Her sayfada: üst şeritte sepet simgesi + yandan açılan sepet paneli.
   Ürün sayfasında: [data-urun] bloğundaki adet seçici, "Sepete ekle" ve "Hemen satın al". */
(function () {
  'use strict';

  var KATALOG = {
    origin: { ad: 'Remble Origin', fiyat: 14999, gorsel: 'assets/img/kutu-acik-bilye-yuvali.webp?v=3', sayfa: 'satin-al.html' }
  };
  var MAX_ADET = 10;                 // bir siparişte toplam adet sınırı (fazlası için WhatsApp)
  var ANAHTAR = 'remble-sepet';

  /* Sayfa kökü: betik js/ klasöründe durur; 404 gibi kök yollu sayfalarda da doğru çözülür */
  var betik = document.currentScript;
  var kok = betik && betik.src ? new URL('..', betik.src) : new URL('.', location.href);
  var yol = function (p) { return new URL(p, kok).href; };

  /* ── Durum ── */
  var oku = function () {
    var ham = {};
    try { ham = JSON.parse(localStorage.getItem(ANAHTAR) || '{}') || {}; } catch (e) { ham = {}; }
    var temiz = {}, toplam = 0;
    Object.keys(KATALOG).forEach(function (id) {
      var n = Math.floor(Number(ham[id]));
      if (n >= 1) { n = Math.min(n, MAX_ADET - toplam); if (n >= 1) { temiz[id] = n; toplam += n; } }
    });
    return temiz;
  };
  var durum = oku();
  var yaz = function () {
    try { localStorage.setItem(ANAHTAR, JSON.stringify(durum)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('sepet:degisti'));
  };
  var toplamAdet = function () { return Object.keys(durum).reduce(function (t, id) { return t + durum[id]; }, 0); };
  var tl = function (n) { return Number(n).toLocaleString('tr-TR') + ' TL'; };

  var Sepet = {
    MAX_ADET: MAX_ADET,
    tl: tl,
    yol: yol,
    kalemler: function () {
      return Object.keys(durum).map(function (id) {
        var u = KATALOG[id];
        return { id: id, ad: u.ad, adet: durum[id], fiyat: u.fiyat, toplam: u.fiyat * durum[id], gorsel: yol(u.gorsel), sayfa: yol(u.sayfa) };
      });
    },
    adet: toplamAdet,
    toplam: function () { return Object.keys(durum).reduce(function (t, id) { return t + KATALOG[id].fiyat * durum[id]; }, 0); },
    /* n adet ekler; sınır aşılırsa sığdığı kadarını ekler ve false döner */
    ekle: function (id, n) {
      if (!KATALOG[id]) return false;
      n = Math.max(1, Math.floor(Number(n) || 1));
      var bos = MAX_ADET - toplamAdet(), eklenen = Math.min(n, bos);
      if (eklenen > 0) { durum[id] = (durum[id] || 0) + eklenen; yaz(); }
      return eklenen === n;
    },
    /* adedi tam olarak n yapar (0 ya da altı: kaldırır) */
    ayarla: function (id, n) {
      if (!KATALOG[id]) return;
      n = Math.floor(Number(n) || 0);
      var digerleri = toplamAdet() - (durum[id] || 0);
      n = Math.min(n, MAX_ADET - digerleri);
      if (n >= 1) durum[id] = n; else delete durum[id];
      yaz();
    },
    sil: function (id) { delete durum[id]; yaz(); },
    bosalt: function () { durum = {}; yaz(); },
    ac: function () {}, kapat: function () {}
  };
  window.RembleSepet = Sepet;

  /* Başka sekmede değişirse eşitle */
  window.addEventListener('storage', function (e) {
    if (e.key === ANAHTAR) { durum = oku(); document.dispatchEvent(new CustomEvent('sepet:degisti')); }
  });

  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  /* Adet seçici (panelde, ürün sayfasında ve sepet sayfasında aynı) */
  Sepet.adetSecici = function (n, ek) {
    return '<div class="qty"' + (ek || '') + '>' +
      '<button type="button" data-azalt aria-label="Adedi azalt">&minus;</button>' +
      '<span class="qty-n" aria-live="polite">' + n + '</span>' +
      '<button type="button" data-artir aria-label="Adedi artır">+</button></div>';
  };
  Sepet.satirlar = function () {
    return Sepet.kalemler().map(function (k) {
      return '<div class="cart-line" data-kalem="' + k.id + '">' +
        '<a class="cart-thumb" href="' + esc(k.sayfa) + '"><img src="' + esc(k.gorsel) + '" alt="" width="1700" height="1275" loading="lazy"></a>' +
        '<div class="cart-line-info">' +
          '<a class="cart-line-name" href="' + esc(k.sayfa) + '" lang="en">' + esc(k.ad) + '</a>' +
          '<span class="cart-line-unit">' + tl(k.fiyat) + '</span>' +
          Sepet.adetSecici(k.adet) +
        '</div>' +
        '<div class="cart-line-side">' +
          '<span class="cart-line-total">' + tl(k.toplam) + '</span>' +
          '<button type="button" class="cart-remove" data-sil>Kaldır</button>' +
        '</div></div>';
    }).join('');
  };
  /* Bir kapsayıcıdaki satır düğmelerini sepete bağlar */
  Sepet.satirOlaylari = function (kap) {
    kap.addEventListener('click', function (e) {
      var satir = e.target.closest('[data-kalem]');
      if (!satir) return;
      var id = satir.getAttribute('data-kalem'), n = durum[id] || 0;
      if (e.target.closest('[data-artir]')) { if (toplamAdet() < MAX_ADET) Sepet.ayarla(id, n + 1); else document.dispatchEvent(new CustomEvent('sepet:sinir')); }
      else if (e.target.closest('[data-azalt]')) Sepet.ayarla(id, n - 1);
      else if (e.target.closest('[data-sil]')) Sepet.sil(id);
    });
  };

  var sepetSayfasi = document.body.getAttribute('data-sayfa') === 'sepet';

  /* ── Üst şeritteki sepet simgesi ── */
  var ust = document.querySelector('.header-inner');
  var dugme = null, sayac = null;
  if (ust) {
    dugme = document.createElement('button');
    dugme.type = 'button';
    dugme.className = 'cart-btn';
    dugme.setAttribute('aria-label', 'Sepet');
    dugme.innerHTML =
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5.6 8.6h12.8l-.9 11.4H6.5z"/><path d="M9 8.6V7.2a3 3 0 0 1 6 0v1.4"/></svg>' +
      '<span class="cart-count" hidden>0</span>';
    var hamburger = ust.querySelector('.nav-toggle');
    ust.insertBefore(dugme, hamburger || null);
    sayac = dugme.querySelector('.cart-count');
  }

  /* ── Yandan açılan sepet paneli ── */
  var panel = document.createElement('div');
  panel.className = 'cart';
  panel.setAttribute('data-open', 'false');
  panel.innerHTML =
    '<div class="cart-backdrop" data-kapat></div>' +
    '<aside class="cart-panel" role="dialog" aria-modal="true" aria-label="Sepet" tabindex="-1">' +
      '<header class="cart-head"><p class="kicker">Sepet</p>' +
        '<button type="button" class="cart-close" data-kapat aria-label="Sepeti kapat"><span></span><span></span></button></header>' +
      '<div class="cart-body"></div>' +
      '<footer class="cart-foot"></footer>' +
    '</aside>';
  document.body.appendChild(panel);
  var govde = panel.querySelector('.cart-body'), alt = panel.querySelector('.cart-foot'), kutu = panel.querySelector('.cart-panel');
  var sinirNotu = false, oncekiOdak = null;

  var ciz = function () {
    var n = toplamAdet();
    if (sayac) { sayac.textContent = n; sayac.hidden = n === 0; }
    if (dugme) dugme.setAttribute('aria-label', n ? 'Sepet, ' + n + ' ürün' : 'Sepet, boş');
    if (n === 0) {
      govde.innerHTML = '<div class="cart-empty"><p>Sepetiniz boş.</p>' +
        '<a class="btn" href="' + esc(yol('satin-al.html')) + '">Ürünü inceleyin</a></div>';
      alt.innerHTML = '';
      alt.hidden = true;
      return;
    }
    govde.innerHTML = Sepet.satirlar() +
      (sinirNotu ? '<p class="cart-limit">Bir siparişte en fazla ' + MAX_ADET + ' adet alınabilir. Daha fazlası için bize WhatsApp’tan yazın.</p>' : '');
    alt.hidden = false;
    alt.innerHTML =
      '<div class="cart-total"><span>Toplam</span><strong>' + tl(Sepet.toplam()) + '</strong></div>' +
      '<p class="cart-note">KDV ve kargo dahil</p>' +
      '<a class="btn btn--solid" href="' + esc(yol('sepet.html')) + '#teslimat">Alışverişi tamamla</a>' +
      '<button type="button" class="cart-continue" data-kapat>Alışverişe devam et</button>';
  };

  Sepet.ac = function () {
    if (sepetSayfasi) { window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    oncekiOdak = document.activeElement;
    ciz();
    panel.setAttribute('data-open', 'true');
    document.documentElement.classList.add('cart-open');
    kutu.focus({ preventScroll: true });
  };
  Sepet.kapat = function () {
    if (panel.getAttribute('data-open') !== 'true') return;
    panel.setAttribute('data-open', 'false');
    document.documentElement.classList.remove('cart-open');
    sinirNotu = false;
    if (oncekiOdak && oncekiOdak.focus) oncekiOdak.focus({ preventScroll: true });
  };

  if (dugme) dugme.addEventListener('click', Sepet.ac);
  panel.addEventListener('click', function (e) { if (e.target.closest('[data-kapat]')) Sepet.kapat(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') Sepet.kapat(); });
  Sepet.satirOlaylari(govde);
  document.addEventListener('sepet:sinir', function () { sinirNotu = true; ciz(); });
  document.addEventListener('sepet:degisti', ciz);
  ciz();

  /* ── Ürün sayfası: adet + Sepete ekle + Hemen satın al ── */
  Array.prototype.forEach.call(document.querySelectorAll('[data-urun]'), function (blok) {
    var id = blok.getAttribute('data-urun');
    if (!KATALOG[id]) return;
    var secici = blok.querySelector('[data-adet]'), yazi = secici && secici.querySelector('.qty-n');
    var n = 1;
    var goster = function () { if (yazi) yazi.textContent = n; };
    if (secici) secici.addEventListener('click', function (e) {
      if (e.target.closest('[data-artir]')) n = Math.min(MAX_ADET, n + 1);
      else if (e.target.closest('[data-azalt]')) n = Math.max(1, n - 1);
      goster();
    });
    var ekle = blok.querySelector('[data-sepete-ekle]');
    if (ekle) ekle.addEventListener('click', function () {
      sinirNotu = !Sepet.ekle(id, n);
      n = 1; goster();
      Sepet.ac();
    });
    var hemen = blok.querySelector('[data-hemen-al]');
    if (hemen) hemen.addEventListener('click', function () {
      Sepet.ayarla(id, n);              // doğrudan satın alma: bu üründen tam seçilen adet
      /* bağlantı kendi adresine (sepet.html#teslimat) gider */
    });
  });
})();
