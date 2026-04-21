"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
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

const generateSchema = z.object({
  prompt: z.string().min(3, 'Prompt must be at least 3 characters').max(1000, 'Keep prompt under 1000 characters'),
  negativePrompt: z.string().optional(),
  model: z.string(),
  style: z.string(),
  size: z.string(),
});

type GenerateValues = z.infer<typeof generateSchema>;

const MODEL_LABELS: Record<string, string> = {
  recraftv4: 'Recraft V4',
  recraftv4_vector: 'Recraft V4 Vector',
  recraftv4_pro: 'Recraft V4 Pro',
  recraftv4_pro_vector: 'Recraft V4 Pro Vector',
  recraftv3: 'Recraft V3',
  recraftv3_vector: 'Recraft V3 Vector',
  recraftv2: 'Recraft V2',
  recraftv2_vector: 'Recraft V2 Vector',
  'gemini-2.5-flash': 'Gemini 2.5 Flash (Free)',
};

const GenerateTool = () => {
  const tool = TOOLS['generate'];
  const { model, setModel, size, setSize, style, setStyle } = useToolStore();
  const { deductCredits, user } = useUserStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [results, setResults] = useState<{id: string, url: string}[]>([]);

  const { register, handleSubmit, formState: { errors }, watch } = useForm<GenerateValues>({
    resolver: zodResolver(generateSchema),
    defaultValues: { prompt: '', negativePrompt: '', model, style, size },
  });

  const promptValue = watch('prompt', '');

  const onSubmit = async (data: GenerateValues) => {
    if ((user?.credits ?? 0) < tool.creditsPerGeneration) {
      toast.error('Insufficient credits', { description: `To generate, you need ${tool.creditsPerGeneration} credits.` });
      return;
    }

    setIsGenerating(true);
    // Persist user's choices for defaults next time
    setModel(data.model);
    setStyle(data.style);
    setSize(data.size);

    try {
      // Stub generation API request, simulate latency
      const res = await new Promise<{id:string, url: string}[]>((resolve) => 
        setTimeout(() => resolve([{
          id: Math.random().toString(),
          url: `https://picsum.photos/seed/${Math.random()}/1024/1024`
        }]), 2500)
      );
      
      setResults((prev) => [...res, ...prev]);
      deductCredits(tool.creditsPerGeneration);
      toast.success('Image generated!', { description: 'Your masterpiece is ready.'});
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Please try again later.';
      toast.error('Generation failed', { description: message });
    } finally {
      setIsGenerating(false);
    }
  };

  const LeftPanel = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6 h-full pb-4">
      {/* Prompt */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-semibold capitalize flex justify-between">
          Image Prompt
          <span className="text-xs font-normal text-muted-foreground">{promptValue.length}/1000</span>
        </label>
        <Textarea 
          rows={5}
          placeholder="Describe the image you want to create (e.g. A cyberpunk city at night, neon lights...)" 
          {...register('prompt')}
          className="bg-surface border-border focus-visible:ring-primary"
        />
        {errors.prompt && <span className="text-xs text-error">{errors.prompt.message}</span>}
      </div>

      {/* Model & Style Selectors (simplified for iteration) */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase font-bold text-muted-foreground">Model</label>
          <select 
            {...register('model')}
            className="h-10 px-3 py-2 bg-surface border border-border rounded-md text-sm outline-none focus:border-primary"
          >
            {tool.supportedModels.map(m => (
              <option key={m} value={m}>{MODEL_LABELS[m] || m}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-xs uppercase font-bold text-muted-foreground">Aspect Ratio</label>
          <select 
            {...register('size')}
            className="h-10 px-3 py-2 bg-surface border border-border rounded-md text-sm outline-none focus:border-primary"
          >
            <option value="1024x1024">1:1 Square</option>
            <option value="1024x1365">3:4 Portrait</option>
            <option value="1365x1024">4:3 Landscape</option>
            <option value="1024x576">16:9 Widescreen</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-auto pt-6">
        <p className="text-xs text-center text-muted-foreground mb-1">
          This will use <span className="font-bold text-foreground">~{tool.creditsPerGeneration} credits</span>
        </p>
        <Button size="lg" type="submit" disabled={isGenerating} className="w-full text-base font-semibold">
          {isGenerating ? (
            <><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Generating...</>
          ) : 'Generate Image'}
        </Button>
      </div>
    </form>
  );

  const RightPanel = (
    <div className="flex flex-col gap-6 h-full">
      {results.length === 0 && !isGenerating && (
        <div className="flex-1 flex flex-col items-center justify-center opacity-60 text-center p-8">
          <div className="w-24 h-24 mb-4 rounded-full border border-dashed border-muted-foreground/30 flex items-center justify-center">
            <LucideIcons.Image className="w-10 h-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-xl font-heading mb-2">No Images Yet</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            Enter a prompt on the left to start generating high-quality AI images.
          </p>
        </div>
      )}

      {isGenerating && (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
             <div className="w-16 h-16 rounded-xl border-4 border-muted border-t-primary animate-spin" />
             <p className="font-mono text-sm tracking-widest uppercase text-muted-foreground animate-pulse">Running {model}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full auto-rows-max">
        {results.map((img) => (
          <div key={img.id} className="group relative rounded-xl overflow-hidden border border-border bg-black aspect-square transition-all duration-300 hover:ring-2 hover:ring-primary/50 shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.url} alt="Generated result" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
              <div className="flex gap-2 justify-end">
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" title="Save style">
                  <Save className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg" title="Regenerate seed">
                  <RefreshCcw className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="default" className="h-8 w-8 rounded-lg" title="Download">
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

// Next.js static component workaround for Dynamic Imports or general icon injection
import * as LucideIcons from 'lucide-react';

export default GenerateTool;
