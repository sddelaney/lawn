import type { Id } from "@convex/_generated/dataModel";

const STORAGE_KEY = "lawn.asperaTransferMap";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface TransferMapEntry {
  videoId: string;
  uploadId: string;
  createdAt: number;
}

type TransferMap = Record<string, TransferMapEntry>;

function readMap(): TransferMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as TransferMap;
  } catch {
    return {};
  }
}

function writeMap(map: TransferMap): void {
  if (typeof window === "undefined") return;
  const keys = Object.keys(map);
  if (keys.length === 0) {
    window.localStorage.removeItem(STORAGE_KEY);
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

/** Purge entries older than 24h, return the rest. */
export function readAndPurgeTransferMap(): Map<string, { videoId: Id<"videos">; uploadId: string }> {
  const raw = readMap();
  const now = Date.now();
  const result = new Map<string, { videoId: Id<"videos">; uploadId: string }>();
  const cleaned: TransferMap = {};

  for (const [uuid, entry] of Object.entries(raw)) {
    if (now - entry.createdAt > TTL_MS) continue;
    cleaned[uuid] = entry;
    result.set(uuid, {
      videoId: entry.videoId as Id<"videos">,
      uploadId: entry.uploadId,
    });
  }

  writeMap(cleaned);
  return result;
}

/** Save a new transfer mapping. */
export function saveTransferMapping(
  transferUuid: string,
  videoId: Id<"videos">,
  uploadId: string,
): void {
  const map = readMap();
  map[transferUuid] = { videoId: videoId as string, uploadId, createdAt: Date.now() };
  writeMap(map);
}

/** Remove a transfer mapping (on completed/failed/cancelled). */
export function removeTransferMapping(transferUuid: string): void {
  const map = readMap();
  delete map[transferUuid];
  writeMap(map);
}
