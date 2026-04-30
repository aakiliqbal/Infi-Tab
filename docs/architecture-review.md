# Architecture Review

This file records the first architecture deepening pass.

## Deepened Modules

### Tab Operations

**Files:** `src/domain/tabOperations.ts`, `src/ui/App.tsx`

**Problem:** Shortcut, Folder, drag/reorder, and icon-matching behavior lived inside `App.tsx`. That made the New Tab Surface module shallow: callers had to understand UI state, domain mutations, and persistence ordering at once.

**Solution:** Move domain mutations into `tabOperations.ts`. The interface now exposes operations such as `createShortcutFromDraft`, `upsertShortcut`, `deleteShortcutFromState`, `createFolderFromDraft`, and `moveTopLevelTileInState`.

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

### Media Storage

**Files:** `src/infrastructure/mediaStorage.ts`, `src/infrastructure/tabStorage.ts`, `src/ui/hooks/useNewTabController.ts`

**Problem:** Wallpaper and uploaded shortcut images lived in the main state blob, which made Chrome storage carry the full media payload and kept the backup/import path coupled to raw data URLs.

**Solution:** Move media payloads into a dedicated IndexedDB-backed media module. The main tab state keeps stable media IDs, while load/save paths hydrate data URLs for rendering and strip them before writing to `chrome.storage.local`.

**Benefits:** Local state stays lean, the storage boundary is clearer, and backup import/export can keep media portable without pushing large blobs through the main settings store.

### Shortcut Icon View

**Files:** `src/ui/ShortcutIcon.tsx`, `src/ui/App.tsx`

**Problem:** Brand, image, and fallback icon rendering was duplicated across top-level shortcuts and folder shortcuts.

**Solution:** Extract a reusable icon view module.

**Benefits:** Icon rendering changes now have locality and no longer require editing multiple JSX surfaces.

### Draft Types

**Files:** `src/ui/model/drafts.ts`, `src/ui/App.tsx`

**Problem:** Draft shape and empty draft defaults were mixed into the New Tab Surface implementation.

**Solution:** Move draft types and defaults into their own module.

**Benefits:** The New Tab Surface stays focused on orchestration while editor draft shape remains easy to find.

### Settings Drawer

**Files:** `src/ui/SettingsDrawer.tsx`, `src/ui/App.tsx`

**Problem:** Settings markup made the New Tab Surface module harder to scan. Understanding the app required reading all settings controls inline with shortcut and folder behavior.

**Solution:** Move the Settings Drawer behind a dedicated UI module. The New Tab Surface now passes state plus handler interfaces into the drawer.

**Benefits:** Drawer layout changes have locality, while the New Tab Surface keeps leverage as the orchestration module for state and overlays.

### New Tab Controller

**Files:** `src/ui/hooks/useNewTabController.ts`, `src/ui/App.tsx`

**Problem:** `App.tsx` still mixed state loading, persistence, overlay actions, drag state, and backup logic with layout rendering. That made the root module shallow even after the view extracted.

**Solution:** Move the state machine and side-effectful actions into `useNewTabController`. The New Tab Surface now composes a controller hook, a shortcut grid, and separate modal/section modules.

**Benefits:** State mutations and persistence now have a tighter seam. The controller hook is a better test surface than the full page, and the view layer can evolve without re-reading storage and backup code.

### Flat Tile Store Foundation

**Files:** `src/domain/tabState.ts`, `src/stores/useTabStore.ts`, `src/infrastructure/tabStorage.ts`

**Problem:** Shortcut and Folder records were split across top-level arrays, while folders nested child shortcut records. That made drag/drop operations expensive to reason about because a move between the surface and a folder required copying records between structures.

**Solution:** Move persisted state to schema v2: a flat `tiles` map stores all `Shortcut` and `Folder` records, and `pages[].tileIds` stores display order. Add a Zustand + immer store shell with `chrome.storage.local` persistence and a v1-to-v2 migration path.

**Benefits:** Future drag actions can mutate ID arrays instead of copying shortcut records. Migration is isolated in the state module, and the store gives later slices a single persisted state boundary.

### Feature Modals and Settings Sections

**Files:** `src/ui/modals/*`, `src/ui/settings/*`, `src/ui/ShortcutGrid.tsx`

**Problem:** Folder overlays, shortcut editors, and settings subsections were embedded in larger files, so small UI changes required editing a large orchestration module.

**Solution:** Split the New Tab Surface into focused feature modules for the shortcut grid, folder panel, editor modals, and settings subsections.

**Benefits:** Locality improves because each feature now has one obvious file. Leverage improves because the view layer can be assembled from smaller, easier-to-reason-about pieces.

## Remaining Deepening Opportunities

1. Consider a small store module if the controller gains more cross-cutting state.
