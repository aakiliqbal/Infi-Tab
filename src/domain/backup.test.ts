import { describe, expect, it } from "vitest";
import {
  describeBackupReplacement,
  getBackupImportErrorMessage,
  parseTabStateBackup
} from "./backup";
import { defaultTabState } from "./tabState";

describe("parseTabStateBackup", () => {
  it("migrates older backups missing optional fields and tile order", () => {
    const backup = {
      schemaVersion: 1,
      searchProvider: defaultTabState.searchProvider,
      layout: {
        ...defaultTabState.layout,
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
        type: "dataUrl",
        value: "data:image/png;base64,abc"
      },
      quickLinks: defaultTabState.quickLinks.slice(0, 1),
      folders: defaultTabState.folders.slice(0, 1)
    };

    const parsed = parseTabStateBackup(backup);

    expect(parsed.wallpaper.dim).toBe(40);
    expect(parsed.wallpaper.blur).toBe(0);
    expect(parsed.layout.gridLayout.rows).toBe(2);
    expect(parsed.layout.gridLayout.columns).toBe(6);
    expect(parsed.topLevelTiles).toEqual([
      { type: "shortcut", id: defaultTabState.quickLinks[0].id },
      { type: "folder", id: defaultTabState.folders[0].id }
    ]);
  });

  it("keeps media payload references in portable backup state", () => {
    const backup = {
      schemaVersion: 1,
      searchProvider: defaultTabState.searchProvider,
      layout: defaultTabState.layout,
      wallpaper: {
        ...defaultTabState.wallpaper,
        type: "dataUrl",
        value: "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
        mediaId: "wallpaper-id"
      },
      quickLinks: [
        {
          ...defaultTabState.quickLinks[0],
          icon: {
            ...defaultTabState.quickLinks[0].icon,
            type: "image",
            imageDataUrl: "data:image/gif;base64,R0lGODlhAQABAPAAAAAAAAAAACH5BAEAAAAALAAAAAABAAEAAAICRAEAOw==",
            imageMediaId: "icon-id"
          }
        }
      ],
      folders: defaultTabState.folders.slice(0, 1)
    };

    const parsed = parseTabStateBackup(backup);

    expect(parsed.wallpaper.mediaId).toBe("wallpaper-id");
    expect(parsed.quickLinks[0].icon.imageMediaId).toBe("icon-id");
  });

  it("rejects invalid shapes", () => {
    expect(() => parseTabStateBackup(null)).toThrow("Unsupported backup schema");
    expect(() => parseTabStateBackup({ schemaVersion: 1 })).toThrow("Invalid backup shape");
  });

  it("describes what the import will replace", () => {
    expect(describeBackupReplacement(defaultTabState)).toContain("shortcuts");
    expect(describeBackupReplacement(defaultTabState)).toContain("folder");
  });

  it("maps backup import errors to user-friendly messages", () => {
    expect(getBackupImportErrorMessage(new SyntaxError("Unexpected token"))).toBe(
      "The selected file is not valid JSON."
    );
    expect(getBackupImportErrorMessage(new Error("Unsupported backup schema"))).toBe(
      "This backup uses an unsupported schema version."
    );
    expect(getBackupImportErrorMessage(new Error("Invalid backup shape"))).toBe(
      "This backup file is missing required fields."
    );
  });
});
