# ERP Engineer Output Review — 2026-09-27

> **Status: advisory review of proposed outputs only.** This is not an accepted ERP specification, implementation plan, runtime gate, or evidence that the ERP is ready.

## Review basis

The reviewed sales proposal is useful as a bounded domain input, but it is not the central Monoga OS ERP design. It correctly retains evidence/mode distinctions, server-owned allowed actions, exact approval binding, and transactional outbox plus unknown-effect reconciliation. These should be preserved by default rather than rewritten.

## Findings requiring resolution before an ERP specification

### R1 — Scope mismatch

The proposal’s scope update says YouTube and prior work are first-class (line 6), yet the wireframe makes Content Studio “Later” (lines 50 and 53) and its primary navigation is sales-only (lines 41–50). The correction is an intent note; it does not turn the preserved sales body into a complete ERP design. This is a scope blocker for a future ERP specification, not a runtime defect and not a reason to delete sales history.

### R2 — Core contract absent

The proposed sales model/diagram (lines 25–34 and 97–108) is sales-specific. A central ERP core needs proposed contracts for global project/artifact/source IDs, source ownership, imports and dedupe, rename/deletion semantics, search freshness, permission and revocation behavior, and cross-domain conflicts. Sol’s proposed core—central catalog, permissions, search, artifact IDs, inbox, AI coordination, and adapters—does not make `09_AUTO_REVENUE_ENGINE` the ERP owner. These are proposed contracts, not implemented capabilities.

### R3 — YouTube is a primary workflow

A first-class YouTube domain needs a proposed workflow: research → story for 10–20+ minutes → recording assets (including SolidWorks/Blender when applicable) → edit/render → thumbnail → approval → publication evidence → outcome. A duration label is insufficient: duration must be based on timed voice/content evidence. Facts, rights, privacy, and publication approval require separate evidence. A future `codex.exe` job would need typed job identity, workspace, budget, approval, model, and credential boundaries. No existing workflow, thumbnail integration, or regeneration is asserted.

### R4 — AI and memory boundaries undefined

The future specification must distinguish documents/source of record, human preferences/Engram, search index, and operational databases. Retrieval needs selected permissions, citations, freshness/staleness, and revocation behavior. A model cannot authorize actions; provider, cost, cancellation, and failure policy remain open. No automatic cross-provider context sharing may be assumed.

### R5 — ERP acceptance coverage is missing

The sales test table (lines 147–165) is explicitly NOT RUN and sales-scoped. Future ERP tests must add artifact duplicate/rename/deletion, private content excluded from search/AI after revocation, stale or offline sources, project↔client↔3D↔video traceability, timed long-form duration, and revoked publication approval. No tests were run for this review.

### R6 — Command replay ambiguity

The proposal’s command semantics (line 111) should clarify that a stable idempotency replay resolves an existing receipt before reapplying stale `expectedVersion`; it never creates a new external effect. Key TTL, namespace, and receipt-status retention require specification. This is a specification ambiguity, not a demonstrated runtime failure.

## Discussion recommendation

Discuss a core-plus-domain-adapters approach versus a full rewrite. Core-plus-adapters preserves existing work but adds adapter/ownership maintenance; a rewrite may simplify the target model but risks losing working context and evidence. No design is accepted. The blocking human decisions remain privacy/source coverage and local versus remote operation.

## Structural note

This review records root findings against `docs/engineering/2026-09-27-admin-dashboard-proposal.md` only. It makes no source changes and does not authorize dependencies, services, databases, providers, finance access, or external actions.
