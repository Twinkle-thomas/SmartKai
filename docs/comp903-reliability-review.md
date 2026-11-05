# COMP903 reliability review — 6 November 2026

This report separates code implementation, automated checks, hosted database checks and actual deployed-browser evidence. Earlier feature-delivery documents describe implementation scope; they do not establish that every deployed workflow was exercised successfully.

## Authentication findings

| Issue | Verified finding / root cause | Files changed and fix | Evidence | Deployment / limitation |
| --- | --- | --- | --- | --- |
| Registration rejection | The logged signup at 19:51 NZDT on 5 November used a reserved `example.com` test address. Auth returned HTTP 400, `email_address_invalid`. This explains that specific request, not all signups. | `src/components/AuthForm.jsx`: safe actionable messages for invalid address, delivery restriction, invalid credentials, network and service failures; registration explains the need for an accessible inbox. Generic validation errors do not assume the email is the cause. | Hosted Auth log; four error-message cases. No raw account identifiers, passwords or server responses are displayed. | Deliverable project mailbox subsequently confirmed by account holder; authenticated browser observed. New-credential/email verification steps were performed by the owner. |
| Email delivery | Email/password and signups are enabled; confirmation is required. The live bundle contains the matching project URL and publishable key. Custom SMTP is disabled. | No configuration weakened; no confirmation bypass added. | Auth `/settings` HTTP 200 and Supabase dashboard. Account holder subsequently reports email verified; confirmed account and browser sign-in observed. | This project mailbox works for the tested flow. Delivery to arbitrary external addresses is not established; default service restrictions remain relevant. |
| Redirects | Site URL is the canonical Vercel URL. Exact `/?auth=confirm` and `/?auth=recovery` callbacks are allowed for production and localhost/127.0.0.1 on ports 5173/5174. | No change required in this review. | Live Supabase URL Configuration read. | Correct configuration alone is not an end-to-end confirmation-email test. |
| Mobile account access | Several media queries hid all header links except the account link, including registration. | `src/styles.css`: phone navigation wraps and keeps registration/sign-in visible. | Live 390px viewport: Sign in and Get started both visible; content and viewport widths both 375px (no horizontal overflow). | Verified in deployment `777a678`; existing design retained. |
| Signed-out labels | Workspace routes labelled the signed-out account link “Your account” and sent it to account history. | `src/components/SiteChrome.jsx`: signed-out main navigation consistently says Sign in and links to login. | Live deployed registration/personalisation/pantry header and mobile check. | Verified in deployment `777a678`; workspace shells remain accessible while data/mutations require sign-in. |
| Unanswered questions | Native required-radio validation prevented submission but gave no persistent page-level explanation. | `src/components/PracticeForm.jsx`: explicit missing-question summary, focus, question links and inline errors; classification module unchanged. | Existing scenario tests, summary/focus assertions and live blank submission: five missing questions listed with inline guidance. | Verified in deployment `777a678`; authenticated saving remains separately unverified. |

## Isolation checks

All nine public application tables have RLS enabled. Pantry, shopping, meals, reminders, sharing and inventory events use authenticated ownership predicates; assessment access joins through the owned household. Update policies have ownership checks on both existing and replacement rows. The assessment-save RPC checks authenticated identity and derives result snapshots server-side.

A hosted transaction created temporary synthetic pantry, shopping, meal, assessment/result and inventory-event records, switched to the authenticated role with a different account claim and verified denied cross-account reads, updates/deletes and owner-ID injection. The entire transaction was rolled back. This is a database-role test, not a claim of two separately logged-in browser sessions or token-endpoint testing.

Anonymous Data API reads using the deployed publishable configuration returned HTTP 401 / PostgreSQL `42501` for pantry, shopping, meal plans, assessments, assessment results, inventory events and sharing. Live signed-out Pantry showed a sign-in action rather than saved inventory or editing controls.

Existing security-advisor notices remain: the automatic-RLS event-trigger function has public execute grants; the intended assessment security-definer RPC is executable by signed-in users; leaked-password protection is disabled. These were not identified as the cause of registration failure. Do not describe the application as security-certified or production-hardened. See [Supabase function advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Deployed-browser verification ledger

| Workflow | Required evidence | Current result |
| --- | --- | --- |
| Registration | Controlled inbox signup, verification email and confirmed session | Account holder reports email verified; hosted account is confirmed; subsequent live browser is authenticated. Email-entry/delivery steps were performed by the account holder, not independently observed. |
| Login / logout / restoration | Sign in, reload, sign out, sign in again; signed-out protected tools | Passed for controlled account: initial login led to assessment; refresh restored session; Log out returned home; pantry hid all records/editing controls; owner signed in again and returning dashboard restored saved guidance. |
| Pantry | Add/edit/delete synthetic food, refresh and new-login persistence | Passed tested flow: Rice added at 500 g, edited to 400 g and persisted after refresh and new login. Old milk deleted with explicit account-holder permission and absent after new login. Apples4, Soup2 and Bread1 also restored. |
| Expiry | Recorded use-by/best-before/prepared-on examples, use-soon/passed filters and date labels | Passed tested examples, NZ 6 November: Rice best-before 8 November shows two days and Due soon; milk use-by 5 November shows passed one day and Do not eat warning under Date passed; soup prepared 6 November has no inferred expiry. Dedicated tracker: Bread best-before 6 November shows Today; calendar puts Bread on6 and Rice on8. Food dates persisted across new login. |
| Shopping | Add/edit/purchased state, refresh and new login; pantry comparison/transfer | Live: pictured Apples selection populated Fruit; QA Apples added as 3 items/NZD4.50, edited to 4 and purchased; refresh retained state. Reviewed transfer created 4 items in Fridge; refresh retained transfer marker and pantry comparison. New login retained both shopping entries, purchased state and transfer marker. |
| Meals | Save/edit/move dated plan, pantry ingredients and shopping addition | Live: QA Rice dinner saved for Friday/2 portions with Rice and Soup inserted from pantry; edited to Saturday/3 portions with leftover flag. Refresh retained details; pantry remained Rice400g/Soup2 portions. Missing-ingredient action reported QA Carrots200g added to shopping; destination shows QA Carrots200g with meal/date note; new login retained Saturday/3 portions/leftover flag and pantry ingredient notes. |
| Leftovers | Preparation/storage/planned-use dates, edit and outcomes/history | Passed tested flow: Soup created at 2 portions with prepared/stored 6 November and planned use 7 November, edited to 3; one portion recorded Used leaves 2 with saved outcome history. Dedicated leftover route displays only Soup. New login restored dates, quantity and the 1-portion Used event. Whole-entry discard/freeze not exercised in this live run. |
| Assessment history | Save an assessment, reload, log in again and retrieve the same result | Passed: Household G saved at 12:26 NZDT; account route retrieved Often/Often/Never/Sometimes/Often and Overbuyer/Food Forgetter/Storage Learner with three recommendations. Full refresh retained record; new login dashboard retrieved the same answers/profiles/recommendations. |

Use only recognisable synthetic entries prefixed `COMP903 QA` and record expected quantities/dates before testing. Preserve existing records. Leave demonstration entries for repeatable evaluation unless the account holder explicitly authorises their removal. Do not substitute privileged database inserts, fake sessions or service-role requests for browser tests.

## Demonstration-account workflow

1. Use an inbox controlled by the project owner; confirm its address is permitted by the configured email provider. Keep household content fictional.
2. The account holder enters a unique SmartKai password in the live registration form and submits it, then opens the verification email themselves. Do not send passwords or reset/verification links in chat.
3. Keep the authenticated live browser tab available for testing. Browser safety requires the account holder to enter new credentials; development does not need to know them.
4. Exercise the ledger with refreshes, then sign out and have the account holder sign in again. A second authorised account is needed for browser-level cross-account testing; otherwise retain the narrower database-role evidence.
5. If SMTP is required, use a configured sender for the project mailbox. Enter any provider secret directly in Supabase; do not commit it or expose it through a Vite environment variable. Do not disable confirmation merely to make a test pass.

## Automated checks and deferred UX work

170 tests passed (20 Node/database/domain and 150 component/service), including the existing eight scenarios and all 243 valid score combinations. Separate evaluation command passed 8/8 scenarios. Production build passed. These results do not replace the deployed-browser ledger.

Application fixes were pushed as commit `777a678`; Vercel deployment `smartkai-etq5lsibw-twinklethomas-projects.vercel.app` reached Ready and was promoted to `https://smartkai.vercel.app`. Later ledger/report updates do not imply a completed authenticated test.

The authenticated browser ledger was exercised against that production release. Follow-up changes are limited to safe error wording and the account/results/homepage copy listed below; no schema or workflow logic changed. Follow-up production deployment status will be appended after verification.

### Follow-up UX findings and fixes

| Finding | Files changed / fix | Validation and limit |
| --- | --- | --- |
| Signed-in account/results still instructed the user to sign in | `src/App.jsx`: session-aware account introduction. `src/components/Results.jsx`: saving instructions describe the action and account requirement without incorrectly asserting the user is signed out. | Seen during live history test; full suite/build pass. Follow-up deployment verification recorded below. |
| Homepage described core tools as still on the way while linking to available tools | `src/components/LandingHero.jsx`, `src/components/FeatureShowcase.jsx`: describe the verified pantry, shopping, meal and guidance workflow. | Copy-only change preserves previews, feature status labels, navigation and design. |
| Generic Auth validation could be incorrectly described as invalid email | `src/components/AuthForm.jsx`, `tests/auth.ui.test.jsx`: distinguish general form validation from `email_address_invalid`. | Four safe error-code cases, raw server details remain hidden. |

Neutral presentation labels were considered: Shopping habits, Keeping food visible, Meal planning habits, Making use of leftovers and Storage confidence. Research categories, saved values and rule logic remain unchanged to preserve evaluation comparability. Renaming is optional future presentation work.

Existing motion respects `useReducedMotion`/`MotionConfig reducedMotion="user"`; reduced mode renders six inline sections with no pinned preview. The existing motion tests passed for reduced-motion, roomy and small layouts. No new elaborate animation was needed for reliability; OS-level reduced-motion and a full mobile device matrix were not independently exercised in this live run.

Sources: [Supabase Auth errors](https://supabase.com/docs/guides/auth/debugging/error-codes), [default/custom email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
