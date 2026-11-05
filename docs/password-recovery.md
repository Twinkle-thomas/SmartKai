# Password recovery

The sign-in form links to `#/forgot-password`. Users submit their own SmartKai email address; the Supabase browser SDK calls `resetPasswordForEmail` with an origin-derived `/?auth=recovery` callback. A generic acknowledgement avoids exposing account existence. Network and rate-limit failures leave the form usable; duplicate in-flight requests are blocked.

Supabase verifies the email link and establishes a session. The recovery query takes precedence over normal token-callback routing, so the user reaches the new-password screen rather than the usual assessment/dashboard redirect. Password changes require a ready authenticated session and matching entries of at least eight characters; server password policies remain authoritative. Missing/expired links lead to requesting another email. API errors clear password inputs. A successful `updateUser` clears callback URL data and offers continuation to the dashboard using the authenticated recovery session. Passwords are never saved in application tables or logged.

The production allowlist includes `https://smartkai.vercel.app/?auth=recovery`; localhost and 127.0.0.1 on ports 5173/5174 are also configured. Existing confirmation callbacks remain. No database migration, admin key or email-template edit is needed. Supabase's configured email provider controls delivery and rate limits.

Automated component tests cover generic requests, duplicate prevention, callback construction/routing, mismatch focus, policy rejection, missing/expired sessions, successful update/URL cleanup and request failures. Existing authentication, account history and household tests remain in the full suite. Real email delivery and the final password change must be exercised by the account holder; development checks do not alter an evaluator's password or send unsolicited email.

Manual check: open the deployed Forgot password page, request an email for your account, open the newest reset link, enter and confirm a new password, then continue to SmartKai. Sign out and sign in again to verify the new password. Do not share reset links or passwords in chat.
