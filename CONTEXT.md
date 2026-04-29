# Context

## Glossary

**New Tab Surface**  
The browser page rendered by Infi Tab when Chrome opens a new tab.

**Shortcut**  
A top-level or folder-contained link with a title, URL, and icon.

**Shortcut Page**  
A visible partition of the New Tab Surface's Shortcut and Folder tiles, sized so it fits within the viewport without vertical page scrolling.
_Avoid_: browser page, tab page, slide

**Folder**  
A tile on the New Tab Surface that opens a modal overlay containing shortcuts.

**Top-Level Tile**  
A user-arrangeable tile on the New Tab Surface, either a Shortcut or a Folder.
_Avoid_: mixed item, grid item

**Grid Layout**  
A user-selected row and column arrangement that defines how many Top-Level Tiles appear on each Shortcut Page.
_Avoid_: automatic capacity, measured capacity, layout mode

**Wallpaper**  
The user-selected background media for the New Tab Surface. It may be a static image or GIF and is represented as a data URL in the current state model.

**Settings Drawer**  
The right-side drawer that exposes Search, Grid Layout, Wallpaper, and Backup controls.

**Backup**  
A portable JSON representation of the full `TabState`, including user settings and media data URLs.

**Brand Icon**  
A bundled Simple Icons entry matched from shortcut title or URL.

**Fallback Icon**  
A generated icon using a short text label and background color when no Brand Icon or uploaded image is available.

## Current Decisions

- Infi Tab is local-first; no backend or account sync exists in the MVP.
- `chrome.storage.local` is the runtime persistence adapter.
- JSON Backup is replace-only on import.
- Wallpapers and uploaded icons currently remain portable by being stored as data URLs.
- The New Tab Surface is a single React app, not multiple extension pages.
- Shortcut creation tiles participate in Shortcut Page capacity after all user Shortcuts and Folders.
- Shortcut Pages contain one shared sequence of Top-Level Tiles; Shortcuts and Folders can be arranged together by the user.
- The display order of Top-Level Tiles is represented by an explicit ordered list of tile references, while Shortcut and Folder records remain the source of tile details.
- Shortcut Page capacity comes from the selected Grid Layout.
- The main New Tab Surface must not browser-scroll; overlays such as the Settings Drawer and modals may scroll internally.
- Mouse wheel navigation applies anywhere on the main New Tab Surface, except while an overlay is open or focus is inside a text entry or selection control.
- Wheel gestures are thresholded so one intentional scroll gesture moves one Shortcut Page.
- Infinite wrapping applies to previous/next Shortcut Page navigation; absolute navigation such as page-dot selection jumps directly.
- If layout changes reduce the number of Shortcut Pages, the active Shortcut Page is clamped to the nearest valid page.
- After creating a Shortcut or Folder, the active Shortcut Page moves to the page containing the new Top-Level Tile.
- Editing an existing Shortcut or Folder preserves the active Shortcut Page unless page clamping is required.
- Initial Top-Level Tile drag-and-drop reorders only within the active Shortcut Page; cross-page drag is deferred.
- Shortcut Pages are derived windows over the ordered Top-Level Tile list, so deleting a tile shifts later tiles forward instead of leaving page gaps.
- Shortcut Page dots are shown only when there is more than one Shortcut Page.
- Shortcut Page dots are interactive absolute navigation controls.
- The active Shortcut Page is transient UI state and starts at the first page on each new tab load.
- Shortcut Page pagination applies only to Top-Level Tiles on the New Tab Surface; Folder modal contents are outside this feature.
- When there are no user Top-Level Tiles, creation tiles appear on the first Shortcut Page and do not require page dots unless pagination is actually needed.
- A Grid Layout's rows and columns define the tile slots on each Shortcut Page.
- The selected Grid Layout's row and column count is preserved across viewports; tile presentation may scale down to avoid browser scrolling.
- Grid Layout presets are 2x4, 2x5, 2x6, 2x7, and 3x3, with a Customize option for user-defined rows and columns.
- Custom Grid Layout rows and columns range from 1 to 8 and default to the currently selected Grid Layout when opened.
- The Settings Drawer replaces the generic Layout section with Grid Layout controls; row count, column count, column spacing, line spacing, and icon size are configured through Grid Layout customization.
- Grid Layout persistence records both preset/custom mode and numeric row, column, spacing, and icon-size values.
- Selecting a Grid Layout preset overwrites rows and columns with preset values while preserving current spacing and icon-size values.
- Column spacing, line spacing, and icon size apply across preset and custom Grid Layout modes.
- Grid Layout uses separate column spacing and line spacing settings.
- Grid Layout icon size is stored and displayed as a percentage from 50% to 120%.
- Grid Layout column spacing and line spacing are stored and displayed as percentages from 0% to 100%.
- The default Grid Layout is the 2x6 preset with 100% icon size, 100% column spacing, and 100% line spacing.
- A small footer area is reserved for Shortcut Page controls even when page dots are hidden, keeping capacity measurement stable.
- Shortcut Page changes use a short fade/slide transition, disabled when reduced motion is requested.
- Keyboard previous/next navigation uses PageUp/PageDown or ArrowLeft/ArrowRight on the main New Tab Surface, except inside inputs or overlays.
- Touch swipe navigation between Shortcut Pages is deferred.
- Existing state without an explicit Top-Level Tile order migrates to the previous visual order: Shortcuts first, then Folders.
- The Shortcut Page feature is implemented in two slices: first persistent Top-Level Tile ordering, then measured pagination and navigation.
