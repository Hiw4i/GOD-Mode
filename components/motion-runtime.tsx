"use client";

import { useEffect } from "react";

const PARALLAX_CONFIG = {
  features: {
    visualDistance: -242,
    textDistance: -309,
    labelDistance: { mobile: -10, desktop: -94 },
    cardFrom: { mobile: 75, desktop: 112 },
    cardTo: { mobile: -75, desktop: -701 },
    cardIndexOffset: { mobile: 0, desktop: 5 },
    scrub: 0.35,
  },
  download: {
    visualFrom: 30,
    visualTo: -40,
    textFrom: 50,
    textTo: -80,
    scrub: 0.35,
  },
  support: {
    visualFrom: 30,
    visualTo: -40,
    textFrom: 50,
    textTo: -80,
    scrub: 0.35,
  },
  hero: {
    contentY: 0.45,
    statueY: 0.2,
  },
} as const;

function offsetWithin(element: HTMLElement, ancestor: HTMLElement) {
  let x = 0;
  let y = 0;
  let current: HTMLElement | null = element;
  while (current && current !== ancestor) {
    x += current.offsetLeft;
    y += current.offsetTop;
    current = current.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

type MaskMotionState = {
  planeId: string;
  scene: string;
  targetId: string;
  motionChannel: "visual" | "text" | "static";
  scrollGroup: SVGGElement;
  hoverGroup: SVGGElement;
  centerX: number;
  centerY: number;
  baseScale: number;
  hovered: boolean;
};

export function MotionRuntime() {
  useEffect(() => {
    let disposed = false;
    const cleanups: Array<() => void> = [];

    const start = async () => {
      const [{ gsap }, scrollModule, lenisModule] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger"), import("lenis")]);
      if (disposed) return;

      const ScrollTrigger = scrollModule.ScrollTrigger;
      const Lenis = lenisModule.default;
      gsap.registerPlugin(ScrollTrigger);

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const usesNativeMobileScroll = window.matchMedia("(max-width: 768px), (hover: none), (pointer: coarse)").matches;
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

      const maskStates = new Map<string, MaskMotionState>();
      const maskKey = (planeId: string, targetId: string) => `${planeId}:${targetId}`;
      const sceneTargetKey = (scene: string, targetId: string) => `${scene}:${targetId}`;
      const masksBySceneTarget = new Map<string, MaskMotionState[]>();

      const getTargetMasks = (scene: string, targetId: string) => masksBySceneTarget.get(sceneTargetKey(scene, targetId)) ?? [];
      const syncScene = (scene: HTMLElement) => {
        const name = scene.dataset.maskStage;
        if (!name) return;
        scene.querySelectorAll<HTMLElement>(`[data-xray-scene="${name}"]`).forEach((plane) => {
          const planeId = plane.dataset.xrayPlane;
          const svg = planeId ? plane.querySelector<SVGSVGElement>(`[data-mask-backdrop="${planeId}"]`) : null;
          const images = svg ? Array.from(svg.querySelectorAll<SVGImageElement>("[data-paired-image]")) : [];
          if (!planeId || !svg || images.length !== 2) return;

          const width = plane.offsetWidth;
          const height = plane.offsetHeight;
          if (!width || !height) return;
          svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
          svg.querySelectorAll<SVGMaskElement>("[data-card-mask]").forEach((mask) => {
            mask.setAttribute("width", String(width));
            mask.setAttribute("height", String(height));
          });
          svg.querySelectorAll<SVGRectElement>("[data-mask-base]").forEach((base) => {
            base.setAttribute("width", String(width));
            base.setAttribute("height", String(height));
          });
          images.forEach((image) => {
            image.setAttribute("x", "0");
            image.setAttribute("y", "0");
            image.setAttribute("width", String(width));
            image.setAttribute("height", String(height));
          });

          const planeOffset = offsetWithin(plane, scene);
          const planeX = plane.dataset.centered === "true" ? planeOffset.x - plane.offsetWidth / 2 : planeOffset.x;
          const motionChannel = (plane.dataset.xrayMotion ?? "static") as MaskMotionState["motionChannel"];
          // Text planes are vertically centered with a static CSS translateY(-50%).
          // offsetTop intentionally ignores transforms, so include that one fixed
          // translation in the cached layout geometry. Animated movement remains
          // in MaskMotionState and never requires per-frame layout reads.
          const planeY = planeOffset.y - (motionChannel === "text" ? plane.offsetHeight / 2 : 0);

          scene.querySelectorAll<HTMLElement>("[data-mask-target]").forEach((target) => {
            const targetId = target.dataset.maskTarget;
            const shape = targetId ? svg.querySelector<SVGGElement>(`[data-mask-motion="${targetId}"]`) : null;
            const scrollGroup = shape?.querySelector<SVGGElement>(`[data-mask-scroll="${targetId}"]`) ?? null;
            const hoverGroup = shape?.querySelector<SVGGElement>(`[data-mask-hover="${targetId}"]`) ?? null;
            const rect = shape?.querySelector<SVGRectElement>(`[data-mask-rect="${targetId}"]`) ?? null;
            if (!targetId || !scrollGroup || !hoverGroup || !rect) return;
            const offset = offsetWithin(target, scene);
            const radius = Number.parseFloat(getComputedStyle(target).borderRadius) || 16;
            const x = offset.x - planeX;
            const y = offset.y - planeY;
            const targetWidth = target.offsetWidth;
            const targetHeight = target.offsetHeight;
            rect.setAttribute("x", String(x));
            rect.setAttribute("y", String(y));
            rect.setAttribute("width", String(targetWidth));
            rect.setAttribute("height", String(targetHeight));
            rect.setAttribute("rx", String(radius));
            rect.setAttribute("ry", String(radius));

            const key = maskKey(planeId, targetId);
            const existing = maskStates.get(key);
            const cssScale = Number.parseFloat(getComputedStyle(target).getPropertyValue("--feature-card-scale")) || 1;
            const state: MaskMotionState = existing ?? {
              planeId,
              scene: name,
              targetId,
              motionChannel,
              scrollGroup,
              hoverGroup,
              centerX: 0,
              centerY: 0,
              baseScale: cssScale,
              hovered: false,
            };
            state.scrollGroup = scrollGroup;
            state.hoverGroup = hoverGroup;
            state.centerX = x + targetWidth / 2;
            state.centerY = y + targetHeight / 2;
            state.baseScale = cssScale;
            state.motionChannel = motionChannel;
            gsap.set(hoverGroup, state.hovered
              ? { svgOrigin: `${state.centerX} ${state.centerY}` }
              : { y: 0, scale: cssScale, svgOrigin: `${state.centerX} ${state.centerY}` });
            maskStates.set(key, state);
            const lookupKey = sceneTargetKey(name, targetId);
            const lookup = masksBySceneTarget.get(lookupKey) ?? [];
            if (!lookup.includes(state)) lookup.push(state);
            masksBySceneTarget.set(lookupKey, lookup);
          });
        });
      };

      const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-mask-stage]"));
      const featuresStage = document.querySelector<HTMLElement>('[data-mask-stage="features"]');
      const syncAll = () => {
        masksBySceneTarget.clear();
        scenes.forEach(syncScene);
      };
      let syncFrame = 0;
      const scheduleSync = () => {
        if (syncFrame) return;
        syncFrame = window.requestAnimationFrame(() => {
          syncFrame = 0;
          syncAll();
        });
      };
      syncAll();

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
        if (!prefersReducedMotion && featuresSection && featuresStage) {
          const visual = featuresStage.querySelector<HTMLElement>('[data-xray-motion="visual"]');
          const text = featuresStage.querySelector<HTMLElement>("[data-parallax-text]");
          const label = featuresStage.querySelector<HTMLElement>(".hiw-bg-label");
          const cards = Array.from(featuresStage.querySelectorAll<HTMLElement>("[data-feature-card]"));
          const mm = gsap.matchMedia();

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
            const imageDistance = mobile ? -132 : PARALLAX_CONFIG.features.visualDistance;
            const textDistance = PARALLAX_CONFIG.features.textDistance;
            if (visual) timeline.to(visual, { y: imageDistance, ease: "none" }, 0);
            if (text) timeline.to(text, { y: textDistance, ease: "none" }, 0);
            if (label) timeline.to(label, { y: mobile ? PARALLAX_CONFIG.features.labelDistance.mobile : PARALLAX_CONFIG.features.labelDistance.desktop, ease: "none" }, 0);

            cards.forEach((card, index) => {
              const speed = Number(card.dataset.speed ?? 1);
              const adjusted = mobile ? speed - 0.5 : speed;
              const from = PARALLAX_CONFIG.features.cardFrom[mobile ? "mobile" : "desktop"] * adjusted + (mobile ? 0 : (index - 2.5) * PARALLAX_CONFIG.features.cardIndexOffset.desktop);
              const to = PARALLAX_CONFIG.features.cardTo[mobile ? "mobile" : "desktop"] * adjusted + (mobile ? 0 : (index - 2.5) * PARALLAX_CONFIG.features.cardIndexOffset.desktop);
              const targetId = card.dataset.maskTarget ?? card.dataset.maskLink;
              timeline.fromTo(card, { y: from }, { y: to, ease: "none" }, 0);
              if (!targetId) return;

              getTargetMasks("features", targetId).forEach((maskState) => {
                const planeDistance = maskState.motionChannel === "visual" ? imageDistance : maskState.motionChannel === "text" ? textDistance : 0;
                timeline.fromTo(maskState.scrollGroup, { y: from }, { y: to - planeDistance, ease: "none" }, 0);
              });
            });
            return () => timeline.kill();
          };

          mm.add("(min-width: 681px)", () => createFeatureTimeline(false));
          mm.add("(max-width: 680px)", () => createFeatureTimeline(true));
          cleanups.push(() => mm.revert());
        }

        if (!prefersReducedMotion) ["download", "support"].forEach((name) => {
          const section = document.querySelector<HTMLElement>(`[data-mask-stage="${name}"]`);
          if (!section) return;
          const visual = section.querySelector<HTMLElement>('[data-xray-motion="visual"]');
          const text = section.querySelector<HTMLElement>("[data-parallax-text]");
          const config = name === "download" ? PARALLAX_CONFIG.download : PARALLAX_CONFIG.support;
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: config.scrub,
              onToggle: ({ isActive }) => section.classList.toggle("motion-active", isActive),
            },
          });
          if (visual) timeline.fromTo(visual, { y: config.visualFrom }, { y: config.visualTo, ease: "none" }, 0);
          if (text) timeline.fromTo(text, { y: config.textFrom }, { y: config.textTo, ease: "none" }, 0);

          section.querySelectorAll<HTMLElement>("[data-mask-target]").forEach((target) => {
            const targetId = target.dataset.maskTarget;
            if (!targetId) return;
            getTargetMasks(name, targetId).forEach((maskState) => {
              const planeFrom = maskState.motionChannel === "visual" ? config.visualFrom : maskState.motionChannel === "text" ? config.textFrom : 0;
              const planeTo = maskState.motionChannel === "visual" ? config.visualTo : maskState.motionChannel === "text" ? config.textTo : 0;
              timeline.fromTo(maskState.scrollGroup, { y: -planeFrom }, { y: -planeTo, ease: "none" }, 0);
            });
          });
        });

        const ambientCard = document.querySelector<HTMLElement>("#ambientCard");
        const ambientStage = ambientCard?.querySelector<HTMLElement>("[data-ambient-stage]");
        if (!prefersReducedMotion && canHover && ambientCard && ambientStage) {
          const moveX = gsap.quickTo(ambientStage, "x", { duration: 0.55, ease: "power3" });
          const moveY = gsap.quickTo(ambientStage, "y", { duration: 0.55, ease: "power3" });
          const rotate = gsap.quickTo(ambientStage, "rotation", { duration: 0.55, ease: "power3" });
          const onMove = (event: PointerEvent) => {
            const rect = ambientCard.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width - 0.5;
            const y = (event.clientY - rect.top) / rect.height - 0.5;
            moveX(x * 18); moveY(y * 14); rotate(x * 2.4 - 3);
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

      let nearObserver: IntersectionObserver | null = null;
      if (!prefersReducedMotion) {
        nearObserver = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            entry.target.classList.toggle("motion-near", entry.isIntersecting);
            if (entry.isIntersecting && entry.target instanceof HTMLElement && entry.target.hasAttribute("data-mask-stage")) {
              scheduleSync();
            }
          });
        }, { rootMargin: "35% 0px", threshold: 0 });
        document.querySelectorAll("[data-motion-near]").forEach((element) => nearObserver?.observe(element));
      }

      if (canHover && !prefersReducedMotion) scenes.forEach((scene) => {
        const name = scene.dataset.maskStage;
        if (!name) return;
        scene.querySelectorAll<HTMLElement>("[data-mask-target]").forEach((target) => {
          const targetId = target.dataset.maskTarget;
          if (!targetId) return;
          const targetMasks = getTargetMasks(name, targetId);
          const isFeature = target.classList.contains("feature-card-surface") || target.classList.contains("total-focus-motion");
          let hoverScale: number | null = null;
          let hoverY = -8;
          const enter = () => {
            const baseScale = targetMasks[0]?.baseScale ?? 1;
            if (isFeature && hoverScale === null) {
              const style = getComputedStyle(target);
              hoverScale = Number.parseFloat(style.getPropertyValue("--feature-card-hover-scale")) || baseScale * 1.02;
              hoverY = Number.parseFloat(style.getPropertyValue("--feature-card-hover-lift")) || -8;
            }
            const scale = isFeature ? hoverScale ?? baseScale : 1.02;
            const y = isFeature ? hoverY : -8;
            if (isFeature) {
              gsap.to(target, { y, scale, duration: 0.55, ease: "power2.out", overwrite: "auto" });
            } else {
              gsap.to(target, { y, scale, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            }
            targetMasks.forEach((maskState) => {
              maskState.hovered = true;
              gsap.to(maskState.hoverGroup, { y, scale, duration: 0.55, ease: "power2.out", overwrite: "auto" });
            });
          };
          const leave = () => {
            const baseScale = targetMasks[0]?.baseScale ?? 1;
            if (isFeature) {
              gsap.to(target, { y: 0, scale: baseScale, duration: 0.55, ease: "power2.out", overwrite: "auto", onComplete: () => gsap.set(target, { clearProps: "transform" }) });
            } else {
              gsap.to(target, { y: 0, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            }
            targetMasks.forEach((maskState) => {
              maskState.hovered = false;
              gsap.to(maskState.hoverGroup, { y: 0, scale: maskState.baseScale, duration: 0.55, ease: "power2.out", overwrite: "auto" });
            });
          };
          target.addEventListener("pointerenter", enter);
          target.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            targetMasks.forEach((state) => {
              gsap.killTweensOf(state.scrollGroup);
              gsap.killTweensOf(state.hoverGroup);
            });
            gsap.killTweensOf(target);
            target.removeEventListener("pointerenter", enter);
            target.removeEventListener("pointerleave", leave);
          });
        });
      });

      const navLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".nav-right a"));
      const navLogo = document.querySelector<HTMLElement>(".nav-logo");
      const sectionObserver = new IntersectionObserver((entries) => {
        const current = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (!current) return;
        navLinks.forEach((link) => link.classList.toggle("active", link.hash === `#${current.target.id}`));
        navLogo?.classList.toggle("scrolled", current.target.id !== "hero");
      }, { rootMargin: "-35% 0px -55%", threshold: [0, 0.1, 0.5] });
      document.querySelectorAll("section[id]").forEach((section) => sectionObserver.observe(section));

      let resizeFrame = 0;
      const resizeObserver = new ResizeObserver(() => {
        if (resizeFrame) return;
        resizeFrame = window.requestAnimationFrame(() => {
          resizeFrame = 0;
          scheduleSync();
        });
      });
      scenes.forEach((scene) => {
        resizeObserver.observe(scene);
        scene.querySelectorAll<HTMLElement>("[data-xray-plane], [data-mask-target]").forEach((element) => resizeObserver.observe(element));
      });
      void document.fonts.ready.then(() => { if (!disposed) scheduleSync(); });
      ScrollTrigger.addEventListener("refreshInit", syncAll);
      ScrollTrigger.refresh();

      const maskDebug = new URLSearchParams(window.location.search).get("maskDebug") === "1";
      document.documentElement.toggleAttribute("data-mask-debug", maskDebug);

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
        document.documentElement.removeAttribute("data-mask-debug");
        ScrollTrigger.removeEventListener("refreshInit", syncAll);
        if (syncFrame) window.cancelAnimationFrame(syncFrame);
        if (resizeFrame) window.cancelAnimationFrame(resizeFrame);
        if (resumeFrame) window.cancelAnimationFrame(resumeFrame);
        resizeObserver.disconnect();
        nearObserver?.disconnect();
        sectionObserver.disconnect();
        maskStates.clear();
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
