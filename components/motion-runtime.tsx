"use client";

import { useEffect } from "react";

const MOBILE_LAYOUT_QUERY = "(max-width: 768px)";

const PARALLAX_CONFIG = {
  features: {
    visualDistance: -242,
    textDistance: -309,
    labelDistance: { mobile: -10, desktop: -94 },
    cardFrom: 112,
    cardTo: -701,
    cardIndexOffset: 5,
    scrub: 0.35,
  },
  download: { visualFrom: 30, visualTo: -40, textFrom: 50, textTo: -80, scrub: 0.35 },
  support: { visualFrom: 30, visualTo: -40, textFrom: 50, textTo: -80, scrub: 0.35 },
  hero: { contentY: 0.45, statueY: 0.2 },
} as const;

export function MotionRuntime() {
  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const start = async () => {
      const [{ gsap }, scrollModule, lenisModule] = await Promise.all([
        import("gsap"),
        import("gsap/ScrollTrigger"),
        import("lenis"),
      ]);
      if (disposed) return;

      const ScrollTrigger = scrollModule.ScrollTrigger;
      const Lenis = lenisModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const mobileLayoutMedia = window.matchMedia(MOBILE_LAYOUT_QUERY);
      const usesNativeMobileScroll = window.matchMedia(`${MOBILE_LAYOUT_QUERY}, (hover: none), (pointer: coarse)`).matches;
      ScrollTrigger.config({ ignoreMobileResize: true, limitCallbacks: true });

      const lenis = prefersReducedMotion || usesNativeMobileScroll ? null : new Lenis({
        duration: 0.8,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
        anchors: { offset: 0 },
        autoRaf: false,
        stopInertiaOnNavigate: true,
        respectReducedMotion: true,
      });

      const onLenisScroll = () => ScrollTrigger.update();
      const tick = (time: number) => lenis?.raf(time * 1000);
      lenis?.on("scroll", onLenisScroll);
      if (lenis) gsap.ticker.add(tick);

      const context = gsap.context(() => {
        const hero = document.querySelector<HTMLElement>(".hero");
        const heroContent = document.querySelector<HTMLElement>(".hero-content");
        const heroStatue = document.querySelector<HTMLElement>(".hero-statue-wrap");
        if (!prefersReducedMotion && hero && heroContent && heroStatue) {
          let initialized = false;
          const initializeHeroParallax = () => {
            if (initialized || window.scrollY < 1) return;
            initialized = true;
            window.removeEventListener("scroll", initializeHeroParallax);
            gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
              .to(heroContent, { y: () => innerHeight * PARALLAX_CONFIG.hero.contentY, opacity: 0, ease: "none" }, 0)
              .to(heroStatue, { y: () => innerHeight * PARALLAX_CONFIG.hero.statueY, ease: "none" }, 0);
            ScrollTrigger.refresh();
          };
          window.addEventListener("scroll", initializeHeroParallax, { passive: true });
          initializeHeroParallax();
          cleanups.push(() => window.removeEventListener("scroll", initializeHeroParallax));
        }

        const featuresSection = document.querySelector<HTMLElement>(".how-it-works");
        const featuresStage = document.querySelector<HTMLElement>(".features-stage");
        if (!prefersReducedMotion && featuresSection && featuresStage) {
          const visual = featuresStage.querySelector<HTMLElement>("[data-parallax-visual]");
          const text = featuresStage.querySelector<HTMLElement>("[data-parallax-text]");
          const label = featuresStage.querySelector<HTMLElement>(".hiw-bg-label");
          const cards = Array.from(featuresStage.querySelectorAll<HTMLElement>("[data-feature-card]"));
          const media = gsap.matchMedia();

          const createFeatureTimeline = (mobile: boolean) => {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: featuresSection,
                start: "top top",
                end: "bottom top",
                scrub: PARALLAX_CONFIG.features.scrub,
                onToggle: ({ isActive }) => featuresStage.classList.toggle("motion-active", isActive),
              },
            });
            const imageDistance = mobile ? -42 : PARALLAX_CONFIG.features.visualDistance;
            if (visual) timeline.to(visual, { y: imageDistance, ease: "none" }, 0);
            if (text) timeline.to(text, { y: mobile ? -30 : PARALLAX_CONFIG.features.textDistance, ease: "none" }, 0);
            if (label) timeline.to(label, { y: mobile ? PARALLAX_CONFIG.features.labelDistance.mobile : PARALLAX_CONFIG.features.labelDistance.desktop, ease: "none" }, 0);

            if (!mobile) {
              cards.forEach((card, index) => {
                const speed = Number(card.dataset.speed ?? 1);
                const offset = (index - 2.5) * PARALLAX_CONFIG.features.cardIndexOffset;
                timeline.fromTo(
                  card,
                  { y: PARALLAX_CONFIG.features.cardFrom * speed + offset },
                  { y: PARALLAX_CONFIG.features.cardTo * speed + offset, ease: "none" },
                  0,
                );
              });
            }
            return () => timeline.kill();
          };

          media.add("(min-width: 769px)", () => createFeatureTimeline(false));
          media.add(MOBILE_LAYOUT_QUERY, () => createFeatureTimeline(true));
          cleanups.push(() => media.revert());
        }

        if (!prefersReducedMotion) ["download", "support"].forEach((name) => {
          const section = document.querySelector<HTMLElement>(`[data-motion-scene="${name}"]`);
          if (!section) return;
          const visual = section.querySelector<HTMLElement>("[data-parallax-visual]");
          const text = section.querySelector<HTMLElement>("[data-parallax-text]");
          const config = name === "download" ? PARALLAX_CONFIG.download : PARALLAX_CONFIG.support;
          const media = gsap.matchMedia();

          const createSceneTimeline = (mobile: boolean) => {
            const timeline = gsap.timeline({
              scrollTrigger: {
                trigger: section,
                start: "top bottom",
                end: "bottom top",
                scrub: config.scrub,
                onToggle: ({ isActive }) => section.classList.toggle("motion-active", isActive),
              },
            });
            if (visual) timeline.fromTo(visual, { y: mobile ? 14 : config.visualFrom }, { y: mobile ? -22 : config.visualTo, ease: "none" }, 0);
            if (text) timeline.fromTo(text, { y: mobile ? 16 : config.textFrom }, { y: mobile ? -24 : config.textTo, ease: "none" }, 0);
            return () => timeline.kill();
          };

          media.add("(min-width: 769px)", () => createSceneTimeline(false));
          media.add(MOBILE_LAYOUT_QUERY, () => createSceneTimeline(true));
          cleanups.push(() => media.revert());
        });

        const ambientCard = document.querySelector<HTMLElement>("#ambientCard");
        const ambientStage = ambientCard?.querySelector<HTMLElement>("[data-ambient-stage]");
        if (!prefersReducedMotion && canHover && !mobileLayoutMedia.matches && ambientCard && ambientStage) {
          const moveX = gsap.quickTo(ambientStage, "x", { duration: 0.55, ease: "power3" });
          const moveY = gsap.quickTo(ambientStage, "y", { duration: 0.55, ease: "power3" });
          const rotate = gsap.quickTo(ambientStage, "rotation", { duration: 0.55, ease: "power3" });
          const onMove = (event: PointerEvent) => {
            const rect = ambientCard.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            moveX(x * 18);
            moveY(y * 14);
            rotate(x * 2.4 - 3);
          };
          const onLeave = () => { moveX(0); moveY(0); rotate(-3); };
          ambientCard.addEventListener("pointermove", onMove);
          ambientCard.addEventListener("pointerleave", onLeave);
          cleanups.push(() => {
            ambientCard.removeEventListener("pointermove", onMove);
            ambientCard.removeEventListener("pointerleave", onLeave);
          });
        }
      });

      const nearObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("motion-near", !prefersReducedMotion && entry.isIntersecting));
      }, { rootMargin: "35% 0px", threshold: 0 });
      document.querySelectorAll("[data-motion-near]").forEach((element) => nearObserver.observe(element));

      if (canHover && !prefersReducedMotion && !mobileLayoutMedia.matches) {
        document.querySelectorAll<HTMLElement>("[data-hover-target]").forEach((target) => {
          const style = getComputedStyle(target);
          const baseScale = Number.parseFloat(style.getPropertyValue("--feature-card-scale")) || 1;
          const hoverScale = Number.parseFloat(style.getPropertyValue("--feature-card-hover-scale")) || baseScale * 1.02;
          const hoverY = Number.parseFloat(style.getPropertyValue("--feature-card-hover-lift")) || -8;
          const enter = () => gsap.to(target, { y: hoverY, scale: hoverScale, duration: 0.5, ease: "power2.out", overwrite: "auto" });
          const leave = () => gsap.to(target, {
            y: 0,
            scale: baseScale,
            duration: 0.5,
            ease: "power2.out",
            overwrite: "auto",
            onComplete: () => gsap.set(target, { clearProps: "transform" }),
          });
          target.addEventListener("pointerenter", enter);
          target.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            gsap.killTweensOf(target);
            target.removeEventListener("pointerenter", enter);
            target.removeEventListener("pointerleave", leave);
          });
        });
      }

      const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav-right a"));
      const navLogo = document.querySelector<HTMLElement>(".nav-logo");
      const pageSections = Array.from(document.querySelectorAll<HTMLElement>("section[id]"));
      let navFrame = 0;
      const updateActiveNav = () => {
        navFrame = 0;
        const activationLine = window.innerHeight * 0.25;
        let current = pageSections[0];
        pageSections.forEach((section) => {
          if (section.getBoundingClientRect().top <= activationLine) current = section;
        });
        if (!current) return;
        navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${current.id}`));
        navLogo?.classList.toggle("scrolled", current.id !== "hero");
      };
      const scheduleActiveNavUpdate = () => {
        if (navFrame) return;
        navFrame = window.requestAnimationFrame(updateActiveNav);
      };
      window.addEventListener("scroll", scheduleActiveNavUpdate, { passive: true });
      window.addEventListener("resize", scheduleActiveNavUpdate);
      updateActiveNav();

      const onLayoutChange = () => ScrollTrigger.refresh();
      mobileLayoutMedia.addEventListener("change", onLayoutChange);
      void document.fonts.ready.then(() => { if (!disposed) ScrollTrigger.refresh(); });
      ScrollTrigger.refresh();

      let modalOpen = false;
      let resumeFrame = 0;
      const syncLenisState = () => {
        if (!lenis) return;
        if (document.hidden || modalOpen) {
          lenis.stop();
          return;
        }
        lenis.start();
        if (resumeFrame) window.cancelAnimationFrame(resumeFrame);
        resumeFrame = window.requestAnimationFrame(() => {
          resumeFrame = 0;
          lenis.resize();
          ScrollTrigger.refresh();
        });
      };
      const onModal = (event: Event) => {
        modalOpen = Boolean((event as CustomEvent<{ open: boolean }>).detail?.open);
        syncLenisState();
      };
      window.addEventListener("godmode:modal", onModal);
      document.addEventListener("visibilitychange", syncLenisState);

      cleanups.push(() => {
        window.removeEventListener("godmode:modal", onModal);
        document.removeEventListener("visibilitychange", syncLenisState);
        if (resumeFrame) window.cancelAnimationFrame(resumeFrame);
        if (navFrame) window.cancelAnimationFrame(navFrame);
        window.removeEventListener("scroll", scheduleActiveNavUpdate);
        window.removeEventListener("resize", scheduleActiveNavUpdate);
        mobileLayoutMedia.removeEventListener("change", onLayoutChange);
        nearObserver.disconnect();
        context.revert();
        if (lenis) gsap.ticker.remove(tick);
        lenis?.destroy();
        ScrollTrigger.config({ ignoreMobileResize: false, limitCallbacks: false });
      });
    };

    void start().catch((error) => console.error("Failed to initialize motion runtime", error));
    return () => {
      disposed = true;
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
