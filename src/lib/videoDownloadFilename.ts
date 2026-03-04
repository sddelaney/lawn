function getExtensionFromKey(key: string, fallback = "mp4") {
  let source = key;
  if (key.startsWith("http://") || key.startsWith("https://")) {
    try {
      source = new URL(key).pathname;
    } catch {
      source = key;
    }
  }

  const fileName = source.split("/").pop() ?? "";
  const ext = fileName.split(".").pop() ?? "";
  if (!ext) return fallback;
  if (ext.length > 8 || /[^a-zA-Z0-9]/.test(ext)) return fallback;
  return ext.toLowerCase();
}

function sanitizeDownloadTitle(input: string) {
  const trimmed = input.trim();
  const base = trimmed.length > 0 ? trimmed : "video";
  const sanitized = base
    .replace(/["]|[']/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_");

  return sanitized.slice(0, 120);
}

export function buildDownloadFilename(title: string | undefined, key?: string | null) {
  const ext = getExtensionFromKey(key ?? "", "mp4");
  const safeTitle = sanitizeDownloadTitle(title ?? "video");
  return safeTitle.endsWith(`.${ext}`) ? safeTitle : `${safeTitle}.${ext}`;
}
