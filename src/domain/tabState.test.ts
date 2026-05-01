import { describe, expect, it } from "vitest";
import { defaultTabState, migrateLegacyTabState } from "./tabState";

const baseLegacyState = {
  schemaVersion: 1 as const,
  searchProvider: defaultTabState.searchProvider,
  layout: defaultTabState.layout,
  wallpaper: defaultTabState.wallpaper
};

describe("migrateLegacyTabState", () => {
  it("returns the v2 default for empty state", () => {
    const migrated = migrateLegacyTabState(null);

    expect(migrated.schemaVersion).toBe(2);
    expect(migrated.pages[0].tileIds).toContain("docs");
    expect(migrated.tiles["work-folder"].kind).toBe("folder");
  });

  it("migrates shortcuts-only v1 state into tiles and page ids", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [
        {
          id: "docs",
          title: "Docs",
          url: "https://docs.google.com",
          icon: {
            type: "fallback",
            label: "D",
            background: "#4285f4"
          }
        }
      ],
      folders: []
    });

    expect(migrated.pages).toEqual([{ id: "page-1", tileIds: ["docs"] }]);
    expect(migrated.tiles.docs.kind).toBe("shortcut");
  });

  it("migrates folders with children into a flat tile map", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [],
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
            {
              id: "work-notion",
              title: "Notion",
              url: "https://notion.so",
              icon: {
                type: "fallback",
                label: "N",
                background: "#111827"
              }
            },
            {
              id: "work-reddit",
              title: "Reddit",
              url: "https://reddit.com",
              icon: {
                type: "fallback",
                label: "R",
                background: "#ff4500"
              }
            }
          ]
        }
      ]
    });

    expect(migrated.pages[0].tileIds).toEqual(["work-folder"]);
    expect(migrated.tiles["work-folder"].kind === "folder" ? migrated.tiles["work-folder"].childIds : []).toEqual([
      "work-notion",
      "work-reddit"
    ]);
    expect(migrated.tiles["work-notion"].kind).toBe("shortcut");
  });

  it("preserves mixed explicit top-level order", () => {
    const migrated = migrateLegacyTabState({
      ...baseLegacyState,
      quickLinks: [
        {
          id: "docs",
          title: "Docs",
          url: "https://docs.google.com",
          icon: {
            type: "fallback",
            label: "D",
            background: "#4285f4"
          }
        }
      ],
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
            {
              id: "work-notion",
              title: "Notion",
              url: "https://notion.so",
              icon: {
                type: "fallback",
                label: "N",
                background: "#111827"
              }
            }
          ]
        }
      ],
      topLevelTiles: [
        { type: "folder", id: "work-folder" },
        { type: "shortcut", id: "docs" }
      ]
    });

    expect(migrated.pages[0].tileIds).toEqual(["work-folder", "docs"]);
  });
});
