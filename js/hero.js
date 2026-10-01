/* Remble — hareketli hero
   Gövde ortasından hafifçe sağa-sola eğilir; bilye eğime göre kanal boyunca akar.
   Hareket tek bir periyodun tablosundan okunur, bu yüzden döngü kusursuz kapanır. */
(function () {
  'use strict';

  var CFG = {
    period: 11,      // bir tam sağ-sol turu (sn)
    tilt: 2.4,       // en büyük eğim (derece)
    accel: 1.1,      // eğimin bilyeye verdiği ivme
    drag: 0.4,       // yuvarlanma direnci
    stick: 0.12,     // bilyenin harekete geçmesi için gereken en küçük eğim oranı
    bounce: 0.22,    // kanal ucuna çarpınca geri sekme
    travel: 1378     // bilyenin yarım yolu (kendi genişliğinin yüzdesi)
  };

  /* Bilye konumunu bir periyot için önceden hesapla (kararlı döngüye oturana kadar) */
  var buildTable = function () {
    var dt = 1 / 240, n = Math.round(CFG.period / dt);
    var s = -1, v = 0, table = new Float32Array(n);
    for (var p = 0; p < 5; p++) {
      for (var i = 0; i < n; i++) {
        var f = CFG.accel * Math.sin(2 * Math.PI * i / n);
        var acc;
        if (Math.abs(v) < 1e-4 && Math.abs(f) < CFG.stick * CFG.accel) { acc = 0; v = 0; }
        else acc = f - CFG.drag * v - CFG.stick * CFG.accel * 0.5 * (v > 0 ? 1 : v < 0 ? -1 : 0);
        v += acc * dt; s += v * dt;
        if (s > 1) { s = 1; v = Math.abs(v) > 0.25 ? -CFG.bounce * v : 0; }
        if (s < -1) { s = -1; v = Math.abs(v) > 0.25 ? -CFG.bounce * v : 0; }
        table[i] = s;
      }
    }
    return table;
  };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  Array.prototype.forEach.call(document.querySelectorAll('[data-hero-motion]'), function (fig) {
    var body = fig.querySelector('.hm-body');
    var ball = fig.querySelector('.hm-ball');
    if (!body || !ball || reduce.matches) return;   // hareket istemeyenlerde durağan kalır

    var table = buildTable(), n = table.length;
    var visible = true, raf = null;

    var frame = function (now) {
      raf = null;
      var ph = (now / 1000 % CFG.period) / CFG.period;          // 0..1
      var deg = CFG.tilt * Math.sin(2 * Math.PI * ph);
      var x = ph * n, i0 = Math.floor(x) % n, i1 = (i0 + 1) % n, k = x - Math.floor(x);
      var s = table[i0] * (1 - k) + table[i1] * k;
      body.style.transform = 'rotate(' + deg.toFixed(3) + 'deg)';
      ball.style.transform = 'translateX(' + (s * CFG.travel).toFixed(2) + '%)';
      if (visible && !document.hidden) raf = requestAnimationFrame(frame);
    };
    var start = function () { if (raf === null && visible && !document.hidden) raf = requestAnimationFrame(frame); };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting; start();
      }, { rootMargin: '100px' }).observe(fig);
    }
    document.addEventListener('visibilitychange', start);
    start();
  });
})();
