// TypeScript facade over window.asperaSdk (IBM Aspera SDK 0.2.30)
// Adapted from ~/dev/fetch/web/src/lib/asperaSdk.ts — stripped to upload-only

import type { AsperaInitOptions, TransferInfo, TransferStatus } from "./asperaTypes";

declare global {
  interface Window {
    asperaSdk?: {
      init(options: unknown): Promise<void>;
      testConnection(): Promise<void>;
      startTransfer(
        spec: unknown,
        asperaSpec: unknown,
      ): Promise<{ uuid: string }>;
      stopTransfer(id: string): Promise<void>;
      showSelectFileDialog(options: unknown): Promise<unknown>;
      registerActivityCallback(
        cb: (activity: unknown) => void,
      ): unknown;
      getAllTransfers(): Promise<unknown>;
    };
  }
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

export function isSdkAvailable(): boolean {
  return (
    typeof window !== "undefined" &&
    window.asperaSdk != null &&
    typeof window.asperaSdk.init === "function"
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function sdk() {
  if (!window.asperaSdk) throw new Error("Aspera SDK not loaded");
  return window.asperaSdk;
}

// ---------------------------------------------------------------------------
// SDK methods
// ---------------------------------------------------------------------------

export function initSdk(options: AsperaInitOptions): Promise<void> {
  return withTimeout(sdk().init(options), 5000, "SDK init");
}

export async function testConnection(): Promise<boolean> {
  try {
    await withTimeout(sdk().testConnection(), 2000, "testConnection");
    return true;
  } catch {
    return false;
  }
}

export async function startTransfer(
  spec: unknown,
  asperaSpec: unknown,
): Promise<string> {
  const result = await sdk().startTransfer(spec, asperaSpec);
  return result.uuid;
}

export function stopTransfer(id: string): Promise<void> {
  return sdk().stopTransfer(id);
}

/**
 * Open the SDK's native file selection dialog.
 * Returns an object with `dataTransfer.files` containing SDK-authorized paths.
 */
export function showSelectFileDialog(
  options: { allowMultipleSelection?: boolean } = {},
): Promise<unknown> {
  return sdk().showSelectFileDialog(options);
}

export function registerActivityCallback(
  cb: (activity: unknown) => void,
): unknown {
  return sdk().registerActivityCallback(cb);
}

export async function getAllTransfers(): Promise<TransferInfo[]> {
  try {
    const raw = await withTimeout(sdk().getAllTransfers(), 3000, "getAllTransfers");
    return parseAllTransfers(raw);
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// Dialog cancellation detection
// ---------------------------------------------------------------------------

export function isDialogCancellation(error: unknown): boolean {
  if (error == null || typeof error !== "object") return true;

  const err = error as Record<string, unknown>;
  if (err.error !== true) return true;

  const debugData = err.debugData as Record<string, unknown> | undefined;
  const debugCode = debugData && typeof debugData === "object"
    ? typeof (debugData as Record<string, unknown>).code === "number"
      ? (debugData as Record<string, unknown>).code
      : undefined
    : undefined;
  const topCode = typeof err.code === "number" ? err.code : undefined;
  if (
    topCode === -32002 || topCode === -32005 ||
    debugCode === -32002 || debugCode === -32005
  ) {
    return true;
  }

  const debugMessage = debugData && typeof debugData === "object"
    ? typeof (debugData as Record<string, unknown>).message === "string"
      ? (debugData as Record<string, unknown>).message.toLowerCase()
      : ""
    : "";
  const msg =
    typeof err.message === "string" ? err.message.toLowerCase() : "";
  if (
    !msg ||
    msg.includes("closed") ||
    msg.includes("cancel") ||
    debugMessage.includes("closed") ||
    debugMessage.includes("cancel")
  ) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Transfer info parsing (from SDK activity callback)
// ---------------------------------------------------------------------------

function getField(obj: unknown, key: string): unknown {
  if (obj == null || typeof obj !== "object") return undefined;
  return (obj as Record<string, unknown>)[key];
}

function getFieldString(obj: unknown, key: string): string | undefined {
  const val = getField(obj, key);
  if (typeof val === "string") {
    const trimmed = val.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }
  return undefined;
}

function getFieldNumber(obj: unknown, key: string): number | undefined {
  const val = getField(obj, key);
  if (typeof val === "number") return val;
  if (typeof val === "string") {
    const n = parseFloat(val.trim());
    return isNaN(n) ? undefined : n;
  }
  return undefined;
}

function normalizeStatus(raw: string): TransferStatus {
  switch (raw.toLowerCase()) {
    case "running":
      return "running";
    case "completed":
      return "completed";
    case "failed":
      return "failed";
    case "paused":
    case "stopped":
      return "paused";
    case "canceled":
    case "cancelled":
    case "removed":
      return "canceled";
    case "queued":
    case "initiating":
    case "willretry":
      return "queued";
    default:
      console.warn(`[SDK] Unknown transfer status '${raw}', treating as canceled`);
      return "canceled";
  }
}

export function parseTransferInfo(val: unknown): TransferInfo | null {
  if (val == null || typeof val !== "object") return null;

  const uuid = getFieldString(val, "uuid") ?? "";
  const statusRaw = getFieldString(val, "status") ?? "";
  const status = normalizeStatus(statusRaw);

  const percentage = getFieldNumber(val, "percentage") ?? 0;
  const speedKbps = getFieldNumber(val, "calculated_rate_kbps") ?? 0;
  const bytesWritten = getFieldNumber(val, "bytes_written") ?? 0;
  const bytesExpected = getFieldNumber(val, "bytes_expected") ?? 0;
  const remainingUsec = getFieldNumber(val, "remaining_usec") ?? 0;
  const currentFile = getFieldString(val, "current_file") ?? "";
  const isHttpGateway = getField(val, "httpGatewayTransfer") === true;

  const dirRaw = (getFieldString(val, "direction") ?? "").toLowerCase();
  const direction: "send" | "receive" =
    dirRaw === "send" || dirRaw === "upload" ? "send" : "receive";

  let fileName: string;
  if (currentFile) {
    const parts = currentFile.split("/");
    fileName = parts[parts.length - 1] || currentFile;
  } else {
    fileName = "Preparing upload...";
  }

  let errorCode: number | undefined;
  let errorMessage: string | undefined;
  if (status === "failed") {
    errorCode =
      getFieldNumber(val, "error_code") ??
      getFieldNumber(val, "errorCode");
    errorMessage =
      getFieldString(val, "error_desc") ??
      getFieldString(val, "errorDescription") ??
      getFieldString(val, "error_message") ??
      getFieldString(val, "errorMessage");
  }

  return {
    uuid,
    status,
    fileName,
    percentage,
    speedKbps,
    bytesWritten,
    bytesExpected,
    remainingUsec,
    isHttpGateway,
    direction,
    errorCode,
    errorMessage,
  };
}

export function parseAllTransfers(activity: unknown): TransferInfo[] {
  const results: TransferInfo[] = [];

  const transfersField = getField(activity, "transfers");
  if (Array.isArray(transfersField)) {
    for (const item of transfersField) {
      const info = parseTransferInfo(item);
      if (info) results.push(info);
    }
    return results;
  }

  if (Array.isArray(activity)) {
    for (const item of activity) {
      const info = parseTransferInfo(item);
      if (info) results.push(info);
    }
    return results;
  }

  if (
    activity &&
    typeof activity === "object" &&
    typeof getField(activity, "uuid") === "string"
  ) {
    const info = parseTransferInfo(activity);
    if (info) results.push(info);
  }

  return results;
}
