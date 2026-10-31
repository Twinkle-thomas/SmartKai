# Supabase setup: fictional assessments

The database service and evaluator sign-in, save and history controls are implemented. The page also works locally without signing in. Use fictional household data only.

1. Sign in at [Supabase](https://supabase.com/dashboard) and create a project named SmartKai. Choose a region suitable for institutional requirements and store the database password privately.
2. Open the project's SQL Editor. Paste the complete contents of `supabase/migrations/202610310001_fictional_assessments.sql` and run it once. It creates three tables, read policies and a transactional save function. Later changes need new migrations; do not rerun the initial migration on existing tables.
3. Confirm that `households`, `assessments` and `assessment_results` exist with row-level security enabled.
4. Disable public user sign-ups and anonymous sign-ins in Authentication settings. Create your evaluator account through the dashboard's user administration. This login is for the evaluator, not a research participant. Keep its password private.
5. Find the project's URL and publishable API key in its connection/API settings. In PowerShell run:

```powershell
Copy-Item .env.example .env.local
```

6. Replace the two placeholders in `.env.local`. Use the project URL and **publishable** key only. Vite exposes `VITE_` values in browser code. Never use a database password, secret key or service-role key. The file is ignored by Git.
7. Restart `npm run dev`. Scroll to **Evaluator workspace** and sign in with your evaluator email and password. Generate guidance above, then choose **Save assessment**. Configuration and sign-in alone do not save assessments.

## Try the connected interface

1. Sign in as Evaluator A using the account you created in Supabase.
2. Load Fictional Household G and choose View household guidance. Confirm its three profiles.
3. Choose Save assessment once. Wait for the success message and history record.
4. Expand the history record and compare its saved answers, profiles, recommendations and reasons with the current result.
5. Refresh the browser. The working form resets, while the Supabase session restores and saved history reloads.
6. Sign out. History and evaluator details should disappear; local guidance remains usable.
7. Sign in as Evaluator B. A's saved records should be absent. Save a different scenario, sign back in as A and confirm the accounts see only their own records.

The interface prevents repeated saves of the currently saved result and disables saving while a request is in progress. Viewing guidance again creates a new working result that can be saved separately. A timeout has an uncertain outcome: refresh history before retrying, because a server may have completed the save even if the response was lost. There is no automatic retry.

## Storage design

`createAssessmentService(client).save(scores, scenarioId)` validates input and invokes `save_fictional_assessment`. The database checks authentication, five integer scores and scenario consistency, derives results itself, and inserts household/assessment/result rows together. A failure leaves no partial records. Each save creates a separate fictional household snapshot with a generated label.

`list()` returns the 50 most recent accessible assessments with their saved result snapshots. Row-level security limits reads to the evaluator who saved them. Signed-out clients cannot read or save. Signed-in clients cannot write tables directly. The save function uses a fixed search path and gets ownership from the session.

Both SQL and JavaScript encode `provisional-v1`. Update both and version the rules if thresholds or recommendations change. Preserve historic snapshots.

## Live checks still required

Use two evaluator accounts to verify save/reload and isolation in your actual project. Check that signed-out requests fail, invalid answers create no rows, and network failure leaves local results usable. Each intentional save creates a new snapshot; automatic retry and idempotent network recovery are not implemented.

Automated service and local SQL tests cannot verify all hosted settings or network behaviour. A read-only live check confirmed that the configured Auth endpoint responds, public sign-ups are disabled and a signed-out assessment read returns HTTP 401. The developer subsequently reported that authenticated save/reload and two-account isolation passed the supplied browser walkthrough; no evaluator passwords were used by the development agent.

Implementation uses [auth state subscriptions](https://supabase.com/docs/reference/javascript/auth-onauthstatechange). Database requests run outside the subscription callback. The SDK restores its session after refresh. Saved histories clear on sign-out or account change, and responses from the previous workspace are discarded.

References: [client initialisation](https://supabase.com/docs/reference/javascript/initializing), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), [database functions](https://supabase.com/docs/guides/database/functions).
