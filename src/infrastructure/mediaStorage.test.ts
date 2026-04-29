import { describe, expect, it } from "vitest";
import { defaultTabState } from "../domain/tabState";
import { materializeTabStateMedia, stripResolvedMediaFromTabState } from "./mediaStorage";

describe("mediaStorage", () => {
  it("stores and reloads wallpaper and shortcut GIFs through media ids", async () => {
    const dataUrl = "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    const state = {
      ...defaultTabState,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl" as const,
        value: dataUrl,
        mediaId: null
      },
      quickLinks: [
        {
          ...defaultTabState.quickLinks[0],
          icon: {
            ...defaultTabState.quickLinks[0].icon,
            type: "image" as const,
            imageDataUrl: dataUrl,
            imageMediaId: null
          }
        }
      ]
    };

    const hydrated = await materializeTabStateMedia(state);

    expect(hydrated.wallpaper.mediaId).toBeTruthy();
    expect(hydrated.quickLinks[0].icon.imageMediaId).toBeTruthy();

    const stripped = stripResolvedMediaFromTabState(hydrated);
    expect(stripped.wallpaper.value).toBeNull();
    expect(stripped.quickLinks[0].icon.imageDataUrl).toBeNull();

    const rehydrated = await materializeTabStateMedia(stripped);

    expect(rehydrated.wallpaper.value).toBe(dataUrl);
    expect(rehydrated.quickLinks[0].icon.imageDataUrl).toBe(dataUrl);
  });

  it("preserves backup media ids while restoring media payloads", async () => {
    const dataUrl = "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==";
    const state = {
      ...defaultTabState,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl" as const,
        value: dataUrl,
        mediaId: "wallpaper-id"
      },
      quickLinks: [
        {
          ...defaultTabState.quickLinks[0],
          icon: {
            ...defaultTabState.quickLinks[0].icon,
            type: "image" as const,
            imageDataUrl: dataUrl,
            imageMediaId: "icon-id"
          }
        }
      ]
    };

    const hydrated = await materializeTabStateMedia(state);

    expect(hydrated.wallpaper.mediaId).toBe("wallpaper-id");
    expect(hydrated.quickLinks[0].icon.imageMediaId).toBe("icon-id");

    const stripped = stripResolvedMediaFromTabState(hydrated);
    const rehydrated = await materializeTabStateMedia(stripped);

    expect(rehydrated.wallpaper.mediaId).toBe("wallpaper-id");
    expect(rehydrated.quickLinks[0].icon.imageMediaId).toBe("icon-id");
    expect(rehydrated.wallpaper.value).toBe(dataUrl);
    expect(rehydrated.quickLinks[0].icon.imageDataUrl).toBe(dataUrl);
  });
});
