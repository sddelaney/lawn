"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { Upload } from "lucide-react";

type UploadMethod = "s3-direct" | "aspera";

interface DropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  className?: string;
  asperaAvailable?: boolean;
  uploadMethod?: UploadMethod;
  onUploadMethodChange?: (method: UploadMethod) => void;
}

export function DropZone({
  onFilesSelected,
  disabled,
  className,
  asperaAvailable,
  uploadMethod = "s3-direct",
  onUploadMethodChange,
}: DropZoneProps) {
  const [isDragActive, setIsDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragActive(false);

      if (disabled) return;

      const files = Array.from(e.dataTransfer.files).filter((file) =>
        file.type.startsWith("video/")
      );

      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;

      const files = e.target.files ? Array.from(e.target.files) : [];
      if (files.length > 0) {
        onFilesSelected(files);
      }
    },
    [disabled, onFilesSelected]
  );

  return (
    <div className={cn("flex flex-col gap-0", className)}>
      {asperaAvailable && onUploadMethodChange && (
        <div className="flex">
          <button
            type="button"
            className={cn(
              "px-3 py-1.5 text-xs font-bold border-2 border-[#1a1a1a] border-r-0 transition-colors",
              uploadMethod === "s3-direct"
                ? "bg-[#1a1a1a] text-[#f0f0e8]"
                : "bg-[#f0f0e8] text-[#1a1a1a] hover:bg-[#e8e8e0]",
            )}
            onClick={() => onUploadMethodChange("s3-direct")}
          >
            S3 Direct
          </button>
          <button
            type="button"
            className={cn(
              "px-3 py-1.5 text-xs font-bold border-2 border-[#1a1a1a] transition-colors",
              uploadMethod === "aspera"
                ? "bg-[#1a1a1a] text-[#f0f0e8]"
                : "bg-[#f0f0e8] text-[#1a1a1a] hover:bg-[#e8e8e0]",
            )}
            onClick={() => onUploadMethodChange("aspera")}
          >
            Aspera FASP
          </button>
        </div>
      )}
      <div
        className={cn(
          "relative border-2 border-dashed p-12 text-center transition-all",
          isDragActive
            ? "border-[#2d5a2d] bg-[#2d5a2d]/5"
            : "border-[#1a1a1a] hover:border-[#888] bg-[#f0f0e8]",
          disabled && "opacity-40 cursor-not-allowed",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept="video/*"
          multiple
          onChange={handleChange}
          disabled={disabled}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
        />
        <div className="flex flex-col items-center gap-4">
          <div
            className={cn(
              "w-14 h-14 flex items-center justify-center transition-colors border-2 border-[#1a1a1a]",
              isDragActive
                ? "bg-[#2d5a2d] text-[#f0f0e8]"
                : "bg-[#e8e8e0] text-[#888]"
            )}
          >
            <Upload className="h-6 w-6" />
          </div>
          <div>
            <p className="font-bold text-[#1a1a1a]">
              {isDragActive ? "Drop to upload" : "Drop videos or click to upload"}
            </p>
            <p className="text-sm text-[#888] mt-1">
              MP4, MOV, WebM supported
              {asperaAvailable && uploadMethod === "aspera" && " (accelerated)"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
