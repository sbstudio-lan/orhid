/* ===== ORHID — поведение и слой движения =====
 *
 * Правила, которым подчинён весь файл:
 *   1. Страница обязана быть читаемой без JS. Начальные состояния (opacity:0)
 *      живут под селектором `.js` и ставятся только когда скрипт жив.
 *   2. prefers-reduced-motion выключает всё движение — не «помягче», а полностью.
 *      Навигация (подсветка раздела, кнопка звонка) при этом продолжает работать.
 *   3. Наклон карточек и магнитная кнопка — только для мыши.
 *
 * Движения сознательно немного: появление, лёгкий параллакс, лента расцветок.
 */

(function () {
  'use strict';

  var REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var FINE_POINTER = matchMedia('(hover: hover) and (pointer: fine)').matches;

  var year = document.getElementById('year');
  if (year) year.textContent = new Date().getFullYear();

  /* ---------- Без анимаций: работает всегда ---------- */

  // Мобильная кнопка звонка прячется, пока на экране есть другая крупная
  // кнопка звонка (в хиро или в финальном блоке) — две рядом навязчиво.
  function initCallbar() {
    var bar = document.getElementById('callbar');
    if (!bar || !('IntersectionObserver' in window)) return;
    var targets = document.querySelectorAll('.hero-actions, #contacts');
    var seen = new Map();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { seen.set(e.target, e.isIntersecting); });
      var any = false;
      seen.forEach(function (v) { any = any || v; });
      bar.classList.toggle('off', any);
    }, { threshold: 0.25 });
    targets.forEach(function (t) { io.observe(t); });
  }

  // Каталог: подсветка текущего раздела в липкой навигации.
  function initCatalogNav() {
    var nav = document.querySelector('.cat-nav');
    if (!nav || !('IntersectionObserver' in window)) return;
    var list = nav.querySelector('ul');
    var links = {};
    nav.querySelectorAll('a[href^="#"]').forEach(function (a) {
      links[a.getAttribute('href').slice(1)] = a;
    });
    var visible = {};

    function setActive(id) {
      Object.keys(links).forEach(function (k) { links[k].classList.toggle('active', k === id); });
      var a = links[id];
      if (!a) return;
      // Прокручиваем только саму ленту чипов, не страницу.
      var left = a.offsetLeft - (list.clientWidth - a.offsetWidth) / 2;
      list.scrollTo({ left: left, behavior: REDUCED ? 'auto' : 'smooth' });
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { visible[e.target.id] = e.isIntersecting; });
      // Активный — первый по порядку видимый раздел.
      var first = Object.keys(links).filter(function (id) { return visible[id]; })[0];
      if (first) setActive(first);
    }, { rootMargin: '-30% 0px -55% 0px' });

    Object.keys(links).forEach(function (id) {
      var el = document.getElementById(id);
      if (el) io.observe(el);
    });
  }

  initCallbar();
  initCatalogNav();

  // Библиотек нет (офлайн, блокировщик, ошибка) или движение выключено —
  // показываем всё как есть.
  if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined' || REDUCED) {
    document.documentElement.classList.remove('js');
    var m = document.getElementById('marquee');
    if (m) m.style.overflowX = 'auto';   // лента остаётся листаемой руками
    return;
  }

  gsap.registerPlugin(ScrollTrigger);
  var hasSplit = typeof SplitText !== 'undefined';
  if (hasSplit) gsap.registerPlugin(SplitText);

  /* ---------- Инерционный скролл ---------- */
  var lenis = null;
  function anchorOffset() {
    var h = document.getElementById('header');
    var nav = document.querySelector('.cat-nav');
    return -((h ? h.offsetHeight : 0) + (nav ? nav.offsetHeight : 0) + 12);
  }
  function initLenis() {
    if (typeof Lenis === 'undefined') return;
    lenis = new Lenis({ duration: 1.1, smoothWheel: true });

    // Без этой связки ScrollTrigger считает позиции по нативному скроллу
    // и все триггеры срабатывают не там, где нужно.
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
    gsap.ticker.lagSmoothing(0);

    // Якоря Lenis сам не перехватывает.
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        var id = a.getAttribute('href');
        if (id.length < 2 || !document.querySelector(id)) return;
        e.preventDefault();
        lenis.scrollTo(id, { offset: anchorOffset() });
        history.replaceState(null, '', id);
      });
    });

    // Пришли по ссылке вида catalog.html#kids — докручиваем с учётом шапки.
    if (location.hash && document.querySelector(location.hash)) {
      window.addEventListener('load', function () {
        lenis.scrollTo(location.hash, { offset: anchorOffset(), immediate: true });
      });
    }
  }

  /* ---------- Появление первого экрана ---------- */
  function initHeroIntro() {
    var h1 = document.querySelector('.js-split');
    var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

    if (h1 && hasSplit) {
      // Слова выезжают из-под строк с overflow:hidden — «шторка», а не проявление.
      var split = new SplitText(h1, { type: 'lines,words', linesClass: 'line', wordsClass: 'word' });
      gsap.set(h1, { opacity: 1 });
      tl.from(split.words, { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.05 });
    } else if (h1) {
      tl.to(h1, { opacity: 1, duration: 0.8 });
    }

    tl.fromTo('.js-intro', { opacity: 0, y: 20 },
      { opacity: 1, y: 0, duration: 0.7, stagger: 0.08 }, '-=0.55');

    if (document.querySelector('.shot-main')) {
      // Арка с фото раскрывается снизу вверх, мелкое фото и ценник догоняют.
      tl.to('.shot-main', { opacity: 1, duration: 0.01 }, 0.15)
        .from('.shot-main', { clipPath: 'inset(100% 0% 0% 0%)', scale: 1.05, duration: 1.2, ease: 'power3.inOut' }, '<')
        .fromTo('.shot-sub', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8 }, '-=0.6')
        .fromTo('.price-badge', { opacity: 0, scale: 0.6, rotation: -12 },
          { opacity: 1, scale: 1, rotation: 0, duration: 0.7, ease: 'back.out(1.8)' }, '-=0.5');
    }
  }

  /* ---------- Всё, что завязано на скролл ---------- */
  function initScrollFX() {
    // Шапка: подложка после начала прокрутки; прячется при движении вниз.
    var header = document.getElementById('header');
    ScrollTrigger.create({
      start: 0, end: 'max',
      onUpdate: function (self) {
        header.classList.toggle('scrolled', self.scroll() > 8);
        header.classList.toggle('hidden', self.direction === 1 && self.scroll() > 500);
      }
    });

    // Лёгкий параллакс в хиро — только на широких экранах: в одну колонку
    // сдвиг по Y наезжает на текст.
    gsap.matchMedia().add('(min-width: 1001px)', function () {
      if (!document.querySelector('.hero-media')) return;
      gsap.to('.shot-main', { y: -40, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
      gsap.to('.shot-sub', { y: 30, ease: 'none',
        scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: 1 } });
    });

    gsap.utils.toArray('.js-reveal').forEach(function (el) {
      gsap.fromTo(el, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.8, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 90%', once: true }
      });
    });

    ScrollTrigger.batch('.js-card', {
      start: 'top 92%', once: true,
      onEnter: function (batch) {
        gsap.fromTo(batch, { opacity: 0, y: 36 },
          { opacity: 1, y: 0, duration: 0.75, stagger: 0.08, ease: 'power3.out' });
      }
    });

    // Шаги: прочерчивается линия, следом проявляется текст.
    gsap.utils.toArray('.js-step').forEach(function (li, i) {
      gsap.timeline({ scrollTrigger: { trigger: li, start: 'top 88%', once: true }, delay: i * 0.12 })
        .fromTo(li, { '--draw': 0 }, { '--draw': 1, duration: 0.8, ease: 'power2.inOut' })
        .from(li.children, { opacity: 0, y: 14, duration: 0.5, stagger: 0.07, ease: 'power2.out' }, 0.2);
    });
  }

  /* ---------- Счётчики ---------- */
  function initCounters() {
    gsap.utils.toArray('[data-count]').forEach(function (el) {
      var target = parseFloat(el.dataset.count);
      var suffix = (el.dataset.suffix || '').replace(/&nbsp;/g, ' ');
      var state = { v: 0 };
      el.textContent = '0' + suffix;
      gsap.to(state, {
        v: target, duration: 1.6, ease: 'power2.out',
        scrollTrigger: { trigger: el, start: 'top 92%', once: true },
        onUpdate: function () {
          // ru-RU ставит неразрывный пробел: 3 737, а не 3,737
          el.textContent = Math.round(state.v).toLocaleString('ru-RU') + suffix;
        }
      });
    });
  }

  /* ---------- Наклон карточек за курсором ---------- */
  function initTilt() {
    if (!FINE_POINTER) return;
    document.querySelectorAll('.js-tilt').forEach(function (card) {
      var max = 6;
      var rx = gsap.quickTo(card, 'rotationX', { duration: 0.5, ease: 'power3' });
      var ry = gsap.quickTo(card, 'rotationY', { duration: 0.5, ease: 'power3' });
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        ry(((e.clientX - r.left) / r.width - 0.5) * max);
        rx(-((e.clientY - r.top) / r.height - 0.5) * max);
      });
      card.addEventListener('pointerleave', function () { rx(0); ry(0); });
    });
  }

  /* ---------- Магнитная кнопка ---------- */
  function initMagnetic() {
    if (!FINE_POINTER) return;
    document.querySelectorAll('.js-magnetic').forEach(function (btn) {
      var xTo = gsap.quickTo(btn, 'x', { duration: 0.45, ease: 'power3' });
      var yTo = gsap.quickTo(btn, 'y', { duration: 0.45, ease: 'power3' });
      var RADIUS = 100;
      window.addEventListener('pointermove', function (e) {
        var r = btn.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        if (Math.hypot(dx, dy) < RADIUS) { xTo(dx * 0.28); yTo(dy * 0.28); }
        else { xTo(0); yTo(0); }
      }, { passive: true });
    });
  }

  /* ---------- Бесконечная лента расцветок ---------- */
  function initMarquee() {
    var box = document.getElementById('marquee');
    if (!box) return;
    var track = box.querySelector('.marquee-track');
    var originals = Array.prototype.slice.call(track.children);
    if (!originals.length) return;

    // Дублируем набор: когда лента уезжает на длину оригинала,
    // на его месте уже стоит копия — стык незаметен.
    originals.forEach(function (tile) {
      var copy = tile.cloneNode(true);
      copy.setAttribute('aria-hidden', 'true');
      track.appendChild(copy);
    });

    var tween = null;
    var hovered = false;
    function build() {
      if (tween) tween.kill();
      gsap.set(track, { x: 0 });
      var half = track.scrollWidth / 2;
      if (half < 10) return;
      tween = gsap.to(track, { x: -half, duration: half / 45, ease: 'none', repeat: -1 });
    }

    // Ширину считаем только когда картинки загрузились.
    if (document.readyState === 'complete') build();
    else window.addEventListener('load', build);

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(build, 200);
    });

    box.addEventListener('pointerenter', function () { hovered = true; if (tween) tween.pause(); });
    box.addEventListener('pointerleave', function () { hovered = false; if (tween) tween.resume(); });

    // За пределами экрана лента не крутится — бережём батарею телефона.
    ScrollTrigger.create({
      trigger: box, start: 'top bottom', end: 'bottom top',
      onToggle: function (self) {
        if (!tween) return;
        if (self.isActive && !hovered) tween.resume(); else tween.pause();
      }
    });
  }

  /* ---------- Пуск ---------- */
  initLenis();
  initHeroIntro();
  initScrollFX();
  initCounters();
  initTilt();
  initMagnetic();
  initMarquee();

  // Шрифты меняют высоту текста — после загрузки пересчитываем триггеры.
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(function () { ScrollTrigger.refresh(); });
  }
})();
