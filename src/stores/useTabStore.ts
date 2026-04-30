import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import {
  defaultTabState,
  normalizeTabState,
  type LayoutSettings,
  type SearchProviderId,
  type TabState
} from "../domain/tabState";

const storageKey = "infiTabState";

type TabStoreState = TabState & {
  replaceState: (state: TabState) => void;
  setLayout: <K extends keyof LayoutSettings>(key: K, value: LayoutSettings[K]) => void;
  setSearchProvider: (providerId: SearchProviderId) => void;
  setWallpaper: (wallpaper: TabState["wallpaper"]) => void;
};

export const useTabStore = create<TabStoreState>()(
  persist(
    immer((set) => ({
      ...defaultTabState,
      replaceState: (state) =>
        set((draft) => {
          Object.assign(draft, normalizeTabState(state));
        }),
      setLayout: (key, value) =>
        set((draft) => {
          draft.layout[key] = value;
        }),
      setSearchProvider: (providerId) =>
        set((draft) => {
          draft.searchProvider = providerId;
        }),
      setWallpaper: (wallpaper) =>
        set((draft) => {
          draft.wallpaper = wallpaper;
        })
    })),
    {
      name: storageKey,
      storage: createJSONStorage(() => createChromeStorage()),
      version: 2,
      migrate: (persistedState) => normalizeTabState(persistedState as Partial<TabState>)
    }
  )
);

function createChromeStorage(): StateStorage {
  return {
    getItem: async (key) => {
      const chromeLocal = getChromeLocalStorage();

      if (chromeLocal) {
        return new Promise((resolve) => {
          chromeLocal.get([key], (items) => {
            const value = items[key];
            resolve(typeof value === "string" ? value : value ? JSON.stringify(value) : null);
          });
        });
      }

      return window.localStorage.getItem(key);
    },
    setItem: async (key, value) => {
      const chromeLocal = getChromeLocalStorage();

      if (chromeLocal) {
        await new Promise<void>((resolve, reject) => {
          chromeLocal.set({ [key]: value }, () => {
            const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
            if (error) {
              reject(new Error(error.message ?? "Chrome storage write failed"));
              return;
            }

            resolve();
          });
        });
        return;
      }

      window.localStorage.setItem(key, value);
    },
    removeItem: async (key) => {
      const chromeLocal = getChromeLocalStorage();

      const remove = chromeLocal?.remove;
      if (remove) {
        await new Promise<void>((resolve, reject) => {
          remove([key], () => {
            const error = typeof chrome !== "undefined" ? chrome.runtime?.lastError : undefined;
            if (error) {
              reject(new Error(error.message ?? "Chrome storage remove failed"));
              return;
            }

            resolve();
          });
        });
        return;
      }

      window.localStorage.removeItem(key);
    }
  };
}

function getChromeLocalStorage() {
  return typeof chrome !== "undefined" ? chrome.storage?.local : undefined;
}
