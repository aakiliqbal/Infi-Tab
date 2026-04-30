import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { findBrandIconRecommendations, type BrandIcon } from "../../domain/brandIcons";
import {
  describeBackupReplacement,
  getBackupImportErrorMessage,
  parseTabStateBackup
} from "../../domain/backup";
import {
  searchProviders,
  type Folder,
  type Shortcut,
  type SearchProviderId,
  type TabState
} from "../../domain/tabState";
import {
  applyRecommendedIcon,
  createFolderFromDraft,
  createShortcutFromDraft,
  deleteFolderFromState,
  deleteShortcutFromState,
  getShortcutPageIndex,
  moveTopLevelTileInState,
  resolveActiveFolder,
  resolveTopLevelTiles,
  upsertFolder,
  upsertShortcut
} from "../../domain/tabOperations";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { deleteMediaDataUrl } from "../../infrastructure/mediaStorage";
import { loadTabState, saveTabState } from "../../infrastructure/tabStorage";
import {
  emptyFolderDraft,
  emptyShortcutDraft,
  type FolderDraft,
  type ShortcutDraft
} from "../model/drafts";

export function useNewTabController() {
  const [tabState, setTabState] = useState<TabState | null>(null);
  const [query, setQuery] = useState("");
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutDraft | null>(null);
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
      setShortcutDraft(null);
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
  const hasOverlayOpen = isSettingsDrawerOpen || shortcutDraft !== null || folderDraft !== null || activeFolderId !== null;
  const activeFolder = tabState ? resolveActiveFolder(tabState, activeFolderId) : null;
  const shortcutIconRecommendations = shortcutDraft
    ? findBrandIconRecommendations(shortcutDraft.title, shortcutDraft.url)
    : [];

  async function persistState(nextState: TabState) {
    const persistedState = await saveTabState(nextState);
    setTabState(persistedState);
  }

  function moveToTilePage(nextState: TabState, type: "shortcut" | "folder", id: string) {
    const pageIndex = getShortcutPageIndex(nextState, id);
    if (pageIndex >= 0) {
      setActiveShortcutPage(pageIndex);
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

  function openNewShortcutDialog() {
    setShortcutDraft({ ...emptyShortcutDraft, folderId: activeFolderId });
  }

  function openEditShortcutDialog(shortcut: Shortcut, folderId: string | null = null) {
    setShortcutDraft({
      id: shortcut.id,
      folderId,
      title: shortcut.title,
      url: shortcut.url,
      iconLabel: shortcut.icon.label,
      iconBackground: shortcut.icon.background,
      iconImageDataUrl: shortcut.icon.imageDataUrl ?? null,
      iconMediaId: shortcut.icon.imageMediaId ?? null,
      brandIconId: shortcut.icon.brandIconId ?? null
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

  async function saveShortcut(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!shortcutDraft || !tabState) {
      return;
    }

    const nextShortcut = createShortcutFromDraft(shortcutDraft);
    if (!nextShortcut) {
      return;
    }

    const nextState = upsertShortcut(tabState, nextShortcut, shortcutDraft);
    await persistState(nextState);
    if (shortcutDraft.iconMediaId && nextShortcut.icon.type !== "image") {
      await deleteMediaDataUrl(shortcutDraft.iconMediaId);
    }
    if (!shortcutDraft.id && !shortcutDraft.folderId) {
      moveToTilePage(nextState, "shortcut", nextShortcut.id);
    }
    setShortcutDraft(null);
  }

  async function deleteShortcut() {
    if (!shortcutDraft?.id || !tabState) {
      return;
    }

    await persistState(deleteShortcutFromState(tabState, shortcutDraft));
    if (shortcutDraft.iconMediaId) {
      await deleteMediaDataUrl(shortcutDraft.iconMediaId);
    }
    setShortcutDraft(null);
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

  async function uploadShortcutIcon(file: File | null) {
    if (!file || !shortcutDraft) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      return;
    }

    const iconDataUrl = await readFileAsDataUrl(file);
    setShortcutDraft({
      ...shortcutDraft,
      iconImageDataUrl: iconDataUrl,
      iconMediaId: shortcutDraft.iconMediaId
    });
  }

  function chooseRecommendedIcon(icon: BrandIcon) {
    if (!shortcutDraft) {
      return;
    }

    setShortcutDraft(applyRecommendedIcon(shortcutDraft, icon));
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
          mediaId: null,
          dim: tabState.wallpaper.dim,
          blur: tabState.wallpaper.blur
        }
      });
      if (tabState.wallpaper.mediaId) {
        await deleteMediaDataUrl(tabState.wallpaper.mediaId);
      }
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
      const shouldReplace = window.confirm(`${describeBackupReplacement(nextState)} Continue?`);

      if (!shouldReplace) {
        setBackupMessage("Import cancelled.");
        return;
      }

      await persistState(nextState);
      setActiveFolderId(null);
      setShortcutDraft(null);
      setFolderDraft(null);
      setBackupMessage("Backup imported.");
    } catch (error) {
      setBackupMessage(getBackupImportErrorMessage(error));
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
    deleteShortcut,
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
    openEditShortcutDialog,
    openNewFolderDialog,
    openNewShortcutDialog,
    query,
    shortcutDraft,
    shortcutIconRecommendations,
    resetWallpaper,
    saveFolder,
    saveShortcut,
    setActiveFolderId,
    setActiveShortcutPage,
    setBackupMessage,
    setDragOverTopLevelTileKey,
    setDraggedTopLevelTileKey,
    setFolderDraft,
    setIsSettingsDrawerOpen,
    setQuery,
    setShortcutDraft,
    tabState,
    topLevelTiles,
    uploadShortcutIcon,
    uploadWallpaper,
    wallpaperMessage,
    moveTopLevelTile
  };
}
