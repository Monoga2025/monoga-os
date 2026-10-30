# Admin Dashboard Engineering Proposal — 2026-09-27

> **Status: FOR REVIEW ONLY — NOT APPROVED FOR IMPLEMENTATION.** This is engineering research, not an accepted specification, delivery plan, dependency choice, or evidence of sales readiness. Human approval of the concept, written-spec review, then an approved implementation plan and execution method remain required.
## Scope update — user correction

The user’s actual product intent is a cross-project, personalized Monoga OS ERP/knowledge hub: work, projects, YouTube and prior work, plus commercial AI, are first-class domains. This document remains a **sales-domain proposal only**, not a complete ERP design; its proposed `09_AUTO_REVENUE_ENGINE` owner has no authority over the whole ERP. YouTube is not “later”; that sequence was an unaccepted recommendation, not user direction.

A future central catalog/search/dashboard may index domain-owned records through adapters without forcing every database or file into one copy. That design is not approved and requires scope clarification before a new ERP specification or plan. This correction does not permit reading or ingesting `06_ADMIN_Y_FINANZAS`, secrets, production databases, or other private data; autonomous sending, spending, publishing, installs, and runtime changes remain out of scope. Finance/privacy exclusions need an explicit decision; JEV remains deferred.

## Purpose, evidence boundary, and current state

The proposed dashboard would help an **Operator** take a commercial item through a governed workflow without treating a queued email, URL, log, or demo as a sale. The verified current dashboard is a Node HTTP string-template that reads `09_AUTO_REVENUE_ENGINE/orchestrator/revenue_engine.db` read-only and displays `prospects`, `outreach_emails`, and `generated_websites` (`dashboard/server.js:7,17-24`). It has navigation/modal/payment-link actions, not a canonical API. Its test script intentionally fails and it declares only `better-sqlite3` (`dashboard/package.json:6-16`). Existing dependency directories are evidence of local presence, not a dependency decision or installed-runtime guarantee.

Current writers conflict: `MasterRevenueOrchestrator` statically imports nested `sales_engine/src` services (`orchestrator/src/MasterRevenueOrchestrator.ts:3-8`); root services, `EmailDispatcher`, and `autonomous_daemon.mjs` can write statuses directly. The daemon marks `SENT` and `EMAIL_SENT` without transport evidence (`autonomous_daemon.mjs:23-30`). Isolated fictional-fixture evidence showed root checkout `stripe_mock`, nested checkout URL-string construction, and dry-run status mutation; it did not test a real provider, payment, delivery, or customer record. No current intake endpoint or browser-to-canonical-write contract exists; public forms open WhatsApp only.

This proposal preserves the distinction between **observed**, **simulated**, **unknown**, and **verified**. It does not assign a person as owner, promise a price, count, launch date, or claim a working machine.

## Unaccepted architecture hypothesis

**Local single-owner first** is the recommended *hypothesis*: one modular `09_AUTO_REVENUE_ENGINE` Node/TypeScript domain/API process owns a single explicitly configured SQLite path and schema migration history. All Master, nested/root compatibility code, daemon, and dispatcher raw writes would converge behind that owner before a cutover; they would not run in parallel as competing status authorities. SQLite WAL can support readers with a single writer on the same host; it does not eliminate the need for that boundary. [SQLite WAL](https://sqlite.org/wal.html) documents the same-host and single-writer constraints. Consistent backup/restore and migrations must be validated before cutover; SQLite provides a backup API for consistent copies. [SQLite Backup API](https://sqlite.org/backup.html)

A React/TypeScript/Vite frontend is a candidate, not a selected stack: React documents a from-scratch application route and Vite is a reasonable candidate for that route. [React: build from scratch](https://react.dev/learn/build-a-react-app-from-scratch) Fastify is a candidate for JSON-schema validation/serialization; native `http` keeps the dependency surface smaller. No dependency is chosen, pinned, installed, or required here. If Fastify is selected later, schemas remain application code—not LLM- or user-accepted contracts. [Fastify validation and serialization](https://fastify.dev/docs/latest/Reference/Validation-and-Serialization/)

```text
React containers -> /api/v1 -> domain commands/queries -> SQLite owner
      |                 |              |                  |
      | validated VMs   | receipts      +-- audit/event/outbox (atomic)
      +-- presentation  +-- provider callbacks (separate signed boundary)

legacy Master / daemon / dispatcher ----> adapter commands ----> same owner
12/13 / Twenty projection --------------> adapters only, no new microservices
```

`12_LA_GROWTH_STUDIO` and `13_SALES_ENGINE` remain adapters/inputs, not services to deploy. Agency prospects and merchant customers remain separate records. This design does not introduce Jarvis unrestricted tools.

## Dashboard information architecture and wireframe

Containers own queries, URL filters, refetching, and form state. Presentation components receive only validated view models; never SQLite handles, filesystem paths, keys, shell commands, or provider objects.

```text
[Operator]  Today | Research | Pipeline | Proposals | Payments | Delivery | Audit
---------------------------------------------------------------------------------
Today: next safe action | blockers | command receipt status | freshness
Research: reviewed sources (NOT send volume) | consent | dedupe | suppression
Pipeline: qualification | demo | draft | approval | authorized dispatch
Proposals: exact offer/demo/copy binding | approval state | invalidation reason
Payments: checkout issued | provider/manual evidence | collection/settlement/dispute
Delivery: scope | acceptance | support | measured outcome
Audit: event timeline | evidence aliases | actor/command/version
Later, read-only: Projects & Agents; Content Studio (10–20+ minute personal-brand work)
```

The later Content Studio can track real client-case evidence, SolidWorks/Blender assets, scripts, evidence and thumbnail review. A future `codex.exe` job is only a future option and is not executed here. “Java” versus “JavaScript” remains unresolved. The interface must label all fictional examples as fictional and not surface alleged revenue, arbitrary `$199/$499` prices, or fabricated counts.

## Data, truth, and command contracts

Every commercial aggregate carries distinct fields:

| Field | Meaning |
|---|---|
| `workflowState` | Controlled process position, never a payment/delivery assertion |
| `truthState` | `UNKNOWN`, `SIMULATED`, or `VERIFIED` evidence classification |
| `mode` | `LIVE`, `SIMULATION`, or `LEGACY_UNKNOWN` |
| `authority` | Evidence provenance: `sourceSystem`, safe `sourceRecordId`, `observedAt`, `freshness` (`CURRENT`, `STALE`, `UNAVAILABLE`, `UNKNOWN`), `evidenceRefs` |
| `allowedActions`, `blockers`, `version` | Server-owned capabilities, business blockers, and aggregate concurrency version |

Browser aliases must not reveal absolute paths. Legacy data is quarantined as `LEGACY_UNKNOWN`; it is never bulk-promoted to verified. `checkoutIssued` is not paid. Payment separately records collected, settlement, refund, and dispute, with integer minor units plus currency. A manual payment attachment remains manual until a selected, audited review policy says otherwise; a file upload cannot self-mark `VERIFIED`.

All proposal endpoints are rooted at `/api/v1` (the proposed frontend `/v1` prefix is rejected):

```text
GET  /api/v1/today | /research | /opportunities | /evidence | /jobs | /integrations
POST /api/v1/intakes | /source-observations | /drafts | /approvals | /suppressions
POST /api/v1/dispatch-intents | /orders | /checkouts | /manual-payment-evidence | /acceptances
GET  /api/v1/commands/:commandId
POST /api/v1/provider-callbacks/:provider   # signed provider-to-server boundary
```

Representative proposed route contract (all names and example values below are fictional):

| Route | Effect and preconditions | Result/error |
|---|---|---|
| `GET /api/v1/today` | Read operator view model; owner session required | `200`; `503` if canonical store unavailable |
| `POST /api/v1/intakes` | Valid source + consent/dedupe policy; no client status override | `201` intake or `422` blocker |
| `GET /api/v1/opportunities/:id` | Read safe alias/view model | `200`, `401/403`, or `404` |
| `POST /api/v1/drafts` | Qualified opportunity and version required | `201` draft or `409` version conflict |
| `GET /api/v1/drafts/:id` | Retrieve exact immutable draft binding | `200` or `404` |
| `POST /api/v1/approvals` | Draft, recipient, channel, copy hash, offer/demo versions match | `201` approval or `422` blocker |
| `POST /api/v1/dispatch-intents` | Valid approval, suppression recheck, command identity/key | `202` accepted internal job, not external delivery proof |
| `GET /api/v1/commands/:commandId` | Read server-bound receipt | `200` or `404 COMMAND_NOT_FOUND` |

`400` means malformed input; `401/403` means absent/insufficient authority; `409` is a version or idempotency conflict; `422` is a valid request blocked by business rules; `503` means an unavailable dependency. A `202` only acknowledges internal receipt/job creation, never a verified provider outcome.

The logical model is deliberately richer than the current three SQLite tables. It is a proposed relationship, not a migration:

```text
Business --has--> Opportunity --uses--> Evidence
                    |
                    +--> Proposal --requires--> Approval
                    |                         |
                    +--> Order <--authorized--+
                           |
                           +--> Checkout --> PaymentEvent
                           |
                           +--> Delivery --> Acceptance

Jobs and Audit events attach to every command/aggregate above; neither
an Evidence row nor a Job completion changes commercial truth by itself.
```

No generic `PATCH` can set `PAID` or `SENT`. The client proposes a UUID `commandId` and an `idempotencyKey`; the server validates the UUID, binds both to its authenticated actor and command namespace, and persists the first receipt in the transaction. The client never supplies actor identity or a status override. Same command/key with a different payload returns `409 IDEMPOTENCY_CONFLICT`; stale `expectedVersion` returns `409` and the client refetches. No optimistic commercial-status update is allowed. After timeout, the client queries `GET /api/v1/commands/:commandId`: internal `PENDING` differs from external-effect `UNKNOWN`; `404 COMMAND_NOT_FOUND` is not an outcome failure. Only the same stable key and identical payload may be retried after the reconciliation policy permits it—never a new-key resend.

```jsonc
// Fictional request
{"commandId":"550e8400-e29b-41d4-a716-446655440000","idempotencyKey":"fictional-key-001","expectedVersion":4}
// Fictional result
{"commandId":"550e8400-e29b-41d4-a716-446655440000","status":"PENDING","allowedActions":["read"],"blockers":["approval_required"],"version":5,"mode":"SIMULATION","truthState":"UNKNOWN","authority":{"sourceSystem":"fictional-fixture","sourceRecordId":"example-001","observedAt":"2026-09-27T00:00:00Z","freshness":"STALE","evidenceRefs":[]}}
```

A transaction atomically stores domain state, audit/event, outbox, and receipt; external calls run outside it with leases, bounded retry, and `UNKNOWN` reconciliation—never an exactly-once claim.

Approval binds recipient, channel, copy hash, offer version, and demo artifact. Any edit invalidates it. Approval never sends; execution rechecks permission and suppression immediately before dispatch. Signed provider callbacks are not browser sessions: they verify account, mode, currency, amount, order binding, signature, and deduplication.

## Operator journey and safety gates

```text
reviewed source -> intake -> qualification -> draft -> approval
-> authorized dispatch -> issued checkout -> evidence collection
-> scope fulfillment -> delivered -> accepted -> outcome report
```

Research target “50 reviewed” means reviewed public research, **not** 50 sends. No action crosses an unconfigured provider, missing consent, suppression, unapproved offer, missing demo, or unknown command result. A Twenty adapter projects a canonical state outward only after the canonical write; it is not the owner.

The API binds locally to loopback by default with owner authentication. Node’s `server.listen` host selection must be explicit rather than relying on unspecified binding behavior. [Node `server.listen`](https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback) The proposed local bootstrap is a one-time owner-process generated code, not logged; it establishes an HttpOnly, SameSite session. Remote exposure would require HTTPS secure cookies and a future detailed auth spec. Host/origin/CSRF checks apply to browser mutations. Secrets remain server-owned and absent from reports. Request bodies have limits; public-research URLs require validated HTTPS, while action URLs use an allowlist. No arbitrary fetch (SSRF), shell, or provider navigation is permitted. Preview rendering uses a separate origin, safe artifact IDs, and confinement.

## Current findings mapped to design requirements

| Current finding | Required proposal rule/UI/test |
|---|---|
| Read-only dashboard directly interpolates DB values | encoded view models; action-host allowlist; hostile-text regression test |
| Daemon/dispatcher can claim SENT | command receipt + truth/mode + transport evidence; no simulation counts as outcome |
| Root/nested checkout divergence | one canonical checkout contract plus compatibility adapter; prove provider-issued vs mock |
| WhatsApp-only forms | browser success only after canonical intake write |
| DB default path is CWD-dependent | explicit owner path and migration/backup/restore test |
| `stripe_mock`/string URL evidence | checkout-issued state only; signed callback/evidence required for payment |

## Test and acceptance matrix (future, all NOT RUN)

| Criterion | Test/evidence | Status |
|---|---|---|
| Intake identity | same key/payload returns one receipt; mismatch is `409` | NOT RUN |
| Database unavailable | query/command returns `503`, never empty success | NOT RUN |
| Truthful totals | simulated/legacy-unknown records excluded from actual sends and revenue; opportunity value is not collected money | NOT RUN |
| Approval binding | edited copy/offer/demo invalidates exact approval | NOT RUN |
| Suppression | recheck after approval blocks dispatch | NOT RUN |
| Hostile path/text | traversal, XSS, and action-host cases stay confined/encoded | NOT RUN |
| Version race | stale version is `409`; same-key reconciliation has no new resend | NOT RUN |
| Callback integrity | duplicate callbacks and amount/currency/mode mismatch do not mark paid | NOT RUN |
| Crash uncertainty | outbox crash persists `UNKNOWN`, then reconciles | NOT RUN |
| Master compatibility | actual Master graph operates through adapter/owner contract | NOT RUN |
| Fulfillment chain | paid → delivery → accepted binds the same order | NOT RUN |
| Restore | migration plus consistent backup restores an audited state | NOT RUN |
| Usability | keyboard, 320px, 200% zoom, 44px target | NOT RUN |

These future tests use disposable SQLite and provider/transport stubs; they do not claim WCAG, performance, or external-system results.

## Engineering dialogue and unresolved human decisions

| Challenge | Resolution in this proposal |
|---|---|
| Terra: no existing intake or live UI contract | `/api/v1` is proposed; browser waits for canonical write |
| Frontend: provenance must be explicit | safe aliases and truth/mode/provenance fields; no path leakage |
| Backend: approval/jobs must not send | approval binding, receipt resource, outbox, execution rechecks |
| Root: prefix and fictional values | `/api/v1`; neutral Operator; no sales numbers or fake claims |

Human decisions remain: local-only versus remote exposure; offer terms and geography; approved providers; consent/suppression policy; manual-evidence review policy; delivery/acceptance definition; and later content scope. The full repair is deliberately not an executable implementation plan, has no dates, and does not promise sales readiness tomorrow.

## Review gate

If the concept is accepted, the next artifact is a written specification review. Only after that review can an implementation plan and execution method be approved. Until then, no scaffold, migration, dependency, provider, service, or code change is authorized.

## Component boundaries and operational behavior

The proposed domain split is explicit rather than a generic “service layer”:

| Module | Inputs | Outputs | Depends on | Authority |
|---|---|---|---|---|
| Research | reviewed sources, consent/suppression | source observations, qualified intake | canonical store | cannot dispatch |
| Sales + Offer | opportunity, evidence | draft and offer binding | Research | cannot approve/send |
| Communication | approval, channel policy | dispatch intent/receipt | Sales + Offer | rechecks suppression |
| Payments | order, provider callback/manual evidence | checkout/payment events | orders, integration adapter | never trusts browser paid status |
| Delivery | paid/authorized scope evidence | delivery and acceptance | Payments, offer | cannot invent payment |
| Jobs | command/outbox leases | pending/completed/unknown receipt | canonical store | no truth promotion alone |
| Integrations | canonical projection/callback | verified observations | configured adapters | external calls only |
| Audit | immutable events/evidence refs | safe timeline | all modules | read/provenance only |

The API/domain module is proposed to have four narrow responsibilities. First, a query layer produces stable, paginated view models from the canonical store. It does not leak the persistence schema or provide raw status strings as customer truth. Second, a command layer validates command input, decides whether an action is allowed, records the command receipt, and returns the resulting version. Third, a workflow layer applies state transitions only when their required evidence, approvals, and configuration gates are present. Fourth, an integration layer owns provider calls and projects selected canonical changes to external adapters. The integration layer never becomes the source of truth merely because an external request appeared to return success.

The frontend splits along the same boundary. A page container reads URL filters, starts a query, retains filter and form state, performs a command, and then refetches the affected resource. Its presentation children render accessible tables, badges, timelines, drawers, and action menus from validated view models. A badge such as `SENT` must be accompanied by mode and truth provenance; a payment screen must render `issued`, `evidence pending`, `collected`, `settlement pending`, `refunded`, or `disputed` rather than collapsing all paths into “paid.” A command receipt displays its internal lifecycle (`PENDING`, completed, rejected, failed) separately from external-effect uncertainty (`UNKNOWN`). This prevents a timeout from being displayed as a false failure or a false send.

A lower-change alternative is to keep server-rendered HTML and add progressive enhancement for read-only pages and a small intake form. It minimizes a first UI change and retains the current Node template approach. It is weaker once approvals, conflict recovery, command receipts, long-lived filters, and multiple evidence states need coherent client state. The proposed React/Vite candidate is therefore a better fit for that complexity, but remains unselected; Fastify likewise remains only a validation/serialization candidate.

The proposed Today page is intentionally action-first rather than metric-first. For each item it should show one safe next action, why other actions are blocked, the owning command receipt if work is already pending, and the freshness of supporting evidence. Research should distinguish reviewed sources from qualified opportunities and suppressed records. Pipeline should not contain an “auto-send” control; it exposes draft, approval binding, and dispatch authorization as separately visible conditions. Payments should link to an evidence timeline, not directly to a raw checkout URL. Audit should make it possible to reconstruct what command changed a resource and whether that change was local state, an observed provider callback, or a manual evidence submission.

### Configuration, migration, and rollback gates

The proposed single owner needs an explicit configuration boundary before it can replace the current scripts. Provider enablement is separate from the dashboard: an absent provider configuration blocks issuance or dispatch rather than silently selecting mock data. The production deployment question is not answered by local `node_modules` or a generated URL. A pre-cutover review must establish the database path, migration version, writer process identity, backup destination, restore test, and the safe handling of existing legacy rows. WAL is a concurrency mode, not an authorization or backup policy. The backup API is relevant because copying a live database file without a tested consistency method is not a replacement for restore evidence. [SQLite Backup API](https://sqlite.org/backup.html)

A rollback does not reclassify external effects. If a provider call has an unknown result, the order and command remain unknown until the reconciliation query or signed callback resolves them. If a migration needs rollback, the system preserves the event/receipt history needed to tell an operator which resources were affected. If the legacy data cannot be mapped without inventing evidence, it remains quarantined. No “clean dashboard” objective justifies bulk-setting `VERIFIED`, `SENT`, `PAID`, or `DELIVERED`.

### Security and data handling detail

The system accepts distinct untrusted inputs: public research metadata, browser forms, callback bodies, manually supplied evidence, legacy database values, and generated preview content. Each has a separate validation and rendering boundary. JSON schemas, if later selected, validate shape but do not prove that a business claim is true. Browser-facing URLs are categorised: a public-research URL must be canonicalized and require HTTPS; an operator action URL must match an explicitly configured host allowlist; provider credentials never cross either boundary. Preview resources use opaque IDs rather than paths, isolated rendering, and no server-side fetching of arbitrary URLs. Body-size limits and structured parsing are required before a callback is examined.

For a local-only interface, binding explicitly to loopback limits unintended exposure. Node’s server API accepts a host argument, so omitting it should not be treated as an adequate access-control design. [Node `server.listen`](https://nodejs.org/api/net.html#serverlistenport-host-backlog-callback) If remote access is later approved, it needs an explicit network, TLS, session, origin, CSRF, and rate-limit design—not a port change. The suggested owner bootstrap code is a local setup mechanism to be designed later; it is not a credential in this document and must not be logged. Authentication and authorization decisions must be scoped to operators and actions, not inferred from a local process name.

### Scope sequencing for review, not execution

The smallest reviewable slice is a read-only query model plus Today/Audit interface that faithfully exposes `UNKNOWN` or `SIMULATED` truth, with legacy provenance separately labeled by `mode: LEGACY_UNKNOWN`. It cannot promise a new sales workflow. A later slice can introduce canonical intake, dedupe, consent, and suppression, followed by draft/approval receipts. Dispatch, checkout issuance, signed callbacks, payment evidence, delivery acceptance, and external projections require their own approved contracts and tests. This is sequencing for evaluation; it does not authorize implementation or create a task list.

The design intentionally rejects a dashboard that starts with animated KPI cards, a universal “send now” button, or direct payment links. Those shortcuts would preserve the present contradiction: the UI reads values that are not sufficient evidence of commercial facts. The useful first outcome is an operator who can see uncertainty and blockers clearly, then execute only an authorized, observable command.

