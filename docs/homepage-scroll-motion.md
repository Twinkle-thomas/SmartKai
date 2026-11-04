# Homepage scroll motion

Motion for React is installed through the `motion` package. The effects use original SmartKai components and SVG illustrations; no Tara code or assets are used.

## Behaviour

- `HomepageMotion` scopes LazyMotion, reduced-motion configuration and reveal support to the public homepage.
- `Reveal` animates opacity and a restrained 22px entrance translation once per viewport entry. Feature cards, their supporting text and illustrations use short stagger delays. Keyboard focus within a reveal makes it immediately visible.
- The hero product card moves at most 35px and scales down to 0.96 as the hero leaves the viewport. Interactive hero actions are outside that scroll transform.
- At widths of at least 1100px and heights of at least 800px, the feature descriptions scroll past a native CSS sticky preview. Motion scroll values select one of six chapters. Preview changes crossfade with a small translation; the stage uses subtle scale, position and opacity changes.
- The preview and progress markers are decorative (`aria-hidden`), contain no interactive elements and do not create live announcements. All feature descriptions, availability labels and the real personalisation action remain in document order.
- Smaller/shorter screens and reduced-motion users get all six ordinary inline feature sections. Reduced motion disables pinning, parallax and entrance transforms. No IntersectionObserver support also falls back to fully visible inline content.

There is no scroll interception, wheel/touch cancellation, snapping or document scroll lock. Browser history, account controls and questionnaire focus are retained. The viewport model responds to resize and preference updates. Short viewports use the inline layout so tall previews cannot cover other content.

## Performance and structure

Scroll-linked properties are transform/opacity Motion values, without React state updates on each scroll frame. React updates the selected chapter only when its index changes. Preview dimensions stay stable during crossfades. The homepage is lazy-loaded so application/dashboard entry does not need the homepage animation module. Feature definitions are shared through `src/data/features.jsx`, independent of Motion.

This approach does not claim a measured frame rate or device performance guarantee. Native browser checks and the production bundle are used to catch practical regressions.

## Verification

Four animation tests supplement the existing 40 tests: reduced-motion inline visibility and action links, a decorative desktop sticky stage with six descriptions, the small-screen inline fallback, and chapter-boundary/overscroll selection. Media preferences and viewport capability are simulated in these tests; they do not emulate operating-system settings.

Browser checks on 31 October 2026 verified desktop pinning at 1440 × 1000, changing chapter previews while scrolling with a stable stage position, mobile fallback at 390 × 844, no horizontal overflow, keyboard Tab/Enter activation of the personalisation link, and successful scenario G results with focus on the results heading. No browser errors/warnings were captured. These are functional checks, not formal assistive-technology certification.

Use `npm test` and `npm run build` to reproduce automated validation. Food-management rules, database tables and saved assessment formats are unchanged. Planned tools remain marked **In development**.

Official API references: [Motion installation](https://motion.dev/docs/react-installation), [scroll values](https://motion.dev/docs/react-use-scroll), [motion configuration](https://motion.dev/docs/react-motion-config).
