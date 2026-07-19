# Sprint 1 — Editorial Content Foundation

> **Status:** Proposed  
> **Scope:** Product model, domain model, lifecycle, relationships, API contracts, migrations, tests and documentation.  
> **Goal:** Establish the foundation for the next product evolution without prematurely redesigning the UI or implementing Library.

---

## 1. Context

Forge is a content creation platform with two primary content products:

- **Articles** — independently publishable written content.
- **Newsletters** — publishable editions composed from references, articles, commentary and the author's own writing.

Both products share a common writing/review lifecycle and can be assisted by AI to different degrees.

The user must always remain in control:

- AI assistance is optional.
- Manual writing is a first-class workflow.
- AI-generated content requires human review.
- Publication remains manual in the MVP.
- No external publishing integrations are part of this sprint.

The current repository already has a shared Go core, Digest and Compose domains, `GeneratedContent`, sources, jobs and an existing architecture based on Go + PostgreSQL + sqlc/pgx + React/TypeScript. This sprint must **reconcile the current implementation with the editorial model below**, rather than introducing a parallel architecture.

---

# 2. Product Model

## 2.1 Primary publishable content types

```text
Content
├── Article
└── Newsletter
```

Both are independently publishable.

### Article

A cohesive piece of written content that can be published independently.

Examples:

- Blog post
- LinkedIn article/post
- Technical essay
- Personal essay
- Manifesto

An Article can be:

- written entirely manually;
- assisted by AI;
- generated from a topic;
- generated from an idea;
- generated from one or more references.

An Article can be included in multiple Newsletters.

### Newsletter

A publishable editorial edition.

A Newsletter is not fundamentally a different kind of "content" from an Article in terms of lifecycle. Its main difference is the **composition workflow**.

A Newsletter can contain:

- references to external articles, posts and news;
- selected Articles;
- author commentary;
- original writing;
- multiple editorial sections.

Example:

```text
Engineering Weekly #18
├── Reference
│   └── Author commentary
├── Article
│   └── Author commentary
├── Reference
│   └── Author commentary
└── Closing note
```

A Newsletter is therefore a curated editorial composition.

---

# 3. Supporting Entities

## 3.1 Idea

An Idea is a seed for future content.

It is not directly publishable.

Example:

```text
Idea:
"Distributed systems are mostly about time"
```

An Idea may later originate:

```text
Idea
├── Article
└── Newsletter
```

The same Idea may produce multiple pieces of content.

Ideas should not necessarily remain a top-level navigation item forever. They are a content type in the broader Library model.

---

## 3.2 Reference

A Reference is external research material.

Examples:

- Article
- Blog post
- News item
- Documentation
- Paper
- Video
- Other URL-based source

A Reference is not publishable content owned by Forge.

```text
Reference
    ↓
used by
    ↓
Article / Newsletter
```

A Reference may be reused across multiple content items.

```text
Reference A
├── Article 1
├── Article 2
└── Newsletter 5
```

---

# 4. Content Lifecycle

The lifecycle is independent from the content type.

```text
BUILDING
    ↓
REVIEW
    ↓
READY
    ↓
PUBLISHED
```

## Allowed transitions

```text
BUILDING → REVIEW
REVIEW   → BUILDING
REVIEW   → READY
READY    → BUILDING
READY    → PUBLISHED
PUBLISHED → BUILDING
```

The last transition should be used only when the user intentionally reopens published content for editing.

## Invalid transitions

Examples:

```text
BUILDING → READY
BUILDING → PUBLISHED
REVIEW → PUBLISHED
```

The domain must enforce these rules.

The frontend must not be the only layer responsible for lifecycle validation.

---

# 5. Publication Model

Publication is manual in the MVP.

The intended flow is:

```text
BUILDING
    ↓
REVIEW
    ↓
READY
    ↓
User publishes externally
    ↓
User marks content as PUBLISHED
```

Forge does not need to know where the content was published in Sprint 1.

Future versions may add:

```text
published_to:
- substack
- linkedin
- personal_blog
- other
```

This is explicitly out of scope for this sprint.

---

# 6. Content Relationships

## 6.1 Idea → Content

An Idea can originate one or more Content items.

```text
Idea
    ├── Article
    └── Newsletter
```

Recommended implementation:

```text
content.source_idea_id nullable
```

If the current model makes a separate relationship table more appropriate, use that instead. Do not introduce unnecessary complexity solely to support hypothetical future graph functionality.

---

## 6.2 Content ↔ Reference

Many-to-many relationship.

```text
Article A
    ├── Reference 1
    └── Reference 2

Newsletter B
    ├── Reference 2
    └── Reference 3
```

Recommended conceptual table:

```text
content_references
├── content_id
├── reference_id
├── created_at
```

The relationship should support future metadata such as:

- position;
- notes;
- citation context.

Do not overbuild these fields unless the current implementation needs them.

---

## 6.3 Newsletter ↔ Article

Many-to-many relationship.

An Article can appear in multiple Newsletters.

```text
Article A
├── Newsletter #12
└── Newsletter #15
```

Recommended conceptual table:

```text
newsletter_articles
├── newsletter_id
├── article_id
├── position
├── created_at
```

The Article itself should not be copied into the Newsletter.

The Newsletter may add its own commentary or editorial context around the included Article.

---

# 7. Content Naming

When creating a new Newsletter, the default title should be generated using a counter:

```text
Newsletter #1
Newsletter #2
Newsletter #3
```

The user can rename it at any time.

The counter should be scoped appropriately to the user's Newsletter collection.

Example:

```text
Engineering Weekly #18
```

The default title is a convenience, not a permanent identity.

For Articles, the title may initially be:

```text
Untitled article
```

or equivalent, depending on the existing product language.

Do not force the user to name an Article before opening the editor.

---

# 8. Recommended Domain Model

The exact implementation must follow the current repository conventions and existing schema. This is the target conceptual model, not permission to blindly create duplicate tables.

## Content

```text
Content
├── id
├── user_id
├── type
├── title
├── body
├── status
├── source_idea_id nullable
├── created_at
├── updated_at
└── published_at nullable
```

### Type

```text
article
newsletter
```

### Status

```text
building
review
ready
published
```

## Idea

```text
Idea
├── id
├── user_id
├── title
├── notes
├── created_at
└── updated_at
```

## Reference

Reuse the existing source/reference model where possible.

Conceptually:

```text
Reference
├── id
├── user_id
├── url
├── title
├── source_name
├── metadata
└── created_at
```

Do not create a duplicate `references` table if the existing `sources` entity already fulfills this responsibility. If it does, evolve/rename the domain concept carefully and document the decision.

---

# 9. Important Architectural Constraint

The repository already contains an existing concept of `GeneratedContent` and product-specific Digest/Compose domains.

Before introducing a new `Content` entity:

1. Audit the existing `GeneratedContent`.
2. Determine whether it can evolve into the common Content concept.
3. Determine which fields are product-specific.
4. Avoid maintaining two competing representations of content.

The preferred outcome is:

```text
Existing GeneratedContent
        ↓
evolve or clearly map to
        ↓
Shared Content domain
        ↓
Article / Newsletter
```

Do not implement a parallel content model without a documented migration strategy.

---

# 10. Sprint 1 Scope

## In scope

### Backend

- Audit current domain entities and database schema.
- Define the canonical editorial vocabulary.
- Define Content types.
- Define lifecycle states.
- Implement lifecycle transition rules in the domain.
- Define Idea relationships.
- Define Reference relationships.
- Define Article ↔ Newsletter relationships.
- Reuse or evolve existing `GeneratedContent` where appropriate.
- Add migrations only when required.
- Update sqlc queries.
- Update repositories and application services.
- Update API contracts.
- Add unit tests.
- Add integration tests for persistence where required.

### Frontend

- Update shared TypeScript/API types according to the backend contract.
- Update status/type mapping where required.
- Do not redesign the Library yet.
- Do not redesign Articles yet.
- Do not redesign Newsletters yet.
- Avoid creating new visual abstractions unless needed by the domain changes.

### Documentation

Create or update:

```text
docs/glossario.md
docs/content-model.md
docs/adr/0030-editorial-content-model.md
docs/adr/0031-content-lifecycle.md
docs/adr/0032-content-relationships.md
```

Use the repository's existing ADR numbering convention. If these numbers already exist, choose the next available numbers.

---

# 11. Out of Scope

Do not implement in Sprint 1:

- Library redesign;
- Articles page redesign;
- Newsletter page redesign;
- Article editor redesign;
- Newsletter editor redesign;
- AI chat;
- automatic publishing;
- Substack integration;
- LinkedIn integration;
- blog integrations;
- publishing provider APIs;
- complex visual content graph;
- collaborative editing;
- real-time synchronization;
- public content pages;
- advanced analytics.

---

# 12. Implementation Plan

## Step 1 — Repository audit

Inspect:

```text
backend/internal/core/domain/
backend/internal/core/ports/
backend/internal/digest/
backend/internal/compose/
backend/internal/adapters/
backend/migrations/
backend/db/queries/
frontend/src/
docs/adr/
```

Identify:

- existing content entities;
- existing source/reference entities;
- existing statuses;
- existing product fields;
- existing approval/rejection logic;
- existing API endpoints;
- existing frontend types;
- existing route assumptions.

Produce:

```text
docs/content-model-audit.md
```

The audit must explicitly answer:

```text
What is the current canonical content entity?
What is currently called a source?
What is currently called generated content?
Which fields are shared?
Which fields are Digest-specific?
Which fields are Compose-specific?
What must be migrated?
What can be reused without migration?
```

---

## Step 2 — Define canonical vocabulary

Update:

```text
docs/glossario.md
```

Definitions must include:

- Content
- Article
- Newsletter
- Idea
- Reference
- Building
- Review
- Ready
- Published

The vocabulary must be consistent across:

- domain;
- API;
- frontend;
- documentation.

Code remains in English.

---

## Step 3 — Implement lifecycle domain rules

Create or evolve domain behavior so lifecycle transitions are explicit.

Example conceptual API:

```go
content.TransitionToReview()
content.TransitionToBuilding()
content.TransitionToReady()
content.TransitionToPublished()
```

Or the equivalent repository convention.

The domain must reject invalid transitions.

Do not place lifecycle rules only inside HTTP handlers.

---

## Step 4 — Implement relationships

Implement only relationships required by the current model:

```text
Idea → Content
Content ↔ Reference
Newsletter ↔ Article
```

Prefer normalized relationships.

Do not duplicate Article bodies into Newsletters.

Do not duplicate References into Content records.

---

## Step 5 — Database and migrations

If schema changes are required:

- create a forward-only migration;
- preserve existing data;
- provide a migration path from the current model;
- do not silently drop data;
- use existing golang-migrate conventions;
- update sqlc queries afterward.

Before writing a migration, determine whether the existing schema can be evolved instead of replaced.

---

## Step 6 — API contract

Update the API according to the existing repository approach.

The API must expose the minimum operations needed for the new model.

Potential operations:

```text
GET    /api/content
GET    /api/content/{id}
POST   /api/content/{id}/transition
```

or the equivalent existing REST convention.

For Ideas:

```text
GET    /api/ideas
POST   /api/ideas
GET    /api/ideas/{id}
```

For References, reuse existing source endpoints if they already represent the same concept.

For relationships:

```text
POST   /api/content/{id}/references
DELETE /api/content/{id}/references/{referenceId}

POST   /api/newsletters/{id}/articles
DELETE /api/newsletters/{id}/articles/{articleId}
```

Do not add endpoints that the current frontend cannot use or that are not needed for this sprint.

The API contract must remain consistent with the repository's OpenAPI strategy.

---

# 13. Tests

The repository requires at least 95% unit test coverage, and new code should target 100%.

## Domain tests

Required cases:

```text
Article can transition from building to review.
Article can transition from review to building.
Article can transition from review to ready.
Article can transition from ready to building.
Article can transition from ready to published.
Newsletter follows the same lifecycle.
Invalid transitions are rejected.
Published content can only be reopened intentionally.
```

## Relationship tests

Required cases:

```text
Content can reference a saved Reference.
The same Reference can be used by multiple Content items.
An Article can belong to multiple Newsletters.
The same Article is not duplicated when included in a Newsletter.
An Idea can originate an Article.
An Idea can originate a Newsletter.
```

## Persistence tests

Use the repository's existing integration test conventions.

Test:

```text
Tenant/user isolation.
Content persistence.
Relationship persistence.
Migration compatibility.
```

## Frontend tests

Update or add tests for:

```text
Content type mapping.
Status mapping.
Lifecycle action availability.
API response parsing.
```

Do not add tests merely for visual markup unless the existing frontend testing strategy requires it.

---

# 14. Acceptance Criteria

Sprint 1 is complete when:

## Model

- [ ] There is one clearly documented canonical model for publishable content.
- [ ] Article and Newsletter are distinct content types.
- [ ] Ideas are non-publishable seeds.
- [ ] References are reusable external research material.
- [ ] The model does not maintain competing representations of the same content.

## Lifecycle

- [ ] `building`, `review`, `ready` and `published` are defined.
- [ ] Valid transitions are enforced in the domain.
- [ ] Invalid transitions are rejected.
- [ ] The frontend cannot bypass backend lifecycle rules.

## Relationships

- [ ] Ideas can originate content.
- [ ] Content can use References.
- [ ] References can be reused.
- [ ] Articles can be included in multiple Newsletters.
- [ ] Articles are not copied into Newsletters.

## Data

- [ ] Existing data is preserved.
- [ ] Migrations are forward-only.
- [ ] Tenant/user isolation is preserved.
- [ ] sqlc generated code is updated where required.

## API

- [ ] API contracts reflect the canonical model.
- [ ] OpenAPI remains consistent with implementation.
- [ ] Frontend types are updated according to the repository's existing contract strategy.

## Quality

- [ ] Backend tests pass.
- [ ] Frontend tests pass.
- [ ] Integration tests pass where applicable.
- [ ] Coverage policy is maintained.
- [ ] No unrelated UI redesign is introduced.

---

# 15. ADR 0030 — Editorial Content Model

## Status

Accepted

## Context

Forge supports two publishable content workflows:

1. Articles, which are independently publishable written pieces.
2. Newsletters, which are editorial editions composed from references, articles, commentary and original writing.

The products share lifecycle concepts and must eventually be surfaced together in the Library.

The system should avoid creating separate, incompatible content abstractions for each product.

## Decision

Model Article and Newsletter as two types of a shared publishable Content concept.

```text
Content
├── Article
└── Newsletter
```

The shared concept owns common lifecycle and metadata.

Product-specific behavior remains in the relevant domain/application modules.

Ideas and References are supporting entities rather than publishable Content.

## Consequences

### Positive

- Shared lifecycle behavior.
- Shared Library and Home queries.
- Consistent status filtering.
- Easier future search.
- Articles can be reused in multiple Newsletters.
- References can be reused across content.

### Negative

- The shared Content abstraction must not become a generic dumping ground.
- Product-specific behavior must remain separated.
- Existing `GeneratedContent` may require careful evolution or migration.

---

# 16. ADR 0031 — Content Lifecycle

## Status

Accepted

## Context

Forge is an assistive tool, not an autonomous publishing system.

Users must review AI-assisted content before it becomes ready for publication.

## Decision

Use the following lifecycle:

```text
BUILDING
    ↓
REVIEW
    ↓
READY
    ↓
PUBLISHED
```

The lifecycle is shared by Articles and Newsletters.

Publication remains manual in the MVP. The user marks content as Published after publishing externally.

## Consequences

- AI-generated content cannot silently become published.
- The same lifecycle can power Home, Library, Articles and Newsletters.
- External publishing integrations can be added later without changing the core lifecycle.
- Reopening content for editing must be supported deliberately.

---

# 17. ADR 0032 — Editorial Relationships

## Status

Accepted

## Context

Forge content is built from ideas and references.

Articles may be reused inside multiple Newsletters.

References should not be copied into every Content record.

## Decision

Use explicit relationships:

```text
Idea → Content
Content ↔ Reference
Newsletter ↔ Article
```

The relationships are normalized.

Articles are not duplicated when included in Newsletters.

References are reusable.

## Consequences

- A single Reference can support multiple pieces of content.
- An Article can appear in multiple Newsletters.
- The system can later provide provenance and "used in" views.
- The Library can become a cross-content view without duplicating data.

---

# 18. AI Agent Instructions

When implementing this sprint:

1. Read `AGENTS.md` and all relevant existing ADRs first.
2. Inspect the current implementation before changing the model.
3. Do not create a parallel content model without first proving the existing model cannot evolve.
4. Preserve existing behavior unless the new canonical model requires a deliberate change.
5. Keep domain logic independent from adapters.
6. Keep code, comments, database identifiers and API identifiers in English.
7. Follow existing repository conventions for migrations, sqlc, handlers and tests.
8. Maintain tenant/user isolation.
9. Maintain or improve test coverage.
10. Do not redesign the UI as part of this sprint.
11. Do not implement future publishing integrations.
12. If the current code contradicts this document, stop and document the conflict before making a destructive change.
13. Prefer the smallest migration that produces the canonical model.
14. Run the relevant test suites after each meaningful change.
15. At the end, report:
    - files changed;
    - migrations created;
    - ADRs created/updated;
    - API changes;
    - tests added;
    - coverage results;
    - unresolved questions or deviations from this plan.

---

# 19. Definition of Done

The sprint is complete when the repository has a coherent, tested editorial foundation that supports:

```text
Discover
    ↓
Reference
    ↓
Idea
    ↓
Article / Newsletter
    ↓
Building
    ↓
Review
    ↓
Ready
    ↓
Manual external publication
    ↓
Published
```

The next sprint can then safely focus on the **Library experience** without having to redesign the underlying product model again.
