import React from 'react';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

export const CreditsBar = ({ className }: { className?: string }) => {
  const { user } = useUserStore();
  const credits = user?.credits ?? 0;
  
  const isLow = credits < 200;
  
  return (
    <div className={cn('flex flex-col gap-2 p-3 bg-elevated/50 rounded-xl border', isLow ? 'border-warning/30' : 'border-border', className)}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">Credits</span>
        <span className={cn('text-sm font-bold', isLow ? 'text-warning' : 'text-primary')}>
          ⚡ {credits.toLocaleString()}
        </span>
      </div>
      <div className="h-2 w-full bg-surface rounded-full overflow-hidden">
        <div 
          className={cn('h-full rounded-full transition-all duration-500', isLow ? 'bg-warning' : 'bg-primary')}
          style={{ width: `${Math.min(100, (credits / 2000) * 100)}%` }}
        />
      </div>
    </div>
  );
};
