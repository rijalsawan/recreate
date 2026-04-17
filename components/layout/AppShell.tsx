"use client";

import React, { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { cn } from '@/lib/utils';
import { useLayoutStore } from '@/stores/useLayoutStore';

export const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { isSidebarCollapsed, setSidebarCollapsed } = useLayoutStore();

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Init Check
    return () => window.removeEventListener('resize', handleResize);
  }, [setSidebarCollapsed]);

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden relative">
      <Sidebar />
      <div 
        className={cn(
          "flex flex-col flex-1 h-screen overflow-hidden transition-all duration-300 pb-safe",
          isSidebarCollapsed ? "ml-[72px]" : "ml-[260px]"
        )}
      >
        <Topbar />
        <main className="flex-1 overflow-auto bg-surface/30">
          <div className="max-w-[1440px] mx-auto w-full h-full relative">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
