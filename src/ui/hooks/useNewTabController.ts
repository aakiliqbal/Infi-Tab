import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { produce } from "immer";
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
  resolveActiveFolder,
  resolveTopLevelTiles,
  upsertFolder,
  upsertShortcut
} from "../../domain/tabOperations";
import { applyDropAction, type DropAction } from "../../domain/dropActions";
import { readFileAsDataUrl } from "../../infrastructure/fileData";
import { deleteMediaDataUrl } from "../../infrastructure/mediaStorage";
import { useTabStore } from "../../stores/useTabStore";
import {
  emptyFolderDraft,
  emptyShortcutDraft,
  type FolderDraft,
  type ShortcutDraft
} from "../model/drafts";

export function useNewTabController() {
  const tabState = useTabStore();
  const replaceTabState = useTabStore((state) => state.replaceState);
  const updateTabState = useTabStore((state) => state.updateState);
  const setLayout = useTabStore((state) => state.setLayout);
  const setSearchProvider = useTabStore((state) => state.setSearchProvider);
  const setWallpaper = useTabStore((state) => state.setWallpaper);
  const [query, setQuery] = useState("");
  const [shortcutDraft, setShortcutDraft] = useState<ShortcutDraft | null>(null);
  const [folderDraft, setFolderDraft] = useState<FolderDraft | null>(null);
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [isSettingsDrawerOpen, setIsSettingsDrawerOpen] = useState(false);
  const [wallpaperMessage, setWallpaperMessage] = useState<string | null>(null);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [activeShortcutPage, setActiveShortcutPage] = useState(0);
  const gridRef = useRef<HTMLElement | null>(null);

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
    return searchProviders[tabState.searchProvider];
  }, [tabState]);

  const topLevelTiles = useMemo(() => resolveTopLevelTiles(tabState), [tabState]);
  const hasOverlayOpen = isSettingsDrawerOpen || shortcutDraft !== null || folderDraft !== null || activeFolderId !== null;
  const activeFolder = resolveActiveFolder(tabState, activeFolderId);
  const shortcutIconRecommendations = shortcutDraft
    ? findBrandIconRecommendations(shortcutDraft.title, shortcutDraft.url)
    : [];

  function persistState(nextState: TabState) {
    replaceTabState(nextState);
  }

  function moveToTilePage(nextState: TabState, type: "shortcut" | "folder", id: string) {
    const pageIndex = getShortcutPageIndex(nextState, id);
    if (pageIndex >= 0) {
      setActiveShortcutPage(pageIndex);
    }
  }

  function changeSearchProvider(providerId: SearchProviderId) {
    setSearchProvider(providerId);
  }

  function changeLayout<K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) {
    setLayout(key, value);
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

    if (!shortcutDraft) {
      return;
    }

    const nextShortcut = createShortcutFromDraft(shortcutDraft);
    if (!nextShortcut) {
      return;
    }

    const nextState = upsertShortcut(tabState, nextShortcut, shortcutDraft);
    persistState(nextState);
    if (shortcutDraft.iconMediaId && nextShortcut.icon.type !== "image") {
      await deleteMediaDataUrl(shortcutDraft.iconMediaId);
    }
    if (!shortcutDraft.id && !shortcutDraft.folderId) {
      moveToTilePage(nextState, "shortcut", nextShortcut.id);
    }
    setShortcutDraft(null);
  }

  async function deleteShortcut() {
    if (!shortcutDraft?.id) {
      return;
    }

    persistState(deleteShortcutFromState(tabState, shortcutDraft));
    if (shortcutDraft.iconMediaId) {
      await deleteMediaDataUrl(shortcutDraft.iconMediaId);
    }
    setShortcutDraft(null);
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!folderDraft) {
      return;
    }

    const nextFolder = createFolderFromDraft(tabState, folderDraft);
    if (!nextFolder) {
      return;
    }

    const nextState = upsertFolder(tabState, nextFolder, folderDraft);
    persistState(nextState);
    if (!folderDraft.id) {
      moveToTilePage(nextState, "folder", nextFolder.id);
    }
    setFolderDraft(null);
  }

  async function deleteFolder() {
    if (!folderDraft?.id) {
      return;
    }

    persistState(deleteFolderFromState(tabState, folderDraft.id));

    if (activeFolderId === folderDraft.id) {
      setActiveFolderId(null);
    }

    setFolderDraft(null);
  }

  function dispatchDropAction(action: DropAction) {
    updateTabState((state) =>
      produce(state, (draft) => {
        applyDropAction(draft, action);
      })
    );
  }

  async function uploadWallpaper(file: File | null) {
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setWallpaperMessage("Choose an image file.");
      return;
    }

    try {
      setWallpaperMessage("Saving wallpaper...");
      const wallpaperDataUrl = await readFileAsDataUrl(file);
      setWallpaper({
        ...tabState.wallpaper,
        type: "dataUrl",
        value: wallpaperDataUrl
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
    try {
      setWallpaper({
        type: "none",
        value: null,
        mediaId: null,
        dim: tabState.wallpaper.dim,
        blur: tabState.wallpaper.blur
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
    setWallpaper({
      ...tabState.wallpaper,
      [key]: value
    });
  }

  function exportBackup() {
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

      persistState(nextState);
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
    dispatchDropAction,
    exportBackup,
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
    setFolderDraft,
    setIsSettingsDrawerOpen,
    setQuery,
    setShortcutDraft,
    tabState,
    topLevelTiles,
    uploadShortcutIcon,
    uploadWallpaper,
    wallpaperMessage
  };
}
