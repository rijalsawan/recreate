"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  ChevronDown, Hexagon, History, PlayCircle, HelpCircle,
  MousePointer2, Hand, Shapes, Frame, Type, Upload, Undo2, Redo2,
  Image as ImageIcon, Wand2, Box, Sparkles, SlidersHorizontal, Paperclip, ArrowUp,
  PanelLeft, Sidebar as SidebarIcon
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

export default function EditorPage() {
  const { user } = useUserStore();
  const [prompt, setPrompt] = useState('');

  return (
    <div className="h-screen w-screen bg-[#0A0A0B] relative overflow-hidden flex flex-col font-sans select-none text-foreground">
      {/* Background Dot Grid */}
      <div 
        className="absolute inset-0 z-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle at center, #ffffff 1px, transparent 1px)',
          backgroundSize: '24px 24px'
        }}
      />

      {/* TOP HEADER */}
      <header className="absolute top-0 w-full p-4 flex items-center justify-between z-40 pointer-events-none">
        
        {/* Top Left Navigation */}
        <div className="flex items-center gap-2 pointer-events-auto">
          {/* App Logo */}
          <Link href="/" className="w-10 h-10 bg-black border border-white/10 rounded-xl flex items-center justify-center hover:bg-neutral-900 transition-colors shadow-lg">
            <div className="w-5 h-5 bg-white rounded-md flex items-center justify-center">
              <Hexagon className="w-3.5 h-3.5 text-black" fill="currentColor" />
            </div>
            <ChevronDown className="w-3 h-3 text-muted-foreground ml-1" />
          </Link>

          <div className="flex items-center bg-elevated/80 backdrop-blur-md border border-white/5 rounded-xl h-10 px-1 shadow-lg">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              <PlayCircle className="w-4 h-4 mr-2" />
              Workflows <span className="ml-1.5 text-[0.6rem] bg-orange-500/20 text-orange-400 px-1.5 rounded uppercase tracking-wider">Beta</span>
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              <History className="w-4 h-4 mr-2" />
              History
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Get started
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              <HelpCircle className="w-4 h-4 mr-2" />
              Help
            </Button>
          </div>
        </div>

        {/* Top Center: Project Title */}
        <div className="absolute left-1/2 -translate-x-1/2 pointer-events-auto">
          <button className="flex items-center gap-2 bg-elevated/80 backdrop-blur-md border border-white/5 hover:bg-elevated px-4 h-10 rounded-xl transition-colors shadow-lg group">
            <span className="text-sm font-medium">Untitled</span>
            <ChevronDown className="w-4 h-4 text-muted-foreground group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Top Right Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className="flex items-center bg-elevated/80 backdrop-blur-md border border-white/5 rounded-xl h-10 px-1 shadow-lg">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              50%
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-muted-foreground hover:text-white rounded-lg">
              Share
            </Button>
            <div className="w-px h-4 bg-white/10 mx-1" />
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium px-3 text-primary hover:text-primary hover:bg-primary/10 rounded-lg">
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              60
            </Button>
            <Button size="sm" className="h-8 text-xs font-bold px-4 ml-1 rounded-lg bg-primary hover:bg-primary-hover text-white shadow-[0_0_15px_-3px_rgba(124,58,237,0.4)]">
              Upgrade
            </Button>
          </div>
          
          <button className="w-10 h-10 rounded-xl bg-elevated/80 backdrop-blur-md border border-white/5 flex items-center justify-center hover:bg-elevated transition-colors shadow-lg overflow-hidden">
             {/* Avatar placeholder */}
             {user?.avatar ? (
                <img src={user.avatar} alt="User" className="w-7 h-7 rounded-lg" />
             ) : (
                <div className="w-7 h-7 bg-primary/20 rounded-lg flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {user?.name?.[0] || 'U'}
                </div>
             )}
          </button>
        </div>

      </header>

      {/* LEFT TOOLBAR */}
      <aside className="absolute left-4 top-1/2 -translate-y-1/2 bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex flex-col gap-1.5 z-40 shadow-2xl pointer-events-auto">
        <ToolButton icon={<MousePointer2 className="w-5 h-5" />} active tooltip="Select (V)" />
        <ToolButton icon={<Hand className="w-5 h-5" />} tooltip="Hand Tool (H)" />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        <ToolButton icon={<Shapes className="w-5 h-5" />} tooltip="Shapes (S)" />
        <ToolButton icon={<Frame className="w-5 h-5" />} tooltip="Frame (F)" />
        <ToolButton icon={<Type className="w-5 h-5" />} tooltip="Text (T)" />
        <ToolButton icon={<Upload className="w-5 h-5" />} tooltip="Upload Image (I)" />
        <div className="w-6 h-px bg-white/10 mx-auto my-1" />
        <ToolButton icon={<Undo2 className="w-5 h-5" />} tooltip="Undo (Cmd+Z)" />
        <ToolButton icon={<Redo2 className="w-5 h-5" />} tooltip="Redo (Cmd+Shift+Z)" />
      </aside>

      {/* BOTTOM LEFT TOGGLES */}
      <div className="absolute left-4 bottom-4 bg-elevated/90 backdrop-blur-xl border border-white/10 rounded-2xl p-1 flex flex-col gap-1 z-40 shadow-2xl pointer-events-auto">
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
          <PanelLeft className="w-5 h-5" />
        </button>
        <button className="w-10 h-10 rounded-xl flex items-center justify-center text-muted-foreground hover:text-white hover:bg-white/5 transition-colors">
          <SidebarIcon className="w-5 h-5" />
        </button>
      </div>

      {/* BOTTOM PROMPT BAR */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-[800px] z-40 pointer-events-auto">
        <div className="bg-elevated/95 backdrop-blur-2xl border border-white/10 rounded-[1.5rem] p-3 shadow-[0_20px_40px_-15px_rgba(0,0,0,0.5)] flex flex-col gap-3">
          
          {/* Main Input */}
          <div className="relative px-3 pt-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what you want to generate"
              className="w-full bg-transparent border-none outline-none resize-none text-white placeholder:text-muted-foreground text-base h-[50px] font-medium"
              autoFocus
            />
          </div>

          {/* Options Row */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
              <BadgeButton icon={<ImageIcon className="w-4 h-4" />} label="Image" />
              <BadgeButton icon={<Wand2 className="w-4 h-4" />} label="Manual" />
              <BadgeButton icon={<Box className="w-4 h-4" />} label="V4 Vector" />
              <BadgeButton icon={<Sparkles className="w-4 h-4 text-primary" />} label="Vector art" />
              <BadgeButton icon={<Frame className="w-4 h-4" />} label="Ratio" />
              <BadgeButton icon={<LayoutGridIcon className="w-4 h-4" />} label="Count" />
              <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors ml-1">
                <SlidersHorizontal className="w-4 h-4" />
              </button>
              <button className="p-1.5 text-muted-foreground hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                <Paperclip className="w-4 h-4" />
              </button>
            </div>

            {/* Submit Button */}
            <button 
              className={cn(
                "w-10 h-10 rounded-full flex flex-shrink-0 items-center justify-center transition-all shadow-lg ml-4",
                prompt.trim().length > 0 
                  ? "bg-primary text-white hover:bg-primary-hover hover:scale-105" 
                  : "bg-surface text-muted-foreground hover:bg-white/10"
              )}
            >
              <ArrowUp className="w-5 h-5 stroke-[2.5]" />
            </button>
          </div>
        </div>

        <p className="text-center text-[11px] text-muted-foreground font-medium mt-3">
          Recraft AI can make mistakes. Check important info.
        </p>
      </div>

    </div>
  );
}

// Subcomponents helper
function ToolButton({ icon, active, tooltip }: { icon: React.ReactNode, active?: boolean, tooltip?: string }) {
  return (
    <button 
      title={tooltip}
      className={cn(
        "w-10 h-10 rounded-xl flex items-center justify-center transition-all group relative",
        active 
          ? "bg-primary/10 text-primary shadow-inner shadow-primary/20" 
          : "text-muted-foreground hover:text-white hover:bg-white/5"
      )}
    >
      {icon}
      
      {/* Optional Tooltip (simple CSS-based for now) */}
      <div className="absolute left-full ml-3 px-2 py-1 bg-black text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
        {tooltip}
      </div>
    </button>
  );
}

function BadgeButton({ icon, label }: { icon: React.ReactNode, label: string }) {
  return (
    <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-background border border-white/5 text-sm text-foreground hover:bg-white/5 hover:border-white/10 transition-all font-medium whitespace-nowrap">
      {icon}
      {label}
    </button>
  );
}

// Temporary inline custom icon missing from import above
function LayoutGridIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
    </svg>
  );
}