import type { BrandIconId } from "../../domain/brandIcons";

export type ShortcutDraft = {
  id: string | null;
  folderId: string | null;
  title: string;
  url: string;
  iconLabel: string;
  iconBackground: string;
  iconImageDataUrl: string | null;
  iconMediaId: string | null;
  brandIconId: BrandIconId | null;
};

export type FolderDraft = {
  id: string | null;
  title: string;
  iconLabel: string;
  iconBackground: string;
};

export const emptyShortcutDraft: ShortcutDraft = {
  id: null,
  folderId: null,
  title: "",
  url: "",
  iconLabel: "",
  iconBackground: "#2d8cff",
  iconImageDataUrl: null,
  iconMediaId: null,
  brandIconId: null
};

export const emptyFolderDraft: FolderDraft = {
  id: null,
  title: "",
  iconLabel: "",
  iconBackground: "#64748b"
};
