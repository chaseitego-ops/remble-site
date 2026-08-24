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
        el.style.transitionDelay = Math.min(i, 4) * 90 + 'ms';
        el.classList.add('is-in');
        io.unobserve(el);
      });
    }, { rootMargin: '0px 0px -80px 0px', threshold: 0 });
    items.forEach(function (el) { io.observe(el); });
  }

  /* ── Taslak (placeholder) görünürlüğü ──
     Yayına almadan önce bu blok ve #phToggle butonu silinecek. */
  var phBtn = document.getElementById('phToggle');
  if (phBtn) {
    var KEY = 'remble-ph-off';
    if (localStorage.getItem(KEY) === '1') document.body.classList.add('ph-off');
    phBtn.addEventListener('click', function () {
      var off = document.body.classList.toggle('ph-off');
      localStorage.setItem(KEY, off ? '1' : '0');
    });
  }
  /* yüklenen sürümü doğrulamak için: konsola  __remble  yaz */
  window.__remble = { v: 3, smoothScroll: true };
})();
