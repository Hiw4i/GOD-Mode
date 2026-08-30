"use client";

import { useEffect } from "react";

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
  groups: SVGGElement[];
  centerX: number;
  centerY: number;
  baseScale: number;
  scale: number;
  scrollY: number;
  hoverY: number;
};

type CardMotionState = {
  id: string;
  element: HTMLElement;
  baseScale: number;
  scale: number;
  scrollY: number;
  hoverY: number;
};

type OverlapReplicaState = {
  element: HTMLElement;
  source: CardMotionState;
  target: CardMotionState;
  sourceX: number;
  sourceY: number;
  targetX: number;
  targetY: number;
  sourceWidth: number;
  sourceHeight: number;
  targetWidth: number;
  targetHeight: number;
  disabledAt: number;
};

function renderMaskState(state: MaskMotionState) {
  const y = state.scrollY + state.hoverY;
  const transform = [
    `translate(0 ${y.toFixed(3)})`,
    `translate(${state.centerX.toFixed(3)} ${state.centerY.toFixed(3)})`,
    `scale(${state.scale.toFixed(5)})`,
    `translate(${-state.centerX.toFixed(3)} ${-state.centerY.toFixed(3)})`,
  ].join(" ");
  state.groups.forEach((group) => group.setAttribute("transform", transform));
}

function renderOverlapState(state: OverlapReplicaState) {
  if (window.innerWidth <= state.disabledAt) return;
  const sourceScale = Math.max(0.001, state.source.scale);
  const targetScale = Math.max(0.001, state.target.scale);
  const sourceWorldX = state.sourceX + (state.sourceWidth * (1 - sourceScale)) / 2;
  const sourceWorldY = state.sourceY + state.source.scrollY + state.source.hoverY + (state.sourceHeight * (1 - sourceScale)) / 2;
  const targetWorldX = state.targetX + (state.targetWidth * (1 - targetScale)) / 2;
  const targetWorldY = state.targetY + state.target.scrollY + state.target.hoverY + (state.targetHeight * (1 - targetScale)) / 2;
  const x = (sourceWorldX - targetWorldX) / targetScale;
  const y = (sourceWorldY - targetWorldY) / targetScale;
  state.element.style.width = `${(state.sourceWidth * sourceScale) / targetScale}px`;
  state.element.style.height = `${(state.sourceHeight * sourceScale) / targetScale}px`;
  state.element.style.transform = `translate3d(${x.toFixed(3)}px, ${y.toFixed(3)}px, 0)`;
}

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

      const lenis = new Lenis({
        duration: 1,
        easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true,
        wheelMultiplier: 0.9,
        touchMultiplier: 1.5,
        anchors: { offset: 0 },
        autoRaf: false,
        stopInertiaOnNavigate: true,
        respectReducedMotion: false,
      });

      const onLenisScroll = () => ScrollTrigger.update();
      const tick = (time: number) => lenis.raf(time * 1000);
      lenis.on("scroll", onLenisScroll);
      gsap.ticker.add(tick);
      gsap.ticker.lagSmoothing(0);

      const maskStates = new Map<string, MaskMotionState>();
      const cardStates = new Map<string, CardMotionState>();
      const overlapStates = new Map<string, OverlapReplicaState>();
      const maskKey = (planeId: string, targetId: string) => `${planeId}:${targetId}`;
      const sceneTargetKey = (scene: string, targetId: string) => `${scene}:${targetId}`;
      const masksBySceneTarget = new Map<string, MaskMotionState[]>();

      const getTargetMasks = (scene: string, targetId: string) => masksBySceneTarget.get(sceneTargetKey(scene, targetId)) ?? [];
      const renderOverlapsFor = (cardId: string) => {
        overlapStates.forEach((state) => {
          if (state.source.id === cardId || state.target.id === cardId) renderOverlapState(state);
        });
      };

      const syncCardStates = (stage: HTMLElement) => {
        stage.querySelectorAll<HTMLElement>("[data-feature-id]").forEach((card) => {
          const id = card.dataset.featureId;
          if (!id) return;
          const existing = cardStates.get(id);
          const cssScale = Number.parseFloat(getComputedStyle(card).getPropertyValue("--feature-card-scale")) || 1;
          cardStates.set(id, existing ?? { id, element: card, baseScale: cssScale, scale: cssScale, scrollY: 0, hoverY: 0 });
        });
      };

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
            const rects = targetId ? Array.from(svg.querySelectorAll<SVGRectElement>(`[data-mask-rect="${targetId}"]`)) : [];
            if (!targetId || rects.length !== 2) return;
            const offset = offsetWithin(target, scene);
            const radius = Number.parseFloat(getComputedStyle(target).borderRadius) || 16;
            const x = offset.x - planeX;
            const y = offset.y - planeY;
            const targetWidth = target.offsetWidth;
            const targetHeight = target.offsetHeight;
            rects.forEach((rect) => {
              rect.setAttribute("x", String(x));
              rect.setAttribute("y", String(y));
              rect.setAttribute("width", String(targetWidth));
              rect.setAttribute("height", String(targetHeight));
              rect.setAttribute("rx", String(radius));
              rect.setAttribute("ry", String(radius));
            });

            const key = maskKey(planeId, targetId);
            const existing = maskStates.get(key);
            const cssScale = Number.parseFloat(getComputedStyle(target).getPropertyValue("--feature-card-scale")) || 1;
            const state: MaskMotionState = existing ?? {
              planeId,
              scene: name,
              targetId,
              motionChannel,
              groups: [],
              centerX: 0,
              centerY: 0,
              baseScale: cssScale,
              scale: cssScale,
              scrollY: 0,
              hoverY: 0,
            };
            state.groups = rects.map((rect) => rect.parentElement as unknown as SVGGElement);
            state.centerX = x + targetWidth / 2;
            state.centerY = y + targetHeight / 2;
            state.motionChannel = motionChannel;
            maskStates.set(key, state);
            const lookupKey = sceneTargetKey(name, targetId);
            const lookup = masksBySceneTarget.get(lookupKey) ?? [];
            if (!lookup.includes(state)) lookup.push(state);
            masksBySceneTarget.set(lookupKey, lookup);
            renderMaskState(state);
          });
        });
      };

      const syncOverlapReplicas = (stage: HTMLElement) => {
        stage.querySelectorAll<HTMLElement>("[data-overlap-replica]").forEach((replica) => {
          const relation = replica.dataset.overlapReplica;
          const [sourceId, targetId] = relation?.split(":") ?? [];
          const source = sourceId ? cardStates.get(sourceId) : null;
          const target = targetId ? cardStates.get(targetId) : null;
          const windowElement = replica.closest<HTMLElement>("[data-overlap-window]");
          if (!relation || !source || !target || !windowElement) return;
          const sourceOffset = offsetWithin(source.element, stage);
          const targetOffset = offsetWithin(target.element, stage);
          const state: OverlapReplicaState = {
            element: replica,
            source,
            target,
            sourceX: sourceOffset.x,
            sourceY: sourceOffset.y,
            targetX: targetOffset.x,
            targetY: targetOffset.y,
            sourceWidth: source.element.offsetWidth,
            sourceHeight: source.element.offsetHeight,
            targetWidth: target.element.offsetWidth,
            targetHeight: target.element.offsetHeight,
            disabledAt: Number(windowElement.dataset.overlapDisableAt ?? 680),
          };
          overlapStates.set(relation, state);
          renderOverlapState(state);
        });
      };

      const scenes = Array.from(document.querySelectorAll<HTMLElement>("[data-mask-stage]"));
      const featuresStage = document.querySelector<HTMLElement>('[data-mask-stage="features"]');
      const syncAll = () => {
        masksBySceneTarget.clear();
        scenes.forEach(syncScene);
        if (featuresStage) {
          syncCardStates(featuresStage);
          syncOverlapReplicas(featuresStage);
        }
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
        if (hero && heroContent && heroStatue) {
          let initialized = false;
          const initializeHeroParallax = () => {
            if (initialized || window.scrollY < 1) return;
            initialized = true;
            window.removeEventListener("scroll", initializeHeroParallax);
            gsap.timeline({ scrollTrigger: { trigger: hero, start: "top top", end: "bottom top", scrub: true } })
              .to(heroContent, { y: () => innerHeight * 0.45, opacity: 0, ease: "none" }, 0)
              .to(heroStatue, { y: () => innerHeight * 0.2, ease: "none" }, 0);
            ScrollTrigger.refresh();
          };
          window.addEventListener("scroll", initializeHeroParallax, { passive: true });
          initializeHeroParallax();
          cleanups.push(() => window.removeEventListener("scroll", initializeHeroParallax));
        }

        const featuresSection = document.querySelector<HTMLElement>(".how-it-works");
        if (featuresSection && featuresStage) {
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
                end: "bottom bottom",
                scrub: 0.35,
                onToggle: ({ isActive }) => featuresStage.classList.toggle("motion-active", isActive),
              },
            });
            const imageDistance = mobile ? -411 : -617;
            const textDistance = -309;
            if (visual) timeline.to(visual, { y: imageDistance, ease: "none" }, 0);
            if (text) timeline.to(text, { y: textDistance, ease: "none" }, 0);
            if (label) timeline.to(label, { y: mobile ? -10 : -94, ease: "none" }, 0);

            cards.forEach((card, index) => {
              const speed = Number(card.dataset.speed ?? 1);
              const adjusted = mobile ? speed - 0.5 : speed;
              const from = (mobile ? 75 : 112) * adjusted + (mobile ? 0 : (index - 2.5) * 5);
              const to = (mobile ? -75 : -701) * adjusted + (mobile ? 0 : (index - 2.5) * 5);
              const targetId = card.dataset.maskTarget ?? card.dataset.maskLink;
              timeline.fromTo(card, { "--feature-card-y": `${from}px` }, { "--feature-card-y": `${to}px`, ease: "none" }, 0);
              if (!targetId) return;

              const cardState = cardStates.get(targetId);
              if (cardState) {
                timeline.fromTo(cardState, { scrollY: from }, { scrollY: to, ease: "none", onUpdate: () => renderOverlapsFor(targetId) }, 0);
              }
              getTargetMasks("features", targetId).forEach((maskState) => {
                const planeDistance = maskState.motionChannel === "visual" ? imageDistance : maskState.motionChannel === "text" ? textDistance : 0;
                timeline.fromTo(maskState, { scrollY: from, onUpdate: () => renderMaskState(maskState) }, { scrollY: to - planeDistance, ease: "none", onUpdate: () => renderMaskState(maskState) }, 0);
              });
            });
            return () => timeline.kill();
          };

          mm.add("(min-width: 681px)", () => createFeatureTimeline(false));
          mm.add("(max-width: 680px)", () => createFeatureTimeline(true));
          cleanups.push(() => mm.revert());
        }

        ["download", "support"].forEach((name) => {
          const section = document.querySelector<HTMLElement>(`[data-mask-stage="${name}"]`);
          if (!section) return;
          const visual = section.querySelector<HTMLElement>('[data-xray-motion="visual"]');
          const text = section.querySelector<HTMLElement>("[data-parallax-text]");
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: section,
              start: "top bottom",
              end: "bottom top",
              scrub: 0.35,
              onToggle: ({ isActive }) => section.classList.toggle("motion-active", isActive),
            },
          });
          if (visual) timeline.fromTo(visual, { y: 30 }, { y: -40, ease: "none" }, 0);
          if (text) timeline.fromTo(text, { y: 50 }, { y: -80, ease: "none" }, 0);

          section.querySelectorAll<HTMLElement>("[data-mask-target]").forEach((target) => {
            const targetId = target.dataset.maskTarget;
            if (!targetId) return;
            getTargetMasks(name, targetId).forEach((maskState) => {
              const planeFrom = maskState.motionChannel === "visual" ? 30 : maskState.motionChannel === "text" ? 50 : 0;
              const planeTo = maskState.motionChannel === "visual" ? -40 : maskState.motionChannel === "text" ? -80 : 0;
              timeline.fromTo(maskState, { scrollY: -planeFrom, onUpdate: () => renderMaskState(maskState) }, { scrollY: -planeTo, ease: "none", onUpdate: () => renderMaskState(maskState) }, 0);
            });
          });
        });

        const ambientCard = document.querySelector<HTMLElement>("#ambientCard");
        const ambientStage = ambientCard?.querySelector<HTMLElement>("[data-ambient-stage]");
        if (ambientCard && ambientStage) {
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

      const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -8%", threshold: 0.08 });
      document.querySelectorAll(".fade-in").forEach((element) => revealObserver.observe(element));

      const nearObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => entry.target.classList.toggle("motion-near", entry.isIntersecting));
      }, { rootMargin: "35% 0px", threshold: 0 });
      document.querySelectorAll("[data-motion-near]").forEach((element) => nearObserver.observe(element));

      scenes.forEach((scene) => {
        const name = scene.dataset.maskStage;
        if (!name) return;
        scene.querySelectorAll<HTMLElement>("[data-mask-target]").forEach((target) => {
          const targetId = target.dataset.maskTarget;
          if (!targetId) return;
          const targetMasks = getTargetMasks(name, targetId);
          const cardState = cardStates.get(targetId);
          const isFeature = target.classList.contains("feature-card");
          let hoverScale: number | null = null;
          let hoverY = -8;
          const enter = () => {
            const baseScale = cardState?.baseScale ?? targetMasks[0]?.baseScale ?? 1;
            if (isFeature && hoverScale === null) {
              const style = getComputedStyle(target);
              hoverScale = Number.parseFloat(style.getPropertyValue("--feature-card-scale")) || baseScale;
              hoverY = Number.parseFloat(style.getPropertyValue("--feature-card-lift")) || -8;
            }
            const scale = isFeature ? hoverScale ?? baseScale : 1.02;
            const y = isFeature ? hoverY : -8;
            if (isFeature) {
              gsap.to(target, { "--feature-card-scale": scale, "--feature-card-lift": `${y}px`, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            } else {
              gsap.to(target, { y, scale, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            }
            targetMasks.forEach((maskState) => gsap.to(maskState, { scale, hoverY: y, duration: 0.45, ease: "power3.out", overwrite: "auto", onUpdate: () => renderMaskState(maskState) }));
            if (cardState) gsap.to(cardState, { scale, hoverY: y, duration: 0.45, ease: "power3.out", overwrite: "auto", onUpdate: () => renderOverlapsFor(targetId) });
          };
          const leave = () => {
            const baseScale = cardState?.baseScale ?? targetMasks[0]?.baseScale ?? 1;
            if (isFeature) {
              gsap.to(target, { "--feature-card-scale": baseScale, "--feature-card-lift": "0px", duration: 0.45, ease: "power3.out", overwrite: "auto", onComplete: () => gsap.set(target, { clearProps: "--feature-card-scale,--feature-card-lift" }) });
            } else {
              gsap.to(target, { y: 0, scale: 1, duration: 0.45, ease: "power3.out", overwrite: "auto" });
            }
            targetMasks.forEach((maskState) => gsap.to(maskState, { scale: maskState.baseScale, hoverY: 0, duration: 0.45, ease: "power3.out", overwrite: "auto", onUpdate: () => renderMaskState(maskState) }));
            if (cardState) gsap.to(cardState, { scale: cardState.baseScale, hoverY: 0, duration: 0.45, ease: "power3.out", overwrite: "auto", onUpdate: () => renderOverlapsFor(targetId) });
          };
          target.addEventListener("pointerenter", enter);
          target.addEventListener("pointerleave", leave);
          cleanups.push(() => {
            targetMasks.forEach((state) => gsap.killTweensOf(state));
            if (cardState) gsap.killTweensOf(cardState);
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

      const resizeObserver = new ResizeObserver(scheduleSync);
      scenes.forEach((scene) => {
        resizeObserver.observe(scene);
        scene.querySelectorAll<HTMLElement>("[data-xray-plane], [data-mask-target], [data-overlap-window]").forEach((element) => resizeObserver.observe(element));
      });
      void document.fonts.ready.then(() => { if (!disposed) scheduleSync(); });
      ScrollTrigger.addEventListener("refreshInit", syncAll);
      ScrollTrigger.refresh();

      const maskDebug = new URLSearchParams(window.location.search).get("maskDebug") === "1";
      document.documentElement.toggleAttribute("data-mask-debug", maskDebug);

      const onModal = (event: Event) => {
        const isOpen = Boolean((event as CustomEvent<{ open: boolean }>).detail?.open);
        if (isOpen) lenis.stop(); else lenis.start();
      };
      window.addEventListener("godmode:modal", onModal);

      cleanups.push(() => {
        window.removeEventListener("godmode:modal", onModal);
        document.documentElement.removeAttribute("data-mask-debug");
        ScrollTrigger.removeEventListener("refreshInit", syncAll);
        if (syncFrame) window.cancelAnimationFrame(syncFrame);
        resizeObserver.disconnect();
        revealObserver.disconnect();
        nearObserver.disconnect();
        sectionObserver.disconnect();
        maskStates.clear();
        cardStates.clear();
        overlapStates.clear();
        context.revert();
        gsap.ticker.remove(tick);
        lenis.destroy();
      });
    };

    void start();
    return () => {
      disposed = true;
      cleanups.reverse().forEach((cleanup) => cleanup());
    };
  }, []);

  return null;
}
