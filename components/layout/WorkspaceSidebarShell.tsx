'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { BookOpen, FolderOpen, LogOut, Sparkles, UserCircle, Zap, Plus } from 'lucide-react';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { PricingModal } from '@/components/shared/PricingModal';

type WorkspaceSection = 'projects' | 'styles' | 'profile';

function NavItem({
  icon,
  label,
  active,
  href,
  badge,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  href?: string;
  badge?: string;
  onClick?: () => void;
}) {
  const cls = cn(
    'flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-colors cursor-pointer select-none',
    active
      ? 'bg-white/10 text-white'
      : 'text-muted-foreground hover:text-white hover:bg-white/5'
  );

  if (href) {
    return (
      <Link href={href} className={cls}>
        <span className="shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
        <span className="flex-1">{label}</span>
        {badge && (
          <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full">
            {badge}
          </span>
        )}
      </Link>
    );
  }

  return (
    <button className={cls} onClick={onClick}>
      <span className="shrink-0 w-5 h-5 flex items-center justify-center">{icon}</span>
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span className="text-[10px] font-bold uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full">
          {badge}
        </span>
      )}
    </button>
  );
}

export function WorkspaceSidebarShell({
  activeSection,
  children,
  onCreateProject,
}: {
  activeSection: WorkspaceSection;
  children: React.ReactNode;
  onCreateProject?: () => void;
}) {
  const { user } = useUserStore();
  const [showPricingModal, setShowPricingModal] = useState(false);

  const handleCreateProject = () => {
    if (onCreateProject) {
      onCreateProject();
      return;
    }

    window.location.href = '/projects?new=1';
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      <aside className="w-[220px] shrink-0 border-r border-border bg-background flex flex-col h-full">
        <div className="p-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 group mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-base text-white">Recraft SaaS</span>
          </Link>

          <Button
            className="w-full rounded-xl font-bold text-sm h-9 gap-2 shadow-[0_0_20px_-5px_rgba(124,58,237,0.4)]"
            onClick={handleCreateProject}
          >
            <Plus className="w-4 h-4" />
            Create new project
          </Button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          <NavItem
            icon={<FolderOpen className="w-4 h-4" />}
            label="Projects"
            href="/projects"
            active={activeSection === 'projects'}
          />
          <NavItem
            icon={<BookOpen className="w-4 h-4" />}
            label="Styles"
            href="/styles"
            active={activeSection === 'styles'}
          />

          <div className="h-px bg-border my-2" />

          <NavItem
            icon={<UserCircle className="w-4 h-4" />}
            label="Profile"
            href="/profile"
            active={activeSection === 'profile'}
          />
          <NavItem
            icon={<Zap className="w-4 h-4" />}
            label="What's new"
            badge="NEW"
            onClick={() => toast.info("You're on the latest version")}
          />
        </nav>

        <div className="p-3 border-t border-border flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full rounded-xl font-bold text-sm h-9 gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => setShowPricingModal(true)}
          >
            <Zap className="w-4 h-4" />
            Upgrade subscription
          </Button>

          <div className="flex items-center gap-2.5 px-1 py-1 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group">
            <div className="w-8 h-8 rounded-full overflow-hidden border border-border shrink-0">
              {user?.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.avatarUrl} alt={user.name ?? 'User'} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                  {user?.name?.[0] ?? 'U'}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-white truncate">{user?.name ?? 'Guest'}</p>
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Sparkles className="w-2.5 h-2.5 text-primary" />
                {user?.credits?.toLocaleString() ?? 0} credits
              </p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: '/' })}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-white"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 overflow-hidden">{children}</div>

      <PricingModal isOpen={showPricingModal} onClose={() => setShowPricingModal(false)} />
    </div>
  );
}