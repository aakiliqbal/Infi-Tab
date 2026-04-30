import { CSSProperties, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { defaultTabState, searchProviders, type SearchProviderId } from "../domain/tabState";
import { SettingsDrawer } from "./SettingsDrawer";
import { ShortcutGrid, type ShortcutPageItem } from "./ShortcutGrid";
import { FolderModal } from "./modals/FolderModal";
import { FolderPanel } from "./modals/FolderPanel";
import { ShortcutModal } from "./modals/ShortcutModal";
import { useNewTabController } from "./hooks/useNewTabController";
import { useShortcutGridMetrics } from "./hooks/useShortcutGridMetrics";

export function App() {
  const controller = useNewTabController();
  const [query, setQuery] = useState("");
  const wheelDeltaRef = useRef(0);
  const wheelLockUntilRef = useRef(0);

  const shortcutPageItems = useMemo<ShortcutPageItem[]>(
    () => [
      ...controller.topLevelTiles,
      { key: "create:shortcut", type: "create-shortcut" },
      { key: "create:folder", type: "create-folder" }
    ],
    [controller.topLevelTiles]
  );

  const tabState = controller.tabState ?? defaultTabState;
  const pageCapacity = tabState.layout.gridLayout.rows * tabState.layout.gridLayout.columns;
  const shortcutPageCount = Math.max(1, Math.ceil(shortcutPageItems.length / pageCapacity));
  const activeShortcutPageIndex = Math.min(controller.activeShortcutPage, shortcutPageCount - 1);
  const visibleShortcutPageItems = shortcutPageItems.slice(
    activeShortcutPageIndex * pageCapacity,
    (activeShortcutPageIndex + 1) * pageCapacity
  );
  const { maxFittedIconSize, fittedLabelSize, fittedTileGap } = useShortcutGridMetrics(
    controller.gridRef,
    tabState.layout.gridLayout,
    tabState.layout.showLabels,
    activeShortcutPageIndex
  );

  useEffect(() => {
    if (controller.activeShortcutPage >= shortcutPageCount) {
      controller.setActiveShortcutPage(shortcutPageCount - 1);
    }
  }, [controller.activeShortcutPage, controller.setActiveShortcutPage, shortcutPageCount]);

  useEffect(() => {
    if (!controller.tabState || controller.hasOverlayOpen || shortcutPageCount <= 1) {
      return;
    }

    function movePage(direction: 1 | -1) {
      controller.setActiveShortcutPage((current) => {
        if (direction > 0) {
          return (current + 1) % shortcutPageCount;
        }

        return (current - 1 + shortcutPageCount) % shortcutPageCount;
      });
    }

    function handleWheel(event: WheelEvent) {
      if (isTextEntryControl(event.target)) {
        return;
      }

      event.preventDefault();
      const now = Date.now();
      if (now < wheelLockUntilRef.current) {
        return;
      }

      wheelDeltaRef.current += event.deltaY;
      if (Math.abs(wheelDeltaRef.current) < 90) {
        return;
      }

      movePage(wheelDeltaRef.current > 0 ? 1 : -1);
      wheelDeltaRef.current = 0;
      wheelLockUntilRef.current = now + 420;
    }

    function handlePageKey(event: KeyboardEvent) {
      if (isTextEntryControl(event.target)) {
        return;
      }

      if (event.key === "PageDown" || event.key === "ArrowRight") {
        event.preventDefault();
        movePage(1);
      }

      if (event.key === "PageUp" || event.key === "ArrowLeft") {
        event.preventDefault();
        movePage(-1);
      }
    }

    window.addEventListener("wheel", handleWheel, { passive: false });
    window.addEventListener("keydown", handlePageKey);

    return () => {
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("keydown", handlePageKey);
    };
  }, [controller.hasOverlayOpen, controller.setActiveShortcutPage, controller.tabState, shortcutPageCount]);

  const searchBoxHeight = Math.max(44, (62 * tabState.layout.searchBoxSize) / 100);
  const searchBoxRoundness = Math.min(100, Math.max(0, tabState.layout.searchBoxRadius));
  const searchBoxRadius = (searchBoxHeight / 2) * (searchBoxRoundness / 100);
  const gridLayout = tabState.layout.gridLayout;
  const iconSize = Math.max(18, Math.min(maxFittedIconSize, (86 * gridLayout.iconSize) / 100));
  const columnGap = (34 * gridLayout.columnSpacing) / 100;
  const rowGap = (34 * gridLayout.lineSpacing) / 100;

  const layoutStyle = {
    "--icon-size": `${iconSize}px`,
    "--grid-column-gap": `${columnGap}px`,
    "--grid-row-gap": `${rowGap}px`,
    "--grid-columns": `${gridLayout.columns}`,
    "--grid-rows": `${gridLayout.rows}`,
    "--quick-link-label-font-size": `${fittedLabelSize}px`,
    "--quick-link-tile-gap": `${fittedTileGap}px`,
    "--search-box-size": `${(680 * tabState.layout.searchBoxSize) / 100}px`,
    "--search-box-height": `${searchBoxHeight}px`,
    "--search-box-mark-size": `${Math.max(24, (32 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-font-size": `${Math.max(15, (18 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-font-size": `${Math.max(13, (16 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-gap": `${Math.max(14, (38 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-radius": `${searchBoxRadius}px`,
    "--search-box-opacity": `${tabState.layout.searchBoxOpacity / 100}`,
    "--wallpaper-dim": `${tabState.wallpaper.dim / 100}`,
    "--wallpaper-blur": `${tabState.wallpaper.blur}px`
  } as CSSProperties;

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.location.href = `${controller.activeSearchProvider.url}${encodeURIComponent(trimmedQuery)}`;
  }

  if (!controller.tabState) {
    return <main className="new-tab loading">Loading</main>;
  }

  return (
    <main className="new-tab" style={layoutStyle}>
      <div className="wallpaper" aria-hidden="true">
        {tabState.wallpaper.type === "dataUrl" && tabState.wallpaper.value ? (
          <img className="wallpaper-media" src={tabState.wallpaper.value} alt="" />
        ) : null}
      </div>

      <section className="workspace" aria-label="New tab workspace">
        <div className="toolbar">
          <button
            className="settings-button"
            type="button"
            aria-label="Open settings menu"
            onClick={() => controller.setIsSettingsDrawerOpen(true)}
          >
            <span className="gear-icon" aria-hidden="true">
              ⚙
            </span>
          </button>
        </div>

        {!tabState.layout.hideSearchBox ? (
          <section className={`search-panel ${tabState.layout.searchPosition}`}>
            {!tabState.layout.hideSearchCategory ? (
              <div className="search-tabs" role="tablist" aria-label="Search provider">
                {Object.entries(searchProviders).map(([id, provider]) => (
                  <button
                    className={id === tabState.searchProvider ? "active" : ""}
                    key={id}
                    onClick={() => void controller.changeSearchProvider(id as SearchProviderId)}
                    type="button"
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            ) : null}

            <form className="search-box" onSubmit={submitSearch}>
              {!tabState.layout.hideSearchButton ? (
                <span className="search-mark">{controller.activeSearchProvider.label.slice(0, 1)}</span>
              ) : null}
              <input
                aria-label={`Search with ${controller.activeSearchProvider.label}`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter search"
                value={query}
              />
            </form>
          </section>
        ) : null}

        <ShortcutGrid
          activeShortcutPageIndex={activeShortcutPageIndex}
          dispatchDropAction={controller.dispatchDropAction}
          gridRef={controller.gridRef}
          onEditFolder={controller.openEditFolderDialog}
          onEditShortcut={controller.openEditShortcutDialog}
          onOpenNewFolderDialog={controller.openNewFolderDialog}
          onOpenNewShortcutDialog={controller.openNewShortcutDialog}
          onSetActiveFolderId={controller.setActiveFolderId}
          onSetActiveShortcutPage={controller.setActiveShortcutPage}
          pageCount={shortcutPageCount}
          showLabels={tabState.layout.showLabels}
          tabState={tabState}
          visibleShortcutPageItems={visibleShortcutPageItems}
        />
      </section>

      {controller.isSettingsDrawerOpen ? (
        <SettingsDrawer
          backupMessage={controller.backupMessage}
          changeLayout={controller.changeLayout}
          changeSearchProvider={controller.changeSearchProvider}
          changeWallpaperSetting={controller.changeWallpaperSetting}
          close={() => controller.setIsSettingsDrawerOpen(false)}
          exportBackup={controller.exportBackup}
          importBackup={controller.importBackup}
          resetWallpaper={controller.resetWallpaper}
          tabState={tabState}
          uploadWallpaper={controller.uploadWallpaper}
          wallpaperMessage={controller.wallpaperMessage}
        />
      ) : null}

      {controller.activeFolder ? (
        <FolderPanel
          activeFolder={controller.activeFolder}
          onClose={() => controller.setActiveFolderId(null)}
          onEditFolder={controller.openEditFolderDialog}
          onEditShortcut={(shortcut) => controller.openEditShortcutDialog(shortcut, controller.activeFolder?.id ?? null)}
          onOpenNewShortcutDialog={controller.openNewShortcutDialog}
        />
      ) : null}

      {controller.shortcutDraft ? (
        <ShortcutModal
          draft={controller.shortcutDraft}
          iconRecommendations={controller.shortcutIconRecommendations}
          onApplyRecommendedIcon={controller.chooseRecommendedIcon}
          onChangeDraft={controller.setShortcutDraft}
          onClose={() => controller.setShortcutDraft(null)}
          onDelete={() => void controller.deleteShortcut()}
          onSave={controller.saveShortcut}
          onUploadIcon={(file) => void controller.uploadShortcutIcon(file)}
        />
      ) : null}

      {controller.folderDraft ? (
        <FolderModal
          draft={controller.folderDraft}
          onChangeDraft={controller.setFolderDraft}
          onClose={() => controller.setFolderDraft(null)}
          onDelete={() => void controller.deleteFolder()}
          onSave={controller.saveFolder}
        />
      ) : null}
    </main>
  );
}

function isTextEntryControl(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return Boolean(target.closest("input, select, textarea, [contenteditable='true']"));
}
