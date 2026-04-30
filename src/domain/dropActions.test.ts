import { produce } from "immer";
import { describe, expect, it } from "vitest";
import { applyDropAction, resolveDrop, runFolderCleanup, type DropZone } from "./dropActions";
import type { TabState } from "./tabState";

describe("applyDropAction", () => {
  it("reorders a tile within a page", () => {
    const next = reduceTestState({ type: "REORDER", tileId: "a", targetPageId: "page-1", toIndex: 2 });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1", "a"]);
  });

  it("combines two shortcuts into a folder at the target position", () => {
    const next = reduceTestState({
      type: "COMBINE",
      sourceTileId: "a",
      targetTileId: "b",
      targetPageId: "page-1",
      folderId: "combined"
    });

    expect(next.pages[0].tileIds).toEqual(["combined", "folder-1"]);
    expect(next.tiles.combined.kind).toBe("folder");
    expect(next.tiles.combined.kind === "folder" ? next.tiles.combined.childIds : []).toEqual(["a", "b"]);
  });

  it("adds a shortcut to a folder", () => {
    const next = reduceTestState({ type: "ADD_TO_FOLDER", sourceTileId: "a", folderId: "folder-1" });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1"]);
    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual([
      "c",
      "d",
      "a"
    ]);
  });

  it("moves a tile between pages", () => {
    const next = reduceTestState({
      type: "CROSS_PAGE",
      tileId: "a",
      fromPageId: "page-1",
      toPageId: "page-2",
      toIndex: 1
    });

    expect(next.pages[0].tileIds).toEqual(["b", "folder-1"]);
    expect(next.pages[1].tileIds).toEqual(["e", "a", "folder-2"]);
  });

  it("promotes a folder child to a page and cleans up the source folder", () => {
    const next = reduceTestState({
      type: "PROMOTE",
      tileId: "c",
      fromFolderId: "folder-1",
      toPageId: "page-1",
      toIndex: 1
    });

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "c", "b", "d"]);
  });

  it("leaves state unchanged on cancel", () => {
    const state = createTestState();
    const next = produce(state, (draft) => {
      applyDropAction(draft, { type: "CANCEL" });
    });

    expect(next).toEqual(state);
  });
});

describe("runFolderCleanup", () => {
  it("removes an empty folder", () => {
    const next = cleanupState([]);

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "b"]);
  });

  it("promotes the remaining child when a folder has one child", () => {
    const next = cleanupState(["c"]);

    expect(next.tiles["folder-1"]).toBeUndefined();
    expect(next.pages[0].tileIds).toEqual(["a", "b", "c"]);
  });

  it("keeps folders with two children", () => {
    const next = cleanupState(["c", "d"]);

    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual(["c", "d"]);
    expect(next.pages[0].tileIds).toEqual(["a", "b", "folder-1"]);
  });

  it("keeps folders with three or more children", () => {
    const next = cleanupState(["c", "d", "e"]);

    expect(next.tiles["folder-1"].kind === "folder" ? next.tiles["folder-1"].childIds : []).toEqual([
      "c",
      "d",
      "e"
    ]);
  });
});

describe("resolveDrop", () => {
  const zones: DropZone[] = ["leading", "center", "trailing"];

  it("cancels when there is no target", () => {
    expect(resolveDrop(createTestState(), baseResolveInput({ overId: null }))).toEqual({ type: "CANCEL" });
  });

  it("resolves folder-child drops on the surface to promote", () => {
    expect(
      resolveDrop(
        createTestState(),
        baseResolveInput({ activeId: "c", overId: "surface", sourceFolderId: "folder-1", toIndex: 1 })
      )
    ).toEqual({
      type: "PROMOTE",
      tileId: "c",
      fromFolderId: "folder-1",
      toPageId: "page-1",
      toIndex: 1
    });
  });

  it("resolves preview-page drops to cross-page moves", () => {
    expect(resolveDrop(createTestState(), baseResolveInput({ previewPageId: "page-2", toIndex: 1 }))).toEqual({
      type: "CROSS_PAGE",
      tileId: "a",
      fromPageId: "page-1",
      toPageId: "page-2",
      toIndex: 1
    });
  });

  it.each(zones)("resolves Shortcut over Shortcut in %s zone", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "a", overId: "b", overZone: zone }));

    expect(action.type).toBe(zone === "center" ? "COMBINE" : "REORDER");
  });

  it.each(zones)("resolves Shortcut over Folder in %s zone", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "a", overId: "folder-1", overZone: zone }));

    expect(action.type).toBe(zone === "center" ? "ADD_TO_FOLDER" : "REORDER");
  });

  it.each(zones)("resolves Folder over Shortcut in %s zone as reorder", (zone) => {
    const action = resolveDrop(createTestState(), baseResolveInput({ activeId: "folder-1", overId: "a", overZone: zone }));

    expect(action.type).toBe("REORDER");
  });

  it.each(zones)("resolves Folder over Folder in %s zone as reorder", (zone) => {
    const action = resolveDrop(
      createTestState(),
      baseResolveInput({ activeId: "folder-1", overId: "folder-2", overZone: zone })
    );

    expect(action.type).toBe("REORDER");
  });
});

function reduceTestState(action: Parameters<typeof applyDropAction>[1]) {
  return produce(createTestState(), (draft) => {
    applyDropAction(draft, action);
  });
}

function cleanupState(childIds: string[]) {
  return produce(createTestState(), (draft) => {
    if (draft.tiles["folder-1"].kind === "folder") {
      draft.tiles["folder-1"].childIds = childIds;
    }
    runFolderCleanup(draft, "folder-1");
  });
}

function baseResolveInput(overrides: Partial<Parameters<typeof resolveDrop>[1]> = {}): Parameters<typeof resolveDrop>[1] {
  return {
    activeId: "a",
    overId: "b",
    overZone: "leading",
    sourcePageId: "page-1",
    ...overrides
  };
}

function createTestState(): TabState {
  return {
    schemaVersion: 2,
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
    tiles: {
      a: shortcut("a"),
      b: shortcut("b"),
      c: shortcut("c"),
      d: shortcut("d"),
      e: shortcut("e"),
      "folder-1": folder("folder-1", ["c", "d"]),
      "folder-2": folder("folder-2", ["a", "b"])
    },
    pages: [
      { id: "page-1", tileIds: ["a", "b", "folder-1"] },
      { id: "page-2", tileIds: ["e", "folder-2"] }
    ]
  };
}

function shortcut(id: string): TabState["tiles"][string] {
  return {
    kind: "shortcut",
    id,
    title: id.toUpperCase(),
    url: `https://${id}.example.com`,
    icon: {
      type: "fallback",
      label: id.toUpperCase(),
      background: "#111827"
    }
  };
}

function folder(id: string, childIds: string[]): TabState["tiles"][string] {
  return {
    kind: "folder",
    id,
    title: id,
    icon: {
      type: "fallback",
      label: "F",
      background: "#64748b"
    },
    childIds
  };
}
