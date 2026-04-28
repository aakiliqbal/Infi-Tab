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
- User-uploaded wallpaper, including GIFs.
- Wallpaper dim and blur controls.
- Search provider presets: Google, Bing, Yahoo, Yandex, DuckDuckGo.
- Search-box customization: hide box, hide category labels, hide search mark, size, rounded corners, opacity.
- Layout customization: icon size, grid spacing, column count, label visibility.
- Right-side settings drawer opened by a gear button.
- Full JSON export/import backup with replace-only restore.
- Release automation with Release Please and GitHub Actions.

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
src/ui/App.tsx                Main application state and UI
src/ui/styles.css             Application styling
src/domain/tabState.ts        App state types and default state
src/domain/brandIcons.ts      Curated Simple Icons registry and matching
src/infrastructure/tabStorage.ts  Storage adapter
docs/roadmap-issues.md        Future issue backlog
docs/development.md           Current development notes
```

## State Model

The source of truth is `TabState` in `src/domain/tabState.ts`.

Top-level fields:

- `schemaVersion`: currently `1`.
- `searchProvider`: active fixed search provider.
- `layout`: search and grid customization settings.
- `wallpaper`: wallpaper data URL plus dim/blur settings.
- `quickLinks`: top-level shortcut tiles.
- `folders`: folder tiles with contained shortcuts.

`QuickLink` icons support three modes:

- `fallback`: generated label and background color.
- `brand`: bundled Simple Icons ID.
- `image`: uploaded image data URL.

## Storage

Runtime state is persisted with `chrome.storage.local` through `src/infrastructure/tabStorage.ts`.

The manifest includes:

```json
"permissions": ["storage", "unlimitedStorage"]
```

`unlimitedStorage` is used because wallpapers and GIFs are stored locally as data URLs and may exceed Chrome's normal storage quota.

When running outside Chrome extension context, the storage adapter falls back to `window.localStorage` so Vite development works in a normal browser tab.

## Backup And Restore

JSON export serializes the full `TabState`, including wallpaper and uploaded icon data URLs.

Import is replace-only:

1. User chooses a JSON file.
2. App validates the basic backup shape.
3. User confirms replacement.
4. Current state is replaced.

Older backups missing newer wallpaper fields get defaults for `dim` and `blur`.

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

The workflow is manual-only and uses Release Please:

- Conventional commits drive version bumps and changelog entries.
- Running the `Release` workflow manually opens or updates a release PR.
- The release PR updates `CHANGELOG.md`, `package.json`, `package-lock.json`, and `public/manifest.json`.
- After the release PR is merged, running the `Release` workflow manually again creates the release, builds `dist/`, zips it, and attaches the zip to the GitHub release.

Use commit messages like:

```text
feat: add icon recommendations
fix: preserve GIF wallpaper data
chore: update release workflow
```

## Current Known Gaps

- No automated browser smoke tests yet.
- Backup import validation is minimal.
- Large media is stored directly in extension storage instead of IndexedDB.
- Drag/drop lacks polished insertion and folder-combine previews.
- Favicon lookup for unknown websites is not implemented.
- Keyboard focus trapping for modals/drawer is not complete.
- Chrome Web Store assets and privacy text are not prepared.

See `docs/roadmap-issues.md` for issue-ready future slices.
