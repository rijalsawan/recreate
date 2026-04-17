"use client";

import React, { useState } from 'react';
import { TOOLS } from '@/config/tools.config';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'sonner';
import { Loader2, Download, SlidersHorizontal } from 'lucide-react';
import { FileDropzone } from '@/components/tools/FileDropzone';

const VectorizeTool = () => {
  const tool = TOOLS['vectorize'];
  const { deductCredits, user } = useUserStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{id: string, url: string} | null>(null);
  
  // File State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleUpload = (file: File) => {
    setSourceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleClear = () => {
    setSourceFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const onSubmit = async () => {
    if (!sourceFile) {
      toast.error('Upload an image', { description: 'Please provide a base image to vectorize.' });
      return;
    }
    if ((user?.credits ?? 0) < tool.creditsPerGeneration) {
      toast.error('Insufficient credits', { description: `To generate, you need ${tool.creditsPerGeneration} credits.` });
      return;
    }

    setIsGenerating(true);

    try {
      // Mocking Vector SVG result with a random image for now
      const res = await new Promise<{id:string, url: string}>((resolve) => 
        setTimeout(() => resolve({
          id: Math.random().toString(),
          url: `https://picsum.photos/seed/${Math.random()}/1024/1024`
        }), 2500)
      );
      
      setResult(res);
      deductCredits(tool.creditsPerGeneration);
      toast.success('Vectorization complete!', { description: 'Your SVG is ready.'});
    } catch (e: any) {
      toast.error('Vectorization failed', { description: e.message || 'Please try again later.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const LeftPanel = (
    <div className="flex flex-col gap-6 h-full pb-4">
      {/* Dynamic Uploader */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold capitalize flex justify-between">
          Source Image
        </label>
        
        <FileDropzone 
          onUpload={handleUpload}
          onClear={handleClear}
          file={sourceFile}
          previewUrl={previewUrl}
        />
      </div>

      {/* Settings (Mockup) */}
      <div className="flex flex-col gap-2">
        <label className="text-xs uppercase font-bold text-muted-foreground flex items-center gap-1">
          <SlidersHorizontal className="w-3 h-3" /> Options
        </label>
        <div className="bg-elevated p-3 rounded-lg border border-border text-sm flex items-center justify-between">
           <span className="text-muted-foreground">Color Palette</span>
           <span className="font-medium text-white">Auto</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-6">
        <p className="text-xs text-center text-muted-foreground mb-1">
          This will use <span className="font-bold text-foreground">~{tool.creditsPerGeneration} credits</span>
        </p>
        <Button size="lg" onClick={onSubmit} disabled={isGenerating || !sourceFile} className="w-full text-base font-semibold">
          {isGenerating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Vectorizing...</>
          ) : 'Vectorize Image'}
        </Button>
      </div>
    </div>
  );

  const RightPanel = (
    <div className="flex flex-col gap-6 h-full">
      {!result && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-center p-8">
          <div className="w-24 h-24 mb-4 rounded-xl border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/50">
              <path d="M12 2v20 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <h3 className="text-xl font-heading mb-2">No Vectors Yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Upload a raster image on the left and convert it to a scalable vector.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
             <div className="w-16 h-16 rounded-xl border-4 border-success/30 border-t-success animate-spin" />
             <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground animate-pulse">Tracing Paths...</p>
          </div>
        </div>
      )}

      {result && (
        <div className="flex-1 flex flex-col items-center justify-center auto-rows-max w-full pt-8">
          <div key={result.id} className="group relative rounded-xl overflow-hidden border border-border bg-black/50 aspect-square max-w-lg w-full transition-all duration-300 shadow-lg hover:ring-2 hover:ring-success/50 p-8 flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={result.url} alt="Vector result" className="max-w-full max-h-full object-contain" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <div className="flex gap-2 justify-center">
                <Button variant="default" className="gap-2 font-bold w-full bg-success text-black hover:bg-success/90">
                  <Download className="h-4 w-4" /> Download SVG Archive
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  return <ToolLayout tool={tool} leftPanel={LeftPanel} rightPanel={RightPanel} />;
};

export default VectorizeTool;
