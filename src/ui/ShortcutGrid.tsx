import { type DragEvent, type RefObject } from "react";
import { Folder as FolderIcon, FolderPlus as FolderPlusIcon } from "lucide-react";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../domain/tabOperations";
import type { Shortcut } from "../domain/tabState";
import { ShortcutIcon } from "./ShortcutIcon";

export type ShortcutPageItem =
  | ResolvedTopLevelTile
  | {
      key: "create:shortcut";
      type: "create-shortcut";
    }
  | {
      key: "create:folder";
      type: "create-folder";
    };

type ShortcutGridProps = {
  activeShortcutPageIndex: number;
  dragOverTopLevelTileKey: string | null;
  draggedTopLevelTileKey: string | null;
  finishDragging: () => void;
  gridRef: RefObject<HTMLElement | null>;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onMoveTopLevelTile: (targetTileKey: string) => Promise<void>;
  onOpenNewFolderDialog: () => void;
  onOpenNewShortcutDialog: () => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  onSetActiveShortcutPage: (pageIndex: number) => void;
  onSetDragOverTopLevelTileKey: (key: string | null) => void;
  onSetDraggedTopLevelTileKey: (key: string | null) => void;
  pageCount: number;
  showLabels: boolean;
  visibleShortcutPageItems: ShortcutPageItem[];
};

export function ShortcutGrid({
  activeShortcutPageIndex,
  dragOverTopLevelTileKey,
  draggedTopLevelTileKey,
  finishDragging,
  gridRef,
  onEditFolder,
  onEditShortcut,
  onMoveTopLevelTile,
  onOpenNewFolderDialog,
  onOpenNewShortcutDialog,
  onSetActiveFolderId,
  onSetActiveShortcutPage,
  onSetDragOverTopLevelTileKey,
  onSetDraggedTopLevelTileKey,
  pageCount,
  showLabels,
  visibleShortcutPageItems
}: ShortcutGridProps) {
  return (
    <>
      <section
        className="quick-link-grid"
        aria-label="Quick links"
        key={`shortcut-page-${activeShortcutPageIndex}`}
        ref={gridRef}
      >
        {visibleShortcutPageItems.map((tile) => {
          if (tile.type === "create-shortcut") {
            return (
              <button className="quick-link add-link" type="button" key={tile.key} onClick={onOpenNewShortcutDialog}>
                <span className="quick-link-icon add-link-icon" aria-hidden="true">
                  +
                </span>
                <span className="quick-link-title">Add</span>
              </button>
            );
          }

          if (tile.type === "create-folder") {
            return (
              <button className="quick-link add-link" type="button" key={tile.key} onClick={onOpenNewFolderDialog}>
                <span className="quick-link-icon add-link-icon folder-add-icon" aria-hidden="true">
                  <FolderPlusIcon strokeWidth={2.25} />
                </span>
                <span className="quick-link-title">Folder</span>
              </button>
            );
          }

          const tileClassName = [
            "quick-link",
            tile.type === "folder" ? "folder-link" : "",
            draggedTopLevelTileKey === tile.key ? "dragging" : "",
            dragOverTopLevelTileKey === tile.key && draggedTopLevelTileKey !== tile.key ? "drag-over" : ""
          ]
            .filter(Boolean)
            .join(" ");
          const dragProps = {
            draggable: true,
            onDragStart: (event: DragEvent<HTMLElement>) => {
              event.dataTransfer.effectAllowed = "move";
              event.dataTransfer.setData("text/plain", tile.key);
              onSetDraggedTopLevelTileKey(tile.key);
            },
            onDragEnter: (event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              onSetDragOverTopLevelTileKey(tile.key);
            },
            onDragOver: (event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
            },
            onDragLeave: (event: DragEvent<HTMLElement>) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                onSetDragOverTopLevelTileKey(null);
              }
            },
            onDrop: (event: DragEvent<HTMLElement>) => {
              event.preventDefault();
              void onMoveTopLevelTile(tile.key).finally(finishDragging);
            },
            onDragEnd: finishDragging
          };

          if (tile.type === "shortcut") {
            const { shortcut } = tile;
            return (
              <a className={tileClassName} href={shortcut.url} key={tile.key} {...dragProps}>
                <ShortcutIcon shortcut={shortcut} />
                {showLabels ? <span className="quick-link-title">{shortcut.title}</span> : null}
                <button
                  className="quick-link-edit"
                  type="button"
                  aria-label={`Edit ${shortcut.title}`}
                  onClick={(event) => {
                    event.preventDefault();
                    onEditShortcut(shortcut);
                  }}
                >
                  Edit
                </button>
              </a>
            );
          }

          const { folder } = tile;
          return (
            <div
              className={tileClassName}
              key={tile.key}
              role="button"
              tabIndex={0}
              onClick={() => onSetActiveFolderId(folder.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onSetActiveFolderId(folder.id);
                }
              }}
              {...dragProps}
            >
              <span
                className="quick-link-icon folder-icon"
                style={{ backgroundColor: folder.icon.background }}
                aria-hidden="true"
              >
                <FolderIcon strokeWidth={2.25} />
                <span className="folder-count">{folder.shortcuts.length}</span>
              </span>
              {showLabels ? <span className="quick-link-title">{folder.title}</span> : null}
              <button
                className="quick-link-edit"
                type="button"
                aria-label={`Edit ${folder.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  onEditFolder(folder);
                }}
              >
                Edit
              </button>
            </div>
          );
        })}
      </section>
      <nav className="shortcut-page-footer" aria-label="Shortcut pages">
              {pageCount > 1 ? (
            <div className="shortcut-page-dots">
              {Array.from({ length: pageCount }, (_, index) => (
                <button
                  aria-label={`Go to shortcut page ${index + 1}`}
                  aria-current={index === activeShortcutPageIndex ? "page" : undefined}
                  className={index === activeShortcutPageIndex ? "active" : ""}
                  key={index}
                  onClick={() => onSetActiveShortcutPage(index)}
                  type="button"
                />
              ))}
            </div>
          ) : null}
      </nav>
    </>
  );
}
