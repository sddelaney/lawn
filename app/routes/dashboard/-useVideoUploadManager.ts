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
  showSelectFileDialog,
  registerActivityCallback,
  parseAllTransfers,
  isDialogCancellation,
} from "@/lib/asperaSdk";

export type UploadMethod = "s3-direct" | "aspera";

const UPLOAD_METHOD_STORAGE_KEY = "lawn.uploadMethod";
const ASPERA_INSTALL_URL = "https://www.ibm.com/aspera/connect/";

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
  /** Total bytes from SDK (for FASP uploads where file.size is unknown) */
  totalBytes?: number;
}

function createUploadId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2);
}

function inferContentTypeFromFilename(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "mov":
    case "qt":
      return "video/quicktime";
    case "webm":
      return "video/webm";
    case "mkv":
      return "video/x-matroska";
    case "mp4":
    case "m4v":
    default:
      return "video/mp4";
  }
}

function readStoredUploadMethod(): { method: UploadMethod; hasStored: boolean } {
  if (typeof window === "undefined") {
    return { method: "s3-direct", hasStored: false };
  }
  const stored = window.localStorage.getItem(UPLOAD_METHOD_STORAGE_KEY);
  if (stored === "aspera") {
    return { method: "aspera", hasStored: true };
  }
  if (stored === "s3-direct") {
    return { method: "s3-direct", hasStored: true };
  }
  return { method: "s3-direct", hasStored: false };
}

export function useVideoUploadManager() {
  const initialPreference = readStoredUploadMethod();
  const getAsperaEnabled = useAction(api.aspera.isEnabled);
  const createVideo = useMutation(api.videos.create);
  const getUploadUrl = useAction(api.videoActions.getUploadUrl);
  const getAsperaUploadSpec = useAction(api.videoActions.getAsperaUploadSpec);
  const markUploadComplete = useAction(api.videoActions.markUploadComplete);
  const markUploadFailed = useAction(api.videoActions.markUploadFailed);
  const [uploads, setUploads] = useState<ManagedUploadItem[]>([]);
  const [uploadMethodState, setUploadMethodState] = useState<UploadMethod>(initialPreference.method);
  const [hasStoredUploadMethod, setHasStoredUploadMethod] = useState(initialPreference.hasStored);
  const [asperaEnabled, setAsperaEnabled] = useState(false);
  const [asperaAvailable, setAsperaAvailable] = useState(false);

  const setUploadMethod = useCallback((method: UploadMethod) => {
    setUploadMethodState(method);
    setHasStoredUploadMethod(true);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(UPLOAD_METHOD_STORAGE_KEY, method);
  }, []);

  const promptInstallAspera = useCallback(() => {
    if (typeof window === "undefined") return;
    const shouldOpenInstaller = window.confirm(
      "Aspera FASP upload requires Aspera Connect. Install it now?",
    );
    if (shouldOpenInstaller) {
      window.open(ASPERA_INSTALL_URL, "_blank", "noopener,noreferrer");
    }
  }, []);

  const ensureAsperaReady = useCallback(async (): Promise<boolean> => {
    if (!isSdkAvailable()) {
      return false;
    }

    try {
      await initSdk({ appId: "lawn" });
    } catch {
      // SDK may already be initialized by another flow.
    }

    return testConnection();
  }, []);

  // Initialize Aspera feature flag + availability.
  useEffect(() => {
    let cancelled = false;

    void getAsperaEnabled({})
      .then(async (enabled) => {
        if (cancelled) return;

        setAsperaEnabled(enabled);
        if (!enabled) {
          setAsperaAvailable(false);
          return;
        }

        const connected = await ensureAsperaReady().catch(() => false);
        if (cancelled) return;

        setAsperaAvailable(connected);
        if (connected && !hasStoredUploadMethod) {
          setUploadMethodState("aspera");
          setHasStoredUploadMethod(true);
          if (typeof window !== "undefined") {
            window.localStorage.setItem(UPLOAD_METHOD_STORAGE_KEY, "aspera");
          }
        }
      })
      .catch(() => {
        if (cancelled) return;
        setAsperaEnabled(false);
        setAsperaAvailable(false);
      });

    return () => {
      cancelled = true;
    };
  }, [ensureAsperaReady, getAsperaEnabled, hasStoredUploadMethod]);

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

        // SDK reports percentage as 0-1 fraction; normalize to 0-100.
        // Fall back to bytesWritten/bytesExpected if percentage is missing.
        let pct = info.percentage;
        if (pct > 0 && pct <= 1 && info.bytesExpected > 0) {
          pct = pct * 100;
        } else if (pct === 0 && info.bytesExpected > 0 && info.bytesWritten > 0) {
          pct = (info.bytesWritten / info.bytesExpected) * 100;
        }
        const progressPct = Math.min(Math.round(pct), 100);

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
                    progress: progressPct,
                    bytesPerSecond: speedBytes,
                    estimatedSecondsRemaining: remainingSec,
                    status: "uploading" as UploadStatus,
                    totalBytes: info.bytesExpected > 0 ? info.bytesExpected : u.totalBytes,
                  }
                : u,
            ),
          );
        }
      }
    });
  }, [asperaAvailable, markUploadComplete, markUploadFailed]);

  // Aspera upload: opens SDK file picker, gets authorized paths, starts FASP transfer
  const asperaUploadToProject = useCallback(
    async (projectId: Id<"projects">) => {
      if (!asperaEnabled) {
        window.alert("Aspera uploads are not enabled for this environment.");
        return;
      }

      const ready = await ensureAsperaReady();
      if (!ready) {
        setAsperaAvailable(false);
        promptInstallAspera();
        return;
      }
      setAsperaAvailable(true);

      // Open SDK's native file dialog — returns SDK-authorized file paths
      let result: unknown;
      try {
        result = await showSelectFileDialog({ allowMultipleSelection: true });
      } catch (error) {
        if (isDialogCancellation(error)) {
          return;
        }
        console.error("Aspera file picker failed:", error);
        return;
      }
      const dataTransfer = result && typeof result === "object"
        ? (result as Record<string, unknown>).dataTransfer
        : undefined;
      const filesArr = dataTransfer && typeof dataTransfer === "object"
        ? (dataTransfer as Record<string, unknown>).files
        : undefined;

      if (!Array.isArray(filesArr) || filesArr.length === 0) return;

      for (const sdkFile of filesArr) {
        const filePath = typeof sdkFile === "object" && sdkFile !== null
          ? (sdkFile as Record<string, string>).name ?? ""
          : "";
        if (!filePath) continue;

        const fileName = filePath.split(/[\\/]/).pop() ?? filePath;
        const contentType = inferContentTypeFromFilename(fileName);
        const uploadId = createUploadId();
        const title = fileName.replace(/\.[^/.]+$/, "");
        // Create a minimal File-like object for the upload list
        const dummyFile = new File([], fileName, { type: contentType });

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            projectId,
            file: dummyFile,
            progress: 0,
            status: "pending" as UploadStatus,
            transferMethod: "aspera" as UploadMethod,
          },
        ]);

        let createdVideoId: Id<"videos"> | undefined;
        try {
          createdVideoId = await createVideo({
            projectId,
            title,
            fileSize: 0, // unknown until transfer starts
            contentType,
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, videoId: createdVideoId, status: "uploading" as UploadStatus }
                : u,
            ),
          );

          const { transferSpec } = await getAsperaUploadSpec({
            videoId: createdVideoId,
            filename: fileName,
            fileSize: 0,
            contentType,
          });

          // Merge SDK-authorized source path into transfer spec,
          // preserving the destination from HSTS upload_setup.
          const specPaths = Array.isArray((transferSpec as Record<string, unknown>).paths)
            ? (transferSpec as { paths: Array<Record<string, string>> }).paths
            : [];
          const destination = specPaths[0]?.destination;
          const fullSpec = {
            ...transferSpec,
            paths: [{ source: filePath, ...(destination ? { destination } : {}) }],
          };
          const asperaTransferId = await startTransfer(fullSpec, {});

          asperaMapRef.current.set(asperaTransferId, {
            uploadId,
            videoId: createdVideoId,
          });

          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, asperaTransferId }
                : u,
            ),
          );
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : "Upload failed";
          setUploads((prev) =>
            prev.map((u) =>
              u.id === uploadId
                ? { ...u, status: "error" as UploadStatus, error: errorMessage }
                : u,
            ),
          );
          if (createdVideoId) {
            markUploadFailed({ videoId: createdVideoId }).catch(console.error);
          }
        }
      }
    },
    [
      asperaEnabled,
      createVideo,
      ensureAsperaReady,
      getAsperaUploadSpec,
      markUploadFailed,
      promptInstallAspera,
    ],
  );

  const uploadFilesToProject = useCallback(
    async (projectId: Id<"projects">, files: File[]) => {
      for (const file of files) {
        const uploadId = createUploadId();
        const title = file.name.replace(/\.[^/.]+$/, "");
        const abortController = new AbortController();

        setUploads((prev) => [
          ...prev,
          {
            id: uploadId,
            projectId,
            file,
            progress: 0,
            status: "pending",
            abortController,
            transferMethod: "s3-direct" as UploadMethod,
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

          // ---- S3 direct path ----
          {
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
                reject(
                  new Error(
                    "Upload failed: network/CORS error (check bucket CORS allows PUT and OPTIONS from this origin)",
                  ),
                );
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
    [createVideo, getUploadUrl, markUploadComplete, markUploadFailed],
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

  const effectiveUploadMethod: UploadMethod =
    asperaEnabled ? uploadMethodState : "s3-direct";

  return {
    uploads,
    uploadFilesToProject,
    asperaUploadToProject,
    cancelUpload,
    uploadMethod: effectiveUploadMethod,
    setUploadMethod,
    asperaEnabled,
    asperaAvailable,
  };
}
