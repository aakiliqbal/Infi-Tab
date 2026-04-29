import { type SearchProviderId, type TabState } from "../domain/tabState";
import { BackupSettingsSection } from "./settings/BackupSettingsSection";
import { GridLayoutSettingsSection } from "./settings/GridLayoutSettingsSection";
import { SearchSettingsSection } from "./settings/SearchSettingsSection";
import { WallpaperSettingsSection } from "./settings/WallpaperSettingsSection";

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
          <SearchSettingsSection changeLayout={changeLayout} changeSearchProvider={changeSearchProvider} tabState={tabState} />
          <GridLayoutSettingsSection changeLayout={changeLayout} tabState={tabState} />
          <WallpaperSettingsSection
            changeWallpaperSetting={changeWallpaperSetting}
            resetWallpaper={resetWallpaper}
            tabState={tabState}
            uploadWallpaper={uploadWallpaper}
            wallpaperMessage={wallpaperMessage}
          />
          <BackupSettingsSection backupMessage={backupMessage} exportBackup={exportBackup} importBackup={importBackup} />
        </div>
      </aside>
    </div>
  );
}
