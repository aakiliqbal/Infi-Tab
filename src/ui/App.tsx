import { CSSProperties, DragEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { Folder as FolderIcon, FolderPlus as FolderPlusIcon } from "lucide-react";
import {
  findBrandIconRecommendations,
  type BrandIcon
} from "../domain/brandIcons";
import { parseTabStateBackup } from "../domain/backup";
import {
  searchProviders,
  type Folder,
  type QuickLink,
  type SearchProviderId,
  type TabState
} from "../domain/tabState";
import {
  applyRecommendedIcon,
  createFolderFromDraft,
  createQuickLinkFromDraft,
  deleteFolderFromState,
  deleteQuickLinkFromState,
  moveTopLevelTileInState,
  type ResolvedTopLevelTile,
  resolveTopLevelTiles,
  upsertFolder,
  upsertQuickLink
} from "../domain/tabOperations";
import { readFileAsDataUrl } from "../infrastructure/fileData";
import { loadTabState, saveTabState } from "../infrastructure/tabStorage";
import { QuickLinkIcon } from "./QuickLinkIcon";
import { SettingsDrawer } from "./SettingsDrawer";
import {
  emptyFolderDraft,
  emptyQuickLinkDraft,
  type FolderDraft,
  type QuickLinkDraft
} from "./drafts";

type ShortcutPageItem =
  | ResolvedTopLevelTile
  | {
      key: "create:shortcut";
      type: "create-shortcut";
    }
  | {
      key: "create:folder";
      type: "create-folder";
    };

export function App() {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [query, setQuery] = useState("");
  const [quickLinkDraft, setQuickLinkDraft] = useState<QuickLinkDraft | null>(null);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [wallpaperMessage, setWallpaperMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [draggedTopLevelTileKey, setDraggedTopLevelTileKey] = useState<string | null>(null);
  const [dragOverTopLevelTileKey, setDragOverTopLevelTileKey] = useState<string | null>(null);
  const [activeShortcutPage, setActiveShortcutPage] = useState(0);
  const [maxFittedIconSize, setMaxFittedIconSize] = useState(104);
  const [fittedLabelSize, setFittedLabelSize] = useState(16);
  const [fittedTileGap, setFittedTileGap] = useState(12);
  const gridRef = useRef<HTMLElement | null>(null);
  const wheelDeltaRef = useRef(0);
  const wheelLockUntilRef = useRef(0);

  useEffect(() => {
    void loadTabState().then(setTabState);
  }, []);

  useEffect(() => {
    function closeOverlays(event: KeyboardEvent) {
      if (event.key !== "Escape") {
        return;
      }

      setIsSettingsDrawerOpen(false);
      setQuickLinkDraft(null);
      setFolderDraft(null);
      setActiveFolderId(null);
    }

    window.addEventListener("keydown", closeOverlays);
    return () => window.removeEventListener("keydown", closeOverlays);
  }, []);

  const activeSearchProvider = useMemo(() => {
    if (!tabState) {
      return searchProviders.google;
    }

    return searchProviders[tabState.searchProvider];
  }, [tabState]);

  const topLevelTiles = useMemo(() => (tabState ? resolveTopLevelTiles(tabState) : []), [tabState]);
  const shortcutPageItems = useMemo<ShortcutPageItem[]>(
    () => [
      ...topLevelTiles,
      { key: "create:shortcut", type: "create-shortcut" },
      { key: "create:folder", type: "create-folder" }
    ],
    [topLevelTiles]
  );
  const pageCapacity = tabState ? tabState.layout.gridLayout.rows * tabState.layout.gridLayout.columns : 12;
  const shortcutPageCount = Math.max(1, Math.ceil(shortcutPageItems.length / pageCapacity));
  const activeShortcutPageIndex = Math.min(activeShortcutPage, shortcutPageCount - 1);
  const visibleShortcutPageItems = shortcutPageItems.slice(
    activeShortcutPageIndex * pageCapacity,
    (activeShortcutPageIndex + 1) * pageCapacity
  );
  const hasOverlayOpen = isSettingsDrawerOpen || quickLinkDraft !== null || folderDraft !== null || activeFolderId !== null;

  useEffect(() => {
    if (activeShortcutPage >= shortcutPageCount) {
      setActiveShortcutPage(shortcutPageCount - 1);
    }
  }, [activeShortcutPage, shortcutPageCount]);

  useEffect(() => {
    if (!tabState) {
      return;
    }

    const gridLayout = tabState.layout.gridLayout;
    const showLabels = tabState.layout.showLabels;

    function measureFittedIconSize() {
      const grid = gridRef.current;
      if (!grid) {
        return;
      }

      const gridBounds = grid.getBoundingClientRect();
      const gridStyles = window.getComputedStyle(grid);
      const columnGap = parseFloat(gridStyles.columnGap) || 0;
      const rowGap = parseFloat(gridStyles.rowGap) || 0;
      const paddingTop = parseFloat(gridStyles.paddingTop) || 0;
      const rowHeight =
        (gridBounds.height - paddingTop - rowGap * Math.max(0, gridLayout.rows - 1)) / gridLayout.rows;
      const labelSize = showLabels ? Math.max(10, Math.min(16, Math.floor(rowHeight * 0.24))) : 0;
      const tileGap = showLabels ? Math.max(3, Math.min(12, Math.floor(rowHeight * 0.08))) : 0;
      const labelHeight = showLabels ? Math.ceil(labelSize * 1.2) : 0;
      const widthAvailable =
        (gridBounds.width - columnGap * Math.max(0, gridLayout.columns - 1)) / gridLayout.columns;
      const heightAvailable = rowHeight - labelHeight - tileGap;

      setFittedLabelSize(labelSize);
      setFittedTileGap(tileGap);
      setMaxFittedIconSize(Math.max(18, Math.floor(Math.min(104, widthAvailable, heightAvailable))));
    }

    measureFittedIconSize();
    const resizeObserver = new ResizeObserver(measureFittedIconSize);
    resizeObserver.observe(document.documentElement);
    if (gridRef.current) {
      resizeObserver.observe(gridRef.current);
    }
    window.addEventListener("resize", measureFittedIconSize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", measureFittedIconSize);
    };
  }, [
    tabState,
    tabState?.layout.gridLayout.rows,
    tabState?.layout.gridLayout.columns,
    tabState?.layout.gridLayout.columnSpacing,
    tabState?.layout.gridLayout.lineSpacing,
    tabState?.layout.showLabels,
    tabState?.layout.hideSearchBox,
    tabState?.layout.hideSearchCategory,
    tabState?.layout.searchBoxSize
  ]);

  useEffect(() => {
    if (!tabState || hasOverlayOpen || shortcutPageCount <= 1) {
      return;
    }

    function movePage(direction: 1 | -1) {
      setActiveShortcutPage((current) => {
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
  }, [hasOverlayOpen, shortcutPageCount, tabState]);

  if (!tabState) {
    return <main className="new-tab loading">Loading</main>;
  }

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

  const activeFolder = activeFolderId
    ? tabState.folders.find((folder) => folder.id === activeFolderId) ?? null
    : null;
  const quickLinkIconRecommendations = quickLinkDraft
    ? findBrandIconRecommendations(quickLinkDraft.title, quickLinkDraft.url)
    : [];

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return;
    }

    window.location.href = `${activeSearchProvider.url}${encodeURIComponent(trimmedQuery)}`;
  }

  async function changeSearchProvider(providerId: SearchProviderId) {
    if (!tabState) {
      return;
    }

    const nextState = { ...tabState, searchProvider: providerId };
    await persistState(nextState);
  }

  async function changeLayout<K extends keyof TabState["layout"]>(
    key: K,
    value: TabState["layout"][K]
  ) {
    if (!tabState) {
      return;
    }

    await persistState({
      ...tabState,
      layout: {
        ...tabState.layout,
        [key]: value
      }
    });
  }

  async function persistState(nextState: TabState) {
    setTabState(nextState);
    await saveTabState(nextState);
  }

  function moveToTilePage(nextState: TabState, type: "shortcut" | "folder", id: string) {
    const tileIndex = nextState.topLevelTiles.findIndex((tile) => tile.type === type && tile.id === id);
    if (tileIndex >= 0) {
      setActiveShortcutPage(Math.floor(tileIndex / pageCapacity));
    }
  }

  function openNewQuickLinkDialog() {
    setQuickLinkDraft({ ...emptyQuickLinkDraft, folderId: activeFolderId });
  }

  function openEditQuickLinkDialog(quickLink: QuickLink, folderId: string | null = null) {
    setQuickLinkDraft({
      id: quickLink.id,
      folderId,
      title: quickLink.title,
      url: quickLink.url,
      iconLabel: quickLink.icon.label,
      iconBackground: quickLink.icon.background,
      iconImageDataUrl: quickLink.icon.imageDataUrl ?? null,
      brandIconId: quickLink.icon.brandIconId ?? null
    });
  }

  function openNewFolderDialog() {
    setFolderDraft(emptyFolderDraft);
  }

  function openEditFolderDialog(folder: Folder) {
    setFolderDraft({
      id: folder.id,
      title: folder.title,
      iconLabel: folder.icon.label,
      iconBackground: folder.icon.background
    });
  }

  async function saveQuickLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!quickLinkDraft || !tabState) {
      return;
    }

    const nextQuickLink = createQuickLinkFromDraft(quickLinkDraft);
    if (!nextQuickLink) {
      return;
    }

    const nextState = upsertQuickLink(tabState, nextQuickLink, quickLinkDraft);
    await persistState(nextState);
    if (!quickLinkDraft.id && !quickLinkDraft.folderId) {
      moveToTilePage(nextState, "shortcut", nextQuickLink.id);
    }
    setQuickLinkDraft(null);
  }

  async function deleteQuickLink() {
    if (!quickLinkDraft?.id || !tabState) {
      return;
    }

    await persistState(deleteQuickLinkFromState(tabState, quickLinkDraft));
    setQuickLinkDraft(null);
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!folderDraft || !tabState) {
      return;
    }

    const nextFolder = createFolderFromDraft(tabState, folderDraft);
    if (!nextFolder) {
      return;
    }

    const nextState = upsertFolder(tabState, nextFolder, folderDraft);
    await persistState(nextState);
    if (!folderDraft.id) {
      moveToTilePage(nextState, "folder", nextFolder.id);
    }
    setFolderDraft(null);
  }

  async function deleteFolder() {
    if (!folderDraft?.id || !tabState) {
      return;
    }

    await persistState(deleteFolderFromState(tabState, folderDraft.id));

    if (activeFolderId === folderDraft.id) {
      setActiveFolderId(null);
    }

    setFolderDraft(null);
  }

  async function moveTopLevelTile(targetTileKey: string) {
    if (!tabState || !draggedTopLevelTileKey || draggedTopLevelTileKey === targetTileKey) {
      return;
    }

    await persistState(moveTopLevelTileInState(tabState, draggedTopLevelTileKey, targetTileKey));
  }

  function finishDragging() {
    setDraggedTopLevelTileKey(null);
    setDragOverTopLevelTileKey(null);
  }

  async function uploadWallpaper(file: File | null) {
    if (!file || !tabState) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setWallpaperMessage("Choose an image file.");
      return;
    }

    try {
      setWallpaperMessage("Saving wallpaper...");
      const wallpaperDataUrl = await readFileAsDataUrl(file);
      await persistState({
        ...tabState,
        wallpaper: {
          ...tabState.wallpaper,
          type: "dataUrl",
          value: wallpaperDataUrl
        }
      });
      setWallpaperMessage("Wallpaper saved.");
    } catch {
      setWallpaperMessage("Could not save. Try a smaller image or GIF.");
    }
  }

  async function uploadQuickLinkIcon(file: File | null) {
    if (!file || !quickLinkDraft) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const iconDataUrl = await readFileAsDataUrl(file);
    setQuickLinkDraft({
      ...quickLinkDraft,
      iconImageDataUrl: iconDataUrl
    });
  }

  function chooseRecommendedIcon(icon: BrandIcon) {
    if (!quickLinkDraft) {
      return;
    }

    setQuickLinkDraft(applyRecommendedIcon(quickLinkDraft, icon));
  }

  async function resetWallpaper() {
    if (!tabState) {
      return;
    }

    try {
      await persistState({
        ...tabState,
        wallpaper: {
          type: "none",
          value: null,
          dim: tabState.wallpaper.dim,
          blur: tabState.wallpaper.blur
        }
      });
      setWallpaperMessage("Wallpaper reset.");
    } catch {
      setWallpaperMessage("Could not reset wallpaper.");
    }
  }

  async function changeWallpaperSetting(key: "dim" | "blur", value: number) {
    if (!tabState) {
      return;
    }

    await persistState({
      ...tabState,
      wallpaper: {
        ...tabState.wallpaper,
        [key]: value
      }
    });
  }

  function exportBackup() {
    if (!tabState) {
      return;
    }

    const backupBlob = new Blob([JSON.stringify(tabState, null, 2)], {
      type: "application/json"
    });
    const objectUrl = URL.createObjectURL(backupBlob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = `infi-tab-backup-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    setBackupMessage("Backup exported.");
  }

  async function importBackup(file: File | null) {
    if (!file) {
      return;
    }

    try {
      const backupText = await file.text();
      const parsedBackup = JSON.parse(backupText) as unknown;
      const nextState = parseTabStateBackup(parsedBackup);
      const shouldReplace = window.confirm(
        "Importing this backup will replace all current shortcuts, folders, settings, and wallpaper. Continue?"
      );

      if (!shouldReplace) {
        setBackupMessage("Import cancelled.");
        return;
      }

      await persistState(nextState);
      setActiveFolderId(null);
      setQuickLinkDraft(null);
      setFolderDraft(null);
      setBackupMessage("Backup imported.");
    } catch {
      setBackupMessage("Could not import this backup file.");
    }
  }

  return (
    <main
      className="new-tab"
      style={layoutStyle}
    >
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
            onClick={() => setIsSettingsDrawerOpen(true)}
          >
            <span className="gear-icon" aria-hidden="true">⚙</span>
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
                    onClick={() => void changeSearchProvider(id as SearchProviderId)}
                    type="button"
                  >
                    {provider.label}
                  </button>
                ))}
              </div>
            ) : null}

            <form className="search-box" onSubmit={submitSearch}>
              {!tabState.layout.hideSearchButton ? (
                <span className="search-mark">{activeSearchProvider.label.slice(0, 1)}</span>
              ) : null}
              <input
                aria-label={`Search with ${activeSearchProvider.label}`}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Enter search"
                value={query}
              />
            </form>
          </section>
        ) : null}

        <section
          className="quick-link-grid"
          aria-label="Quick links"
          key={`shortcut-page-${activeShortcutPageIndex}`}
          ref={gridRef}
        >
          {visibleShortcutPageItems.map((tile) => {
            if (tile.type === "create-shortcut") {
              return (
                <button className="quick-link add-link" type="button" key={tile.key} onClick={openNewQuickLinkDialog}>
                  <span className="quick-link-icon add-link-icon" aria-hidden="true">
                    +
                  </span>
                  <span className="quick-link-title">Add</span>
                </button>
              );
            }

            if (tile.type === "create-folder") {
              return (
                <button className="quick-link add-link" type="button" key={tile.key} onClick={openNewFolderDialog}>
                  <span className="quick-link-icon add-link-icon folder-add-icon" aria-hidden="true">
                    <FolderPlusIcon strokeWidth={2.25} />
                  </span>
                  <span className="quick-link-title">Folder</span>
                </button>
              );
            }

            const tileClassName = [
              "quick-link",
              tile.type === "folder" ? "folder-link" : "",
              draggedTopLevelTileKey === tile.key ? "dragging" : "",
              dragOverTopLevelTileKey === tile.key && draggedTopLevelTileKey !== tile.key ? "drag-over" : ""
            ]
              .filter(Boolean)
              .join(" ");
            const dragProps = {
              draggable: true,
              onDragStart: (event: DragEvent<HTMLElement>) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", tile.key);
                setDraggedTopLevelTileKey(tile.key);
              },
              onDragEnter: (event: DragEvent<HTMLElement>) => {
                event.preventDefault();
                setDragOverTopLevelTileKey(tile.key);
              },
              onDragOver: (event: DragEvent<HTMLElement>) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              },
              onDragLeave: (event: DragEvent<HTMLElement>) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOverTopLevelTileKey(null);
                }
              },
              onDrop: (event: DragEvent<HTMLElement>) => {
                event.preventDefault();
                void moveTopLevelTile(tile.key).finally(finishDragging);
              },
              onDragEnd: finishDragging
            };

            if (tile.type === "shortcut") {
              const { quickLink } = tile;
              return (
                <a className={tileClassName} href={quickLink.url} key={tile.key} {...dragProps}>
                  <QuickLinkIcon quickLink={quickLink} />
                  {tabState.layout.showLabels ? <span className="quick-link-title">{quickLink.title}</span> : null}
                  <button
                    className="quick-link-edit"
                    type="button"
                    aria-label={`Edit ${quickLink.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      openEditQuickLinkDialog(quickLink);
                    }}
                  >
                    Edit
                  </button>
                </a>
              );
            }

            const { folder } = tile;
            return (
              <div
                className={tileClassName}
                key={tile.key}
                role="button"
                tabIndex={0}
                onClick={() => setActiveFolderId(folder.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setActiveFolderId(folder.id);
                  }
                }}
                {...dragProps}
              >
                <span
                  className="quick-link-icon folder-icon"
                  style={{ backgroundColor: folder.icon.background }}
                  aria-hidden="true"
                >
                  <FolderIcon strokeWidth={2.25} />
                  <span className="folder-count">{folder.quickLinks.length}</span>
                </span>
                {tabState.layout.showLabels ? <span className="quick-link-title">{folder.title}</span> : null}
                <button
                  className="quick-link-edit"
                  type="button"
                  aria-label={`Edit ${folder.title}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    openEditFolderDialog(folder);
                  }}
                >
                  Edit
                </button>
              </div>
            );
          })}
        </section>
        <nav className="shortcut-page-footer" aria-label="Shortcut pages">
          {shortcutPageCount > 1 ? (
            <div className="shortcut-page-dots">
              {Array.from({ length: shortcutPageCount }, (_, index) => (
                <button
                  aria-label={`Go to shortcut page ${index + 1}`}
                  aria-current={index === activeShortcutPageIndex ? "page" : undefined}
                  className={index === activeShortcutPageIndex ? "active" : ""}
                  key={index}
                  onClick={() => setActiveShortcutPage(index)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
        </nav>
      </section>

      {isSettingsDrawerOpen ? (
        <SettingsDrawer
          backupMessage={backupMessage}
          changeLayout={(key, value) => void changeLayout(key, value)}
          changeSearchProvider={(providerId) => void changeSearchProvider(providerId)}
          changeWallpaperSetting={(key, value) => void changeWallpaperSetting(key, value)}
          close={() => setIsSettingsDrawerOpen(false)}
          exportBackup={exportBackup}
          importBackup={(file) => void importBackup(file)}
          resetWallpaper={() => void resetWallpaper()}
          tabState={tabState}
          uploadWallpaper={(file) => void uploadWallpaper(file)}
          wallpaperMessage={wallpaperMessage}
        />
      ) : null}

      {activeFolder ? (
        <div
          className="folder-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setActiveFolderId(null);
            }
          }}
        >
          <section className="folder-panel" role="dialog" aria-modal="true" aria-labelledby="folder-panel-title">
            <div className="folder-header">
              <div>
                <h1 id="folder-panel-title">{activeFolder.title}</h1>
                <span>{activeFolder.quickLinks.length} shortcuts</span>
              </div>
              <div className="folder-actions">
                <button className="secondary-button" type="button" onClick={() => openEditFolderDialog(activeFolder)}>
                  Edit
                </button>
                <button className="modal-close" type="button" onClick={() => setActiveFolderId(null)} aria-label="Close">
                  x
                </button>
              </div>
            </div>

            <div className="folder-grid">
              {activeFolder.quickLinks.map((quickLink) => (
                <a className="quick-link folder-item" href={quickLink.url} key={quickLink.id}>
                  <QuickLinkIcon quickLink={quickLink} />
                  <span className="quick-link-title">{quickLink.title}</span>
                  <button
                    className="quick-link-edit"
                    type="button"
                    aria-label={`Edit ${quickLink.title}`}
                    onClick={(event) => {
                      event.preventDefault();
                      openEditQuickLinkDialog(quickLink, activeFolder.id);
                    }}
                  >
                    Edit
                  </button>
                </a>
              ))}

              <button className="quick-link add-link" type="button" onClick={openNewQuickLinkDialog}>
                <span className="quick-link-icon add-link-icon" aria-hidden="true">
                  +
                </span>
                <span className="quick-link-title">Add</span>
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {quickLinkDraft ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setQuickLinkDraft(null);
            }
          }}
        >
          <section className="quick-link-modal" role="dialog" aria-modal="true" aria-labelledby="quick-link-title">
            <div className="modal-header">
              <h1 id="quick-link-title">
                {quickLinkDraft.id ? "Edit shortcut" : "Add shortcut"}
              </h1>
              <button className="modal-close" type="button" onClick={() => setQuickLinkDraft(null)} aria-label="Close">
                x
              </button>
            </div>

            <form className="quick-link-form" onSubmit={saveQuickLink}>
              <label>
                <span>Title</span>
                <input
                  autoFocus
                  value={quickLinkDraft.title}
                  onChange={(event) =>
                    setQuickLinkDraft({ ...quickLinkDraft, title: event.target.value })
                  }
                  required
                />
              </label>

              <label>
                <span>URL</span>
                <input
                  inputMode="url"
                  placeholder="https://example.com"
                  value={quickLinkDraft.url}
                  onChange={(event) => setQuickLinkDraft({ ...quickLinkDraft, url: event.target.value })}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <span>Icon label</span>
                  <input
                    maxLength={2}
                    value={quickLinkDraft.iconLabel}
                    onChange={(event) =>
                      setQuickLinkDraft({ ...quickLinkDraft, iconLabel: event.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Icon color</span>
                  <input
                    className="color-input"
                    type="color"
                    value={quickLinkDraft.iconBackground}
                    onChange={(event) =>
                      setQuickLinkDraft({ ...quickLinkDraft, iconBackground: event.target.value })
                    }
                  />
                </label>
              </div>

              {quickLinkIconRecommendations.length > 0 ? (
                <div className="recommended-icons" aria-label="Recommended icons">
                  <span>Recommended icons</span>
                  <div className="recommended-icon-row">
                    {quickLinkIconRecommendations.map((icon) => (
                      <button
                        className={quickLinkDraft.brandIconId === icon.id ? "selected" : ""}
                        type="button"
                        key={icon.id}
                        onClick={() => chooseRecommendedIcon(icon)}
                        aria-label={`Use ${icon.title} icon`}
                        title={icon.title}
                      >
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                          <path d={icon.path} />
                        </svg>
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

              <div className="form-preview">
                <span
                  className={`quick-link-icon ${quickLinkDraft.iconImageDataUrl ? "image-icon" : ""}`}
                  style={{ backgroundColor: quickLinkDraft.iconBackground }}
                  aria-hidden="true"
                >
                  {quickLinkDraft.iconImageDataUrl ? (
                    <img src={quickLinkDraft.iconImageDataUrl} alt="" />
                  ) : (
                    (quickLinkDraft.iconLabel || quickLinkDraft.title.slice(0, 1) || "?")
                      .slice(0, 2)
                      .toUpperCase()
                  )}
                </span>
              </div>

              <div className="icon-image-actions">
                <label className="secondary-button file-button">
                  Upload icon image
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      void uploadQuickLinkIcon(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>

              <div className="modal-actions">
                {quickLinkDraft.id ? (
                  <button className="danger-button" type="button" onClick={() => void deleteQuickLink()}>
                    Delete
                  </button>
                ) : null}
                <button className="secondary-button" type="button" onClick={() => setQuickLinkDraft(null)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}

      {folderDraft ? (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setFolderDraft(null);
            }
          }}
        >
          <section className="quick-link-modal" role="dialog" aria-modal="true" aria-labelledby="folder-title">
            <div className="modal-header">
              <h1 id="folder-title">{folderDraft.id ? "Edit folder" : "Add folder"}</h1>
              <button className="modal-close" type="button" onClick={() => setFolderDraft(null)} aria-label="Close">
                x
              </button>
            </div>

            <form className="quick-link-form" onSubmit={saveFolder}>
              <label>
                <span>Title</span>
                <input
                  autoFocus
                  value={folderDraft.title}
                  onChange={(event) => setFolderDraft({ ...folderDraft, title: event.target.value })}
                  required
                />
              </label>

              <div className="form-row">
                <label>
                  <span>Icon label</span>
                  <input
                    maxLength={2}
                    value={folderDraft.iconLabel}
                    onChange={(event) =>
                      setFolderDraft({ ...folderDraft, iconLabel: event.target.value })
                    }
                  />
                </label>

                <label>
                  <span>Icon color</span>
                  <input
                    className="color-input"
                    type="color"
                    value={folderDraft.iconBackground}
                    onChange={(event) =>
                      setFolderDraft({ ...folderDraft, iconBackground: event.target.value })
                    }
                  />
                </label>
              </div>

              <div className="form-preview">
                <span
                  className="quick-link-icon folder-icon"
                  style={{ backgroundColor: folderDraft.iconBackground }}
                  aria-hidden="true"
                >
                  <FolderIcon strokeWidth={2.25} />
                </span>
              </div>

              <div className="modal-actions">
                {folderDraft.id ? (
                  <button className="danger-button" type="button" onClick={() => void deleteFolder()}>
                    Delete
                  </button>
                ) : null}
                <button className="secondary-button" type="button" onClick={() => setFolderDraft(null)}>
                  Cancel
                </button>
                <button className="primary-button" type="submit">
                  Save
                </button>
              </div>
            </form>
          </section>
        </div>
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
