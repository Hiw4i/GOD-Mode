(function () {
  'use strict';

  /* ===== SMOOTH SCROLL (Lenis + GSAP) ===== */
  var lenis = new Lenis({
    duration: 1.0,
    easing: function (t) { return Math.min(1, 1.001 - Math.pow(2, -10 * t)); },
    orientation: 'vertical',
    gestureOrientation: 'vertical',
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
    infinite: false,
  });

  lenis.on('scroll', ScrollTrigger.update);

  gsap.ticker.add(function (time) { lenis.raf(time * 1000); });
  gsap.ticker.lagSmoothing(0);

  /* Expose for nav smooth scroll (ui.js) */
  window.__lenis = lenis;

  var clamp = window.GamUtils.clamp;
  var updaters = [];

  /* ===== GENERIC SECTION PARALLAX =====
     Animates oversized background text + statue for a given section. */
  function createSectionParallax(config) {
    var section = config.section;
    var textEl = config.textEl;
    var imgEl = config.imgEl;
    var labelEl = config.labelEl;
    var textPrefix = config.textPrefix || '';
    var smooth = config.smooth;
    var getTextSpeed = config.getTextSpeed;
    var getImgSpeed = config.getImgSpeed;
    var getLabelSpeed = config.getLabelSpeed;

    if (!section || !textEl || !imgEl) return;

    var sTop = section.offsetTop;
    var sH = section.offsetHeight;
    var smoothRatio = 0;

    function refreshLayout() {
      sTop = section.offsetTop;
      sH = section.offsetHeight;
    }
    window.addEventListener('resize', refreshLayout);

    return function () {
      if (sH === 0) return;
      var sCenter = sTop + sH / 2;
      var viewCenter = lenis.scroll + window.innerHeight / 2;
      var ratio = (viewCenter - sCenter) / sH;
      smoothRatio = smooth ? smoothRatio + (ratio - smoothRatio) * 0.08 : ratio;

      var textSpeed = getTextSpeed ? getTextSpeed() : config.textSpeed;
      var imgSpeed = getImgSpeed ? getImgSpeed() : config.imgSpeed;
      textEl.style.transform = textPrefix + 'translateY(' + (smoothRatio * textSpeed).toFixed(2) + 'px)';
      imgEl.style.transform = 'translateX(-50%) translateY(' + (smoothRatio * imgSpeed).toFixed(2) + 'px)';
      if (labelEl) {
        var labelSpeed = getLabelSpeed ? getLabelSpeed() : config.labelSpeed;
        labelEl.style.transform = 'translateY(' + (smoothRatio * labelSpeed).toFixed(2) + 'px)';
      }
    };
  }

  /* ===== HERO ===== */
  (function () {
    var hero = document.querySelector('.hero');
    var heroContent = document.querySelector('.hero-content');
    var heroStatue = document.querySelector('.hero-statue');
    if (!hero || !heroContent || !heroStatue) return;

    updaters.push(function () {
      var scrollY = lenis.scroll;
      var heroH = hero.offsetHeight;
      if (scrollY > heroH) return;

      var ratio = scrollY / heroH;
      heroContent.style.transform = 'translateY(' + (scrollY * 0.5) + 'px)';
      heroContent.style.opacity = (1 - ratio * 1.2).toFixed(3);
      heroStatue.style.transform = 'translateX(-50%) translateY(' + scrollY * 0.2 + 'px)';
    });
  })();

  /* ===== FEATURES ===== */
  (function () {
    var featuresSection = document.querySelector('.how-it-works');
    if (!featuresSection) return;

    var featuresConfig = {
      section: featuresSection,
      textEl: document.querySelector('[data-parallax-features-text]'),
      imgEl: document.querySelector('[data-parallax-features-img]'),
      labelEl: document.querySelector('.hiw-bg-label'),
      textPrefix: 'translateX(-50%) ',
      textSpeed: -309,
      imgSpeed: -411,
      labelSpeed: -94,
      smooth: true,
    };
    var featuresUpdater = createSectionParallax(featuresConfig);

    function refreshImgSpeed() {
      featuresConfig.imgSpeed = window.innerWidth > 680 ? -617 : -411;
    }
    function refreshLabelSpeed() {
      featuresConfig.labelSpeed = window.innerWidth <= 680 ? -10 : -94;
    }
    window.addEventListener('resize', refreshImgSpeed);
    window.addEventListener('resize', refreshLabelSpeed);
    refreshImgSpeed();
    refreshLabelSpeed();

    var featureCards = Array.from(document.querySelectorAll('.feature-card'));
    var cruelTimer = document.getElementById('cruelTimer');
    var cardSmoothY = [];
    var timerSmoothY = 0;

    var sectionTop = featuresSection.offsetTop;
    var scrollRange = Math.max(1, featuresSection.offsetHeight - window.innerHeight);

    function refreshLayout() {
      sectionTop = featuresSection.offsetTop;
      scrollRange = Math.max(1, featuresSection.offsetHeight - window.innerHeight);
    }
    window.addEventListener('resize', refreshLayout);

    /* Card parallax speeds are set once in CSS via --card-speed */
    var cardSpeeds = featureCards.map(function (card) {
      return Number(getComputedStyle(card).getPropertyValue('--card-speed')) || 1;
    });

    /* Desktop: staggered absolute layout on a tall stage.
       Mobile: simple vertical list, cards move slightly relative to each other. */
    function updateCards(progress) {
      var isMobile = window.innerWidth <= 680;
      var baseY = isMobile ? 75 * (1 - 2 * progress) : 112 - progress * 813;

      featureCards.forEach(function (card, index) {
        var speed = isMobile ? cardSpeeds[index] - 0.5 : cardSpeeds[index];
        var targetY = baseY * speed + (isMobile ? 0 : (index - 2.5) * 5);
        if (cardSmoothY[index] === undefined) cardSmoothY[index] = targetY;
        cardSmoothY[index] += (targetY - cardSmoothY[index]) * 0.16;
        card.style.setProperty('--feature-card-y', cardSmoothY[index].toFixed(2) + 'px');
      });

      if (cruelTimer && featureCards[3]) {
        var speed = isMobile ? cardSpeeds[3] - 0.5 : cardSpeeds[3];
        var target = baseY * speed * 0.05 + (isMobile ? 0 : 2.5);
        timerSmoothY += (target - timerSmoothY) * 0.08;
        cruelTimer.style.transform = 'translateY(' + timerSmoothY.toFixed(2) + 'px)';
      }
    }

    updaters.push(function () {
      if (featuresUpdater) featuresUpdater();
      var progress = clamp((lenis.scroll - sectionTop) / scrollRange, 0, 1);
      updateCards(progress);
    });
  })();

  /* ===== DOWNLOAD + SUPPORT (shared layout, one definition) ===== */
  (function () {
    var downloadConfig = {
      section: document.querySelector('.download-section'),
      textEl: document.querySelector('[data-parallax-download-text]'),
      imgEl: document.querySelector('[data-parallax-download-img]'),
      labelEl: document.querySelector('.download-bg-label'),
      textSpeed: -80,
      imgSpeed: -40,
      labelSpeed: -60,
      getLabelSpeed: function() { return window.innerWidth <= 680 ? -35 : -60; },
    };

    var supportConfig = {
      section: document.querySelector('.support-section'),
      textEl: document.querySelector('[data-parallax-support-text]'),
      imgEl: document.querySelector('[data-parallax-support-img]'),
      labelEl: document.querySelector('.support-bg-label'),
      textSpeed: -80,
      imgSpeed: -40,
      labelSpeed: -60,
      getLabelSpeed: function() { return window.innerWidth <= 680 ? -35 : -60; },
    };

    var downloadUpdater = createSectionParallax(downloadConfig);
    var supportUpdater = createSectionParallax(supportConfig);

    if (downloadUpdater) updaters.push(downloadUpdater);
    if (supportUpdater) updaters.push(supportUpdater);
  })();

  /* ===== TICK ===== */
  function updateAllParallax() {
    updaters.forEach(function (updater) { updater(); });
  }

  gsap.ticker.add(updateAllParallax);
  window.addEventListener('resize', updateAllParallax);
  updateAllParallax();
})();