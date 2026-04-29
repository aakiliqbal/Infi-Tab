import { defaultTabState, normalizeGridLayout, normalizeTopLevelTiles, type TabState } from "../domain/tabState";

const storageKey = "infiTabState";

export async function loadTabState(): Promise<TabState> {
  const stored = await storageGet<Partial<TabState>>(storageKey);

  if (!stored || stored.schemaVersion !== defaultTabState.schemaVersion) {
    await saveTabState(defaultTabState);
    return defaultTabState;
  }

  const quickLinks = stored.quickLinks ?? defaultTabState.quickLinks;
  const folders = stored.folders ?? defaultTabState.folders;

  return {
    ...defaultTabState,
    ...stored,
    quickLinks,
    folders,
    topLevelTiles: normalizeTopLevelTiles(stored.topLevelTiles, quickLinks, folders),
    wallpaper: {
      ...defaultTabState.wallpaper,
      ...(stored.wallpaper ?? {})
    },
    layout: {
      ...defaultTabState.layout,
      ...(stored.layout ?? {}),
      gridLayout: normalizeGridLayout(stored.layout?.gridLayout, stored.layout)
    }
  };
}

export async function saveTabState(state: TabState): Promise<void> {
  await storageSet(storageKey, state);
}

async function storageGet<T>(key: string): Promise<T | null> {
  const chromeLocal = getChromeLocalStorage();

  if (chromeLocal) {
    return new Promise((resolve) => {
      chromeLocal.get([key], (items) => resolve((items[key] as T | undefined) ?? null));
    });
  }

  const raw = window.localStorage.getItem(key);
  return raw ? (JSON.parse(raw) as T) : null;
}

async function storageSet<T>(key: string, value: T): Promise<void> {
  const chromeLocal = getChromeLocalStorage();

  if (chromeLocal) {
    return new Promise((resolve, reject) => {
      chromeLocal.set({ [key]: value }, () => {
        const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
        if (error) {
          reject(new Error(error.message ?? "Chrome storage write failed"));
          return;
        }

        resolve();
      });
    });
  }

  window.localStorage.setItem(key, JSON.stringify(value));
}

function getChromeLocalStorage() {
  return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
}
