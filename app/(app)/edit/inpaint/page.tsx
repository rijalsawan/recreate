"use client";

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { TOOLS } from '@/config/tools.config';
import { ToolLayout } from '@/components/tools/ToolLayout';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToolStore } from '@/stores/useToolStore';
import { useUserStore } from '@/stores/useUserStore';
import { toast } from 'sonner';
import { Loader2, Download, RefreshCcw, Save } from 'lucide-react';
import { FileDropzone } from '@/components/tools/FileDropzone';
import { cn } from '@/lib/utils';
import { MaskCanvas, LineData } from '@/components/tools/MaskCanvas';
import * as LucideIcons from 'lucide-react';

const inpaintSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters'),
});
type InpaintValues = z.infer<typeof inpaintSchema>;

const InpaintTool = () => {
  const tool = TOOLS['inpaint'];
  const { deductCredits, user } = useUserStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{id: string, url: string}[]>([]);
  
  // File & Canvas State
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [maskLines, setMaskLines] = useState<LineData[]>([]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<InpaintValues>({
    resolver: zodResolver(inpaintSchema),
    defaultValues: { prompt: '' },
  });
  const promptValue = watch('prompt', '');

  const handleUpload = (file: File) => {
    setSourceFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setMaskLines([]);
  };

  const handleClear = () => {
    setSourceFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setMaskLines([]);
  };

  const onSubmit = async (data: InpaintValues) => {
    if (!sourceFile) {
      toast.error('Upload an image', { description: 'Please provide a base image to inpaint.' });
      return;
    }
    if (maskLines.length === 0) {
      toast.error('Draw a mask', { description: 'Please paint over the area you want to modify.' });
      return;
    }
    if ((user?.credits ?? 0) < tool.creditsPerGeneration) {
      toast.error('Insufficient credits', { description: `To generate, you need ${tool.creditsPerGeneration} credits.` });
      return;
    }

    setIsGenerating(true);

    try {
      const res = await new Promise<{id:string, url: string}[]>((resolve) => 
        setTimeout(() => resolve([{
          id: Math.random().toString(),
          url: `https://picsum.photos/seed/${Math.random()}/1024/1024`
        }]), 2500)
      );
      
      setResults((prev) => [...res, ...prev]);
      deductCredits(tool.creditsPerGeneration);
      toast.success('Inpainting complete!', { description: 'Your new variation is ready.'});
    } catch (e: any) {
      toast.error('Generation failed', { description: e.message || 'Please try again later.' });
    } finally {
      setIsGenerating(false);
    }
  };

  const LeftPanel = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 h-full pb-4">
      {/* Dynamic Uploader / Canvas */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold capitalize flex justify-between">
          1. Base Image & Mask
        </label>
        
        {!sourceFile || !previewUrl ? (
          <FileDropzone 
            onUpload={handleUpload}
            onClear={handleClear}
            file={sourceFile}
            previewUrl={previewUrl}
          />
        ) : (
          <div className="flex flex-col gap-2 relative group">
            <MaskCanvas imageUrl={previewUrl} onMaskChange={setMaskLines} className="mb-2" />
            <Button variant="ghost" size="sm" onClick={handleClear} className="text-error hover:bg-error/10 hover:text-error">
              Start Over (Reset Image)
            </Button>
          </div>
        )}
      </div>

      {/* Prompt */}
      <div className={cn("flex flex-col gap-2 transition-opacity", !sourceFile && "opacity-50 pointer-events-none")}>
        <label className="text-sm font-semibold capitalize flex justify-between">
          2. Edit Prompt
          <span className="text-xs font-normal text-muted-foreground">{promptValue.length}/1000</span>
        </label>
        <Textarea 
          rows={4}
          placeholder="Describe what you want to appear in the masked region" 
          {...register('prompt')}
          disabled={!sourceFile}
          className="bg-surface border-border focus-visible:ring-primary"
        />
        {errors.prompt && <span className="text-xs text-error">{errors.prompt.message}</span>}
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-6">
        <p className="text-xs text-center text-muted-foreground mb-1">
          This will use <span className="font-bold text-foreground">~{tool.creditsPerGeneration} credits</span>
        </p>
        <Button size="lg" type="submit" disabled={isGenerating || !sourceFile} className="w-full text-base font-semibold">
          {isGenerating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Inpainting...</>
          ) : 'Generate Edit'}
        </Button>
      </div>
    </form>
  );

  const RightPanel = (
    <div className="flex flex-col gap-6 h-full">
      {results.length === 0 && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-center p-8">
          <div className="w-24 h-24 mb-4 rounded-xl border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <LucideIcons.Paintbrush className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-heading mb-2">No Edits Yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Upload an image, paint your mask, and describe your edit on the left.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
             <div className="w-16 h-16 rounded-xl border-4 border-muted border-t-primary animate-spin" />
             <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground animate-pulse">Processing Region...</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full auto-rows-max">
        {results.map((img) => (
          <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border bg-black aspect-square transition-all duration-300 shadow-lg hover:ring-2 hover:ring-primary/50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="Inpaint result" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <div className="flex gap-2 justify-end">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" title="Download">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return <ToolLayout tool={tool} leftPanel={LeftPanel} rightPanel={RightPanel} />;
};

export default InpaintTool;
