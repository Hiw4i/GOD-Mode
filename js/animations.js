(function () {
  'use strict';

  var createVisibilityLoop = window.GamUtils.createVisibilityLoop;
  var formatTime = window.GamUtils.formatTime;

  /* ===== SCROLL REVEAL (IntersectionObserver) ===== */
  (function () {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) entry.target.classList.add('visible');
        });
      },
      { threshold: 0.15 }
    );

    document.querySelectorAll('.fade-in').forEach(function (el) { observer.observe(el); });
  })();

  /* ===== CRUEL STOPWATCH ===== */
  (function () {
    var cruelCard = document.getElementById('cruelCard');
    var timerEl = document.getElementById('cruelTimer');
    if (!cruelCard || !timerEl) return;

    var intervalId = null;
    var elapsedMs = 0;

    function start() {
      if (intervalId) return;
      elapsedMs = 0;
      timerEl.textContent = '00:00';
      timerEl.classList.add('is-counting');
      timerEl.classList.remove('is-reset');
      intervalId = setInterval(function () {
        elapsedMs += 16;
        timerEl.textContent = formatTime(elapsedMs);
      }, 16);
    }

    function stop() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
      elapsedMs = 0;
      timerEl.textContent = '00:00';
      timerEl.classList.remove('is-counting');
      timerEl.classList.add('is-reset');
    }

    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting) start();
        else stop();
      },
      { threshold: 0.15 }
    ).observe(cruelCard);
  })();

  /* ===== FLOATING ICONS ===== */
  (function () {
    var iconsWrap = document.querySelector('[data-floating-icons]');
    if (!iconsWrap) return;

    var icons = iconsWrap.querySelectorAll('.float-icon');
    var card = iconsWrap.closest('.total-focus-wrap').querySelector('.feature-card');

    var t0 = performance.now();
    var iconY = [0, 0, 0];
    var mx = 0, my = 0, sx = 0, sy = 0;

    /* Per-icon motion profile: depth/parallax, idle sway/bob, rotation */
    var cfg = [
      { depth: 8, lerp: 0.04, bob: 8, bobHz: 0.12, sway: 4, swayHz: 0.08, rot: 14, rotHz: 0.1, phase: 0, rotOff: -10 },
      { depth: 6, lerp: 0.06, bob: 10, bobHz: 0.15, sway: 5, swayHz: 0.1, rot: 12, rotHz: 0.12, phase: 1.2, rotOff: 22 },
      { depth: 5, lerp: 0.022, bob: 6, bobHz: 0.1, sway: 3, swayHz: 0.06, rot: 10, rotHz: 0.08, phase: 2.5, rotOff: -8 },
    ];

    iconsWrap.addEventListener('mousemove', function (e) {
      var r = iconsWrap.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    iconsWrap.addEventListener('mouseleave', function () { mx = 0; my = 0; });

    function tick() {
      sx += (mx - sx) * 0.08;
      sy += (my - sy) * 0.08;

      var t = (performance.now() - t0) / 1000;
      var cardY = parseFloat(card.style.getPropertyValue('--feature-card-y')) || 0;

      icons.forEach(function (icon, i) {
        var c = cfg[i];
        iconY[i] += (cardY - iconY[i]) * c.lerp;

        var bob = Math.sin(t * c.bobHz * 6.283 + c.phase) * c.bob;
        var sway = Math.sin(t * c.swayHz * 6.283 + c.phase + 1) * c.sway;
        var rot = Math.sin(t * c.rotHz * 6.283 + c.phase + 2) * c.rot + c.rotOff;

        var tx = sx * c.depth + sway;
        var ty = iconY[i] + sy * c.depth + bob;

        icon.style.transform =
          'translate(' + tx.toFixed(1) + 'px,' + ty.toFixed(1) + 'px) rotate(' + rot.toFixed(1) +
          'deg) perspective(400px) rotateX(' + (sy * -3).toFixed(1) + 'deg) rotateY(' + (sx * 3).toFixed(1) + 'deg)';
      });
    }

    createVisibilityLoop(iconsWrap, 0.1, tick);
  })();

  /* ===== AMBIENT SOUNDSCAPES ===== */
  (function () {
    var ambientCard = document.getElementById('ambientCard');
    if (!ambientCard) return;

    var player = ambientCard.querySelector('[data-ambient-player]');
    var stage = ambientCard.querySelector('[data-ambient-stage]');
    var cover = ambientCard.querySelector('[data-ambient-cover]');
    var nameEl = ambientCard.querySelector('[data-ambient-name]');
    var audio = ambientCard.querySelector('[data-ambient-audio]');
    var playBtn = ambientCard.querySelector('[data-ambient-play]');
    var prevBtn = ambientCard.querySelector('[data-ambient-prev]');
    var nextBtn = ambientCard.querySelector('[data-ambient-next]');

    var tracks = [
      { name: 'Had to be alone', cover: 'sources/music (1).jpg', src: 'sources/music (1).mp3' },
      { name: 'Hope burns last', cover: 'sources/music (2).jpg', src: 'sources/music (2).mp3' },
      { name: 'Lo-fi Focus', cover: 'sources/music (3).jpg', src: 'sources/music (3).m4a' },
    ];

    var index = 0;
    var tx = 0, ty = 0, x = 0, y = 0;

    function render() {
      var track = tracks[index];
      cover.src = track.cover;
      nameEl.textContent = track.name;
      playBtn.setAttribute('aria-label', (audio.paused ? 'Play ' : 'Pause ') + track.name);
    }

    function setState(playing) {
      player.classList.toggle('is-playing', playing);
      playBtn.setAttribute('aria-pressed', String(playing));
      playBtn.classList.toggle('is-playing', playing);
      render();
    }

    function choose(next, autoplay) {
      index = ((next % tracks.length) + tracks.length) % tracks.length;
      var wasPlaying = !audio.paused;
      audio.pause();
      audio.src = tracks[index].src;
      audio.load();
      render();
      if (autoplay || wasPlaying) audio.play().catch(function () { setState(false); });
    }

    playBtn.addEventListener('click', function () {
      if (!audio.src) audio.src = tracks[index].src;
      if (audio.paused) audio.play().catch(function () { setState(false); });
      else audio.pause();
    });

    prevBtn.addEventListener('click', function () { choose(index - 1, true); });
    nextBtn.addEventListener('click', function () { choose(index + 1, true); });

    audio.addEventListener('play', function () { setState(true); });
    audio.addEventListener('pause', function () { setState(false); });
    audio.addEventListener('ended', function () { choose(index + 1, true); });

    ambientCard.addEventListener('pointermove', function (e) {
      var r = ambientCard.getBoundingClientRect();
      tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    });
    ambientCard.addEventListener('pointerleave', function () { tx = 0; ty = 0; });

    function tick() {
      x += (tx - x) * 0.08;
      y += (ty - y) * 0.08;
      ambientCard.style.setProperty('--ambient-tilt-x', (y * -3).toFixed(2) + 'deg');
      ambientCard.style.setProperty('--ambient-tilt-y', (x * 4).toFixed(2) + 'deg');
      stage.style.transform =
        'translate3d(' + (x * 9).toFixed(1) + 'px,' + (y * 7).toFixed(1) + 'px,38px) rotateZ(' + (x * 1.2).toFixed(2) + 'deg)';
    }

    createVisibilityLoop(ambientCard, 0.12, tick);

    render();
  })();
})();