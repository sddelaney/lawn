import { useAction, useMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import type { UploadStatus } from "@/components/upload/UploadProgress";
import {
  isSdkAvailable,
  initSdk,
  testConnection,
  startTransfer,
  stopTransfer,
  registerActivityCallback,
  parseAllTransfers,
} from "@/lib/asperaSdk";

export type UploadMethod = "s3-direct" | "aspera";

export interface ManagedUploadItem {
  id: string;
  projectId: Id<"projects">;
  file: File;
  videoId?: Id<"videos">;
  progress: number;
  status: UploadStatus;
  error?: string;
  bytesPerSecond?: number;
  estimatedSecondsRemaining?: number | null;
  abortController?: AbortController;
  transferMethod: UploadMethod;
  /** Aspera SDK transfer UUID — set after startTransfer resolves */
  asperaTransferId?: string;
}

function createUploadId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

export function useVideoUploadManager() {
  const createVideo = useMutation(api.videos.create);
  const getUploadUrl = useAction(api.videoActions.getUploadUrl);
  const getAsperaUploadSpec = useAction(api.videoActions.getAsperaUploadSpec);
  const markUploadComplete = useAction(api.videoActions.markUploadComplete);
  const markUploadFailed = useAction(api.videoActions.markUploadFailed);
  const [uploads, setUploads] = useState<ManagedUploadItem[]>([]);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>("s3-direct");
  const [asperaAvailable, setAsperaAvailable] = useState(false);

  // Initialize Aspera SDK on mount (async: init → testConnection)
  useEffect(() => {
    if (!isSdkAvailable()) return;

    initSdk({ appId: "lawn" })
      .then(() => testConnection())
      .then((connected) => {
        setAsperaAvailable(connected);
        if (connected) {
          setUploadMethod("aspera");
        }
      })
      .catch((err) => {
        console.warn("Aspera SDK init failed:", err);
        setAsperaAvailable(false);
      });
  }, []);

  // Track Aspera transfer UUID → local upload ID mapping
  const asperaMapRef = useRef<Map<string, { uploadId: string; videoId: Id<"videos"> }>>(new Map());

  // Register Aspera activity callback once
  useEffect(() => {
    if (!asperaAvailable) return;

    registerActivityCallback((activity: unknown) => {
      const transfers = parseAllTransfers(activity);
      for (const info of transfers) {
        const entry = asperaMapRef.current.get(info.uuid);
        if (!entry) continue;

        const speedBytes = info.speedKbps * 1000;
        const remainingSec = info.remainingUsec > 0
          ? Math.ceil(info.remainingUsec / 1_000_000)
          : null;

        if (info.status === "completed") {
          // Transfer finished — call markUploadComplete
          asperaMapRef.current.delete(info.uuid);
          setUploads((prev) =>
            prev.map((u) =>
              u.id === entry.uploadId
                ? { ...u, progress: 100, status: "processing" as UploadStatus }
                : u,
            ),
          );
          markUploadComplete({ videoId: entry.videoId })
            .then(() => {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === entry.uploadId
                    ? { ...u, status: "complete" as UploadStatus, progress: 100 }
                    : u,
                ),
              );
              setTimeout(() => {
                setUploads((prev) => prev.filter((u) => u.id !== entry.uploadId));
              }, 3000);
            })
            .catch((err) => {
              setUploads((prev) =>
                prev.map((u) =>
                  u.id === entry.uploadId
                    ? { ...u, status: "error" as UploadStatus, error: err instanceof Error ? err.message : "Processing failed" }
                    : u,
                ),
              );
            });
        } else if (info.status === "failed") {
          asperaMapRef.current.delete(info.uuid);
          const errorMsg = info.errorMessage ?? "Aspera transfer failed";
          setUploads((prev) =>
            prev.map((u) =>
              u.id === entry.uploadId
                ? { ...u, status: "error" as UploadStatus, error: errorMsg }
                : u,
            ),
          );
          markUploadFailed({ videoId: entry.videoId }).catch(console.error);
        } else if (info.status === "running") {
          setUploads((prev) =>
            prev.map((u) =>
              u.id === entry.uploadId
                ? {
                    ...u,
                    progress: Math.round(info.percentage),
                    bytesPerSecond: speedBytes,
                    estimatedSecondsRemaining: remainingSec,
                    status: "uploading" as UploadStatus,
                  }
                : u,
            ),
          );
        }
      }
    });
  }, [asperaAvailable, markUploadComplete, markUploadFailed]);

  const uploadFilesToProject = useCallback(
    async (projectId: Id<"projects">, files: File[]) => {
      for (const file of files) {
        const uploadId = createUploadId();
        const title = file.name.replace(/\.[^/.]+$/, "");
        const abortController = new AbortController();
        const method = uploadMethod;

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            projectId,
            file,
            progress: 0,
            status: "pending",
            abortController,
            transferMethod: method,
          },
        ]);

        let createdVideoId: Id<"videos"> | undefined;

        try {
          createdVideoId = await createVideo({
            projectId,
            title,
            fileSize: file.size,
            contentType: file.type || "video/mp4",
          });

          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? { ...upload, videoId: createdVideoId, status: "uploading" }
                : upload,
            ),
          );

          if (method === "aspera") {
            // ---- Aspera path ----
            const { transferSpec } = await getAsperaUploadSpec({
              videoId: createdVideoId,
              filename: file.name,
              fileSize: file.size,
              contentType: file.type || "video/mp4",
            });

            const asperaTransferId = await startTransfer(
              { paths: [{ source: file.name }] },
              transferSpec,
            );

            asperaMapRef.current.set(asperaTransferId, {
              uploadId,
              videoId: createdVideoId,
            });

            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, asperaTransferId }
                  : upload,
              ),
            );

            // Aspera progress/completion handled by activity callback above
          } else {
            // ---- S3 direct path (unchanged) ----
            const { url } = await getUploadUrl({
              videoId: createdVideoId,
              filename: file.name,
              fileSize: file.size,
              contentType: file.type || "video/mp4",
            });

            await new Promise<void>((resolve, reject) => {
              const xhr = new XMLHttpRequest();
              let lastTime = Date.now();
              let lastLoaded = 0;
              const recentSpeeds: number[] = [];

              xhr.upload.addEventListener("progress", (event) => {
                if (!event.lengthComputable) return;

                const percentage = Math.round((event.loaded / event.total) * 100);
                const now = Date.now();
                const timeDelta = (now - lastTime) / 1000;
                const bytesDelta = event.loaded - lastLoaded;

                if (timeDelta > 0.1) {
                  const speed = bytesDelta / timeDelta;
                  recentSpeeds.push(speed);
                  if (recentSpeeds.length > 5) recentSpeeds.shift();
                  lastTime = now;
                  lastLoaded = event.loaded;
                }

                const avgSpeed =
                  recentSpeeds.length > 0
                    ? recentSpeeds.reduce((sum, speed) => sum + speed, 0) /
                      recentSpeeds.length
                    : 0;
                const remaining = event.total - event.loaded;
                const eta = avgSpeed > 0 ? Math.ceil(remaining / avgSpeed) : null;

                setUploads((prev) =>
                  prev.map((upload) =>
                    upload.id === uploadId
                      ? {
                          ...upload,
                          progress: percentage,
                          bytesPerSecond: avgSpeed,
                          estimatedSecondsRemaining: eta,
                        }
                      : upload,
                  ),
                );
              });

              xhr.addEventListener("load", () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                  resolve();
                  return;
                }
                reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
              });

              xhr.addEventListener("error", () => {
                reject(new Error("Upload failed: Network error"));
              });

              xhr.addEventListener("abort", () => {
                reject(new Error("Upload cancelled"));
              });

              abortController.signal.addEventListener("abort", () => {
                xhr.abort();
              });

              xhr.open("PUT", url);
              xhr.setRequestHeader("Content-Type", file.type || "video/mp4");
              xhr.send(file);
            });

            await markUploadComplete({ videoId: createdVideoId });

            setUploads((prev) =>
              prev.map((upload) =>
                upload.id === uploadId
                  ? { ...upload, status: "complete", progress: 100 }
                  : upload,
              ),
            );

            setTimeout(() => {
              setUploads((prev) => prev.filter((upload) => upload.id !== uploadId));
            }, 3000);
          }
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Upload failed";

          setUploads((prev) =>
            prev.map((upload) =>
              upload.id === uploadId
                ? { ...upload, status: "error", error: errorMessage }
                : upload,
            ),
          );

          if (createdVideoId) {
            markUploadFailed({ videoId: createdVideoId }).catch(console.error);
          }
        }
      }
    },
    [createVideo, getUploadUrl, getAsperaUploadSpec, markUploadComplete, markUploadFailed, uploadMethod],
  );

  const cancelUpload = useCallback(
    (uploadId: string) => {
      const upload = uploads.find((item) => item.id === uploadId);
      if (upload?.abortController) {
        upload.abortController.abort();
      }
      // Cancel Aspera transfer if active
      if (upload?.asperaTransferId) {
        asperaMapRef.current.delete(upload.asperaTransferId);
        stopTransfer(upload.asperaTransferId).catch(console.error);
      }
      if (upload?.videoId) {
        markUploadFailed({ videoId: upload.videoId }).catch(console.error);
      }
      setUploads((prev) => prev.filter((item) => item.id !== uploadId));
    },
    [uploads, markUploadFailed],
  );

  return {
    uploads,
    uploadFilesToProject,
    cancelUpload,
    uploadMethod,
    setUploadMethod,
    asperaAvailable,
  };
}
