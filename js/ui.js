(function () {
  'use strict';

  /* ===== SMOOTH SCROLL FOR NAV LINKS ===== */
  (function () {
    var lenis = window.__lenis;

    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var target = document.querySelector(this.getAttribute('href'));
        if (target && lenis) lenis.scrollTo(target, { offset: 0 });
      });
    });
  })();

  /* ===== SPOTS COUNTER ===== */
  (function () {
    var DEADLINE = new Date('2026-09-03T00:00:00+03:00');
    var TOTAL_SPOTS = 1000;

    function getSpotsRemaining() {
      var diff = DEADLINE - new Date();
      if (diff <= 0) return 0;
      return Math.ceil(diff / (1000 * 60 * 60 * 24));
    }

    function updateSpots() {
      var remaining = getSpotsRemaining();
      var pct = ((TOTAL_SPOTS - remaining) / TOTAL_SPOTS) * 100;
      document.getElementById('spotsRemaining').textContent = remaining;
      document.getElementById('spotsBarFill').style.width = pct + '%';
    }

    updateSpots();
  })();

  /* ===== ACTIVE NAV LINK ===== */
  (function () {
    var sections = document.querySelectorAll('section[id], footer[id]');
    var navLinks = document.querySelectorAll('.nav-right a');
    var logo = document.querySelector('.nav-logo');

    function setActiveNav() {
      var current = '';
      sections.forEach(function (section) {
        if (window.scrollY >= section.offsetTop - 200)
          current = section.getAttribute('id');
      });

      navLinks.forEach(function (link) {
        link.classList.toggle('active', link.getAttribute('href') === '#' + current);
      });

      if (logo) logo.classList.toggle('scrolled', window.scrollY >= 300);
    }

    window.addEventListener('scroll', setActiveNav, { passive: true });
    setActiveNav();
  })();

  /* ===== MODALS ===== */
  function openModal(id) {
    var overlay = document.getElementById(id);
    if (overlay) overlay.classList.add('open');
  }

  function closeModal(overlay) {
    overlay.classList.remove('open');
  }

  /* Flash a selectable button as "picked" for 2 seconds */
  function flashSelected(btn) {
    document.querySelectorAll('.selectable-btn.selected').forEach(function (b) {
      b.classList.remove('selected');
    });
    btn.classList.add('selected');
    setTimeout(function () { btn.classList.remove('selected'); }, 2000);
  }

  /* ===== EVENT DELEGATION ===== */
  document.addEventListener('click', function (e) {
    var target = e.target;

    /* Open modal */
    var openBtn = target.closest('[data-open-modal]');
    if (openBtn) {
      e.preventDefault();
      openModal(openBtn.getAttribute('data-open-modal'));
      return;
    }

    /* Close modal via x button */
    var closeBtn = target.closest('.modal-close');
    if (closeBtn) {
      closeModal(closeBtn.closest('.modal-overlay'));
      return;
    }

    /* Close modal via backdrop */
    if (target.classList.contains('modal-overlay')) {
      closeModal(target);
      return;
    }

    /* Copy address to clipboard */
    var copyEl = target.closest('[data-copy]');
    if (copyEl) {
      navigator.clipboard.writeText(copyEl.textContent).then(function () {
        copyEl.classList.add('copied');
        setTimeout(function () { copyEl.classList.remove('copied'); }, 2000);
      });
      return;
    }

    /* OS / Auth button selection (shared .selectable-btn behavior) */
    var selectable = target.closest('.selectable-btn');
    if (selectable) {
      e.preventDefault();
      flashSelected(selectable);
      return;
    }

    /* Premium email note -> close premium, open signup */
    var emailNote = target.closest('.premium-email-note');
    if (emailNote) {
      closeModal(document.getElementById('premiumModal'));
      setTimeout(function () { openModal('signupModal'); }, 200);
    }
  });

  /* Esc closes the open modal */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var open = document.querySelector('.modal-overlay.open');
    if (open) closeModal(open);
  });

  /* ===== SIGNUP FORM ===== */
  (function () {
    var signupForm = document.querySelector('.signup-form');
    if (!signupForm) return;

    signupForm.addEventListener('submit', function (e) {
      e.preventDefault();
      var btn = this.querySelector('.signup-submit');
      btn.textContent = '✓ Welcome!';
      btn.classList.add('success');
      setTimeout(function () {
        closeModal(document.getElementById('signupModal'));
        btn.textContent = 'SIGN UP';
        btn.classList.remove('success');
        signupForm.reset();
      }, 2000);
    });
  })();
})();