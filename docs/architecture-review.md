# Architecture Review

This file records the first architecture deepening pass.

## Deepened Modules

### Tab Operations

**Files:** `src/domain/tabOperations.ts`, `src/ui/App.tsx`

**Problem:** Shortcut, Folder, drag/reorder, and icon-matching behavior lived inside `App.tsx`. That made the New Tab Surface module shallow: callers had to understand UI state, domain mutations, and persistence ordering at once.

**Solution:** Move domain mutations into `tabOperations.ts`. The interface now exposes operations such as `createQuickLinkFromDraft`, `upsertQuickLink`, `deleteQuickLinkFromState`, `createFolderFromDraft`, and `moveQuickLinkInState`.

**Benefits:** Locality improves because Shortcut and Folder mutation rules live in one module. Leverage improves because future tests can exercise domain behavior without rendering the New Tab Surface.

### Backup Parsing

**Files:** `src/domain/backup.ts`, `src/ui/App.tsx`

**Problem:** Backup validation was embedded in the UI module, so import behavior had no clear seam.

**Solution:** Move backup parsing and compatibility defaults into `backup.ts`.

**Benefits:** Backup schema changes now have locality. The backup module's interface is a natural test surface for import compatibility.

### File Data Adapter

**Files:** `src/infrastructure/fileData.ts`, `src/ui/App.tsx`

**Problem:** Browser `FileReader` behavior was inline in the UI module.

**Solution:** Move file-to-data-URL conversion into a small infrastructure adapter.

**Benefits:** File reading is isolated behind a tiny interface, making future IndexedDB/media work easier.

### Quick Link Icon View

**Files:** `src/ui/QuickLinkIcon.tsx`, `src/ui/App.tsx`

**Problem:** Brand, image, and fallback icon rendering was duplicated across top-level shortcuts and folder shortcuts.

**Solution:** Extract a reusable icon view module.

**Benefits:** Icon rendering changes now have locality and no longer require editing multiple JSX surfaces.

### Draft Types

**Files:** `src/ui/drafts.ts`, `src/ui/App.tsx`

**Problem:** Draft shape and empty draft defaults were mixed into the New Tab Surface implementation.

**Solution:** Move draft types and defaults into their own module.

**Benefits:** The New Tab Surface stays focused on orchestration while editor draft shape remains easy to find.

### Settings Drawer

**Files:** `src/ui/SettingsDrawer.tsx`, `src/ui/App.tsx`

**Problem:** Settings markup made the New Tab Surface module harder to scan. Understanding the app required reading all settings controls inline with shortcut and folder behavior.

**Solution:** Move the Settings Drawer behind a dedicated UI module. The New Tab Surface now passes state plus handler interfaces into the drawer.

**Benefits:** Drawer layout changes have locality, while the New Tab Surface keeps leverage as the orchestration module for state and overlays.

## Remaining Deepening Opportunities

1. Extract `ShortcutGrid` and `FolderOverlay` from `App.tsx` so grid behavior can evolve independently.
2. Add automated tests around `tabOperations.ts` and `backup.ts`.
3. Move media persistence behind a deeper module before implementing IndexedDB.
