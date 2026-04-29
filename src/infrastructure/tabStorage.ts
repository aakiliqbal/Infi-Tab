import { defaultTabState, normalizeGridLayout, normalizeTopLevelTiles, type TabState } from "../domain/tabState";
import { materializeTabStateMedia, stripResolvedMediaFromTabState } from "./mediaStorage";

const storageKey = "infiTabState";

export async function loadTabState(): Promise<TabState> {
  const stored = await storageGet<Partial<TabState>>(storageKey);

  if (!stored || stored.schemaVersion !== defaultTabState.schemaVersion) {
    return saveTabState(defaultTabState);
  }

  const quickLinks = stored.quickLinks ?? defaultTabState.quickLinks;
  const folders = stored.folders ?? defaultTabState.folders;

  const nextState = {
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

  const hydratedState = await materializeTabStateMedia(nextState);
  await storageSet(storageKey, stripResolvedMediaFromTabState(hydratedState));
  return hydratedState;
}

export async function saveTabState(state: TabState): Promise<TabState> {
  const materializedState = await materializeTabStateMedia(state);
  await storageSet(storageKey, stripResolvedMediaFromTabState(materializedState));
  return materializedState;
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
