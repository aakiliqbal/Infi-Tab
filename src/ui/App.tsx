import { CSSProperties, FormEvent, useEffect, useMemo, useState } from "react";
import {
  brandIcons,
  findBrandIconRecommendations,
  matchBrandIcon,
  type BrandIcon,
  type BrandIconId
} from "../domain/brandIcons";
import {
  searchProviders,
  type Folder,
  type QuickLink,
  type SearchProviderId,
  type TabState
} from "../domain/tabState";
import { loadTabState, saveTabState } from "../infrastructure/tabStorage";

type QuickLinkDraft = {
  id: string | null;
  folderId: string | null;
  title: string;
  url: string;
  iconLabel: string;
  iconBackground: string;
  iconImageDataUrl: string | null;
  brandIconId: BrandIconId | null;
};

type FolderDraft = {
  id: string | null;
  title: string;
  iconLabel: string;
  iconBackground: string;
};

const emptyQuickLinkDraft: QuickLinkDraft = {
  id: null,
  folderId: null,
  title: "",
  url: "",
  iconLabel: "",
  iconBackground: "#2d8cff",
  iconImageDataUrl: null,
  brandIconId: null
};

const emptyFolderDraft: FolderDraft = {
  id: null,
  title: "",
  iconLabel: "",
  iconBackground: "#64748b"
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
  const [draggedQuickLinkId, setDraggedQuickLinkId] = useState<string | null>(null);
  const [dragOverQuickLinkId, setDragOverQuickLinkId] = useState<string | null>(null);

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

  if (!tabState) {
    return <main className="new-tab loading">Loading</main>;
  }

  const layoutStyle = {
    "--icon-size": `${tabState.layout.iconSize}px`,
    "--grid-gap": `${tabState.layout.gridGap}px`,
    "--grid-columns": `${tabState.layout.columns}`,
    "--search-box-size": `${(680 * tabState.layout.searchBoxSize) / 100}px`,
    "--search-box-height": `${Math.max(44, (62 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-mark-size": `${Math.max(24, (32 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-font-size": `${Math.max(15, (18 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-font-size": `${Math.max(13, (16 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-category-gap": `${Math.max(14, (38 * tabState.layout.searchBoxSize) / 100)}px`,
    "--search-box-radius": `${tabState.layout.searchBoxRadius}px`,
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

    const title = quickLinkDraft.title.trim();
    const url = normalizeUrl(quickLinkDraft.url);
    const iconLabel = (quickLinkDraft.iconLabel.trim() || title.slice(0, 1) || "?")
      .slice(0, 2)
      .toUpperCase();
    const matchedBrandIcon = quickLinkDraft.iconImageDataUrl
      ? null
      : quickLinkDraft.brandIconId
        ? brandIcons[quickLinkDraft.brandIconId]
        : matchBrandIcon(title, url);

    if (!title || !url) {
      return;
    }

    const nextQuickLink: QuickLink = {
      id: quickLinkDraft.id ?? crypto.randomUUID(),
      title,
      url,
      icon: {
        type: quickLinkDraft.iconImageDataUrl
          ? "image"
          : matchedBrandIcon
            ? "brand"
            : "fallback",
        label: matchedBrandIcon ? matchedBrandIcon.title.slice(0, 2).toUpperCase() : iconLabel,
        background: matchedBrandIcon ? `#${matchedBrandIcon.hex}` : quickLinkDraft.iconBackground,
        imageDataUrl: quickLinkDraft.iconImageDataUrl,
        brandIconId: matchedBrandIcon?.id ?? null
      }
    };

    if (quickLinkDraft.folderId) {
      const nextFolders = tabState.folders.map((folder) => {
        if (folder.id !== quickLinkDraft.folderId) {
          return folder;
        }

        const nextFolderQuickLinks = quickLinkDraft.id
          ? folder.quickLinks.map((quickLink) =>
              quickLink.id === quickLinkDraft.id ? nextQuickLink : quickLink
            )
          : [...folder.quickLinks, nextQuickLink];

        return { ...folder, quickLinks: nextFolderQuickLinks };
      });

      await persistState({ ...tabState, folders: nextFolders });
    } else {
      const nextQuickLinks = quickLinkDraft.id
        ? tabState.quickLinks.map((quickLink) =>
            quickLink.id === quickLinkDraft.id ? nextQuickLink : quickLink
          )
        : [...tabState.quickLinks, nextQuickLink];

      await persistState({ ...tabState, quickLinks: nextQuickLinks });
    }

    setQuickLinkDraft(null);
  }

  async function deleteQuickLink() {
    if (!quickLinkDraft?.id || !tabState) {
      return;
    }

    if (quickLinkDraft.folderId) {
      await persistState({
        ...tabState,
        folders: tabState.folders.map((folder) =>
          folder.id === quickLinkDraft.folderId
            ? {
                ...folder,
                quickLinks: folder.quickLinks.filter((quickLink) => quickLink.id !== quickLinkDraft.id)
              }
            : folder
        )
      });
    } else {
      await persistState({
        ...tabState,
        quickLinks: tabState.quickLinks.filter((quickLink) => quickLink.id !== quickLinkDraft.id)
      });
    }

    setQuickLinkDraft(null);
  }

  async function saveFolder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!folderDraft || !tabState) {
      return;
    }

    const title = folderDraft.title.trim();
    const iconLabel = (folderDraft.iconLabel.trim() || title.slice(0, 1) || "?")
      .slice(0, 2)
      .toUpperCase();

    if (!title) {
      return;
    }

    const nextFolder: Folder = {
      id: folderDraft.id ?? crypto.randomUUID(),
      title,
      icon: {
        type: "fallback",
        label: iconLabel,
        background: folderDraft.iconBackground
      },
      quickLinks: folderDraft.id
        ? tabState.folders.find((folder) => folder.id === folderDraft.id)?.quickLinks ?? []
        : []
    };

    const nextFolders = folderDraft.id
      ? tabState.folders.map((folder) => (folder.id === folderDraft.id ? nextFolder : folder))
      : [...tabState.folders, nextFolder];

    await persistState({ ...tabState, folders: nextFolders });
    setActiveFolderId(nextFolder.id);
    setFolderDraft(null);
  }

  async function deleteFolder() {
    if (!folderDraft?.id || !tabState) {
      return;
    }

    await persistState({
      ...tabState,
      folders: tabState.folders.filter((folder) => folder.id !== folderDraft.id)
    });

    if (activeFolderId === folderDraft.id) {
      setActiveFolderId(null);
    }

    setFolderDraft(null);
  }

  async function moveQuickLink(targetQuickLinkId: string) {
    if (!tabState || !draggedQuickLinkId || draggedQuickLinkId === targetQuickLinkId) {
      return;
    }

    const fromIndex = tabState.quickLinks.findIndex((quickLink) => quickLink.id === draggedQuickLinkId);
    const toIndex = tabState.quickLinks.findIndex((quickLink) => quickLink.id === targetQuickLinkId);

    if (fromIndex < 0 || toIndex < 0) {
      return;
    }

    const nextQuickLinks = [...tabState.quickLinks];
    const [movedQuickLink] = nextQuickLinks.splice(fromIndex, 1);
    nextQuickLinks.splice(toIndex, 0, movedQuickLink);

    await persistState({ ...tabState, quickLinks: nextQuickLinks });
  }

  function finishDragging() {
    setDraggedQuickLinkId(null);
    setDragOverQuickLinkId(null);
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

    setQuickLinkDraft({
      ...quickLinkDraft,
      iconImageDataUrl: null,
      brandIconId: icon.id,
      iconBackground: `#${icon.hex}`,
      iconLabel: icon.title.slice(0, 2).toUpperCase()
    });
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

        <section className="quick-link-grid" aria-label="Quick links">
          {tabState.quickLinks.map((quickLink) => (
            <a
              className={[
                "quick-link",
                draggedQuickLinkId === quickLink.id ? "dragging" : "",
                dragOverQuickLinkId === quickLink.id && draggedQuickLinkId !== quickLink.id ? "drag-over" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              draggable
              href={quickLink.url}
              key={quickLink.id}
              onDragStart={(event) => {
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", quickLink.id);
                setDraggedQuickLinkId(quickLink.id);
              }}
              onDragEnter={(event) => {
                event.preventDefault();
                setDragOverQuickLinkId(quickLink.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragOverQuickLinkId(null);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                void moveQuickLink(quickLink.id).finally(finishDragging);
              }}
              onDragEnd={finishDragging}
            >
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
          ))}
          {tabState.folders.map((folder) => (
            <div
              className="quick-link folder-link"
              key={folder.id}
              role="button"
              tabIndex={0}
              onClick={() => setActiveFolderId(folder.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActiveFolderId(folder.id);
                }
              }}
            >
              <span
                className="quick-link-icon folder-icon"
                style={{ backgroundColor: folder.icon.background }}
                aria-hidden="true"
              >
                {folder.icon.label}
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
          ))}
          <button className="quick-link add-link" type="button" onClick={openNewQuickLinkDialog}>
            <span className="quick-link-icon add-link-icon" aria-hidden="true">
              +
            </span>
            <span className="quick-link-title">Add</span>
          </button>
          <button className="quick-link add-link" type="button" onClick={openNewFolderDialog}>
            <span className="quick-link-icon add-link-icon folder-add-icon" aria-hidden="true">
              +
            </span>
            <span className="quick-link-title">Folder</span>
          </button>
        </section>
      </section>

      {isSettingsDrawerOpen ? (
        <div
          className="settings-drawer-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setIsSettingsDrawerOpen(false);
            }
          }}
        >
          <aside
            className="settings-drawer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="settings-drawer-title"
          >
            <header className="settings-drawer-header">
              <div>
                <span className="settings-drawer-kicker">Infi Tab</span>
                <h1 id="settings-drawer-title">Settings</h1>
              </div>
              <button
                className="drawer-close"
                type="button"
                onClick={() => setIsSettingsDrawerOpen(false)}
                aria-label="Close settings"
              >
                x
              </button>
            </header>

            <div className="settings-drawer-body">
              <section className="settings-group">
                <h2>Search</h2>
                <label>
                  <span>Provider</span>
                  <select
                    value={tabState.searchProvider}
                    onChange={(event) => void changeSearchProvider(event.target.value as SearchProviderId)}
                  >
                    {Object.entries(searchProviders).map(([id, provider]) => (
                      <option value={id} key={id}>
                        {provider.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Hide search box</span>
                  <input
                    type="checkbox"
                    checked={tabState.layout.hideSearchBox}
                    onChange={(event) => void changeLayout("hideSearchBox", event.target.checked)}
                  />
                </label>
                <label>
                  <span>Hide search category</span>
                  <input
                    type="checkbox"
                    checked={tabState.layout.hideSearchCategory}
                    onChange={(event) => void changeLayout("hideSearchCategory", event.target.checked)}
                  />
                </label>
                <label>
                  <span>Hide search button</span>
                  <input
                    type="checkbox"
                    checked={tabState.layout.hideSearchButton}
                    onChange={(event) => void changeLayout("hideSearchButton", event.target.checked)}
                  />
                </label>
                <label>
                  <span>Search box size</span>
                  <input
                    type="range"
                    min="55"
                    max="100"
                    step="5"
                    value={tabState.layout.searchBoxSize}
                    onChange={(event) => void changeLayout("searchBoxSize", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Search box rounded corners</span>
                  <input
                    type="range"
                    min="4"
                    max="100"
                    step="4"
                    value={tabState.layout.searchBoxRadius}
                    onChange={(event) => void changeLayout("searchBoxRadius", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Search box opacity</span>
                  <input
                    type="range"
                    min="35"
                    max="100"
                    step="5"
                    value={tabState.layout.searchBoxOpacity}
                    onChange={(event) => void changeLayout("searchBoxOpacity", Number(event.target.value))}
                  />
                </label>
              </section>

              <section className="settings-group">
                <h2>Layout</h2>
                <label>
                  <span>Icon size</span>
                  <input
                    type="range"
                    min="64"
                    max="112"
                    step="4"
                    value={tabState.layout.iconSize}
                    onChange={(event) => void changeLayout("iconSize", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Spacing</span>
                  <input
                    type="range"
                    min="18"
                    max="52"
                    step="2"
                    value={tabState.layout.gridGap}
                    onChange={(event) => void changeLayout("gridGap", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Columns</span>
                  <input
                    type="range"
                    min="3"
                    max="8"
                    step="1"
                    value={tabState.layout.columns}
                    onChange={(event) => void changeLayout("columns", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Show labels</span>
                  <input
                    type="checkbox"
                    checked={tabState.layout.showLabels}
                    onChange={(event) => void changeLayout("showLabels", event.target.checked)}
                  />
                </label>
              </section>

              <section className="settings-group">
                <h2>Wallpaper</h2>
                <div className="wallpaper-preview">
                  <div className="wallpaper-preview-image" aria-hidden="true">
                    {tabState.wallpaper.type === "dataUrl" && tabState.wallpaper.value ? (
                      <img src={tabState.wallpaper.value} alt="" />
                    ) : null}
                  </div>
                  <label className="wallpaper-preview-upload" aria-label="Upload wallpaper">
                    Upload
                    <input
                      accept="image/*"
                      type="file"
                      onChange={(event) => {
                        void uploadWallpaper(event.target.files?.[0] ?? null);
                        event.currentTarget.value = "";
                      }}
                    />
                  </label>
                </div>
                <label>
                  <span>Dim the wallpaper</span>
                  <input
                    type="range"
                    min="0"
                    max="80"
                    step="5"
                    value={tabState.wallpaper.dim}
                    onChange={(event) => void changeWallpaperSetting("dim", Number(event.target.value))}
                  />
                </label>
                <label>
                  <span>Blur</span>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="1"
                    value={tabState.wallpaper.blur}
                    onChange={(event) => void changeWallpaperSetting("blur", Number(event.target.value))}
                  />
                </label>
                <label className="upload-button">
                  Upload wallpaper
                  <input
                    accept="image/*"
                    type="file"
                    onChange={(event) => {
                      void uploadWallpaper(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                <button className="launcher-action" type="button" onClick={() => void resetWallpaper()}>
                  Reset wallpaper
                </button>
                {wallpaperMessage ? <p className="launcher-message">{wallpaperMessage}</p> : null}
              </section>

              <section className="settings-group">
                <h2>Backup</h2>
                <button className="launcher-action" type="button" onClick={exportBackup}>
                  Export JSON backup
                </button>
                <label className="upload-button">
                  Import JSON backup
                  <input
                    accept="application/json,.json"
                    type="file"
                    onChange={(event) => {
                      void importBackup(event.target.files?.[0] ?? null);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
                {backupMessage ? <p className="launcher-message">{backupMessage}</p> : null}
              </section>
            </div>
          </aside>
        </div>
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
                  {(folderDraft.iconLabel || folderDraft.title.slice(0, 1) || "?")
                    .slice(0, 2)
                    .toUpperCase()}
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

function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

function QuickLinkIcon({ quickLink }: { quickLink: QuickLink }) {
  const brandIcon =
    quickLink.icon.type === "brand" && quickLink.icon.brandIconId
      ? brandIcons[quickLink.icon.brandIconId]
      : null;

  return (
    <span
      className={`quick-link-icon ${
        quickLink.icon.type === "image" || brandIcon ? "image-icon" : ""
      }`}
      style={{ backgroundColor: quickLink.icon.background }}
      aria-hidden="true"
    >
      {quickLink.icon.type === "image" && quickLink.icon.imageDataUrl ? (
        <img src={quickLink.icon.imageDataUrl} alt="" />
      ) : brandIcon ? (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d={brandIcon.path} />
        </svg>
      ) : (
        quickLink.icon.label
      )}
    </span>
  );
}

async function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(file);
  });
}

function parseTabStateBackup(value: unknown): TabState {
  if (!isRecord(value) || value.schemaVersion !== 1) {
    throw new Error("Unsupported backup schema");
  }

  const backup = value as TabState;
  if (
    !Array.isArray(backup.quickLinks) ||
    !Array.isArray(backup.folders) ||
    !isRecord(backup.layout) ||
    !isRecord(backup.wallpaper) ||
    !(backup.searchProvider in searchProviders)
  ) {
    throw new Error("Invalid backup shape");
  }

  return {
    ...backup,
    wallpaper: {
      ...backup.wallpaper,
      dim: typeof backup.wallpaper.dim === "number" ? backup.wallpaper.dim : 40,
      blur: typeof backup.wallpaper.blur === "number" ? backup.wallpaper.blur : 0
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
