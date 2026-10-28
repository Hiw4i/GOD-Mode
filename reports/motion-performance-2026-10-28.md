# Scroll performance — 2026-10-28

## Changes

- FEATURES docks in its stable `100svh` scene. Its native bottom-sticky offset compensates the dynamic viewport with `100dvh`, keeping the dock at a constant scene coordinate. Browser toolbar changes no longer trigger synchronous card measurements or a global ScrollTrigger refresh. ResizeObserver still handles real scene/card size changes, including fonts, orientation and changed copy.
- Hero parallax initializes with the other timelines, removing creation and a full refresh from the first scroll event.
- Navigation uses section coordinates cached on ScrollTrigger refresh instead of reading every section's bounding rectangle in each scroll frame.
- Parallax layers are prepared before entering the viewport, with redundant nested card promotion removed. Nearby lazy artwork is explicitly decoded ahead of entry; distant scenes retain lazy loading.
- Grain is rasterized from the existing SVG during asset generation. Large title halos are generated from the local Space Grotesk font as transparent WebP textures, with separate mobile masks. Live HTML text, hover effects, glass, parallax and native mobile scrolling remain.
- Static export configuration and deployment were not changed.

## Reproduction and measurements

Production static export, headless Microsoft Edge, 4× CPU throttling. Mobile viewport: 390×844, DPR 2, touch enabled. Desktop viewport: 1440×900, DPR 1. Each scene is entered and scrolled for 1.6 seconds. The table contains the largest requestAnimationFrame interval in each recorded run, rounded to milliseconds.

| Scene | Mobile before | Mobile after | Desktop before | Desktop after |
|---|---:|---:|---:|---:|
| HOW IT WORKS | 133 ms | 73 ms | 24 ms | 12 ms |
| FEATURES | 42 ms | 42 ms | 30 ms | 12 ms |
| DOWNLOAD | 85 ms | 18 ms | 85 ms | 24 ms |
| SUPPORT | 42 ms | 18 ms | 12 ms | 6 ms |

These are individual lab runs, not guaranteed real-device frame rates or Core Web Vitals. Residual isolated long frames remain in mobile HOW IT WORKS and FEATURES under CPU throttling. No JavaScript page errors occurred in either final run.

Diagnostic tracing isolated the old heading shadows: removing only those shadows reduced the largest RasterTask from about 45 ms to 5 ms in the DOWNLOAD test. The shipped solution retains a baked halo instead of removing the visual effect. A runtime CSS-filter halo was also measured and did not remove the expensive first frame, so it was not shipped.

## Mobile toolbar regression

A browser fixture executes the actual feature-stack module and responsive CSS while keeping the scene's small viewport height constant and changing the dynamic viewport from 844 → 920 → 844 px.

- Original code: dock changes 666.76 → 726.8 px, moving queued cards by about 60 px and refreshing ScrollTrigger.
- Updated code: dock stays at 666.76 px, card displacement remains below 1 CSS px, and no toolbar-triggered refresh occurs.
- A real card height change to 220 px still refreshes geometry correctly.
- Cleanup removes the stack class, observer and pending timer.
- This fixture tests viewport geometry in Chromium; actual toolbar animation should also be checked on the user's phone.

## Public technical references

Reviewed on 2026-10-28. Sources distinguish studio-confirmed technology from implementation ideas; no unverified award or production-stack claims are inferred from appearance.

- [darkroom.engineering work](https://darkroom.engineering/work): the studio identifies Lightfield as Next.js / GSAP / Lenis and Lore as Satus / Next.js / Lenis / GSAP. Its current portfolio shows that these DOM and scroll primitives coexist with optional Three.js scenes where needed.
- [Lenis source and official GSAP integration](https://github.com/darkroomengineering/lenis): one GSAP ticker drives Lenis RAF and synchronizes ScrollTrigger. GOD Mode already used this arrangement; it was retained.
- [Codrops author demo: On-Scroll 3D Stack Motion Effect](https://tympanus.net/codrops/2024/03/06/on-scroll-3d-stack-motion-effect/) and [source](https://github.com/codrops/3DStackMotion/blob/main/js/effect-1/stackMotionEffect.js): inspected scrub-driven transform choreography and visibility callbacks. This is an experimental reference, not evidence of production mobile stability. Its window-height-dependent resize approach was not copied.
- [GSAP ScrollTrigger configuration](https://gsap.com/docs/v3/Plugins/ScrollTrigger/static.config%28%29): `ignoreMobileResize` is intended to avoid jumps caused by recomputing trigger positions during mobile toolbar changes. The original feature-stack listeners bypassed this protection.
- [web.dev animation performance](https://web.dev/articles/animations-and-performance/): compositor-friendly transforms, bounded layer promotion, and avoiding paint/layout work during motion.

## Validation

- `corepack pnpm lint` — passed.
- `corepack pnpm typecheck` — passed.
- `corepack pnpm build` — passed; static export generated.
- Browser regression: toolbar expansion/collapse, changed content height, cleanup — passed. The same fixture fails against the original code.
- Desktop and mobile screenshots inspected; the feature composition and visible card content are retained.
- Design detector: no findings in initial motion targets. Its later scan flags two pre-existing layout transitions (`margin-left` on the intro link arrow and `width` on the availability meter), outside the scroll-entry fixes.
- Production preview: HTTP 200 at `http://localhost:3000`, serving the updated static export. No deployment performed.
