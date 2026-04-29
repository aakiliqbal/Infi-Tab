import type { BrandIconId } from "./brandIcons";

export type SearchProviderId = "google" | "bing" | "yahoo" | "yandex" | "duckduckgo";

export type QuickLink = {
  id: string;
  title: string;
  url: string;
  icon: {
    type: "fallback" | "image" | "brand";
    label: string;
    background: string;
    imageDataUrl?: string | null;
    imageMediaId?: string | null;
    brandIconId?: BrandIconId | null;
  };
};

export type Folder = {
  id: string;
  title: string;
  icon: {
    type: "fallback";
    label: string;
    background: string;
  };
  quickLinks: QuickLink[];
};

export type TopLevelTile = {
  type: "shortcut" | "folder";
  id: string;
};

export type GridLayoutPresetId = "2x4" | "2x5" | "2x6" | "2x7" | "3x3";

export type GridLayoutSettings = {
  mode: "preset" | "custom";
  presetId: GridLayoutPresetId;
  rows: number;
  columns: number;
  columnSpacing: number;
  lineSpacing: number;
  iconSize: number;
};

export type LayoutSettings = {
  iconSize: number;
  gridGap: number;
  columns: number;
  showLabels: boolean;
  searchPosition: "top" | "center";
  hideSearchBox: boolean;
  hideSearchCategory: boolean;
  hideSearchButton: boolean;
  searchBoxSize: number;
  searchBoxRadius: number;
  searchBoxOpacity: number;
  gridLayout: GridLayoutSettings;
};

export type TabState = {
  schemaVersion: 1;
  searchProvider: SearchProviderId;
  layout: LayoutSettings;
  wallpaper: {
    type: "none" | "dataUrl";
    value: string | null;
    mediaId: string | null;
    dim: number;
    blur: number;
  };
  quickLinks: QuickLink[];
  folders: Folder[];
  topLevelTiles: TopLevelTile[];
};

export const searchProviders: Record<SearchProviderId, { label: string; url: string }> = {
  google: {
    label: "Google",
    url: "https://www.google.com/search?q="
  },
  bing: {
    label: "Bing",
    url: "https://www.bing.com/search?q="
  },
  yahoo: {
    label: "Yahoo",
    url: "https://search.yahoo.com/search?p="
  },
  yandex: {
    label: "Yandex",
    url: "https://yandex.com/search/?text="
  },
  duckduckgo: {
    label: "DuckDuckGo",
    url: "https://duckduckgo.com/?q="
  }
};

export const gridLayoutPresets: Record<GridLayoutPresetId, { label: string; rows: number; columns: number }> = {
  "2x4": { label: "2x4", rows: 2, columns: 4 },
  "2x5": { label: "2x5", rows: 2, columns: 5 },
  "2x6": { label: "2x6", rows: 2, columns: 6 },
  "2x7": { label: "2x7", rows: 2, columns: 7 },
  "3x3": { label: "3x3", rows: 3, columns: 3 }
};

export const defaultTabState: TabState = {
  schemaVersion: 1,
  searchProvider: "google",
  layout: {
    iconSize: 86,
    gridGap: 34,
    columns: 6,
    showLabels: true,
    searchPosition: "top",
    hideSearchBox: false,
    hideSearchCategory: false,
    hideSearchButton: false,
    searchBoxSize: 100,
    searchBoxRadius: 100,
    searchBoxOpacity: 96,
    gridLayout: {
      mode: "preset",
      presetId: "2x6",
      rows: 2,
      columns: 6,
      columnSpacing: 100,
      lineSpacing: 100,
      iconSize: 100
    }
  },
  wallpaper: {
    type: "none",
    value: null,
    mediaId: null,
    dim: 40,
    blur: 0
  },
  folders: [
    {
      id: "work-folder",
      title: "Work",
      icon: {
        type: "fallback",
        label: "W",
        background: "#64748b"
      },
      quickLinks: [
        createQuickLink("work-notion", "Notion", "https://notion.so", "#111827", "notion"),
        createQuickLink("work-reddit", "Reddit", "https://reddit.com", "#ff4500", "reddit")
      ]
    }
  ],
  quickLinks: [
    createQuickLink("docs", "Docs", "https://docs.google.com", "#4285f4", "googleDocs"),
    createQuickLink("mail", "Gmail", "https://mail.google.com", "#ea4335", "gmail"),
    createQuickLink("github", "GitHub", "https://github.com", "#181717", "github"),
    createQuickLink("youtube", "YouTube", "https://youtube.com", "#ff0000", "youtube"),
    createQuickLink("calendar", "Calendar", "https://calendar.google.com", "#4285f4", "googleCalendar"),
    createQuickLink("drive", "Drive", "https://drive.google.com", "#4285f4", "googleDrive"),
    createQuickLink("x", "X", "https://x.com", "#000000", "x"),
    createQuickLink("spotify", "Spotify", "https://spotify.com", "#1db954", "spotify"),
    createQuickLink("netflix", "Netflix", "https://netflix.com", "#e50914", "netflix"),
    createQuickLink("instagram", "Instagram", "https://instagram.com", "#e4405f", "instagram"),
    createQuickLink("facebook", "Facebook", "https://facebook.com", "#0866ff", "facebook"),
    createQuickLink("chrome", "Chrome", "https://chrome.google.com/webstore", "#4285f4", "googleChrome")
  ],
  topLevelTiles: [
    { type: "shortcut", id: "docs" },
    { type: "shortcut", id: "mail" },
    { type: "shortcut", id: "github" },
    { type: "shortcut", id: "youtube" },
    { type: "shortcut", id: "calendar" },
    { type: "shortcut", id: "drive" },
    { type: "shortcut", id: "x" },
    { type: "shortcut", id: "spotify" },
    { type: "shortcut", id: "netflix" },
    { type: "shortcut", id: "instagram" },
    { type: "shortcut", id: "facebook" },
    { type: "shortcut", id: "chrome" },
    { type: "folder", id: "work-folder" }
  ]
};

export function createTopLevelTileOrder(quickLinks: QuickLink[], folders: Folder[]): TopLevelTile[] {
  return [
    ...quickLinks.map((quickLink) => ({ type: "shortcut" as const, id: quickLink.id })),
    ...folders.map((folder) => ({ type: "folder" as const, id: folder.id }))
  ];
}

export function normalizeTopLevelTiles(
  value: unknown,
  quickLinks: QuickLink[],
  folders: Folder[]
): TopLevelTile[] {
  const quickLinkIds = new Set(quickLinks.map((quickLink) => quickLink.id));
  const folderIds = new Set(folders.map((folder) => folder.id));
  const seen = new Set<string>();
  const topLevelTiles: TopLevelTile[] = [];

  if (Array.isArray(value)) {
    for (const tile of value) {
      if (!isTopLevelTileLike(tile)) {
        continue;
      }

      const key = `${tile.type}:${tile.id}`;
      const exists = tile.type === "shortcut" ? quickLinkIds.has(tile.id) : folderIds.has(tile.id);
      if (!exists || seen.has(key)) {
        continue;
      }

      seen.add(key);
      topLevelTiles.push({ type: tile.type, id: tile.id });
    }
  }

  for (const quickLink of quickLinks) {
    const key = `shortcut:${quickLink.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      topLevelTiles.push({ type: "shortcut", id: quickLink.id });
    }
  }

  for (const folder of folders) {
    const key = `folder:${folder.id}`;
    if (!seen.has(key)) {
      seen.add(key);
      topLevelTiles.push({ type: "folder", id: folder.id });
    }
  }

  return topLevelTiles;
}

export function normalizeGridLayout(value: unknown, fallbackLayout?: Partial<LayoutSettings>): GridLayoutSettings {
  const fallback = defaultTabState.layout.gridLayout;

  if (!isRecord(value)) {
    return {
      ...fallback,
      columns: clampInteger(fallbackLayout?.columns, 1, 8, fallback.columns),
      columnSpacing: clampInteger(
        fallbackLayout?.gridGap ? Math.round((fallbackLayout.gridGap / defaultTabState.layout.gridGap) * 100) : undefined,
        0,
        100,
        fallback.columnSpacing
      ),
      lineSpacing: clampInteger(
        fallbackLayout?.gridGap ? Math.round((fallbackLayout.gridGap / defaultTabState.layout.gridGap) * 100) : undefined,
        0,
        100,
        fallback.lineSpacing
      ),
      iconSize: clampInteger(
        fallbackLayout?.iconSize ? Math.round((fallbackLayout.iconSize / defaultTabState.layout.iconSize) * 100) : undefined,
        50,
        120,
        fallback.iconSize
      )
    };
  }

  const presetId = isGridLayoutPresetId(value.presetId) ? value.presetId : fallback.presetId;
  const preset = gridLayoutPresets[presetId];
  const mode = value.mode === "custom" ? "custom" : "preset";

  return {
    mode,
    presetId,
    rows: clampInteger(value.rows, 1, 8, preset.rows),
    columns: clampInteger(value.columns, 1, 8, preset.columns),
    columnSpacing: clampInteger(value.columnSpacing, 0, 100, fallback.columnSpacing),
    lineSpacing: clampInteger(value.lineSpacing, 0, 100, fallback.lineSpacing),
    iconSize: clampInteger(value.iconSize, 50, 120, fallback.iconSize)
  };
}

function isTopLevelTileLike(value: unknown): value is TopLevelTile {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    "id" in value &&
    (value.type === "shortcut" || value.type === "folder") &&
    typeof value.id === "string"
  );
}

function isGridLayoutPresetId(value: unknown): value is GridLayoutPresetId {
  return typeof value === "string" && value in gridLayoutPresets;
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.round(value)));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function createQuickLink(
  id: string,
  title: string,
  url: string,
  background: string,
  brandIconId?: BrandIconId
): QuickLink {
  return {
    id,
    title,
    url,
      icon: {
        type: brandIconId ? "brand" : "fallback",
        label: title.slice(0, 1).toUpperCase(),
        background,
        imageMediaId: null,
        brandIconId: brandIconId ?? null
      }
    };
}
