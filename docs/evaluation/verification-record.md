# Verification record

Date: 31 October 2026, Pacific/Auckland. Environment: Windows PowerShell, Node.js v24.11.0, npm 11.6.1.

| Command | Observed result |
| --- | --- |
| `npm run evaluate` | PASS: 8/8 fictional scenarios; expected and actual profile lists and recommendation IDs agree |
| `npm test` | PASS: 36 tests total; 14 Node tests (13 domain + one SQL integration), 22 Vitest tests (5 service + 17 interface) |
| `npm run build` | PASS: Vite production bundle generated |
| `git diff --check` | PASS: no whitespace errors; Windows line-ending notices only |
| `git check-ignore .env.local` | PASS: local project connection file is ignored |

The SQL integration test includes 243 answer combinations and rollback after a forced final-insert failure. Interface tests use jsdom; service tests use mocks. Generated scenario evidence is in `scenario-results.csv` and `scenario-results.json`.

Browser workflow results are developer-reported in the [evaluation guide](evaluation-guide.md). Formal usability, screen-reader, viewport and hosted network-failure checks have not been recorded. There are no real household observations or measured food-waste outcomes.

This record accompanies the implementation commit. Use `git log -1 --oneline` or `git rev-parse HEAD` to identify the checked-out revision. Rerun the commands and update the record when evaluating later changes.
