---
name: Forge
description: Content creation platform with Digest (curation) and Compose (writing) — precise editorial tools for technical writers
colors:
  primary: "#c96b2c"
  neutral-bg: "#1d1f24"
  neutral-surface: "#f7f6f3"
  neutral-surface-elevated: "#ffffff"
  success: "#567a61"
  danger: "#b33c3c"
  border: "#e2e0db"
  text-secondary: "#5c5b58"
  text-muted: "#8c8a86"
  hover-subtle: "rgba(255,255,255,0.05)"
  active-subtle: "rgba(255,255,255,0.1)"
typography:
  display:
    fontFamily: "Fraunces, Georgia, serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.2
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.6
  label:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
  mono:
    fontFamily: "JetBrains Mono, SF Mono, monospace"
    fontSize: "0.8125rem"
    fontWeight: 500
    lineHeight: 1.4
rounded:
  sm: 6px
  md: 8px
  lg: 12px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{neutral-surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    border: "1px solid {colors.primary}"
  input:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{neutral-surface}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    border: "1px solid rgba(226,224,219,0.2)"
  card:
    backgroundColor: "rgba(255,255,255,0.05)"
    textColor: "{neutral-surface}"
    rounded: "{rounded.lg}"
    padding: "16px"
    border: "1px solid rgba(226,224,219,0.2)"
---

# Design System: Forge

## 1. Overview

**Creative North Star: "The Content Pipeline"**

Raw material flows in — RSS feeds, web searches, topic seeds — passes through the forge of LLM processing, and emerges as refined, publishable content. The interface is the pipeline control room: precise instruments, clear readouts, direct manipulation.

The system is **editorial and tactile** — a dark canvas that evokes the quiet focus of a writer's workspace, not a glowing SaaS dashboard. Surfaces sit in tonal layers rather than floating on shadows. Typography carries the hierarchy: Fraunces serif for headings (authoritative, warm, editorial), DM Sans for body (clean, approachable, contemporary). The burnt orange accent is the single point of action — every time it appears, it means "do this thing."

Forge explicitly rejects the generic AI-tool aesthetic: no purple gradients, no glassmorphism, no cute robot illustrations, no sparkle-emoji overload. The interface is restrained because the content is the point. Motion is purposeful and state-communicating. The tool disappears; the writing remains.

**Key Characteristics:**
- Dark-mode-first, editorial atmosphere
- Tonal layering instead of shadows (dark mode doesn't need drop shadows)
- Single accent color reserved exclusively for primary actions and active selection
- Typography-driven hierarchy with serif/sans pairing
- Restrained motion — state transitions only, no decorative choreography
- Consistent component vocabulary across every screen

## 2. Colors

A restrained palette of warm charcoal, warm off-white, and burnt orange. Neutrals are slightly warm (chroma ~0.01 toward yellow-orange) to avoid clinical gray; the warmth comes from the tint, not from surface color.

### Primary
- **Burnt Orange** (`#C96B2C`): The single action color. Primary buttons, active navigation items, selected states, category labels. Appears on ≤10% of any given screen — its rarity is the point.

### Success
- **Moss Green** (`#567A61`): Completion states, approval indicators, step progress "done." Never used for action buttons.

### Danger
- **Brick Red** (`#B33C3C`): Destructive actions (delete, reject, remove). Errors.

### Neutral
- **Charcoal** (`#1D1F24`): Main background (app is dark-mode-first).
- **Warm White** (`#F7F6F3`): Primary text color on dark bg. Surface bg in light mode.
- **Elevated Surface** (`rgba(255,255,255,0.05)` on charcoal): Cards, panels, sidebar — tonal layer above base.
- **Warm Gray Border** (`rgba(226,224,219,0.2)`): Subtle dividers between elements.
- **Warm Gray Text** (`#5C5B58` dark / `#6E7178` light): Secondary text, metadata, timestamps.
- **Muted Gray** (`#8C8A86` dark / `#A6A9B0` light): Placeholder text, disabled states.

### Named Rules
**The One Voice Rule.** Burnt orange is the single action color. It appears on buttons, selection rings, and active nav items — nowhere else. If an element needs a color to communicate state, it uses success (green), danger (red), or neutral (gray), never a second accent.

**The Tonal Layer Rule.** Depth is conveyed through lightness difference, not shadow. Elevated surfaces are brighter (higher lightness) than the base, on a single plane. Dark mode doesn't need drop shadows.

**The Mode Distinction Rule.** The interface operates in two distinct modes — **Writing Mode** and **Management Mode** — each with its own visual language:
- **Writing Mode** (editors: Article compose, Newsletter editor): Minimal chrome. The navigation sidebar is not visible. Metadata (word count, status, date) lives in a discrete header with small text and/or a collapsible side panel that is **closed by default**, opened on demand. No cards, no badges. The writing surface is the point.
- **Management Mode** (Discover, Library, Article/Newsletter/Idea lists, Settings): May show data density (counts, dates, status), but still follows all other rules (One Voice, no colored pills in dense lists, hairline dividers).

**The Plain Metadata Rule.** In dense list contexts (Discover article list, Library, Article list, Newsletter list, Ideas list), tags, categories, and status render as plain text (`text-secondary`/`text-muted`), separated by `·`, never as colored badges/pills with background tint.

**The Hairline List Rule.** Dense lists of items use a **hairline divider** (1px `border-bottom` at `/10` opacity) between rows, not card per item. The card visual (`rounded-xl border p-4 bg`) is reserved for detail panels, focused single-item views, and empty states — never for each row in a list.

## 3. Typography

**Display Font:** Fraunces (with Georgia, serif fallback)
**Body Font:** DM Sans (with system-ui, sans-serif fallback)
**Label/Mono Font:** JetBrains Mono (with SF Mono, monospace fallback)

**Character:** A pairing of authority and warmth. Fraunces brings editorial weight — its variable optical sizes make it feel typeset, not typed. DM Sans provides a clean, approachable reading experience for scanning lists of articles, metadata, and form labels while keeping a warm, slightly humanist character that contrasts with Fraunces's formality. The pairing reads as contemporary-editorial rather than technical-corporate.

### Hierarchy
- **Display** (Fraunces 600, 2.25rem / 36px, 1.2): Page titles only. Appears once per screen at most.
- **Headline** (Fraunces 600, 1.5rem / 24px, 1.3): Section headings within a page.
- **Title** (DM Sans 500, 1rem / 16px, 1.4): Card titles, list item titles, dialog headings.
- **Body** (DM Sans 400, 1rem / 16px, 1.6): Paragraphs, descriptions, running text. Max line length 70ch.
- **Label** (DM Sans 500, 0.8125rem / 13px, 1.4): Buttons, form labels, navigation items, table headers.
- **Mono** (JetBrains Mono 500, 0.8125rem / 13px, 1.4): Tags, timestamps, versions, code snippets, URLs.

### Named Rules
**The One-Family Interface Rule.** Buttons, labels, navigation, body, and data use DM Sans exclusively. Fraunces is reserved for page and section titles only — never in buttons, never in form labels, never in navigation.

## 4. Elevation

Forge uses a **tonal layering** system rather than drop shadows. Depth is expressed exclusively through lightness contrast between the base canvas and elevated surfaces. This is a deliberate choice: dark-mode-first interfaces with true black backgrounds make shadows invisible or artificial; tonal separation reads cleaner and feels more like a physical material stack.

In the dark theme: base `#1D1F24` → card/surface `rgba(255,255,255,0.05)` → hover `rgba(255,255,255,0.08)` → active/selected `rgba(255,255,255,0.1)`.

In the light theme: base `#F7F6F3` → card/surface `#FFFFFF` → hover `rgba(0,0,0,0.05)` → active/selected `rgba(0,0,0,0.1)`.

No `box-shadow` on any surface at rest. No floating UI (no floating action buttons, no floating cards). The page is a flat material plane with light/dark tonal steps.

### Named Rules
**The Flat-By-Default Rule.** Surfaces are flat at rest and in their natural state. The only depth cue is the lightness step between layers. Shadows do not exist.

## 5. Components

### Buttons
- **Shape:** Gently rounded corners (8px radius).
- **Primary:** Burnt orange (`#C96B2C`) background, warm white (`#F7F6F3`) text. Opacity transition to 90% on hover. No shadow. Inner padding 8px 16px.
- **Secondary / Outline:** Transparent background, burnt orange text, 1px burnt orange border. On hover, fills with burnt orange and text turns white.
- **Ghost / Icon:** Transparent, muted text, no border. On hover, subtle background fill.
- **Disabled:** 50% opacity on primary buttons; no pointer events.
- **Motion:** 120ms opacity transition on hover. 100ms transform on active (translates down 1px for a tactile press feel).

### Chips / Tags
- **Shape:** Fully rounded (9999px radius), small padding (2px 8px).
- **Style:** Semi-transparent background on dark (`rgba(255,255,255,0.1)`), muted text.
- **Active/Filter:** Burnt orange background for active filter pills.
- **Removable:** Tags include an X icon button for removal, colored to match.
- **Dense list context:** In lists (Discover, Library, Newsletters, Articles, Ideas), tags/categories/status render as **plain text** (`text-secondary`/`text-muted`) separated by `·`, never as pills or badges with background.

### Cards / Containers
- **Corner Style:** Rounded (12px radius).
- **Background:** Semi-transparent light layer on dark (`rgba(255,255,255,0.05)`) or white on light.
- **Border:** Subtle warm-gray border (`rgba(226,224,219,0.2)`).
- **Shadow:** None (follows Flat-By-Default Rule).
- **Internal Padding:** 16px.
- **States:** Selected cards get a 1px ring in burnt orange. Used/in-edition cards get 60% opacity + "Used" badge.
- **Hairline list variant:** In dense list contexts, items use a **hairline divider row** instead of a card: no background at rest, `border-bottom: 1px` at `/10` opacity, `py-2` to `py-3` vertical padding, hover adds subtle background tint, selected state uses accent text color.

### Inputs / Fields
- **Shape:** Rounded (8px radius).
- **Style:** Semi-transparent light background, subtle border, 8px 16px padding.
- **Focus:** Border transitions to burnt orange. No glow, no outline — just the color shift.
- **Placeholder:** Muted gray text (`#8C8A86` dark).
- **Error:** Red border + red tinted background (`rgba(179,60,60,0.2)`).

### Navigation (Sidebar)
- **Style:** Vertical sidebar, full height, column layout.
- **Background:** Matches page base (`#1D1F24`), no distinct panel.
- **Item typography:** DM Sans 500, 0.875rem / 14px.
- **Default:** Muted secondary text.
- **Hover:** Subtle background fill + brightens text.
- **Active:** Burnt orange text color only, no background block. The active route is identified by the color of the text alone.
- **Collapsed mode:** 64px wide, shows icons only. Animates width at 200ms.

### Metadata Panel (Editor — Article & Newsletter)
- **Placement:** Right side of the editor workspace, toggled via an icon button in the toolbar corner (e.g., `PanelRight` / `layout-sidebar-right`).
- **Default state:** Closed. The icon button is always visible; clicking it opens the panel.
- **When open:** Shows outline, document stats (word count, reading time, character count, headings), article status, and AI editorial assistance panels.
- **Panels:** Each section is a `CollapsiblePanel` — the stats section is closed by default, other sections are open by default.
- **Visual:** `w-72`, `border-l` at `/10` opacity, surface `bg-[var(--color-bg-surface-elevated)]`.
- **Motion:** Width transition at `300ms ease-out`, content fades in.

### Tabs
- **Step flow tabs** (used in Digest assemble flow): Burnt orange for active step, muted gray for future, moss green checkmark for completed.
- **Filter pills** (category, tag): Fully rounded, burnt orange when active, muted when inactive.

## 6. Do's and Don'ts

### Do:
- **Do** use burnt orange for exactly one primary action per screen. Its rarity communicates importance.
- **Do** prefer tonal layering over box shadows for depth.
- **Do** use Fraunces for page titles (once per page) and DM Sans for everything else.
- **Do** keep body text at WCAG AA contrast (≥4.5:1 against background).
- **Do** use skeleton screens (shimmer animation) for content loading in lists and cards.
- **Do** use direct descriptive language in error messages — no apologies, no emoji, no "Oops!"
- **Do** keep motion under 200ms for UI transitions and 320ms for full-screen changes.
- **Do** use `prefers-reduced-motion` to disable all animations for users who request it.

### Don't:
- **Don't** use generic SaaS purple/blue gradients anywhere in the interface.
- **Don't** use glassmorphism (blur + transparency as a decorative surface treatment).
- **Don't** use gradient text (`background-clip: text` with gradient backgrounds).
- **Don't** use cute robot or friendly-AI illustrations.
- **Don't** use "magical AI" tone in copy — no sparkle emoji, no "look what AI can do."
- **Don't** put Fraunces (display font) in buttons, labels, navigation items, or body text.
- **Don't** use border-left greater than 1px as a colored accent stripe on cards or lists.
- **Don't** use display/h1 font sizes in sidebars, modals, or compact panels.
- **Don't** animate layout properties (width, height, top, left) — prefer transform and opacity.
- **Don't** use right-aligned text in left-to-right interfaces.
- **Don't** create identical card grids — vary content density and layout rhythm.
- **Don't** use the hero-metric template (big number, small label, supporting stats).
- **Don't** render tags, categories, or status as colored pills/badges in dense list contexts — use plain text with `·` separators instead.
- **Don't** use the card visual (`rounded-xl border p-4 bg`) for every row in a dense list — use hairline dividers between rows.
- **Don't** use a colored background block to indicate the active navigation item — text color alone is sufficient.
