# Newsletters Page Redesign: Kanban → List + Sidebar (like Digest)

## Context

Replace kanban board layout with list + sidebar pattern modeled after Digest page. Kanban (drag-and-drop, building/ready columns) removed in favor of filter tabs (one per status), scrollable card list, and sticky detail panel on right.

**Confirmed decisions:**
- Filter tabs: Todas, Building, Ready, Published, Archived
- Editor: separate route `/newsletters/:id/edit`
- Detail panel: sidebar on right (same as Digest)
- Sort: yes (newest/oldest/title)
- Stats bar: yes (counts per status)
- Action buttons on cards: yes (Edit, Duplicate, Preview)

## Files to change

### Create
| File | Purpose |
|------|---------|
| `src/features/newsletters/components/newsletter-list-card.tsx` | New list card (non-draggable, with action buttons) |
| `src/features/newsletters/editor-page.tsx` | Extracted editor for `/newsletters/:id/edit` route |

### Modify
| File | Change |
|------|--------|
| `src/features/newsletters/page.tsx` | **Full rewrite**: list+sidebar layout, filter tabs, sort, stats, no kanban, no inline editor |
| `src/features/newsletters/components/detail-panel.tsx` | Remove `border-l-0`, adjust border/shadow for sidebar context |
| `src/features/digest/components/filter-tabs.tsx` | Generalize tab config (accept `tabs`, `active`, `onChange`, `counts` as props) |
| `src/app/router.tsx` | Add `/newsletters/$id/edit` route |
| `src/i18n/locales/en.json` | Add newsletter tab labels, sort keys, card actions |
| `src/i18n/locales/pt.json` | Same in PT |
| `src/i18n/locales/es.json` | Same in ES |
| `src/features/digest/page.tsx` | Update FilterTabs usage — pass new tab config props |

### Delete
| File | Reason |
|------|--------|
| `src/features/newsletters/components/kanban-board.tsx` | No longer needed |
| `src/features/newsletters/components/newsletter-card.tsx` | Replaced by `newsletter-list-card.tsx` |
| `package.json` | Remove `@dnd-kit/core`, `@dnd-kit/sortable` deps |

## Component tree (new page)

```
NewslettersPage
├── Header (title + "New Newsletter" button)
├── StatsBar inline (counts per status as pills)
├── Toolbar
│   ├── FilterTabs (Todas / Building / Ready / Published / Archived)
│   └── Sort dropdown (newest / oldest / title)
├── Main flex container (list + sidebar)
│   ├── Card list (left, scrollable)
│   │   ├── NewsletterListCard (title, status badge, destination,
│   │   │   article count, tags, last edited, Edit/Duplicate/Preview)
│   │   └── Empty state per tab
│   └── Detail panel (right, sticky, on selection)
│       └── NewsletterDetailPanel (existing, adjusted border)
└── Preview overlay (full-screen, same as current)
```

## Data flow

- **Query**: `useQuery(["editions"], () => api.newsletters.list())` — unchanged
- **Tab filtering**: `activeTab === "todas" ? editions : editions.filter(e => e.status === activeTab)`
- **Sort**: `sortItems(filteredByTab, sortBy)` — reused sort fn from digest
- **Tab counts**: computed from editions list
- **Detail panel articles**: fetch via `api.newsletters.articles(id)` on select
- **Stats**: computed from editions (no extra API call)

## Steps

### 1. Generalize FilterTabs
`src/features/digest/components/filter-tabs.tsx`:
- New props: `tabs: TabItem[]`, `active`, `onChange`, `counts`
- Remove hardcoded `FilterTab` type and digest-specific constants
- Update DigestPage usage

### 2. Rewrite newsletters page
`src/features/newsletters/page.tsx`:
- **Remove**: showEditor, handleDragEnd, kanban imports, @dnd-kit, archive section, editor render path
- **Add**: tabs, sort dropdown, NewsletterListCard, empty states per tab
- **Keep**: queries, selectedItem, detail panel, preview mode, all handlers
- Esc closes detail panel

### 3. Create NewsletterListCard
`src/features/newsletters/components/newsletter-list-card.tsx`:
- Props: item, isSelected, onClick, onEdit, onDuplicate, onPreview
- Card: hover/selected states, title, status badge, destination, count, tags, timestamp, action buttons
- No drag support

### 4. Adjust detail panel
`src/features/newsletters/components/detail-panel.tsx`:
- Remove `border-l-0`, use full border
- Simplify shadow for sidebar

### 5. Create editor page + route
`src/features/newsletters/editor-page.tsx`:
- Extract editor from current page.tsx (lines ~447-604)
- Fetch newsletter by ID on mount
- Back navigates to `/content/newsletters`
`src/app/router.tsx`:
- Route: `/newsletters/$id/edit`

### 6. i18n keys (3 locales)
Add: tabTodas, tabBuilding, tabReady, tabPublished, tabArchived
Add: sortNewest, sortOldest, sortTitle

### 7. Delete obsolete files
- Delete kanban-board.tsx, newsletter-card.tsx
- Remove @dnd-kit/* from package.json

## Verification

1. `npx tsc --noEmit` passes
2. Tabs filter, sort changes order
3. Detail panel opens on click, closes on Esc
4. "Edit" navigates to `/newsletters/:id/edit` with ContentEditor
5. Preview shows HTML
6. Stats bar matches counts
7. Create, Duplicate work
8. Empty states per tab
9. Loading skeleton
10. Digest page still works
11. Build succeeds without @dnd-kit
