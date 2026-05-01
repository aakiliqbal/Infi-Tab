import type { DropZone } from "../../domain/dropActions";
import type { TileId } from "../../domain/tabState";

export type DropPosition = "left" | "center" | "right";

export type DragSource =
  | {
      kind: "top-level";
      tileKind: "shortcut" | "folder";
      tileId: TileId;
      pageId: string;
      index: number;
    }
  | {
      kind: "folder-child";
      shortcutId: TileId;
      folderId: TileId;
      pageId: string;
      index: number;
    };

export type DropTarget =
  | {
      kind: "top-level-tile";
      tileKind: "shortcut" | "folder";
      tileId: TileId;
      pageId: string;
      index: number;
      zone: DropZone;
    }
  | {
      kind: "folder-child";
      folderId: TileId;
      shortcutId: TileId;
      index: number;
      zone: Exclude<DropZone, "center">;
    }
  | {
      kind: "folder-end";
      folderId: TileId;
      index: number;
    }
  | {
      kind: "page-surface";
      pageId: string;
      index: number;
    }
  | {
      kind: "page-edge";
      direction: "prev" | "next";
    };

export type DropPreview = DragSource extends infer S ? DropTarget extends infer T ? { source: S; target: T | null } : never : never;
