# Sprint 3 — References Foundation

## Status

Planned

## Objective

Implement the foundational References system for the editorial workflow.

A Reference represents an external source of information that can be associated with Ideas and Articles.

The purpose of this sprint is to establish the data model, API, relationships, and UI needed to preserve editorial context and provenance.

This sprint must NOT implement AI features.

---

# 1. Context

The system currently supports:

Idea
  ↓
Article
  ↓
Editorial lifecycle

The current editorial workflow:

Idea
  ↓
Article
  ↓
BUILDING
  ↓
REVIEW
  ↓
READY

Sprint 3 adds external references:

Reference
    ↓
Idea
    ↓
Article

A Reference can also be associated directly with an Article:

Reference ──────┐
                ├── Article
Idea ───────────┘

The system should preserve where editorial context came from.

---

# 2. Goals

## Primary goals

1. Create a persistent Reference entity.
2. Store external URLs.
3. Store basic metadata about the reference.
4. Associate References with Ideas.
5. Associate References with Articles.
6. Allow users to manage references from the application.
7. Display associated references in the Article editor.
8. Preserve ownership boundaries.
9. Keep the implementation ready for future AI features.

---

# 3. Non-goals

The following are explicitly OUT OF SCOPE for Sprint 3:

- AI summarization.
- AI analysis.
- AI-generated content.
- Automatic web scraping.
- Automatic metadata extraction from URLs.
- Browser extensions.
- Web crawling.
- Embeddings.
- Vector databases.
- Semantic search.
- Automatic source classification.
- Automatic fact checking.
- Automatic content generation.
- Automatic publication.

Sprint 3 is only the References foundation.

---

# 4. Domain Model

## Reference

A Reference represents an external source used as editorial context.

Suggested fields:

- id
- user_id
- url
- title
- description
- source_name
- reference_type
- created_at
- updated_at

Example:

```json
{
  "id": "uuid",
  "url": "https://example.com/article",
  "title": "Example Article",
  "description": "Optional user-provided description",
  "source_name": "Example",
  "reference_type": "article"
}
```

---

# 5. Reference Types

The initial supported reference types are:

- article
- video
- podcast
- social_post
- document
- website
- other

The system should store the type as a controlled domain value.

The implementation must follow existing project conventions for enums/constants.

Do not introduce arbitrary free-form values if the existing architecture already uses domain constants.

---

# 6. Ownership

Every Reference belongs to a user.

Users must only be able to:

- create their own References;
- read their own References;
- update their own References;
- delete their own References;
- associate their own References with their own Ideas;
- associate their own References with their own Articles.

Cross-user access must be rejected.

Expected behavior:

- invalid ID → 400;
- resource not found → 404;
- resource owned by another user → 403.

Follow existing project error conventions.

---

# 7. Database Design

A new migration is required.

## 7.1 references table

Suggested schema:

`references`

| Column | Type | Nullable | Default |
|--------|------|----------|---------|
| id | UUID | NOT NULL | PRIMARY KEY |
| user_id | UUID | NOT NULL | FK → users |
| url | TEXT | NOT NULL | — |
| title | TEXT | NULL | — |
| description | TEXT | NULL | — |
| source_name | TEXT | NULL | — |
| reference_type | TEXT | NOT NULL | 'website' |
| created_at | TIMESTAMPTZ | NOT NULL | — |
| updated_at | TIMESTAMPTZ | NOT NULL | — |

The exact schema must follow the existing database conventions.

The migration must include:

- primary key;
- user foreign key;
- indexes where appropriate;
- timestamps;
- constraints appropriate for the project.

---

## 7.2 Reference → Idea relationship

Create a junction table:

`idea_references`

| Column | Type | Notes |
|--------|------|-------|
| idea_id | UUID | FK → ideas |
| reference_id | UUID | FK → references |
| created_at | TIMESTAMPTZ | NOT NULL |

Constraints:

- composite primary key;
- foreign key to ideas;
- foreign key to references;
- cascading behavior consistent with the project conventions.

---

## 7.3 Reference → Article relationship

Create a junction table:

`content_references`

| Column | Type | Notes |
|--------|------|-------|
| content_id | UUID | FK → generated_content |
| reference_id | UUID | FK → references |
| created_at | TIMESTAMPTZ | NOT NULL |

Constraints:

- composite primary key;
- foreign key to generated_content;
- foreign key to references;
- cascading behavior consistent with the project conventions.

Only valid Article content should be associated with Article references.

The application must validate that the target GeneratedContent has:

`content_type = article`

---

# 8. Backend Architecture

Follow the existing architecture:

```
HTTP Handler
    ↓
Application Service
    ↓
Ports
    ↓
Repository
    ↓
Database
```

Do not put business logic in HTTP handlers.

---

# 9. Backend Domain

Create a Reference domain model.

The domain should contain:

- Reference entity;
- ReferenceType values;
- validation rules;
- errors relevant to References.

At minimum:

- URL is required;
- URL must be valid;
- reference_type must be supported;
- user ownership must be enforced by the application layer.

Do not perform network requests to validate whether the URL is reachable.

---

# 10. Ports

Create the necessary repository interfaces.

Expected capabilities:

## ReferenceRepository

- Create
- GetByID
- ListByUser
- Update
- Delete
- AttachToIdea
- DetachFromIdea
- ListByIdea
- AttachToContent
- DetachFromContent
- ListByContent

The exact interface shape should follow existing repository conventions.

Avoid creating methods that are not required by the actual use cases.

---

# 11. Application Service

Create:

`backend/internal/core/application/reference_service.go`

The service should provide use cases for:

## CreateReference

Input:

- user ID
- URL
- optional title
- optional description
- optional source name
- reference type

Behavior:

- validate input;
- create Reference;
- return created Reference.

---

## GetReference

Behavior:

- fetch Reference;
- enforce ownership;
- return Reference.

---

## ListReferences

Behavior:

- return References owned by the current user.

---

## UpdateReference

Behavior:

- enforce ownership;
- validate updated data;
- update Reference.

---

## DeleteReference

Behavior:

- enforce ownership;
- remove Reference.

---

## AttachReferenceToIdea

Behavior:

1. Verify Reference ownership.
2. Verify Idea ownership.
3. Create relationship.
4. Avoid duplicate relationships.

---

## DetachReferenceFromIdea

Behavior:

1. Verify Reference ownership.
2. Verify Idea ownership.
3. Remove relationship.

---

## ListIdeaReferences

Behavior:

- verify Idea ownership;
- return associated References.

---

## AttachReferenceToArticle

Behavior:

1. Verify Reference ownership.
2. Verify Article ownership.
3. Verify content_type = article.
4. Create relationship.
5. Avoid duplicate relationships.

---

## DetachReferenceFromArticle

Behavior:

1. Verify Reference ownership.
2. Verify Article ownership.
3. Remove relationship.

---

## ListArticleReferences

Behavior:

- verify Article ownership;
- return associated References.

---

# 12. API

Implement REST endpoints following existing routing conventions.

## Reference CRUD

### POST /api/references

Create a Reference.

Request:

```json
{
  "url": "https://example.com/article",
  "title": "Example Article",
  "description": "Optional description",
  "source_name": "Example",
  "reference_type": "article"
}
```

Response: 201 Created

---

### GET /api/references

List the authenticated user's References.

---

### GET /api/references/{id}

Get one Reference.

Ownership protected.

---

### PUT /api/references/{id}

Update a Reference.

Ownership protected.

---

### DELETE /api/references/{id}

Delete a Reference.

Ownership protected.

---

# 13. Idea Reference API

### GET /api/ideas/{id}/references

List References associated with an Idea.

---

### POST /api/ideas/{id}/references/{referenceId}

Attach a Reference to an Idea.

---

### DELETE /api/ideas/{id}/references/{referenceId}

Detach a Reference from an Idea.

---

# 14. Article Reference API

### GET /api/content/{id}/references

List References associated with an Article.

---

### POST /api/content/{id}/references/{referenceId}

Attach a Reference to an Article.

The endpoint must reject non-Article content.

---

### DELETE /api/content/{id}/references/{referenceId}

Detach a Reference from an Article.

---

# 15. API Validation

The API must validate:

## URL

Required.

Must be a valid absolute URL.

Valid:

- https://example.com/article
- https://www.youtube.com/watch?v=123

Invalid:

- example.com/article
- not-a-url

---

## Reference type

Must be one of:

- article
- video
- podcast
- social_post
- document
- website
- other

---

## Ownership

All operations must enforce ownership.

---

# 16. Frontend

Create a References API client.

Expected methods:

- list()
- get(id)
- create(input)
- update(id, input)
- delete(id)

Create relationship methods:

- listForIdea(ideaId)
- attachToIdea(ideaId, referenceId)
- detachFromIdea(ideaId, referenceId)

- listForContent(contentId)
- attachToContent(contentId, referenceId)
- detachFromContent(contentId, referenceId)

Follow existing API client conventions.

---

# 17. Article Editor Integration

The existing ArticleEditorPage must display a References section.

The right sidebar currently contains a placeholder for future editorial assistance.

Replace the placeholder with:

## References

The sidebar should show:

- associated References;
- title;
- source name;
- reference type;
- link to the external URL;
- remove action.

The user must be able to:

- see associated References;
- attach an existing Reference;
- remove a Reference.

---

# 18. Reference Management UI

Create a References management page.

Suggested route:

`/references`

The page should allow the user to:

- list References;
- create a Reference;
- edit a Reference;
- delete a Reference.

The UI should follow existing project design conventions.

Do not introduce a new design system.

---

# 19. Attach Reference UX

The Article editor should provide a way to attach an existing Reference.

Suggested flow:

```
Article Editor
    ↓
References
    ↓
Add Reference
    ↓
Select existing Reference
    ↓
Attach
```

The user should also be able to create a new Reference from the attachment flow if this fits the existing UI patterns.

Do not duplicate the same Reference.

---

# 20. Idea Integration

The Ideas page should expose associated References.

At minimum:

- display associated References;
- allow attaching an existing Reference;
- allow detaching a Reference.

The existing Idea → Article promotion flow must continue to work.

References must not be lost when an Idea is promoted to an Article.

The Article created from an Idea does NOT automatically need to copy all Idea References in Sprint 3 unless the existing product model explicitly requires this.

The default behavior should preserve the Idea references independently.

---

# 21. Caching and Query Invalidation

Follow existing frontend query conventions.

After:

- creating a Reference;
- updating a Reference;
- deleting a Reference;
- attaching a Reference;
- detaching a Reference;

invalidate or update the relevant queries.

Avoid stale reference lists.

---

# 22. Tests

## Backend domain tests

Test:

- valid URL;
- invalid URL;
- valid reference types;
- invalid reference type.

---

## Reference service tests

Test:

- create;
- get owned;
- get not owned;
- list;
- update owned;
- update not owned;
- delete owned;
- delete not owned.

---

## Relationship tests

Test:

- attach Reference to owned Idea;
- attach Reference to another user's Idea → 403;
- attach another user's Reference → 403;
- detach;
- duplicate attach;
- list relationships.

---

## Article relationship tests

Test:

- attach Reference to owned Article;
- attach Reference to another user's Article → 403;
- attach Reference to non-Article content → rejected;
- duplicate attach;
- detach;
- list relationships.

---

## HTTP tests

Test:

- invalid UUID → 400;
- not found → 404;
- not owned → 403;
- invalid body → 400;
- successful CRUD;
- successful attach/detach.

---

## Frontend tests

Test:

- Reference list renders;
- create Reference;
- edit Reference;
- delete Reference;
- attach Reference to Article;
- detach Reference from Article;
- Article editor displays associated References;
- Idea references render;
- duplicate attach is handled correctly;
- loading/error states.

---

# 23. Security

The system must never allow a user to:

- read another user's Reference;
- modify another user's Reference;
- delete another user's Reference;
- attach another user's Reference to their own Article;
- attach their Reference to another user's Article;
- access another user's Idea references.

All ownership checks must happen server-side.

---

# 24. Migration

Create a new migration after the latest existing migration.

Before creating the migration:

1. Inspect the current migration list.
2. Confirm the latest migration number.
3. Use the next available number.
4. Do not assume the migration number.

The migration must include both up.sql and down.sql.

Do not modify existing migrations.

---

# 25. Documentation

Update documentation only where necessary.

Potential updates:

- docs/glossario.md
- architecture documentation
- API documentation if the project has one

Add:

- Reference
- ReferenceType
- Idea Reference
- Article Reference
- Provenance

---

# 26. Acceptance Criteria

Sprint 3 is complete when:

1. A user can create a Reference.
2. A user can edit a Reference.
3. A user can delete a Reference.
4. A user can list their References.
5. A user can attach a Reference to an Idea.
6. A user can detach a Reference from an Idea.
7. A user can attach a Reference to an Article.
8. A user can detach a Reference from an Article.
9. The Article editor displays associated References.
10. The Ideas UI displays associated References.
11. Ownership is enforced everywhere.
12. Invalid URLs are rejected.
13. Invalid ReferenceTypes are rejected.
14. Duplicate relationships are prevented.
15. Non-Article content cannot receive Article References.
16. Existing Idea → Article promotion continues to work.
17. Existing Sprint 1 lifecycle tests continue to pass.
18. Existing Sprint 2 tests continue to pass.
19. Database migration has up and down support.
20. Backend builds successfully.
21. Backend tests pass.
22. Frontend type checking passes.
23. Frontend tests are run and any pre-existing failures are clearly identified.
