"use client";

import React from 'react';
import Link from 'next/link';
import { TOOLS_LIST } from '@/config/tools.config';
import { Button } from '@/components/ui/button';
import { useUserStore } from '@/stores/useUserStore';
import { PlusCircle, Sparkles, Layers, FileImage, LayoutGrid } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { user } = useUserStore();

  const featuredTools = TOOLS_LIST.filter(t => ['generate', 'inpaint', 'vectorize', 'replace-background'].includes(t.id));

  return (
    <div className="flex flex-col gap-10 p-6 lg:p-10 max-w-6xl mx-auto h-full overflow-y-auto">
      {/* Header Section */}
      <section className="flex flex-col gap-2">
        <h1 className="text-display font-bold font-display tracking-tight text-balance bg-clip-text text-transparent bg-gradient-to-r from-white to-white/50">
          Welcome back, {user?.name?.split(' ')[0] || 'Creator'}
        </h1>
        <p className="text-lg text-muted-foreground w-full max-w-2xl">
          What do you want to create today? Dive into AI image generation or jump back into a recent project.
        </p>
      </section>

      {/* Quick Start Shortcuts */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {featuredTools.map((tool, idx) => (
          <Link href={tool.route} key={tool.id} className="group">
            <div className={cn(
              "flex flex-col gap-4 p-6 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 backdrop-blur-md transition-all hover-lift",
              idx === 0 ? "border-primary/50 shadow-[0_0_40px_-15px_rgba(124,58,237,0.3)] bg-gradient-to-b from-primary/10 to-transparent" : ""
            )}>
              <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center border border-white/10">
                 {/* Icon rendered dynamically inside a static context is hard, so manually mapping important ones */}
                 {tool.id === 'generate' && <Sparkles className="text-primary w-6 h-6" />}
                 {tool.id === 'inpaint' && <Layers className="text-secondary w-6 h-6" />}
                 {tool.id === 'vectorize' && <LayoutGrid className="text-success w-6 h-6" />}
                 {tool.id === 'replace-background' && <FileImage className="text-warning w-6 h-6" />}
              </div>
              <div>
                <h3 className="font-heading font-bold text-lg mb-1">{tool.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{tool.description}</p>
              </div>
              <div className="mt-auto pt-2 flex items-center text-xs font-bold uppercase tracking-wide text-primary">
                Launch tool &rarr;
              </div>
            </div>
          </Link>
        ))}
      </section>

      {/* History Preview */}
      <section className="flex flex-col gap-6 flex-1 min-h-[300px]">
        <div className="flex items-center justify-between">
          <h2 className="text-h3 font-heading font-semibold">Recent Generations</h2>
          <Button variant="ghost" className="text-muted-foreground hover:text-white" asChild>
            <Link href="/history">View all history</Link>
          </Button>
        </div>

        <div className="flex-1 w-full rounded-2xl border border-dashed border-white/10 flex flex-col items-center justify-center gap-4 text-center p-10 bg-black/20">
          <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
            <PlusCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-heading text-xl font-medium">Your workspace is fresh</h3>
          <p className="text-muted-foreground max-w-sm">No recent generations found. Start creating to build up your history gallery.</p>
          <Button variant="default" size="lg" className="mt-4" asChild>
            <Link href="/generate">Start Generating</Link>
          </Button>
        </div>
      </section>

    </div>
  );
}
