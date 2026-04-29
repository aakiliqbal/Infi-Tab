import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { findBrandIconRecommendations, type BrandIcon } from "../../domain/brandIcons";
import { parseTabStateBackup } from "../../domain/backup";
import {
  searchProviders,
  type Folder,
  type QuickLink,
  type SearchProviderId,
  type TabState
} from "../../domain/tabState";
import {
  applyRecommendedIcon,
  createFolderFromDraft,
  createQuickLinkFromDraft,
  deleteFolderFromState,
  deleteQuickLinkFromState,
  moveTopLevelTileInState,
  resolveTopLevelTiles,
  upsertFolder,
  upsertQuickLink
} from "../../domain/tabOperations";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { loadTabState, saveTabState } from "../../infrastructure/tabStorage";
import {
  emptyFolderDraft,
  emptyQuickLinkDraft,
  type FolderDraft,
  type QuickLinkDraft
} from "../model/drafts";

export function useNewTabController() {
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
  const gridRef = useRef<HTMLElement | null>(null);

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
  const hasOverlayOpen = isSettingsDrawerOpen || quickLinkDraft !== null || folderDraft !== null || activeFolderId !== null;
  const activeFolder = activeFolderId
    ? tabState?.folders.find((folder) => folder.id === activeFolderId) ?? null
    : null;
  const quickLinkIconRecommendations = quickLinkDraft
    ? findBrandIconRecommendations(quickLinkDraft.title, quickLinkDraft.url)
    : [];

  async function persistState(nextState: TabState) {
    setTabState(nextState);
    await saveTabState(nextState);
  }

  function moveToTilePage(nextState: TabState, type: "shortcut" | "folder", id: string) {
    const tileIndex = nextState.topLevelTiles.findIndex((tile) => tile.type === type && tile.id === id);
    if (tileIndex >= 0) {
      setActiveShortcutPage(Math.floor(tileIndex / (nextState.layout.gridLayout.rows * nextState.layout.gridLayout.columns)));
    }
  }

  async function changeSearchProvider(providerId: SearchProviderId) {
    if (!tabState) {
      return;
    }

    await persistState({ ...tabState, searchProvider: providerId });
  }

  async function changeLayout<K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) {
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

  return {
    activeFolder,
    activeFolderId,
    activeSearchProvider,
    activeShortcutPage,
    backupMessage,
    changeLayout,
    changeSearchProvider,
    changeWallpaperSetting,
    chooseRecommendedIcon,
    deleteFolder,
    deleteQuickLink,
    dragOverTopLevelTileKey,
    draggedTopLevelTileKey,
    exportBackup,
    finishDragging,
    folderDraft,
    gridRef,
    hasOverlayOpen,
    importBackup,
    isSettingsDrawerOpen,
    openEditFolderDialog,
    openEditQuickLinkDialog,
    openNewFolderDialog,
    openNewQuickLinkDialog,
    query,
    quickLinkDraft,
    quickLinkIconRecommendations,
    resetWallpaper,
    saveFolder,
    saveQuickLink,
    setActiveFolderId,
    setActiveShortcutPage,
    setBackupMessage,
    setDragOverTopLevelTileKey,
    setDraggedTopLevelTileKey,
    setFolderDraft,
    setIsSettingsDrawerOpen,
    setQuery,
    setQuickLinkDraft,
    tabState,
    topLevelTiles,
    uploadQuickLinkIcon,
    uploadWallpaper,
    wallpaperMessage,
    moveTopLevelTile
  };
}
