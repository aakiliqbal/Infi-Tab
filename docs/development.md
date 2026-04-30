# Development Notes

This document captures the current state of Infi Tab after the initial MVP build.

## Product Direction

Infi Tab is a local-first Chrome new tab extension inspired by Infinity New Tab Pro. The first version intentionally avoids account sync and backend services. User data lives locally and can be exported/imported as a portable JSON backup.

## Current Feature Set

- Chrome Manifest V3 new tab override.
- React + Vite single-page new tab UI.
- Quick-link grid with add, edit, delete, and drag reorder.
- Folder tiles that open as modal overlays.
- Shortcut editing with title, URL, fallback label/color, uploaded icon image, and Simple Icons recommendations.
- Bundled default shortcuts with Simple Icons for common websites.
- User-uploaded wallpaper, including GIFs, stored in IndexedDB.
- Wallpaper dim and blur controls.
- Search provider presets: Google, Bing, Yahoo, Yandex, DuckDuckGo.
- Search-box customization: hide box, hide category labels, hide search mark, size, rounded corners, opacity.
- Layout customization: icon size, grid spacing, column count, label visibility.
- Right-side settings drawer opened by a gear button.
- Full JSON export/import backup with replace-only restore.
- Automated build checks plus unit and browser smoke tests.
- Manual release automation with GitHub Actions.

## Tech Stack

- `react` and `react-dom` for UI.
- `vite` for dev/build.
- `typescript` for type checking.
- `simple-icons` for bundled brand icons.
- Chrome extension Manifest V3.

## Project Structure

```text
public/manifest.json          Chrome extension manifest
src/main.tsx                  React entry point
src/ui/App.tsx                New Tab Surface composition
src/ui/hooks/useNewTabController.ts  State, persistence, and overlay actions
src/ui/ShortcutGrid.tsx       Shortcut Page rendering and drag/drop
src/ui/ShortcutIcon.tsx       Shortcut icon rendering
src/ui/SettingsDrawer.tsx     Settings Drawer composition
src/ui/settings/*             Search, Grid Layout, Wallpaper, and Backup sections
src/ui/modals/*               Folder and shortcut modal overlays
src/ui/model/drafts.ts        Editor draft types and defaults
src/ui/hooks/useShortcutGridMetrics.ts  Grid fitting calculations
src/ui/styles.css             Application styling
tests/smoke.spec.ts           Browser smoke test
src/domain/backup.test.ts     Backup parsing and migration tests
vitest.config.ts              Unit test runner config
playwright.config.ts          Browser smoke test config
src/domain/tabState.ts        App state types and default state
src/domain/brandIcons.ts      Curated Simple Icons registry and matching
src/domain/tabOperations.ts   Shortcut, Folder, and layout mutation operations
src/domain/backup.ts          Backup parsing and compatibility defaults
src/infrastructure/fileData.ts  File-to-data-URL adapter
src/infrastructure/mediaStorage.ts  IndexedDB media adapter and state hydration
src/infrastructure/tabStorage.ts  Storage adapter
CONTEXT.md                    Domain glossary and current decisions
docs/architecture-review.md   Architecture deepening notes
docs/roadmap-issues.md        Future issue backlog
docs/development.md           Current development notes
```

## State Model

The source of truth is `TabState` in `src/domain/tabState.ts`.

Top-level fields:

- `schemaVersion`: currently `2`.
- `searchProvider`: active fixed search provider.
- `layout`: search and grid customization settings.
- `wallpaper`: wallpaper data URL plus stable media ID, dim, and blur settings.
- `tiles`: flat map of all `Shortcut` and `Folder` records by ID.
- `pages`: ordered Shortcut Pages. Each page owns a `tileIds[]` list for Top-Level Tile display order.

`Shortcut` icons support three modes:

- `fallback`: generated label and background color.
- `brand`: bundled Simple Icons ID.
- `image`: uploaded image data URL plus stable media ID.

Folders store child shortcuts by ID through `childIds[]`; child shortcut records still live in the flat `tiles` map. Legacy schema v1 state and backups are migrated on load/import from `quickLinks`, nested folder `quickLinks`, and `topLevelTiles` into the v2 flat map and page structure.

## Storage

Runtime state is persisted with `chrome.storage.local` through `src/infrastructure/tabStorage.ts`. Large wallpaper and uploaded shortcut images are stored in IndexedDB through `src/infrastructure/mediaStorage.ts`, while the JSON state keeps only stable media IDs.

The manifest includes:

```json
"permissions": ["storage", "unlimitedStorage"]
```

`unlimitedStorage` remains enabled for local-first storage headroom, but the large media payloads now live in IndexedDB instead of the main Chrome storage blob.

When running outside Chrome extension context, the storage adapter falls back to `window.localStorage` so Vite development works in a normal browser tab.

## Backup And Restore

JSON export serializes the full `TabState`, including wallpaper and uploaded icon data URLs so backups stay portable.

Import is replace-only:

1. User chooses a JSON file.
2. App validates the basic backup shape.
3. User confirms replacement.
4. Current state is replaced.

Older v1 backups are migrated to schema v2. Backups missing newer wallpaper fields get defaults for `dim` and `blur`. On load, media IDs are hydrated back into data URLs from IndexedDB.

Backup parsing lives in `src/domain/backup.ts` so import compatibility has a dedicated seam.

## Icons

Brand icons are curated in `src/domain/brandIcons.ts`.

Current bundled icon set:

- Facebook
- GitHub
- Gmail
- Google
- Google Calendar
- Google Chrome
- Google Docs
- Google Drive
- Instagram
- Netflix
- Notion
- Reddit
- Spotify
- X
- YouTube

When a shortcut is saved, the app tries to match a bundled Simple Icon using the title and URL. The shortcut editor also shows recommended icons based on the same matcher. If no match is found, the app uses fallback label/color. If the user uploads an icon image, the uploaded image wins.

Simple Icons is CC0 as a package, but individual brand marks remain subject to their trademark guidelines.

Shortcut and Folder mutation rules live in `src/domain/tabOperations.ts`. This module is the intended test surface for shortcut creation, folder edits, drag reorder, and icon matching.

## UI Decisions

- Main app is a single new-tab surface rather than separate extension pages.
- Settings open in a right-side drawer so more controls fit without covering the whole page.
- Folder contents open in modal overlays.
- Drag/drop reorder exists, but advanced reorder-vs-folder-combine animation is deferred.
- Local JSON backup is the first sync strategy. Account sync is deferred.

## Development Commands

```bash
npm install
npm run dev
npm run build
```

Load the built extension from `dist/` through `chrome://extensions/` with Developer mode enabled.

## Release Workflow

Release automation lives in `.github/workflows/release.yml`.

The workflow is manual-only and creates a release directly when run:

- `package.json` and `public/manifest.json` must have the same version.
- The workflow fails if the target tag already exists.
- The workflow builds `dist/`, zips it, creates a `vX.Y.Z` GitHub release, and attaches the zip.
- Release notes are generated from commit subjects since the previous tag.

Before running the workflow, intentionally bump the version in both version files and commit that change.

## Current Known Gaps

- Drag/drop lacks polished insertion and folder-combine previews.
- Favicon lookup for unknown websites is not implemented.
- Keyboard focus trapping for modals/drawer is not complete.
- Chrome Web Store assets and privacy text are not prepared.

See `docs/roadmap-issues.md` for issue-ready future slices.

See `docs/architecture-review.md` for the latest architecture deepening pass.
