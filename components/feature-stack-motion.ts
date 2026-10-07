import type { ScrollTrigger } from "gsap/ScrollTrigger";

// Native bottom-sticky positioning holds the stack during compositor scrolling.
// Cards stick within .feature-stack-range (a flex wrapper starting at the
// first card's natural position), so they cannot dock early over the FEATURES
// backdrop while the section is still entering: the first card reaches the
// dock exactly when the sticky statue settles behind it (spacer == dock).
// JS only updates scale/depth; all layout reads happen on refresh.
export function createFeatureStack(
  section: HTMLElement,
  cards: HTMLElement[],
  scrollTrigger: typeof ScrollTrigger,
) {
  let viewportHeight = 0;
  let dock = 0;
  let unfoldDistance = 0;
  let refreshTimer = 0;
  const items = cards.map((card, index) => ({ card, top: 0, height: 0, index, transform: "", opacity: "" }));

  const measure = () => {
    // Read normal-flow coordinates rather than the sticky-adjusted offsetTop.
    section.classList.remove("features-stack");
    viewportHeight = window.innerHeight;
    dock = viewportHeight * 0.79;
    unfoldDistance = viewportHeight * 0.28;
    // In stack layout the spacer (== dock) replaces the normal-flow top
    // padding, so shift the measured tops to match the stuck layout exactly.
    const cardsBox = section.querySelector<HTMLElement>(".feature-cards");
    const flowShift = dock - (cardsBox ? parseFloat(getComputedStyle(cardsBox).paddingTop) || 0 : 0);
    items.forEach((item) => {
      let top = 0;
      let element: HTMLElement | null = item.card;
      // offsetTop ignores the stack's transforms, including during resize.
      while (element) {
        top += element.offsetTop;
        element = element.offsetParent as HTMLElement | null;
      }
      item.top = top + flowShift;
      item.height = item.card.offsetHeight;
    });
    section.style.setProperty("--stack-bottom", `${viewportHeight - dock}px`);
    // Spacer height equals the dock so the first card arrives at the dock
    // exactly when the section content reaches the stuck statue (scroll-up
    // no longer leaves the stack floating above the statue's neck).
    section.style.setProperty("--stack-spacer", `${dock}px`);
    items.forEach(({ card, height }) => {
      card.style.setProperty("--stack-card-height", `${height}px`);
    });
    section.classList.add("features-stack");
  };

  const render = (scroll: number) => {
    const firstQueued = items.findIndex((item) => item.top - scroll >= dock);
    const first = items[firstQueued];
    const previous = items[firstQueued - 1];
    const queueFraction = first
      ? Math.min(1, (first.top - scroll - dock) / (previous ? first.top - previous.top : unfoldDistance))
      : 0;

    items.forEach((item) => {
      const { card, top, height, index } = item;
      const naturalTop = top - scroll;
      const progress = Math.min(1, Math.max(0, (dock - naturalTop) / unfoldDistance));
      const eased = 1 - Math.pow(1 - progress, 3);
      const depth = firstQueued < 0 ? 0 : Math.max(0, index - firstQueued + queueFraction);
      const scale = progress > 0 ? 0.76 + 0.24 * eased : 0.76 - Math.min(depth, 3) * 0.055;
      const y = naturalTop >= dock ? Math.min(depth, 3) * 14 : 0;
      const opacity = Math.min(1, Math.max(0, 3 - depth));
      const visualTop = Math.min(naturalTop, dock) + y;
      const visible = opacity > 0 && visualTop < viewportHeight && visualTop + height * scale > 0;

      const transform = progress === 1 ? "none" : `translateY(${y.toFixed(2)}px) scale(${scale.toFixed(4)})`;
      if (opacity > 0 && transform !== item.transform) {
        card.style.transform = transform;
        item.transform = transform;
      }
      const opacityValue = String(opacity);
      if (opacityValue !== item.opacity) {
        card.style.opacity = opacityValue;
        item.opacity = opacityValue;
      }
      card.toggleAttribute("data-stack-visible", visible && progress < 1);
      card.toggleAttribute("data-stack-queued", progress === 0);
    });
  };

  cards.forEach((card, index) => { card.style.zIndex = String(cards.length - index); });
  measure();
  const trigger = scrollTrigger.create({
    trigger: section,
    start: "top bottom",
    end: "bottom top",
    onUpdate: (self) => render(self.scroll()),
    onRefresh: (self) => { measure(); render(self.scroll()); },
  });
  render(trigger.scroll());

  // Keyboard navigation brings a queued control into the readable list.
  const onFocus = (event: FocusEvent) => {
    const item = items.find(({ card }) => card.contains(event.target as Node));
    if (!item || !item.card.hasAttribute("data-stack-queued")) return;
    window.scrollTo({ top: item.top - viewportHeight * 0.4, behavior: "instant" });
    render(window.scrollY);
  };
  section.addEventListener("focusin", onFocus);

  // Mobile browser chrome showing/hiding changes the viewport height without
  // firing ScrollTrigger's resize handling (ignoreMobileResize). Bottom
  // offsets are viewport-relative, so re-measure live to keep the dock glued
  // to the statue's neck; the full refresh is debounced.
  const scheduleRefresh = () => {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(() => scrollTrigger.refresh(), 160);
  };
  const onViewportChange = () => {
    measure();
    render(window.scrollY);
    scheduleRefresh();
  };
  window.visualViewport?.addEventListener("resize", onViewportChange);
  window.addEventListener("resize", onViewportChange);

  return () => {
    window.visualViewport?.removeEventListener("resize", onViewportChange);
    window.removeEventListener("resize", onViewportChange);
    window.clearTimeout(refreshTimer);
    trigger.kill();
    section.removeEventListener("focusin", onFocus);
    section.classList.remove("features-stack");
    section.style.removeProperty("--stack-bottom");
    section.style.removeProperty("--stack-spacer");
    cards.forEach((card) => {
      card.style.removeProperty("transform");
      card.style.removeProperty("opacity");
      card.style.removeProperty("z-index");
      card.style.removeProperty("--stack-card-height");
      card.removeAttribute("data-stack-visible");
      card.removeAttribute("data-stack-queued");
    });
  };
}
