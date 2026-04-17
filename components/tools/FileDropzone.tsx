"use client";

import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface FileDropzoneProps {
  onUpload: (file: File) => void;
  onClear: () => void;
  file: File | null;
  previewUrl: string | null;
  className?: string;
}

export const FileDropzone = ({ onUpload, onClear, file, previewUrl, className }: FileDropzoneProps) => {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      onUpload(acceptedFiles[0]);
    }
  }, [onUpload]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpeg', '.jpg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: 1,
    multiple: false,
  });

  if (file && previewUrl) {
    return (
      <div className={cn("relative group rounded-xl overflow-hidden border border-border bg-surface aspect-square flex items-center justify-center", className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={previewUrl} alt="Preview" className="max-w-full max-h-full object-contain" />
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Button variant="destructive" size="sm" onClick={onClear} className="gap-2">
            <X className="w-4 h-4" /> Remove Image
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div 
      {...getRootProps()} 
      className={cn(
        "cursor-pointer rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center transition-all bg-surface hover:bg-surface/80 aspect-square",
        isDragActive && "border-primary bg-primary/5",
        isDragReject && "border-error bg-error/5",
        !isDragActive && "border-border",
        className
      )}
    >
      <input {...getInputProps()} />
      <div className="w-12 h-12 rounded-full bg-elevated border border-border flex items-center justify-center mb-4">
        <UploadCloud className={cn("w-6 h-6", isDragActive ? "text-primary" : "text-muted-foreground")} />
      </div>
      <h3 className="font-semibold text-sm mb-1">Upload an image</h3>
      <p className="text-xs text-muted-foreground max-w-[200px]">
        Drag & drop a PNG, JPG, or WEBP file here, or click to browse.
      </p>
    </div>
  );
};
