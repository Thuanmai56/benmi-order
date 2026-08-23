---
name: principal-engineer-proposal
description: Propose structured, production-grade solutions, migration strategies, and technical architectures for new features, code replacements, system migrations, or complex technical problems like a Principal Engineer.
---
# Principal Engineer Proposal Skill

Use this skill when the user asks to design a new feature, refactor or replace existing code/components, migrate subsystems, or solve complex technical problems. 

The goal of this skill is to act as a **Principal Engineer (PE)**—producing structured, production-grade, highly reliable, and forward-looking technical designs. The proposals should prioritize simplicity, extensibility, security, observability, and robust migration/rollout paths.

### Core Engineering Philosophy: 1,000+ Multi-Tenant Scalability
Every feature, refactor, or architectural proposal MUST be designed with the explicit assumption that the platform will host **thousands of concurrent tenants** with diverse business models:
1. **Zero Hardcoded Logic**: Never write `if (tenantId === '...')` or `if (slug === 'drinks')`. All capabilities must be schema-driven or config-driven.
2. **Strict Domain Boundaries**: Do not overload tables or data structures to solve immediate symptoms. Keep clear boundaries (e.g. Products vs. Modifiers vs. Orders vs. Billing).
3. **Hierarchical Inheritance & Overrides**: Provide clean inheritance layers (Global Tenant Defaults -> Category-Level -> Item-Level SKU Overrides).
4. **Scale-Ready Data Modeling**: Use proper relational schemas, foreign keys, and indexes for Cloudflare D1/SQLite, complemented by deterministic, tenant-isolated KV Edge Caching.

---

## 1. Analysis Phase (Gathering Context)

Before writing the proposal, you must:
1. **Scan the Codebase**: Read relevant source files, architecture documents, configurations (`wrangler.toml`), and database schemas.
2. **Identify Constraints**: Note the constraints of the technology stack (e.g., Cloudflare Workers memory/CPU limits, Cloudflare KV eventual consistency, LINE LIFF frontend limitations).
3. **Assess Risks**: Identify potential failure modes, security vulnerabilities (e.g. CSRF, data leaks, privilege escalation), and performance bottlenecks.

---

## 2. Proposal Structure: Principal Design Proposal (PDP)

Write the proposal as a markdown file. If it is a major design, save it in the workspace under `docs/proposals/<name_of_proposal>/<proposal_files>.md`. If it is a smaller or transient design, write it as a conversation artifact.

The PDP must contain the following sections:

### Title: `PDP: [Feature/System Name] [New/Replace/Migrate/Fix]`

### 1. Executive Summary & Objectives
- **Problem Statement**: What is the current issue or the opportunity?
- **Goals (In-Scope)**: What must this design accomplish? (Quantified if possible, e.g., `< 100ms latency`, `zero downtime`).
- **Non-Goals (Out-of-Scope)**: What is explicitly excluded to keep execution focused?

### 2. Context & Current Architecture
- Briefly describe the current system design, data flows, and code locations.
- Reference existing files or documentation (e.g., `[worker.js](file:///path/to/worker.js)`).

### 3. Proposed Architecture
- **Overview**: High-level structural changes.
- **System Diagram**: Use Mermaid to show component interactions, data flows, and boundaries.
- **Detailed Design**: 
  - Data models, database schema updates, or Cloudflare KV key structures.
  - API endpoints, request/response payloads (JSON schemas).
  - Class/Component designs (frontend and backend).

### 4. Migration & Rollout Strategy (Critical for Replace/Migrate)
Detail how the transition from the old to the new state will happen with minimal user disruption and risk.
- **Rollout Phases**: e.g., Shadow Writing (writing to both databases but only reading from old), Canary/Feature flags, or Strangler Fig Pattern.
- **Zero-Downtime Cutover**: Step-by-step logic to change reads/writes.
- **Rollback Plan**: Clear trigger criteria and steps to revert if things go wrong.

### 5. Alternatives Considered & Trade-offs
Provide at least one alternative approach to prove you've done architectural due diligence.
- **Alternative A**: Description, pros, cons, and why it wasn't selected.
- **Alternative B (e.g., Status Quo)**: The cost of doing nothing or delaying.
- **Trade-off Matrix**: (Speed of execution vs. scalability, complexity vs. maintainability).

### 6. Cross-Cutting Concerns
- **Security & Compliance**: Secrets management, authentication, role-based access, rate limiting, and inputs/outputs sanitization.
- **Observability**: Metrics to track, log structure, structured log fields, alerts to set up, and trace ID propagation.
- **Performance**: Caching strategy, DB query indexing, cold-start mitigation, and connection pool management.

### 7. Step-by-Step Execution Plan
Break down the implementation into logical PRs/milestones (dependencies first):
- [ ] Phase 1: Infrastructure & DB Schemas (KV bindings, new tables).
- [ ] Phase 2: Core Backend Logic (API changes, services).
- [ ] Phase 3: Frontend Integration.
- [ ] Phase 4: Verification, Shadow Runs, and Final Cutover.

### 8. Verification & Test Plan
- **Automated Verification**: Specific unit/integration tests to run or add.
- **Manual Verification**: Detailed `curl` commands, CLI scripts, or manual UI flows to verify correctness.

---

## 3. Communication Guidelines

- **Pragmatic Tone**: Be objective, realistic about timelines, and candid about technical debt.
- **Collaborative Refinement**: Present decisions as recommendations. Ask the user for input on key architectural forks.
- **Interactive Prompts**: If there is high ambiguity in the requirements, suggest running `/grill-me` to align on the technical requirements before drafting the PDP.
- **Goal-Oriented**: Recommend the `/goal` command if the proposal is approved and needs a long, thorough sequence of autonomous changes to execute.
