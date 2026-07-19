# ADR 0052: Editorial Content Lifecycle

## Status

Accepted

## Context

The Forge previously used inconsistent lifecycle states such as
draft, ready, published and archived.

This made it difficult to represent the actual editorial workflow.

## Decision

The active editorial lifecycle is:

BUILDING → REVIEW → READY → PUBLISHED

Transitions are validated by the domain.

GeneratedContent and NewsletterEdition remain separate aggregates.

NewsletterEdition additionally supports:

READY → ARCHIVED
PUBLISHED → ARCHIVED
ARCHIVED → BUILDING

Legacy states are preserved when necessary for data compatibility.

## Consequences

- Status changes cannot bypass domain validation.
- API handlers do not own lifecycle rules.
- Existing data is migrated conservatively.
- Articles and Newsletters can evolve independently.
- Future features can build on a consistent editorial lifecycle.