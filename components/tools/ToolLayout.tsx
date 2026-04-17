import React from 'react';
import { cn } from '@/lib/utils';
import { ToolConfig } from '@/types/tool.types';

interface ToolLayoutProps {
  tool: ToolConfig;
  leftPanel: React.ReactNode;
  rightPanel: React.ReactNode;
}

export const ToolLayout = ({ tool, leftPanel, rightPanel }: ToolLayoutProps) => {
  return (
    <div className="flex flex-col lg:flex-row h-[max(100%,calc(100vh-60px))]">
      {/* Left Panel - Fixed Width on Desktop, stack on Mobile */}
      <div className={cn(
        "w-full lg:w-[380px] lg:border-r border-border bg-background flex flex-col shrink-0 relative lg:min-h-full"
      )}>
        {/* Tool Header */}
        <div className="p-5 border-b border-border/50 sticky top-0 bg-background z-10">
          <h2 className="text-lg font-bold font-heading text-white">{tool.name}</h2>
          <p className="text-sm text-muted-foreground mt-1">{tool.description}</p>
        </div>
        
        {/* Tool Editor Fields */}
        <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
          {leftPanel}
        </div>
      </div>

      {/* Right Panel - Output Area */}
      <div className="flex-1 bg-surface p-4 sm:p-6 lg:p-8 overflow-y-auto min-h-[500px] lg:min-h-full">
        {rightPanel}
      </div>
    </div>
  );
};
