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
};

export type TabState = {
  schemaVersion: 1;
  searchProvider: SearchProviderId;
  layout: LayoutSettings;
  wallpaper: {
    type: "none" | "dataUrl";
    value: string | null;
    dim: number;
    blur: number;
  };
  quickLinks: QuickLink[];
  folders: Folder[];
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
    searchBoxOpacity: 96
  },
  wallpaper: {
    type: "none",
    value: null,
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
  ]
};

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
      brandIconId: brandIconId ?? null
    }
  };
}
