/* Remble — rembletools.com */
(function () {
  'use strict';

  /* ── Yıl ── */
  var y = document.getElementById('year');
  if (y) y.textContent = new Date().getFullYear();

  /* ── Header: kaydırınca zemin kazanır ── */
  var header = document.getElementById('header');
  var onScroll = function () {
    header.classList.toggle('is-stuck', window.scrollY > 24);
  };
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* ── Mobil menü ── */
  var toggle = document.querySelector('.nav-toggle');
  var mobileNav = document.getElementById('mobile-nav');
  if (toggle && mobileNav) {
    var setOpen = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      mobileNav.setAttribute('data-open', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
    };
    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true');
    });
    mobileNav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
  }

  /* ── Yumuşak bölüm geçişi ──
     Tarayıcının kendi scroll-behavior:smooth'u uzun mesafede neredeyse anlık
     çalışıyor ve ışınlanma hissi veriyor. Mesafeye göre süre veren kendi
     animasyonumuzu kullanıyoruz. */
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)');

  var easeInOutCubic = function (t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  };

  var animating = false;
  var stop = function () { animating = false; };
  ['wheel', 'touchstart', 'keydown'].forEach(function (ev) {
    window.addEventListener(ev, stop, { passive: true });
  });

  var scrollToY = function (targetY) {
    var maxY = document.documentElement.scrollHeight - window.innerHeight;
    targetY = Math.max(0, Math.min(targetY, maxY));
    var startY = window.scrollY;
    var dist = targetY - startY;

    if (reduce.matches || Math.abs(dist) < 4) { window.scrollTo(0, targetY); return; }

    // Mesafe arttıkça süre uzasın ama 1.5 sn'yi geçmesin
    var dur = Math.min(1500, Math.max(620, Math.abs(dist) * 0.42));
    var t0 = null;
    animating = true;

    var step = function (ts) {
      if (!animating) return;
      if (t0 === null) t0 = ts;
      var p = Math.min(1, (ts - t0) / dur);
      window.scrollTo(0, startY + dist * easeInOutCubic(p));
      if (p < 1) requestAnimationFrame(step); else animating = false;
    };
    requestAnimationFrame(step);
  };

  document.addEventListener('click', function (e) {
    var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
    if (!link) return;
    var hash = link.getAttribute('href');
    if (!hash || hash === '#') return;

    var target = document.getElementById(hash.slice(1));
    if (!target) return;

    e.preventDefault();

    var go = function () {
      var offset = header ? header.getBoundingClientRect().height : 0;
      scrollToY(target.getBoundingClientRect().top + window.scrollY - offset - 12);
      history.replaceState(null, '', hash);
    };

    var wasOpen = mobileNav && mobileNav.getAttribute('data-open') === 'true';
    if (wasOpen && typeof setOpen === 'function') {
      setOpen(false);
      // Menü kapanınca header yüksekliği değişir; bir kare sonra ölç
      requestAnimationFrame(go);
    } else {
      go();
    }
  });

  /* ── Düğme dolgusu: imlecin girdiği noktadan yayılır ──
     Giriş (ve çıkış) noktasını ve en uzak köşeyi örtecek çapı CSS'e verir. */
  var btns = document.querySelectorAll('.btn:not(.btn--soon)');
  Array.prototype.forEach.call(btns, function (btn) {
    var setOrigin = function (e) {
      var r = btn.getBoundingClientRect();
      var x = Math.max(0, Math.min(r.width, e.clientX - r.left));
      var y = Math.max(0, Math.min(r.height, e.clientY - r.top));
      var far = Math.sqrt(Math.pow(Math.max(x, r.width - x), 2) +
                          Math.pow(Math.max(y, r.height - y), 2));
      btn.style.setProperty('--mx', x + 'px');
      btn.style.setProperty('--my', y + 'px');
      btn.style.setProperty('--d', (2 * far + 4) + 'px');
    };
    btn.addEventListener('mouseenter', setOrigin);
    btn.addEventListener('mouseleave', setOrigin);
  });

  /* ── Görsel galerisi (satın alma sayfası) ──
     Kaydırma tarayıcının kendi scroll-snap'i; burada oklar, küçük görseller,
     klavye ve fareyle sürükleme eklenir. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-gallery]'), function (g) {
    var track = g.querySelector('.gallery-track');
    var thumbs = g.querySelectorAll('.gallery-thumb');
    var arrows = g.querySelectorAll('.gallery-arrow');
    var count = track.children.length;
    var current = 0;

    // Bir görselden diğerine kaydırma adımı (görsel genişliği + aradaki boşluk)
    var step = function () {
      return count > 1 ? track.children[1].offsetLeft - track.children[0].offsetLeft : track.clientWidth;
    };
    var goTo = function (i) {
      i = Math.max(0, Math.min(count - 1, i));
      track.scrollTo({ left: i * step(), behavior: reduce.matches ? 'auto' : 'smooth' });
    };
    var sync = function () {
      current = Math.max(0, Math.min(count - 1, Math.round(track.scrollLeft / step())));
      Array.prototype.forEach.call(thumbs, function (t, i) {
        if (i === current) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
      Array.prototype.forEach.call(arrows, function (a) {
        var dir = Number(a.getAttribute('data-dir'));
        a.disabled = (dir < 0 && current === 0) || (dir > 0 && current === count - 1);
      });
    };
    track.addEventListener('scroll', sync, { passive: true });
    window.addEventListener('resize', sync);

    Array.prototype.forEach.call(thumbs, function (t, i) {
      t.addEventListener('click', function () { goTo(i); });
    });
    Array.prototype.forEach.call(arrows, function (a) {
      a.addEventListener('click', function () { goTo(current + Number(a.getAttribute('data-dir'))); });
    });
    track.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); goTo(current + 1); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); goTo(current - 1); }
    });

    // Fareyle tutup sürükleme (dokunmatikte tarayıcı zaten kaydırır)
    var drag = null;
    track.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      drag = { x: e.clientX, left: track.scrollLeft, from: current };
      track.classList.add('is-dragging');
      track.setPointerCapture(e.pointerId);
    });
    track.addEventListener('pointermove', function (e) {
      if (drag) track.scrollLeft = drag.left - (e.clientX - drag.x);
    });
    var endDrag = function (e) {
      if (!drag) return;
      var moved = e.clientX - drag.x;
      var target = drag.from;
      // Görselin altıda birinden fazla çekildiyse komşu görsele geç
      if (Math.abs(moved) > track.clientWidth / 6) target += moved < 0 ? 1 : -1;
      drag = null;
      goTo(target);
      // Yumuşak kaydırma bitene kadar snap kapalı kalsın, yoksa anında yerine atlar
      setTimeout(function () { track.classList.remove('is-dragging'); }, reduce.matches ? 0 : 450);
    };
    track.addEventListener('pointerup', endDrag);
    track.addEventListener('pointercancel', endDrag);

    sync();
  });

  /* ── Scroll reveal ── */
  var items = document.querySelectorAll('.reveal');
  if (!('IntersectionObserver' in window) ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    items.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        // Aynı blok içindeki öğeler sırayla belirsin
        var sibs = Array.prototype.slice.call(
          el.parentNode.querySelectorAll(':scope > .reveal'));
        var i = Math.max(0, sibs.indexOf(el));
        var delay = Math.min(i, 4) * 90;
        el.style.transitionDelay = delay + 'ms';
        el.classList.add('is-in');
        // Belirme bitince gecikmeyi kaldır; yoksa düğmenin hover geçişleri de gecikir
        setTimeout(function () { el.style.transitionDelay = ''; }, delay + 1100);
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  }

})();
