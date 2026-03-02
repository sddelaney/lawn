export type TransferStatus =
  | "queued"
  | "running"
  | "completed"
  | "failed"
  | "paused"
  | "canceled";

export interface TransferInfo {
  uuid: string;
  status: TransferStatus;
  fileName: string;
  percentage: number;
  speedKbps: number;
  bytesWritten: number;
  bytesExpected: number;
  remainingUsec: number;
  isHttpGateway: boolean;
  direction: "send" | "receive";
  errorCode?: number;
  errorMessage?: string;
}

export interface AsperaInitOptions {
  appId: string;
  httpGatewaySettings?: { url: string };
  forceGateway?: boolean;
}
