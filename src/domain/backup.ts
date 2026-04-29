import { normalizeGridLayout, normalizeTopLevelTiles, searchProviders, type TabState } from "./tabState";

export function parseTabStateBackup(value: unknown): TabState {
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
    layout: {
      ...backup.layout,
      gridLayout: normalizeGridLayout(backup.layout.gridLayout, backup.layout)
    },
    topLevelTiles: normalizeTopLevelTiles(backup.topLevelTiles, backup.quickLinks, backup.folders),
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
