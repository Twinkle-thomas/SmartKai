# Registration and login

## Implemented interface

- `#/register`: email, password, password confirmation and a show/hide control.
- `#/login`: dedicated email/password sign-in page.
- Header links provide Sign in and Get started. Inline account sign-in remains available on existing application views.
- `AuthForm` is reused by dedicated pages and the existing account/history component.
- Registration requires at least eight characters and matching passwords; Supabase can impose stronger requirements. Passwords are cleared after submitted requests and never written to application tables or logs.
- Pending requests disable submission. Errors cover unavailable registration, unconfirmed email, rate limiting and failed requests without displaying raw server details.
- With confirmation enabled, registration shows a check-inbox state rather than claiming that the account is signed in. Existing-address handling uses neutral wording.
- A registration response with a session continues to personalisation. Dedicated login returns to the dashboard. Inline sign-in preserves the current assessment view.
- Existing sessions restore through Supabase's auth events. Confirmation returns lead to personalisation once a session is available. Callback parameters are removed after the session is established. Invalid/expired confirmation links show a recovery message.

There are no changes to profile rules, database migrations, ownership policies or existing saved records. No real participant or household data is required. Public deployment/recruitment and password recovery are outside this increment. The dashboard and assessment retain existing preview access; database reads/writes still require authentication and RLS authorisation.

## Required Supabase project configuration

A read-only check on 31 October 2026 found email authentication enabled, **new sign-ups disabled** and **email confirmation enabled**. The code cannot override that setting. No hosted settings were changed and no account or email was created/sent by the agent.

To test registration:

1. In the SmartKai Supabase project, open Authentication's user-sign-up configuration and enable **Allow new users to sign up**, then save. Keep anonymous sign-ins off and Confirm email on.
2. Under Authentication → URL Configuration, use the current local base URL as the development Site URL, for example `http://127.0.0.1:5174/`.
3. Add the exact confirmation return URL `http://127.0.0.1:5174/?auth=confirm` to Redirect URLs. If using Vite at `http://localhost:5173/`, also add `http://localhost:5173/?auth=confirm`. The code builds this URL from the app's current origin and pathname. These hosts are distinct, so open the confirmation link on the same development origin used to register.
4. Configure email delivery. Supabase's built-in sender is restricted to project-team addresses; configure custom SMTP to confirm other test addresses. Keep sender credentials in Supabase, never in `VITE_` variables or source files.
5. Open `#/register`, use an email address you control and a unique password, and submit. Open the confirmation email, then verify that the app establishes a session and opens personalisation. Already confirmed accounts can use `#/login` immediately.

Use a dedicated test project or a deliberately restricted demonstration environment for academic evaluation. Enabling registration does not require weakening table policies or sharing a service-role key. Configure production URLs and delivery separately before any later deployment.

## Live walkthrough still required

After project settings are configured, verify registration → email confirmation → personalisation, sign out → login → dashboard, session restoration after refresh, save/reload, and separation between two controlled accounts. Keep passwords and confirmation links private.

Automated tests mock Supabase Auth and cover registration payloads, confirmation state, mismatched passwords, disabled sign-ups, immediate-session registration, dedicated login navigation, restored sessions, callback cleanup, expired links and missing configuration. Existing storage and profiling tests are retained. Browser layout checks do not establish hosted account-creation or email-delivery success.

References: [Supabase signUp](https://supabase.com/docs/reference/javascript/auth-signup), [redirect URLs](https://supabase.com/docs/guides/auth/redirect-urls), [general Auth settings](https://supabase.com/docs/guides/auth/general-configuration), [SMTP restrictions and setup](https://supabase.com/docs/guides/auth/auth-smtp).
# New and returning account journeys

After a dedicated sign-in, registration with an immediate session, or an email-confirmation return, SmartKai checks the signed-in account's saved assessments using the existing RLS-protected history service. No saved assessments opens personalisation; at least one saved assessment opens the dashboard. This is an onboarding proxy, not a registration-date check: someone who has not saved an assessment will continue to see the questions on their next dedicated sign-in. Saving remains explicit.

The signed-in dashboard shows the latest saved assessment (expand to view profiles and recommendations), links to full history and a new assessment, and retains the development labels for planned tools. A failed history check opens the dashboard with a retry action rather than incorrectly assuming the account is new. Signed-in navigation uses Your account and Go to dashboard on the public homepage as well as application pages. Inline sign-in stays on the current assessment to preserve unsaved work.

Session subscription is shared across the application; history requests run outside the auth callback and ignore responses after unmount or account changes. No database migration or Supabase setting change is required.

