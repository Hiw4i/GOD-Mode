(function () {
  'use strict';

  /* Shared helpers used by animations.js and parallax.js */

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function formatTime(ms) {
    var totalSec = Math.floor(ms / 1000);
    var min = String(Math.floor(totalSec / 60)).padStart(2, '0');
    var sec = String(totalSec % 60).padStart(2, '0');
    return min + ':' + sec;
  }

  /* Runs a requestAnimationFrame loop while the element is on screen.
     Honors prefers-reduced-motion: the loop never starts. */
  function createVisibilityLoop(el, threshold, tick) {
    var rafId = 0;
    var running = false;

    function loop() {
      tick();
      if (running) rafId = requestAnimationFrame(loop);
    }

    new IntersectionObserver(
      function (entries) {
        if (entries[0].isIntersecting && !running && !reducedMotion) {
          running = true;
          rafId = requestAnimationFrame(loop);
        } else if (!entries[0].isIntersecting && running) {
          running = false;
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      },
      { threshold: threshold }
    ).observe(el);
  }

  window.GamUtils = {
    clamp: clamp,
    formatTime: formatTime,
    createVisibilityLoop: createVisibilityLoop,
  };
})();
