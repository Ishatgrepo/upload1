"use client";

import { useState, useRef } from "react";
import { Upload, FilePlus } from "lucide-react";
import { cn } from "../lib/utils";

interface DropzoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export function Dropzone({ onFilesSelected, disabled }: DropzoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
    }
  };

  const handleClick = () => {
    if (disabled) return;
    fileInputRef.current?.click();
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={cn(
        "group relative flex flex-col items-center justify-center w-full min-h-[300px] border-2 border-dashed rounded-2xl transition-all cursor-pointer select-none",
        isDragging
          ? "border-blue-500 bg-blue-50/50 scale-[1.01]"
          : "border-zinc-300 hover:border-blue-400 hover:bg-zinc-50/50",
        disabled && "opacity-50 cursor-not-allowed pointer-events-none"
      )}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        multiple
      />
      <div className="flex flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="p-5 bg-white shadow-sm border border-zinc-200 rounded-2xl group-hover:scale-110 transition-transform">
          <Upload className="w-10 h-10 text-zinc-500 group-hover:text-blue-500 transition-colors" />
        </div>
        <div className="space-y-2">
          <p className="text-xl font-semibold text-zinc-800">
            Drag & drop files or{" "}
            <span className="text-blue-600 hover:underline">browse</span>
          </p>
          <p className="text-sm text-zinc-500 font-medium">
            Multiple file selection supported
          </p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 text-xs font-bold rounded-full uppercase tracking-wider">
          <FilePlus className="w-4 h-4" />
          FAST UPLOAD
        </div>
      </div>
    </div>
  );
}
