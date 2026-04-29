import type { TabState } from "../domain/tabState";

type MediaRecord = {
  id: string;
  kind: "wallpaper" | "icon";
  dataUrl: string;
  createdAt: number;
};

const databaseName = "infi-tab-media";
const storeName = "media";
const memoryMediaRecords = new Map<string, MediaRecord>();

export async function storeMediaDataUrl(
  dataUrl: string,
  kind: MediaRecord["kind"],
  preferredId?: string | null
): Promise<string> {
  const id = preferredId ?? crypto.randomUUID();
  await putMediaRecord({
    id,
    kind,
    dataUrl,
    createdAt: Date.now()
  });
  return id;
}

export async function loadMediaDataUrl(id: string): Promise<string | null> {
  const record = await getMediaRecord(id);
  return record?.dataUrl ?? null;
}

export async function deleteMediaDataUrl(id: string): Promise<void> {
  await deleteMediaRecord(id);
}

export async function materializeTabStateMedia(state: TabState): Promise<TabState> {
  const wallpaper = await materializeWallpaper(state.wallpaper);
  const quickLinks = await materializeQuickLinks(state.quickLinks);
  const folders = await Promise.all(
    state.folders.map(async (folder) => ({
      ...folder,
      quickLinks: await materializeQuickLinks(folder.quickLinks)
    }))
  );

  return {
    ...state,
    wallpaper,
    quickLinks,
    folders
  };
}

export function stripResolvedMediaFromTabState(state: TabState): TabState {
  return {
    ...state,
    wallpaper: {
      ...state.wallpaper,
      value: null
    },
    quickLinks: stripQuickLinks(state.quickLinks),
    folders: state.folders.map((folder) => ({
      ...folder,
      quickLinks: stripQuickLinks(folder.quickLinks)
    }))
  };
}

async function materializeWallpaper(stateWallpaper: TabState["wallpaper"]): Promise<TabState["wallpaper"]> {
  if (stateWallpaper.type !== "dataUrl") {
    return stateWallpaper;
  }

  let mediaId = stateWallpaper.mediaId ?? null;
  let value = stateWallpaper.value ?? null;

  if (value) {
    mediaId = await storeMediaDataUrl(value, "wallpaper", mediaId);
  }

  if (!value && mediaId) {
    value = await loadMediaDataUrl(mediaId);
  }

  return {
    ...stateWallpaper,
    mediaId,
    value
  };
}

async function materializeQuickLinkIcon(quickLink: TabState["quickLinks"][number]): Promise<TabState["quickLinks"][number]> {
  if (quickLink.icon.type !== "image") {
    return quickLink;
  }

  let imageMediaId = quickLink.icon.imageMediaId ?? null;
  let imageDataUrl = quickLink.icon.imageDataUrl ?? null;

  if (imageDataUrl) {
    imageMediaId = await storeMediaDataUrl(imageDataUrl, "icon", imageMediaId);
  }

  if (!imageDataUrl && imageMediaId) {
    imageDataUrl = await loadMediaDataUrl(imageMediaId);
  }

  return {
    ...quickLink,
    icon: {
      ...quickLink.icon,
      imageMediaId,
      imageDataUrl
    }
  };
}

async function materializeQuickLinks(quickLinks: TabState["quickLinks"]): Promise<TabState["quickLinks"]> {
  return Promise.all(quickLinks.map((quickLink) => materializeQuickLinkIcon(quickLink)));
}

function stripQuickLinks(quickLinks: TabState["quickLinks"]): TabState["quickLinks"] {
  return quickLinks.map((quickLink) => ({
    ...quickLink,
    icon: {
      ...quickLink.icon,
      imageDataUrl: null
    }
  }));
}

async function putMediaRecord(record: MediaRecord) {
  if (!hasIndexedDb()) {
    memoryMediaRecords.set(record.id, record);
    return;
  }

  const database = await openDatabase();
  await runRequest(
    database.transaction(storeName, "readwrite").objectStore(storeName).put(record),
    "Could not store media"
  );
}

async function getMediaRecord(id: string): Promise<MediaRecord | null> {
  if (!hasIndexedDb()) {
    return memoryMediaRecords.get(id) ?? null;
  }

  const database = await openDatabase();
  return (await runRequest(database.transaction(storeName, "readonly").objectStore(storeName).get(id), "Could not load media")) ?? null;
}

async function deleteMediaRecord(id: string) {
  if (!hasIndexedDb()) {
    memoryMediaRecords.delete(id);
    return;
  }

  const database = await openDatabase();
  await runRequest(database.transaction(storeName, "readwrite").objectStore(storeName).delete(id), "Could not delete media");
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);

    request.addEventListener("upgradeneeded", () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(storeName)) {
        database.createObjectStore(storeName, { keyPath: "id" });
      }
    });

    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error("Could not open media database")));
  });
}

function runRequest<T>(request: IDBRequest<T>, errorMessage: string): Promise<T> {
  return new Promise((resolve, reject) => {
    request.addEventListener("success", () => resolve(request.result));
    request.addEventListener("error", () => reject(request.error ?? new Error(errorMessage)));
  });
}

function hasIndexedDb() {
  return typeof indexedDB !== "undefined";
}
