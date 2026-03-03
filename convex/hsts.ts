"use node";

/**
 * HSTS Node API client for Aspera transfer spec generation.
 *
 * The HSTS Node API uses basic auth and returns transfer specs that the
 * browser-side Aspera SDK uses to initiate FASP transfers directly to HSTS.
 *
 * Reference: ~/dev/fetch/crates/fetch-hsts/src/client.rs (lines 1139-1222)
 */

export function isAsperaEnabled(): boolean {
  return process.env.ASPERA_ENABLED === "true";
}

function getHstsConfig() {
  const nodeUrl = process.env.HSTS_NODE_URL;
  const nodeUser = process.env.HSTS_NODE_USER;
  const nodePassword = process.env.HSTS_NODE_PASSWORD;

  if (!nodeUrl || !nodeUser || !nodePassword) {
    throw new Error(
      "Missing HSTS configuration. Set HSTS_NODE_URL, HSTS_NODE_USER, HSTS_NODE_PASSWORD."
    );
  }

  return { nodeUrl: nodeUrl.replace(/\/+$/, ""), nodeUser, nodePassword };
}

function buildAuthHeader(user: string, password: string): string {
  const encoded = Buffer.from(`${user}:${password}`).toString("base64");
  return `Basic ${encoded}`;
}

/**
 * Call POST /files/upload_setup on HSTS Node API.
 * Returns the transfer spec JSON that gets passed directly to the Aspera SDK.
 *
 * The destination path should map to where the file should land in S3.
 * HSTS must be configured with the same S3 bucket as Lawn's direct upload.
 */
export async function getUploadTransferSpec(
  destinationPath: string
): Promise<Record<string, unknown>> {
  const { nodeUrl, nodeUser, nodePassword } = getHstsConfig();

  const url = `${nodeUrl}/files/upload_setup`;
  console.log(`[HSTS] POST ${url} destination=${destinationPath}`);

  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: buildAuthHeader(nodeUser, nodePassword),
      },
      body: JSON.stringify({
        transfer_requests: [
          {
            transfer_request: {
              paths: [{ destination: destinationPath }],
            },
          },
        ],
      }),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const cause = err instanceof Error && (err as any).cause ? JSON.stringify((err as any).cause) : "none";
    throw new Error(`[HSTS] fetch failed: ${msg} | cause: ${cause}`);
  }

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(
      `HSTS upload_setup failed: ${response.status} ${response.statusText}${text ? ` — ${text}` : ""}`
    );
  }

  const body = (await response.json()) as {
    transfer_specs?: Array<{
      transfer_spec?: Record<string, unknown>;
      error?: { code?: number; reason?: string; user_message?: string };
    }>;
  };

  const wrapper = body.transfer_specs?.[0];
  if (!wrapper) {
    throw new Error("HSTS returned empty transfer_specs array");
  }

  if (wrapper.error) {
    const e = wrapper.error;
    throw new Error(
      `HSTS upload_setup error: ${e.user_message ?? e.reason ?? `code ${e.code}`}`
    );
  }

  if (!wrapper.transfer_spec) {
    throw new Error("HSTS returned transfer_specs entry without transfer_spec");
  }

  return wrapper.transfer_spec;
}
