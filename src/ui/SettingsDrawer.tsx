import { useState } from "react";
import { LayoutGrid } from "lucide-react";
import {
  gridLayoutPresets,
  searchProviders,
  type GridLayoutPresetId,
  type GridLayoutSettings,
  type SearchProviderId,
  type TabState
} from "../domain/tabState";

type SettingsDrawerProps = {
  backupMessage: string | null;
  changeLayout: <K extends keyof TabState["layout"]>(key: K, value: TabState["layout"][K]) => void;
  changeSearchProvider: (providerId: SearchProviderId) => void;
  changeWallpaperSetting: (key: "dim" | "blur", value: number) => void;
  close: () => void;
  exportBackup: () => void;
  importBackup: (file: File | null) => void;
  resetWallpaper: () => void;
  tabState: TabState;
  uploadWallpaper: (file: File | null) => void;
  wallpaperMessage: string | null;
};

export function SettingsDrawer({
  backupMessage,
  changeLayout,
  changeSearchProvider,
  changeWallpaperSetting,
  close,
  exportBackup,
  importBackup,
  resetWallpaper,
  tabState,
  uploadWallpaper,
  wallpaperMessage
}: SettingsDrawerProps) {
  const [isCustomizeLayoutOpen, setIsCustomizeLayoutOpen] = useState(false);
  const gridLayout = tabState.layout.gridLayout;

  function changeGridLayout(nextGridLayout: GridLayoutSettings) {
    changeLayout("gridLayout", nextGridLayout);
  }

  function chooseGridLayoutPreset(presetId: GridLayoutPresetId) {
    const preset = gridLayoutPresets[presetId];
    changeGridLayout({
      ...gridLayout,
      mode: "preset",
      presetId,
      rows: preset.rows,
      columns: preset.columns
    });
  }

  function customizeGridLayout(nextValues: Partial<GridLayoutSettings>) {
    changeGridLayout({
      ...gridLayout,
      ...nextValues,
      mode: "custom"
    });
  }

  return (
    <div
      className="settings-drawer-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          close();
        }
      }}
    >
      <aside className="settings-drawer" role="dialog" aria-modal="true" aria-labelledby="settings-drawer-title">
        <header className="settings-drawer-header">
          <div>
            <span className="settings-drawer-kicker">Infi Tab</span>
            <h1 id="settings-drawer-title">Settings</h1>
          </div>
          <button className="drawer-close" type="button" onClick={close} aria-label="Close settings">
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
                onChange={(event) => changeSearchProvider(event.target.value as SearchProviderId)}
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
                onChange={(event) => changeLayout("hideSearchBox", event.target.checked)}
              />
            </label>
            <label>
              <span>Hide search category</span>
              <input
                type="checkbox"
                checked={tabState.layout.hideSearchCategory}
                onChange={(event) => changeLayout("hideSearchCategory", event.target.checked)}
              />
            </label>
            <label>
              <span>Hide search button</span>
              <input
                type="checkbox"
                checked={tabState.layout.hideSearchButton}
                onChange={(event) => changeLayout("hideSearchButton", event.target.checked)}
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
                onChange={(event) => changeLayout("searchBoxSize", Number(event.target.value))}
              />
            </label>
            <label>
              <span>Search box rounded corners</span>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={tabState.layout.searchBoxRadius}
                onChange={(event) => changeLayout("searchBoxRadius", Number(event.target.value))}
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
                onChange={(event) => changeLayout("searchBoxOpacity", Number(event.target.value))}
              />
            </label>
          </section>

          <section className="settings-group">
            <h2>Grid Layout</h2>
            <div className="grid-layout-presets" role="radiogroup" aria-label="Grid layout">
              {Object.entries(gridLayoutPresets).map(([presetId, preset]) => (
                <button
                  className={
                    gridLayout.mode === "preset" && gridLayout.presetId === presetId ? "active" : ""
                  }
                  key={presetId}
                  type="button"
                  onClick={() => chooseGridLayoutPreset(presetId as GridLayoutPresetId)}
                >
                  <span className="grid-layout-preview" aria-hidden="true" />
                  <span>{preset.label}</span>
                </button>
              ))}
              <button
                className={gridLayout.mode === "custom" ? "active" : ""}
                type="button"
                onClick={() => setIsCustomizeLayoutOpen(true)}
              >
                <span className="grid-layout-preview custom" aria-hidden="true">
                  <LayoutGrid strokeWidth={2.2} />
                </span>
                <span>Customize</span>
              </button>
            </div>
            <label>
              <span>Show labels</span>
              <input
                type="checkbox"
                checked={tabState.layout.showLabels}
                onChange={(event) => changeLayout("showLabels", event.target.checked)}
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
                    uploadWallpaper(event.target.files?.[0] ?? null);
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
                onChange={(event) => changeWallpaperSetting("dim", Number(event.target.value))}
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
                onChange={(event) => changeWallpaperSetting("blur", Number(event.target.value))}
              />
            </label>
            <label className="upload-button">
              Upload wallpaper
              <input
                accept="image/*"
                type="file"
                onChange={(event) => {
                  uploadWallpaper(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            <button className="launcher-action" type="button" onClick={resetWallpaper}>
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
                  importBackup(event.target.files?.[0] ?? null);
                  event.currentTarget.value = "";
                }}
              />
            </label>
            {backupMessage ? <p className="launcher-message">{backupMessage}</p> : null}
          </section>
        </div>

        {isCustomizeLayoutOpen ? (
          <div className="layout-customize-backdrop" role="presentation">
            <section
              className="layout-customize-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="layout-customize-title"
            >
              <button
                className="modal-close"
                type="button"
                onClick={() => setIsCustomizeLayoutOpen(false)}
                aria-label="Close customize layout"
              >
                x
              </button>
              <h2 id="layout-customize-title">Customize layout</h2>
              <label>
                <span>Rows</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={gridLayout.rows}
                  onChange={(event) => customizeGridLayout({ rows: Number(event.target.value) })}
                />
                <output>{gridLayout.rows}</output>
              </label>
              <label>
                <span>Columns</span>
                <input
                  type="range"
                  min="1"
                  max="8"
                  step="1"
                  value={gridLayout.columns}
                  onChange={(event) => customizeGridLayout({ columns: Number(event.target.value) })}
                />
                <output>{gridLayout.columns}</output>
              </label>
              <label>
                <span>Column spacing</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={gridLayout.columnSpacing}
                  onChange={(event) => customizeGridLayout({ columnSpacing: Number(event.target.value) })}
                />
                <output>{gridLayout.columnSpacing}%</output>
              </label>
              <label>
                <span>Line spacing</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="5"
                  value={gridLayout.lineSpacing}
                  onChange={(event) => customizeGridLayout({ lineSpacing: Number(event.target.value) })}
                />
                <output>{gridLayout.lineSpacing}%</output>
              </label>
              <label>
                <span>Icon size</span>
                <input
                  type="range"
                  min="50"
                  max="120"
                  step="5"
                  value={gridLayout.iconSize}
                  onChange={(event) => customizeGridLayout({ iconSize: Number(event.target.value) })}
                />
                <output>{gridLayout.iconSize}%</output>
              </label>
            </section>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
