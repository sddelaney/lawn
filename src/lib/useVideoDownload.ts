import { useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { useCallback, useEffect, useMemo, useState } from "react";
import { initSdk, isSdkAvailable, startTransfer, testConnection } from "@/lib/asperaSdk";
import { triggerDownload } from "@/lib/download";

export type DownloadMethod = "http" | "fasp";

const DOWNLOAD_METHOD_STORAGE_KEY = "lawn.downloadMethod";
const ASPERA_INSTALL_URL = "https://www.ibm.com/aspera/connect/";

function readStoredDownloadMethod(): DownloadMethod {
  if (typeof window === "undefined") return "http";
  const stored = window.localStorage.getItem(DOWNLOAD_METHOD_STORAGE_KEY);
  return stored === "fasp" ? "fasp" : "http";
}

export function formatDownloadMethodLabel(method: DownloadMethod): string {
  return method === "fasp" ? "FASP (Aspera)" : "HTTP";
}

function withDownloadDestination(
  transferSpec: unknown,
  filename: string,
): unknown {
  if (transferSpec == null || typeof transferSpec !== "object") {
    return transferSpec;
  }

  const spec = transferSpec as Record<string, unknown>;
  if (!Array.isArray(spec.paths)) {
    return transferSpec;
  }

  const paths = spec.paths
    .map((entry) => {
      if (entry == null || typeof entry !== "object") return null;
      const path = entry as Record<string, unknown>;
      const source = path.source;
      if (typeof source !== "string" || source.length === 0) return null;
      return { ...path, destination: filename };
    })
    .filter((entry): entry is Record<string, unknown> => entry !== null);

  if (paths.length === 0) {
    return transferSpec;
  }

  return { ...spec, paths };
}

export function useVideoDownload() {
  const getAsperaEnabled = useAction(api.aspera.isEnabled);
  const getDownloadUrl = useAction(api.videoActions.getDownloadUrl);
  const getAsperaDownloadSpec = useAction(api.videoActions.getAsperaDownloadSpec);

  const [defaultDownloadMethod, setDefaultDownloadMethodState] = useState<DownloadMethod>(() =>
    readStoredDownloadMethod(),
  );
  const [asperaDownloadEnabled, setAsperaDownloadEnabled] = useState(false);

  useEffect(() => {
    let cancelled = false;

    void getAsperaEnabled({})
      .then((enabled) => {
        if (!cancelled) {
          setAsperaDownloadEnabled(enabled);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAsperaDownloadEnabled(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getAsperaEnabled]);

  const setDefaultDownloadMethod = useCallback((method: DownloadMethod) => {
    setDefaultDownloadMethodState(method);
    if (typeof window === "undefined") return;
    window.localStorage.setItem(DOWNLOAD_METHOD_STORAGE_KEY, method);
  }, []);

  const promptInstallAspera = useCallback(() => {
    if (typeof window === "undefined") return;
    const shouldOpenInstaller = window.confirm(
      "FASP download requires Aspera Connect. Install it now?",
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
      // SDK may already be initialized by upload flow; continue with connectivity test.
    }

    return testConnection();
  }, []);

  const effectiveDefaultMethod = useMemo<DownloadMethod>(
    () => (asperaDownloadEnabled ? defaultDownloadMethod : "http"),
    [asperaDownloadEnabled, defaultDownloadMethod],
  );

  const downloadViaHttp = useCallback(
    async (videoId: Id<"videos">, title: string, persistAsDefault: boolean): Promise<boolean> => {
      try {
        const result = await getDownloadUrl({ videoId });
        if (result?.url) {
          triggerDownload(result.url, result.filename ?? `${title}.mp4`);
          if (persistAsDefault) {
            setDefaultDownloadMethod("http");
          }
          return true;
        }
      } catch (error) {
        console.error("Failed to download video:", error);
      }
      return false;
    },
    [getDownloadUrl, setDefaultDownloadMethod],
  );

  const downloadVideo = useCallback(
    async (
      videoId: Id<"videos">,
      title: string,
      method?: DownloadMethod,
    ): Promise<boolean> => {
      const requestedMethod = method ?? effectiveDefaultMethod;

      if (requestedMethod === "fasp") {
        if (!asperaDownloadEnabled) {
          if (!method) {
            return downloadViaHttp(videoId, title, false);
          }
          window.alert("FASP downloads are not enabled for this environment.");
          return false;
        }

        const ready = await ensureAsperaReady();
        if (!ready) {
          promptInstallAspera();
          if (!method) {
            return downloadViaHttp(videoId, title, false);
          }
          return false;
        }

        try {
          const result = await getAsperaDownloadSpec({ videoId });
          const transferSpec = withDownloadDestination(
            result.transferSpec,
            result.filename,
          );
          await startTransfer(transferSpec, {
            use_absolute_destination_path: false,
          });
          if (method) {
            setDefaultDownloadMethod("fasp");
          }
          return true;
        } catch (error) {
          const message = error instanceof Error ? error.message : "Failed to start Aspera download";
          console.error("Failed to download via Aspera:", error);
          window.alert(message);
          return false;
        }
      }

      return downloadViaHttp(videoId, title, method === "http");
    },
    [
      asperaDownloadEnabled,
      downloadViaHttp,
      effectiveDefaultMethod,
      ensureAsperaReady,
      getAsperaDownloadSpec,
      promptInstallAspera,
      setDefaultDownloadMethod,
    ],
  );

  return {
    asperaDownloadEnabled,
    defaultDownloadMethod: effectiveDefaultMethod,
    setDefaultDownloadMethod,
    downloadVideo,
  };
}
