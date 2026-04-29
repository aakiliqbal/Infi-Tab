import type { BrandIconId } from "../../domain/brandIcons";

export type QuickLinkDraft = {
  id: string | null;
  folderId: string | null;
  title: string;
  url: string;
  iconLabel: string;
  iconBackground: string;
  iconImageDataUrl: string | null;
  brandIconId: BrandIconId | null;
};

export type FolderDraft = {
  id: string | null;
  title: string;
  iconLabel: string;
  iconBackground: string;
};

export const emptyQuickLinkDraft: QuickLinkDraft = {
  id: null,
  folderId: null,
  title: "",
  url: "",
  iconLabel: "",
  iconBackground: "#2d8cff",
  iconImageDataUrl: null,
  brandIconId: null
};

export const emptyFolderDraft: FolderDraft = {
  id: null,
  title: "",
  iconLabel: "",
  iconBackground: "#64748b"
};
