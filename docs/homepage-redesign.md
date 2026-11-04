# Product homepage and application navigation

The homepage uses large typography, whitespace, layered product previews and alternating green/cream sections inspired by Tara's presentation. It uses original SmartKai wording, sustainability colours and code-native SVG food illustrations. No reference-site branding or financial content is reused.

## Routes

The existing Vite application uses lightweight hash navigation, requiring no server-side route fallback or new router dependency:

| URL fragment | View |
| --- | --- |
| `#/` or no fragment | Product homepage; no questionnaire or account form mounted |
| `#features` | Homepage feature showcase |
| `#how-it-works` | Homepage explanation section |
| `#/dashboard` | Application overview, feature availability, existing authentication and history |
| `#/personalisation` | Existing questionnaire, results and account/save controls |
| `#/account` | Existing sign-in, save and history controls |

Old `#assessment`, `#guidance` and `#evaluator-workspace` links resolve to the appropriate application views. Unknown routes show a recovery page. The skip link moves focus into the current main content. Application route changes update the page title and focus; browser back/forward updates the view.

Assessment state remains in App while navigating views and resets on browser refresh, as before. The Supabase SDK still restores the authenticated session. Existing saved records and their schema are unchanged. Authentication continues to use existing accounts; this increment does not enable public registration.

## Availability and honest previews

Pantry Management, Meal Planning, Shopping Lists, Leftovers and dedicated Storage Guidance tools are each marked **In development**, and each mockup is labelled a concept preview. Their controls are non-interactive presentation elements. No inactive tool is offered as a working route.

Personalised Recommendations is marked **Available now** and links to the working questionnaire. Example recommendation previews are generated from existing synthetic scenario G using the existing rules. Examples and catalogue-like food illustrations are not actual inventory, measured outcomes or customer records. General storage recommendation text remains functional even though the storage tool is planned.

The requested hero slogan is product positioning, not a measured outcome. No testimonials, impact metrics or evidence of actual waste reduction have been added. Development and evaluation remain limited to synthetic household scenarios as specified in the research documentation.

## Components and styling

- `SiteChrome`: shared brand, header and footer.
- `HomePage` and `LandingHero`: homepage presentation and calls to action.
- `FeatureShowcase`: reusable feature sections and viewport reveal behaviour.
- `ProductPreview`: six distinct, non-interactive application previews and reusable SVG produce.
- `Dashboard`: overview of available guidance, history and planned tools.
- `navigation.js`: route resolution and hash-change subscription.

Tailwind and the existing CSS tokens remain the styling system. Reduced-motion CSS removes reveal/intro animation and hover movement; the reveal observer also checks the preference before starting. Content stays visible when IntersectionObserver is unavailable. Native inputs, semantic headings, labelled sections and keyboard focus indicators are retained.

## Verification

All 36 original tests remain, with their initial URL setup adjusted to open the assessment view intentionally. Four additional tests cover homepage separation, development labels, working route actions, retained assessment answers, account navigation, legacy links and unknown-route recovery.

Browser checks on 31 October 2026 covered desktop 1440px and phone 390px/320px widths, no horizontal page overflow, no questionnaire on the homepage/dashboard, intentional assessment opening, scenario G's three expected profiles, results focus and no captured console errors. These do not constitute formal accessibility certification or a fresh authenticated hosted security review.

Run `npm test` and `npm run build`. The original eight synthetic scenarios and all 243 valid score-combination checks remain included in the regression suite.
