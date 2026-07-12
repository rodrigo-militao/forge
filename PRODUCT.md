# Product

## Register

product

## Users

Technical professionals — developers, engineers, tech leads, and independent writers — who want to publish consistent written content (newsletters, blog posts) but lack the time or discipline to do it entirely manually. They are building personal brand and authority through writing. They are comfortable with tools, suspicious of "magical AI," and want control over what gets published under their name.

The founder is a backend engineer who built the first versions as internal tools for himself — the product speaks that language.

## Product Purpose

Forge is a content creation platform with two products on a shared multi-tenant core:

- **Digest**: daily content curation via RSS + web search, classified by LLM. The user reviews, tags, categorizes, and selects what goes into each edition.
- **Compose**: AI-assisted article writing with voice profiles and topic management. The user provides direction, reviews drafts, and publishes manually.

In both cases, nothing is published automatically. The human reviews and approves everything. The product is a force multiplier for the writer's voice, not a replacement.

## Brand Personality

Serious, editorial, technical instrument. Three words: **precise, restrained, confident**.

- Dark-mode-first, editorial typography (Fraunces serif for display, Inter sans for body)
- Tool-like, not toy-like — references to pipelines, editors, and technical craft
- Speaks the language of people who build things: direct, no marketing fluff, no startup hype
- Conveys reliability and control — the user approves everything; the AI never acts autonomously
- Warmth comes from the burnt orange accent and thoughtful interaction design, not from emoji or casual copy

## Anti-references

- Generic SaaS purple/blue gradients
- Cute robot or "friendly AI" illustrations
- "Magical AI" tone — no sparkle-emoji overload, no "look what AI can do"
- Startup-hype copy ("revolutionize", "supercharge", "game-changing")
- Excess emoji or animation — motion is intentional and state-communicating, not decorative
- Standard SaaS hero-metric template (big number + small label + gradient accent)

## Design Principles

1. **Practice what you preach** — Forge helps people write clearly; the interface itself should be clear, direct, and well-edited. Every element earns its place.
2. **The tool disappears into the task** — Interfaces are familiar, consistent, and predictable. Users think about their content, not about navigating the app.
3. **Control without burden** — The user is always in charge (nothing auto-publishes), but common paths are fast. One click to discover, one click to approve, one click to assemble.
4. **Restraint as quality signal** — Fewer colors, fewer type sizes, fewer motion effects. Each one carries more meaning because it's rare. The burnt orange accent means something every time it appears.
5. **Editorial confidence** — Typography-driven hierarchy. Dark canvas, clean contrast, generous whitespace. Feels more like a publishing tool than a dashboard.

## Accessibility & Inclusion

- WCAG AA contrast targets (4.5:1 body, 3:1 large text)
- Radix UI primitives for keyboard-navigable, screen-reader-friendly components
- Reduced motion respected via `prefers-reduced-motion`
- i18n from day one: English (default), Portuguese, Spanish — every string externalized
- Dark mode first with light mode available via theme toggle
