# Roadmap Issues

These are future vertical slices for Infi Tab. Each issue is scoped to produce a demoable or verifiable result.

## 1. Add automated build and UI smoke test coverage

**Type:** AFK

## What to build

Add a basic automated verification path for the extension so future changes can be checked beyond a local manual review. This should cover the production build and at least one browser-level smoke test that opens the new tab UI and verifies the main surfaces render.

## Acceptance criteria

- [ ] `npm run build` is run in CI on pull requests.
- [ ] A browser smoke test verifies the new tab shell, settings drawer, shortcut grid, and backup controls render without runtime errors.
- [ ] The test command is documented in `README.md`.

## Blocked by

None - can start immediately

## 2. Harden backup import with schema migration and preview validation

**Type:** AFK

## What to build

Make JSON import safer by validating backup contents before replacement and by migrating older backup shapes to the current schema. The import flow should still be replace-only, but users should get clear feedback before destructive restore.

## Acceptance criteria

- [ ] Older backups missing newer optional fields import with defaults.
- [ ] Invalid backup files show a specific error instead of a generic failure.
- [ ] Import confirmation summarizes what will be replaced.
- [ ] Backup import/export behavior is covered by tests.

## Blocked by

Blocked by issue 1 if browser/UI tests are used; otherwise can start immediately.

## 3. Move large wallpaper/icon media to IndexedDB while preserving JSON backups

**Type:** AFK

## What to build

Store large user media such as wallpapers, GIFs, and uploaded shortcut icons in IndexedDB instead of keeping all media directly inside `chrome.storage.local`. JSON export/import must still include the media content so backups remain portable.

## Acceptance criteria

- [ ] Uploaded wallpapers and custom icons are stored in IndexedDB.
- [ ] App state references media by stable internal IDs.
- [ ] JSON export serializes media content into the backup file.
- [ ] JSON import restores media into IndexedDB and reconnects state references.
- [ ] Large GIF wallpaper behavior is verified.

## Blocked by

Blocked by issue 2.

## 4. Add polished drag/drop intent animation and folder combine behavior

**Type:** HITL

## What to build

Upgrade shortcut dragging so users can distinguish reorder intent from folder-combine intent. Dragging near an edge should preview insertion; dragging over the center should preview combining into a folder. Dropping onto a compatible target should create or update a folder.

## Acceptance criteria

- [ ] Reorder intent animates nearby icons left/right or up/down.
- [ ] Combine intent has a visually distinct hover state.
- [ ] Dropping one shortcut onto another creates a folder.
- [ ] Dropping onto an existing folder adds the shortcut to that folder.
- [ ] Folder creation through drag/drop persists and survives reload.

## Blocked by

None - can start immediately.

## 5. Expand icon recommendations and add optional favicon lookup

**Type:** HITL

## What to build

Improve icon recommendations when users add shortcuts. Keep bundled Simple Icons matching for known brands, and decide whether to add favicon lookup for sites not covered by Simple Icons.

## Acceptance criteria

- [ ] Recommendation matching covers more common websites.
- [ ] The shortcut editor shows useful recommendations from title and URL.
- [ ] Unknown websites still fall back to generated label icons.
- [ ] If favicon lookup is enabled, permissions and privacy impact are documented.
- [ ] User-uploaded icons continue to override recommendations.

## Blocked by

None - can start immediately.

## 6. Add settings drawer sections for icon, folder, and layout customization

**Type:** AFK

## What to build

Extend the settings drawer so customization is easier to scan and closer to the reference screenshots. Add dedicated sections for icon appearance, folder behavior, and grid layout while preserving the current settings.

## Acceptance criteria

- [ ] Settings drawer has clear sections for Search, Wallpaper, Icons, Folders, Layout, and Backup.
- [ ] Icon settings apply globally without breaking per-shortcut custom icons.
- [ ] Folder settings are reflected in folder tiles and folder modals.
- [ ] Drawer remains usable at mobile and desktop viewport sizes.

## Blocked by

None - can start immediately.

## 7. Add keyboard accessibility and focus management across modals/drawer

**Type:** AFK

## What to build

Make the extension usable with keyboard navigation. Focus should move predictably into dialogs/drawers, stay contained while open, and return to the triggering control when closed.

## Acceptance criteria

- [ ] Settings drawer traps focus while open.
- [ ] Shortcut and folder modals trap focus while open.
- [ ] `Escape` closes the active overlay only.
- [ ] Focus returns to the trigger after closing.
- [ ] Interactive controls have accessible names.

## Blocked by

Blocked by issue 1 if browser/UI tests are used; otherwise can start immediately.

## 8. Prepare Chrome Web Store release package

**Type:** HITL

## What to build

Prepare the extension for Chrome Web Store submission. This includes permissions review, privacy wording, screenshots, store copy, icon assets, and a packaged release artifact.

## Acceptance criteria

- [ ] Extension permissions are reviewed and justified.
- [ ] Privacy policy/store disclosure text is drafted.
- [ ] Required extension icons are added.
- [ ] Store screenshots are captured from the current UI.
- [ ] Release zip from GitHub Actions can be uploaded to the Chrome Web Store.

## Blocked by

Blocked by issue 1 and the release workflow being merged to `main`.

