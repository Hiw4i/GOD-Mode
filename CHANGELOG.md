# Changelog

All notable changes to GOD Mode are documented here. The project follows
[Semantic Versioning](https://semver.org/) and the structure from
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [0.3.0] - 2026-08-30

### Changed

- Optimized Features parallax and hover rendering by sharing SVG mask geometry and separating scroll and hover transforms.
- Restored the original blurred modal treatment, layout, and open/close transitions.
- Updated the blurred Download and Support statue artwork.
- Moved the build version into the Support section and removed the standalone footer.

### Fixed

- Kept sharp and blurred Total Focus icons aligned during hover.
- Resynchronized Download and Support card masks when deferred sections enter the viewport.
- Corrected feature copy alignment and modal close-button positioning.

## [0.2.1] - 2026-08-30

### Changed

- Switched mobile and touch devices to native scrolling.
- Smoothed feature-card hover transitions and refined the Features statue parallax.
- Removed the simulated blur overlay between Total Focus and Real Statistics.

## [0.2.0] - 2026-08-30

### Added

- Responsive cinematic landing page with static-export deployment.
- Build metadata endpoint at `/version.json`.

### Changed

- Optimized blur assets, animation stability, mobile behavior, and initial loading.
- Refined the Ambient Soundscapes card and player layout.
