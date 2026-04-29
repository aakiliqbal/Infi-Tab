import { brandIcons, matchBrandIcon, type BrandIcon } from "./brandIcons";
import type { Folder, QuickLink, TabState, TopLevelTile } from "./tabState";
import type { FolderDraft, QuickLinkDraft } from "../ui/drafts";

export type ResolvedTopLevelTile =
  | {
      key: string;
      type: "shortcut";
      quickLink: QuickLink;
    }
  | {
      key: string;
      type: "folder";
      folder: Folder;
    };

export function normalizeUrl(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl;
  }

  return `https://${trimmedUrl}`;
}

export function createQuickLinkFromDraft(draft: QuickLinkDraft): QuickLink | null {
  const title = draft.title.trim();
  const url = normalizeUrl(draft.url);

  if (!title || !url) {
    return null;
  }

  const iconLabel = (draft.iconLabel.trim() || title.slice(0, 1) || "?").slice(0, 2).toUpperCase();
  const matchedBrandIcon = draft.iconImageDataUrl
    ? null
    : draft.brandIconId
      ? brandIcons[draft.brandIconId]
      : matchBrandIcon(title, url);

  return {
    id: draft.id ?? crypto.randomUUID(),
    title,
    url,
    icon: {
      type: draft.iconImageDataUrl ? "image" : matchedBrandIcon ? "brand" : "fallback",
      label: matchedBrandIcon ? matchedBrandIcon.title.slice(0, 2).toUpperCase() : iconLabel,
      background: matchedBrandIcon ? `#${matchedBrandIcon.hex}` : draft.iconBackground,
      imageDataUrl: draft.iconImageDataUrl,
      brandIconId: matchedBrandIcon?.id ?? null
    }
  };
}

export function createFolderFromDraft(state: TabState, draft: FolderDraft): Folder | null {
  const title = draft.title.trim();

  if (!title) {
    return null;
  }

  const iconLabel = (draft.iconLabel.trim() || title.slice(0, 1) || "?").slice(0, 2).toUpperCase();

  return {
    id: draft.id ?? crypto.randomUUID(),
    title,
    icon: {
      type: "fallback",
      label: iconLabel,
      background: draft.iconBackground
    },
    quickLinks: draft.id
      ? state.folders.find((folder) => folder.id === draft.id)?.quickLinks ?? []
      : []
  };
}

export function upsertQuickLink(state: TabState, quickLink: QuickLink, draft: QuickLinkDraft): TabState {
  if (draft.folderId) {
    return {
      ...state,
      folders: state.folders.map((folder) => {
        if (folder.id !== draft.folderId) {
          return folder;
        }

        const quickLinks = draft.id
          ? folder.quickLinks.map((existing) => (existing.id === draft.id ? quickLink : existing))
          : [...folder.quickLinks, quickLink];

        return { ...folder, quickLinks };
      })
    };
  }

  return {
    ...state,
    quickLinks: draft.id
      ? state.quickLinks.map((existing) => (existing.id === draft.id ? quickLink : existing))
      : [...state.quickLinks, quickLink],
    topLevelTiles: draft.id
      ? state.topLevelTiles
      : [...state.topLevelTiles, { type: "shortcut", id: quickLink.id }]
  };
}

export function deleteQuickLinkFromState(state: TabState, draft: QuickLinkDraft): TabState {
  if (!draft.id) {
    return state;
  }

  if (draft.folderId) {
    return {
      ...state,
      folders: state.folders.map((folder) =>
        folder.id === draft.folderId
          ? {
              ...folder,
              quickLinks: folder.quickLinks.filter((quickLink) => quickLink.id !== draft.id)
            }
          : folder
      )
    };
  }

  return {
    ...state,
    quickLinks: state.quickLinks.filter((quickLink) => quickLink.id !== draft.id),
    topLevelTiles: state.topLevelTiles.filter((tile) => tile.type !== "shortcut" || tile.id !== draft.id)
  };
}

export function upsertFolder(state: TabState, folder: Folder, draft: FolderDraft): TabState {
  return {
    ...state,
    folders: draft.id
      ? state.folders.map((existing) => (existing.id === draft.id ? folder : existing))
      : [...state.folders, folder],
    topLevelTiles: draft.id
      ? state.topLevelTiles
      : [...state.topLevelTiles, { type: "folder", id: folder.id }]
  };
}

export function deleteFolderFromState(state: TabState, folderId: string): TabState {
  return {
    ...state,
    folders: state.folders.filter((folder) => folder.id !== folderId),
    topLevelTiles: state.topLevelTiles.filter((tile) => tile.type !== "folder" || tile.id !== folderId)
  };
}

export function resolveTopLevelTiles(state: TabState): ResolvedTopLevelTile[] {
  const quickLinks = new Map(state.quickLinks.map((quickLink) => [quickLink.id, quickLink]));
  const folders = new Map(state.folders.map((folder) => [folder.id, folder]));

  return state.topLevelTiles.flatMap<ResolvedTopLevelTile>((tile) => {
    if (tile.type === "shortcut") {
      const quickLink = quickLinks.get(tile.id);
      return quickLink ? [{ key: getTopLevelTileKey(tile), type: tile.type, quickLink }] : [];
    }

    const folder = folders.get(tile.id);
    return folder ? [{ key: getTopLevelTileKey(tile), type: tile.type, folder }] : [];
  });
}

export function moveTopLevelTileInState(state: TabState, draggedKey: string, targetKey: string): TabState {
  if (draggedKey === targetKey) {
    return state;
  }

  const fromIndex = state.topLevelTiles.findIndex((tile) => getTopLevelTileKey(tile) === draggedKey);
  const toIndex = state.topLevelTiles.findIndex((tile) => getTopLevelTileKey(tile) === targetKey);

  if (fromIndex < 0 || toIndex < 0) {
    return state;
  }

  const topLevelTiles = [...state.topLevelTiles];
  const [movedTile] = topLevelTiles.splice(fromIndex, 1);
  topLevelTiles.splice(toIndex, 0, movedTile);

  return { ...state, topLevelTiles };
}

export function applyRecommendedIcon(draft: QuickLinkDraft, icon: BrandIcon): QuickLinkDraft {
  return {
    ...draft,
    iconImageDataUrl: null,
    brandIconId: icon.id,
    iconBackground: `#${icon.hex}`,
    iconLabel: icon.title.slice(0, 2).toUpperCase()
  };
}

function getTopLevelTileKey(tile: TopLevelTile) {
  return `${tile.type}:${tile.id}`;
}
