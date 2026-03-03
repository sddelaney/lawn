"use client";

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

interface UploadButtonProps {
  onFilesSelected: (files: File[]) => void;
  onAsperaUpload?: () => void;
  uploadMethod?: "s3-direct" | "aspera";
  disabled?: boolean;
  children?: React.ReactNode;
}

export function UploadButton({
  onFilesSelected,
  onAsperaUpload,
  uploadMethod = "s3-direct",
  disabled,
  children,
}: UploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    if (uploadMethod === "aspera") {
      onAsperaUpload?.();
      return;
    }
    inputRef.current?.click();
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelected(files);
    }
    e.target.value = "";
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="video/*"
        multiple
        onChange={handleChange}
        className="hidden"
      />
      <Button onClick={handleClick} disabled={disabled}>
        {children || (
          <>
            <Plus className="mr-1.5 h-4 w-4" />
            Upload
          </>
        )}
      </Button>
    </>
  );
}
