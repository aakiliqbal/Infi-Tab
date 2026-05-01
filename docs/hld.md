# High-Level Design

## Product Overview

Infi Tab is a local-first Chrome Manifest V3 new-tab extension. Product shape confirmed by reference extension analysis:

- Fixed full-viewport new tab page
- Configurable search box
- Paged shortcut grid with folders
- Wallpaper layer (image/GIF)
- Right-side settings drawer
- JSON backup import/export

## Architecture Layers

```
Chrome New Tab
  └─ public/manifest.json          # MV3 extension manifest
      └─ src/main.tsx           # React entry point
          └─ src/ui/App.tsx     # Root component
              ├─ useNewTabController()    # Transient UI state
              ├─ ShortcutGrid     # Paged tile grid
              ├─ SettingsDrawer  # Settings surface
              ├─ FolderModal   # Folder edit modal
              ├─ FolderPanel  # Folder child view
              └─ ShortcutModal # Shortcut add/edit

Domain Layer (src/domain/)
  ├─ tabState.ts        # State schema & defaults
  ├─ tabOperations.ts  # Resolved view models
  ├─ dropActions.ts   # DnD domain logic
  └─ backup.ts      # Import/export

Infrastructure Layer (src/infrastructure/)
  ├─ useTabStore.ts    # Zustand + immer store
  ├─ tabStorage.ts   # chrome.storage.local
  ├─ mediaStorage.ts # IndexedDB for media
  └─ fileData.ts    # Browser File API
```

## State Model

```ts
TabState {
  schemaVersion: 2
  searchProvider: string
  layout: GridLayout
  wallpaper: Wallpaper
  tiles: Record<TileId, Shortcut | Folder>
  pages: ShortcutPage[]
}

ShortcutPage {
  id: string
  tileIds: TileId[]  // Ordered references
}

Shortcut {
  kind: "shortcut"
  id: TileId
  title: string
  url: string
  icon: IconData
}

Folder {
  kind: "folder"
  id: TileId
  title: string
  icon: IconData
  childIds: TileId[]
}
```

## Key Invariants

1. **Flat tile map**: All tiles in single `tiles` map, no nesting
2. **Position not in tile**: Page order in `pages[].tileIds`, not in tile records
3. **Folder containment**: Children in `folder.childIds`, not nested records
4. **One store**: All persisted state in Zustand + immer store
5. **Local-first**: No backend, chrome.storage.local persistence

## Product Surfaces

| Surface | Description |
|---------|-----------|
| New Tab Surface | Only first-class runtime page |
| Shortcut Grid | Paged top-level tile grid |
| Settings Drawer | Right-side settings |
| Shortcut Modal | Add/edit shortcuts |
| Folder Modal | Edit folder metadata |
| Folder Panel | View folder children |
| Backup Flow | JSON replace-only import |

## Technology Choices

| Concern | Choice | Rationale |
|---------|--------|-----------|
| UI Framework | React 18 | Reference uses Vue; React chosen for ecosystem |
| Build Tool | Vite | Fast HMR, extension-friendly |
| State | Zustand + Immer | Store shape from ADR 0004 |
| Drag | Native HTML | dnd-kit deferred; native fits current behavior |
| Styling | CSS Modules | No Tailwind yet; simple approach |
| Persistence | chrome.storage.local | Per extension API |
| Animation | Motion (Framer Motion) | Reduced motion support |
| Icons | Lucide + Simple Icons | Brand matching |

## Reference Extension Learnings

The extracted Infinity New Tab Pro extension confirms:

1. Fixed full-viewport with `overflow: hidden`
2. Wallpaper as base layer (CSS background)
3. Search bar positioned top-center
4. Paged grid using row/column variables
5. Page dots/arrows for pagination
6. Folder shows child count badge
7. Drag uses real tile overlay following pointer
8. 30/40/30 split zones for insert/combine/insert
9. Zone confirmation via 200ms timer
10. Cross-page via edge detection (unverified in source)

## Design Decisions from Code

| Decision | Location | Notes |
|----------|----------|-------|
| Native drag | ShortcutGrid.tsx | Custom overlay, no dnd-kit |
| Zone timer | 200ms debounce | Timer in useRef |
| Live shift | getTileShift() | FLIP-like animation |
| Overlay | dragOverlay state | Fixed position following pointer |
| Page dots | Conditional | Only when pageCount > 1 |
| Reduced motion | useReducedMotion | Respects prefers-reduced-motion |

## Current Implementation State

- [x] Top-level reorder (active page)
- [x] Combine (shortcut + shortcut → folder)
- [x] Add to folder (shortcut → folder)
- [ ] Cross-page drag (wired in domain, not UI)
- [ ] Folder child drag (wired in domain, not UI)
- [ ] Keyboard drag
- [ ] Touch drag

## Near-Term Direction

1. Extract drag hook from ShortcutGrid
2. Route native drag through resolveDrop()
3. Wire cross-page drag UI
4. Wire folder child promotion UI