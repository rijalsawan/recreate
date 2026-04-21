"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, ChevronRight, UserCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TOOLS_LIST } from '@/config/tools.config';

export const Topbar = () => {
  const pathname = usePathname();
  
  const currentTool = TOOLS_LIST.find(t => t.route === pathname);
  
  const breadcrumbs = pathname.split('/').filter(Boolean);
  
  return (
    <header className="h-[60px] flex items-center justify-between px-6 border-b border-border bg-background/80 backdrop-blur-md sticky top-0 z-40 w-full transition-all">
      <div className="flex items-center gap-2 text-sm">
        {breadcrumbs.map((crumb, idx) => {
          const isLast = idx === breadcrumbs.length - 1;
          const href = `/${breadcrumbs.slice(0, idx + 1).join('/')}`;
          return (
            <React.Fragment key={crumb}>
              {idx > 0 && <ChevronRight className="w-4 h-4 text-muted-foreground" />}
              {isLast ? (
                <span className="font-semibold capitalize text-foreground">
                  {currentTool?.name || crumb.replace('-', ' ')}
                </span>
              ) : (
                <Link href={href} className="text-muted-foreground hover:text-foreground capitalize transition-colors">
                  {crumb.replace('-', ' ')}
                </Link>
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
          <Bell className="w-5 h-5" />
          <span className="absolute top-2 right-2 w-2 h-2 bg-primary rounded-full animate-pulse" />
        </Button>
        <Link href="/profile">
          <Button variant="outline" size="sm" className="gap-2 rounded-full hidden sm:flex border-border bg-elevated hover:bg-white/5">
            <span className="text-primary font-bold">⚡ 1,250</span>
            <span className="text-muted-foreground font-medium">Credits</span>
          </Button>
        </Link>
        <Button variant="ghost" size="icon" className="rounded-full bg-elevated border border-border hover:bg-white/10">
          <UserCircle className="w-5 h-5 text-muted-foreground" />
        </Button>
      </div>
    </header>
  );
};
