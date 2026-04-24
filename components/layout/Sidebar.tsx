"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { TOOLS_LIST } from '@/config/tools.config';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CreditsBar } from '@/components/shared/CreditsBar';
import { PricingModal } from '@/components/shared/PricingModal';
import * as LucideIcons from 'lucide-react';
import { useLayoutStore } from '@/stores/useLayoutStore';
import { useUserStore } from '@/stores/useUserStore';

const LucideIcon = ({ name, className }: { name: string, className?: string }) => {
  const IconNames: Record<string, any> = {
    image: LucideIcons.Image,
    copy: LucideIcons.Copy,
    paintbrush: LucideIcons.Paintbrush,
    layers: LucideIcons.Layers,
    'image-plus': LucideIcons.ImagePlus,
    eraser: LucideIcons.Eraser,
    vector: LucideIcons.Combine,
    scissors: LucideIcons.Scissors,
    maximize: LucideIcons.Maximize,
    shuffle: LucideIcons.Shuffle,
    compass: LucideIcons.Compass,
    history: LucideIcons.History,
    swatchbook: LucideIcons.SwatchBook,
    user: LucideIcons.User
  };
  
  const IconComponent = IconNames[name] || LucideIcons.Box;
  return <IconComponent className={cn('w-5 h-5 shrink-0', className)} />;
};

export const Sidebar = () => {
  const pathname = usePathname();
  const { isSidebarCollapsed, toggleSidebar } = useLayoutStore();
  const { user } = useUserStore();
  const [showPricingModal, setShowPricingModal] = useState(false);
  const isPaidPlan = user?.plan && user.plan !== 'free';

  const generateTools = TOOLS_LIST.filter(t => t.category === 'generate');
  const editTools = TOOLS_LIST.filter(t => t.category === 'edit');
  const otherTools = TOOLS_LIST.filter(t => t.category === 'tool');

  const navSection = (title: string, tools: typeof TOOLS_LIST) => (
    <div className="flex flex-col gap-1 mb-6">
      {!isSidebarCollapsed && <span className="text-xs uppercase tracking-wider text-muted-foreground px-4 font-bold">{title}</span>}
      <div className="flex flex-col gap-1">
        {tools.map(tool => {
          const isActive = pathname === tool.route;
          return (
            <Link key={tool.id} href={tool.route}>
              <div className={cn(
                "flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg transition-colors hover:bg-white/5",
                isActive ? "bg-white/10 text-primary" : "text-text-subtle",
                isSidebarCollapsed && "justify-center px-0 mx-2"
              )}>
                <LucideIcon name={tool.icon} className={cn(isActive && "text-primary")} />
                {!isSidebarCollapsed && <span className="font-medium text-sm whitespace-nowrap overflow-hidden text-ellipsis">{tool.name}</span>}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className={cn(
      "h-screen fixed left-0 top-0 border-r border-border bg-background flex flex-col transition-all duration-300 z-50",
      isSidebarCollapsed ? "w-18" : "w-65"
    )}>
      <div className={cn("flex shrink-0 items-center p-4 border-b border-border/50", isSidebarCollapsed ? "justify-center" : "justify-between")}>
        {!isSidebarCollapsed && <span className="text-xl font-display font-black uppercase tracking-[0.16em] text-white flex-1 overflow-hidden pointer-events-none">RECREATE</span>}
        <Button variant="ghost" size="icon" onClick={toggleSidebar} className="shrink-0 active:scale-95 transition-transform text-white/70 hover:text-white">
          <LucideIcons.PanelLeftClose className={cn("w-5 h-5 transition-transform", isSidebarCollapsed && "rotate-180")} />
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto py-4 scrollbar-hide">
        {navSection("Create", generateTools)}
        {navSection("Edit", editTools)}
        {navSection("Tools", otherTools)}

        <div className="flex flex-col gap-1 mb-6">
          {!isSidebarCollapsed && <span className="text-xs uppercase tracking-wider text-muted-foreground px-4 font-bold">Library</span>}
          <Link href="/styles">
            <div className={cn("flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg hover:bg-white/5 text-text-subtle", pathname === "/styles" && "bg-white/10 text-primary", isSidebarCollapsed && "justify-center px-0 mx-2")}>
              <LucideIcon name="swatchbook" />
              {!isSidebarCollapsed && <span className="font-medium text-sm">Styles</span>}
            </div>
          </Link>
          <Link href="/history">
            <div className={cn("flex items-center gap-3 px-4 py-2.5 mx-2 rounded-lg hover:bg-white/5 text-text-subtle", pathname === "/history" && "bg-white/10 text-primary", isSidebarCollapsed && "justify-center px-0 mx-2")}>
              <LucideIcon name="history" />
              {!isSidebarCollapsed && <span className="font-medium text-sm">History</span>}
            </div>
          </Link>
        </div>
      </div>

      <div className="p-4 border-t border-border mt-auto flex flex-col gap-4">
        {!isSidebarCollapsed && <CreditsBar />}
        {!isPaidPlan && !isSidebarCollapsed && (
          <Button
            variant="outline"
            className="w-full rounded-xl font-bold text-sm h-9 gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setShowPricingModal(true)}
          >
            <LucideIcons.Zap className="w-4 h-4" />
            Upgrade
          </Button>
        )}
          <Link href="/profile" className={cn("flex items-center gap-3 rounded-lg transition-colors hover:bg-white/5 p-2", isSidebarCollapsed ? "justify-center -mx-2" : "-mx-2")}>
          <div className="w-8 h-8 rounded-full bg-elevated border border-border flex items-center justify-center shrink-0">
             <LucideIcon name="user" className="w-4 h-4 text-muted-foreground" />
          </div>
          {!isSidebarCollapsed && <span className="font-medium text-sm">My Account</span>}
        </Link>
      </div>

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
};
