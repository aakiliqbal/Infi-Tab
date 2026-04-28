/// <reference types="vite/client" />

type ChromeStorageArea = {
  get: (keys: string[], callback: (items: Record<string, unknown>) => void) => void;
  set: (items: Record<string, unknown>, callback?: () => void) => void;
};

declare const chrome:
  | {
      runtime?: {
        lastError?: {
          message?: string;
        };
      };
      storage?: {
        local?: ChromeStorageArea;
      };
    }
  | undefined;
