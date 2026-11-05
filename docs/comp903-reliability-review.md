# COMP903 reliability review — 6 November 2026

This report separates code implementation, automated checks, hosted database checks and actual deployed-browser evidence. Earlier feature-delivery documents describe implementation scope; they do not establish that every deployed workflow was exercised successfully.

## Authentication findings

| Issue | Verified finding / root cause | Files changed and fix | Evidence | Deployment / limitation |
| --- | --- | --- | --- | --- |
| Registration rejection | The logged signup at 19:51 NZDT on 5 November used a reserved `example.com` test address. Auth returned HTTP 400, `email_address_invalid`. This explains that specific request, not all signups. | `src/components/AuthForm.jsx`: safe actionable messages for invalid address, delivery restriction, invalid credentials, network and service failures; registration explains the need for an accessible inbox. | Hosted Auth log; three added error-message tests. No raw account identifiers, passwords or server responses are displayed. | Included in this review's application deployment. Registration with an authorised deliverable mailbox remains to be exercised. |
| Email delivery | Email/password and signups are enabled; confirmation is required. The live bundle contains the matching project URL and publishable key. Custom SMTP is disabled. | No configuration weakened; no confirmation bypass added. | Auth `/settings` HTTP 200 and Supabase dashboard. Default email-service restrictions are documented by Supabase. | Verify delivery to the designated mailbox; configure SMTP if its address is not authorised by the default service. A made-up address cannot establish email verification. |
| Redirects | Site URL is the canonical Vercel URL. Exact `/?auth=confirm` and `/?auth=recovery` callbacks are allowed for production and localhost/127.0.0.1 on ports 5173/5174. | No change required in this review. | Live Supabase URL Configuration read. | Correct configuration alone is not an end-to-end confirmation-email test. |
| Mobile account access | Several media queries hid all header links except the account link, including registration. | `src/styles.css`: phone navigation wraps and keeps registration/sign-in visible. | Source inspection; live viewport check to follow deployment. | Existing design retained; no new menu system. |
| Signed-out labels | Workspace routes labelled the signed-out account link “Your account” and sent it to account history. | `src/components/SiteChrome.jsx`: signed-out main navigation consistently says Sign in and links to login. | Component suite; live route check to follow deployment. | Workspace shells remain accessible while data/mutations require sign-in. |
| Unanswered questions | Native required-radio validation prevented submission but gave no persistent page-level explanation. | `src/components/PracticeForm.jsx`: explicit missing-question summary, focus, question links and inline errors; classification module unchanged. | Existing scenario tests plus explicit summary/focus assertions. | Browser check to follow deployment. |

## Isolation checks

All nine public application tables have RLS enabled. Pantry, shopping, meals, reminders, sharing and inventory events use authenticated ownership predicates; assessment access joins through the owned household. Update policies have ownership checks on both existing and replacement rows. The assessment-save RPC checks authenticated identity and derives result snapshots server-side.

A hosted transaction created temporary synthetic pantry, shopping, meal, assessment/result and inventory-event records, switched to the authenticated role with a different account claim and verified denied cross-account reads, updates/deletes and owner-ID injection. The entire transaction was rolled back. This is a database-role test, not a claim of two separately logged-in browser sessions or token-endpoint testing.

Existing security-advisor notices remain: the automatic-RLS event-trigger function has public execute grants; the intended assessment security-definer RPC is executable by signed-in users; leaked-password protection is disabled. These were not identified as the cause of registration failure. Do not describe the application as security-certified or production-hardened. See [Supabase function advisory guidance](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable) and [password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Deployed-browser verification ledger

| Workflow | Required evidence | Current result |
| --- | --- | --- |
| Registration | Controlled inbox signup, verification email and confirmed session | Awaiting account-holder registration/verification; not marked complete |
| Login / logout / restoration | Sign in, reload, sign out, sign in again; signed-out protected tools | Awaiting authorised demonstration session |
| Pantry | Add/edit/delete synthetic food, refresh and new-login persistence | Awaiting authenticated browser verification |
| Expiry | Recorded use-by/best-before/prepared-on examples, use-soon/passed filters and date labels | Awaiting authenticated browser verification; automated date tests are separate |
| Shopping | Add/edit/purchased state, refresh and new login; pantry comparison/transfer | Awaiting authenticated browser verification |
| Meals | Save/edit/move dated plan, pantry ingredients and shopping addition | Awaiting authenticated browser verification |
| Leftovers | Preparation/storage/planned-use dates, edit and outcomes/history | Awaiting authenticated browser verification |
| Assessment history | Save an assessment, reload, log in again and retrieve the same result | Awaiting authenticated browser verification |

Use only recognisable synthetic entries prefixed `COMP903 QA` and record expected quantities/dates before testing. Preserve existing records. Leave demonstration entries for repeatable evaluation unless the account holder explicitly authorises their removal. Do not substitute privileged database inserts, fake sessions or service-role requests for browser tests.

## Demonstration-account workflow

1. Use an inbox controlled by the project owner; confirm its address is permitted by the configured email provider. Keep household content fictional.
2. The account holder enters a unique SmartKai password in the live registration form and submits it, then opens the verification email themselves. Do not send passwords or reset/verification links in chat.
3. Keep the authenticated live browser tab available for testing. Browser safety requires the account holder to enter new credentials; development does not need to know them.
4. Exercise the ledger with refreshes, then sign out and have the account holder sign in again. A second authorised account is needed for browser-level cross-account testing; otherwise retain the narrower database-role evidence.
5. If SMTP is required, use a configured sender for the project mailbox. Enter any provider secret directly in Supabase; do not commit it or expose it through a Vite environment variable. Do not disable confirmation merely to make a test pass.

## Automated checks and deferred UX work

169 tests passed (20 Node/database/domain and 149 component/service), including the existing eight scenarios and all 243 valid score combinations. Production build passed. These results do not fill the deployed-browser ledger.

The homepage still contains older “tools on the way / taking shape” wording that conflicts with tool links. Align it with verified prototype capabilities after essential workflows are exercised. Consider presentation labels such as Shopping habits, Keeping food visible, Meal planning habits, Making use of leftovers and Storage confidence while retaining the underlying five research category values. No profile renaming or new scroll animation is introduced in this authentication-focused increment. Reduced-motion/browser checks follow critical workflow verification.

Sources: [Supabase Auth errors](https://supabase.com/docs/guides/auth/debugging/error-codes), [default/custom email delivery](https://supabase.com/docs/guides/auth/auth-smtp), [redirect URL configuration](https://supabase.com/docs/guides/auth/redirect-urls).
