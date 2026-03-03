"use client";

/**
 * Trigger a browser download for a presigned URL.
 *
 * Uses plain navigation (no target="_blank") so the download works even when
 * called from an async handler — popup blockers silently swallow programmatic
 * window.open / target="_blank" clicks outside the original user-gesture context.
 *
 * The presigned S3 URL includes Content-Disposition: attachment, so the browser
 * downloads the file without navigating away from the current page.
 */
export function triggerDownload(url: string, filename?: string) {
  const anchor = document.createElement("a");
  anchor.href = url;
  if (filename) {
    anchor.download = filename;
  }

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}

