import { useMemo, useState, type RefObject } from "react";
import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { motion, useReducedMotion } from "motion/react";
import { Folder as FolderIcon } from "lucide-react";
import { resolveDrop, type DropAction, type DropZone } from "../domain/dropActions";
import type { ResolvedFolder, ResolvedTopLevelTile } from "../domain/tabOperations";
import type { Shortcut, TabState } from "../domain/tabState";
import { ShortcutIcon } from "./ShortcutIcon";

export type ShortcutPageItem =
  | ResolvedTopLevelTile
  | {
      key: "create:shortcut";
      type: "create-shortcut";
    };

type ShortcutGridProps = {
  activeShortcutPageIndex: number;
  dispatchDropAction: (action: DropAction) => void;
  gridRef: RefObject<HTMLElement | null>;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onOpenNewShortcutDialog: () => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  onSetActiveShortcutPage: (pageIndex: number) => void;
  pageCount: number;
  showLabels: boolean;
  tabState: TabState;
  visibleShortcutPageItems: ShortcutPageItem[];
};

type DndMeta = {
  activeKey: string;
  overKey: string | null;
  overZone: DropZone | null;
};

export function ShortcutGrid({
  activeShortcutPageIndex,
  dispatchDropAction,
  gridRef,
  onEditFolder,
  onEditShortcut,
  onOpenNewShortcutDialog,
  onSetActiveFolderId,
  onSetActiveShortcutPage,
  pageCount,
  showLabels,
  tabState,
  visibleShortcutPageItems
}: ShortcutGridProps) {
  const reducedMotion = useReducedMotion();
  const [dndMeta, setDndMeta] = useState<DndMeta | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor)
  );
  const draggableTiles = useMemo(
    () => visibleShortcutPageItems.filter((item): item is ResolvedTopLevelTile => item.type === "shortcut" || item.type === "folder"),
    [visibleShortcutPageItems]
  );
  const activeTile = draggableTiles.find((tile) => tile.key === dndMeta?.activeKey) ?? null;
  const overTile = draggableTiles.find((tile) => tile.key === dndMeta?.overKey) ?? null;
  const isCombineHover = activeTile?.type === "shortcut" && overTile?.type === "shortcut" && dndMeta?.overZone === "center";

  function handleDragOver(event: DragOverEvent) {
    const activeKey = String(event.active.id);
    const overKey = event.over ? String(event.over.id) : null;
    const overZone = event.over ? resolveEventZone(event) : null;
    setDndMeta({ activeKey, overKey, overZone });
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeKey = String(event.active.id);
    const overKey = event.over ? String(event.over.id) : null;
    const overZone = dndMeta?.overKey === overKey ? dndMeta.overZone : null;
    setDndMeta(null);

    if (!overKey || activeKey === overKey) {
      return;
    }

    dispatchDropAction(
      resolveDrop(tabState, {
        activeId: getTileIdFromKey(activeKey),
        overId: getTileIdFromKey(overKey),
        overZone,
        sourcePageId: tabState.pages[activeShortcutPageIndex]?.id ?? "page-1"
      })
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={(event) => setDndMeta({ activeKey: String(event.active.id), overKey: null, overZone: null })}
      onDragOver={handleDragOver}
      onDragCancel={() => setDndMeta(null)}
      onDragEnd={handleDragEnd}
    >
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

          return (
            <DraggableTile
              dndMeta={dndMeta}
              key={tile.key}
              reducedMotion={reducedMotion}
              showLabels={showLabels}
              tile={tile}
              onEditFolder={onEditFolder}
              onEditShortcut={onEditShortcut}
              onSetActiveFolderId={onSetActiveFolderId}
            />
          );
        })}
      </section>
      <DragOverlay dropAnimation={reducedMotion ? null : { duration: 80, easing: "ease-out" }}>
        {activeTile ? (
          <motion.div
            className="drag-overlay-tile"
            initial={reducedMotion ? false : { scale: 1, opacity: 0.82 }}
            animate={{ scale: reducedMotion ? 1 : 1.05, opacity: 0.9 }}
            transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 30 }}
          >
            <TileContent tile={activeTile} showLabels={showLabels} />
            {isCombineHover ? (
              <span className="drag-overlay-merge" aria-hidden="true">
                +
              </span>
            ) : null}
          </motion.div>
        ) : null}
      </DragOverlay>
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
    </DndContext>
  );
}

function DraggableTile({
  dndMeta,
  onEditFolder,
  onEditShortcut,
  onSetActiveFolderId,
  reducedMotion,
  showLabels,
  tile
}: {
  dndMeta: DndMeta | null;
  onEditFolder: (folder: ResolvedFolder) => void;
  onEditShortcut: (shortcut: Shortcut) => void;
  onSetActiveFolderId: (folderId: string | null) => void;
  reducedMotion: boolean | null;
  showLabels: boolean;
  tile: ResolvedTopLevelTile;
}) {
  const draggable = useDraggable({ id: tile.key });
  const droppable = useDroppable({ id: tile.key });
  const setNodeRef = (node: HTMLElement | null) => {
    draggable.setNodeRef(node);
    droppable.setNodeRef(node);
  };
  const transform = CSS.Translate.toString(draggable.transform);
  const isActive = dndMeta?.activeKey === tile.key;
  const isOver = dndMeta?.overKey === tile.key && dndMeta.activeKey !== tile.key;
  const tileClassName = [
    "quick-link",
    tile.type === "folder" ? "folder-link" : "",
    isActive ? "dragging" : "",
    isOver ? "drag-over" : "",
    isOver && dndMeta?.overZone ? `drop-${dndMeta.overZone}` : ""
  ]
    .filter(Boolean)
    .join(" ");
  const commonProps = {
    className: tileClassName,
    ref: setNodeRef,
    style: { transform },
    ...draggable.attributes,
    ...draggable.listeners
  };

  if (tile.type === "shortcut") {
    return (
      <motion.a
        href={tile.shortcut.url}
        key={tile.key}
        layout={!reducedMotion}
        transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
        {...commonProps}
      >
        <TileContent tile={tile} showLabels={showLabels} />
        <button
          className="quick-link-edit"
          type="button"
          aria-label={`Edit ${tile.shortcut.title}`}
          onClick={(event) => {
            event.preventDefault();
            onEditShortcut(tile.shortcut);
          }}
        >
          Edit
        </button>
      </motion.a>
    );
  }

  return (
    <motion.div
      key={tile.key}
      layout={!reducedMotion}
      {...commonProps}
      role="button"
      tabIndex={0}
      transition={reducedMotion ? { duration: 0 } : { type: "spring", stiffness: 300, damping: 30 }}
      onClick={() => onSetActiveFolderId(tile.folder.id)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSetActiveFolderId(tile.folder.id);
        }
      }}
    >
      <TileContent tile={tile} showLabels={showLabels} />
      <button
        className="quick-link-edit"
        type="button"
        aria-label={`Edit ${tile.folder.title}`}
        onClick={(event) => {
          event.stopPropagation();
          onEditFolder(tile.folder);
        }}
      >
        Edit
      </button>
    </motion.div>
  );
}

function TileContent({ showLabels, tile }: { showLabels: boolean; tile: ResolvedTopLevelTile }) {
  if (tile.type === "shortcut") {
    return (
      <>
        <ShortcutIcon shortcut={tile.shortcut} />
        {showLabels ? <span className="quick-link-title">{tile.shortcut.title}</span> : null}
      </>
    );
  }

  return (
    <>
      <span className="quick-link-icon folder-icon" style={{ backgroundColor: tile.folder.icon.background }} aria-hidden="true">
        <FolderIcon strokeWidth={2.25} />
        <span className="folder-count">{tile.folder.shortcuts.length}</span>
      </span>
      {showLabels ? <span className="quick-link-title">{tile.folder.title}</span> : null}
    </>
  );
}

function resolveEventZone(event: DragOverEvent): DropZone {
  const rect = event.over?.rect;
  const translated = event.active.rect.current.translated;

  if (!rect || !translated) {
    return "center";
  }

  const pointerX = translated.left + translated.width / 2;
  const relativeX = (pointerX - rect.left) / rect.width;
  if (relativeX < 0.25) {
    return "leading";
  }
  if (relativeX > 0.75) {
    return "trailing";
  }
  return "center";
}

function getTileIdFromKey(key: string) {
  return key.includes(":") ? key.split(":").slice(1).join(":") : key;
}
