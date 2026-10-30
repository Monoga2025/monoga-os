# Isolated sales runtime diagnostic

`probe.cjs` is a single-use diagnostic harness, not a production test or a security sandbox. It refuses to run when `fictional-sales-fixture.sqlite` already exists, preventing a fresh rerun against reused state.

The recorded final run used an empty environment, a stubbed `dotenv` boundary, blocked provider dependencies, fresh TypeScript transpilation, and fictional SQLite data. It observed root checkout provider `stripe_mock`, nested checkout URL text beginning with `cs_live`, and dry-run status changes from `QUEUED` to `SENT` and `OUTREACH_READY` to `EMAIL_SENT`.

`probe-result.json` is the machine-readable record. No fresh runs are authorized now. The fixture and result do not establish live payment, email delivery, CRM connectivity, or production readiness.
