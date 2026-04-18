"use client";

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, Plus, FolderOpen, Layers, Users, Star, History,
  UserCircle, Zap, ChevronDown, X, MoreHorizontal, Pencil,
  Trash2, ExternalLink, Search, SortAsc, Globe, BookOpen,
  LogOut, ChevronRight, ImageIcon, Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';
import { signOut } from 'next-auth/react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  thumbnail: string | null;
  createdAt: string;
  updatedAt: string;
}

type SortOption = 'Last opened' | 'Last created' | 'Alphabetically';
type TabOption = 'My projects' | 'Shared by me' | 'Shared with me' | 'Featured projects';

// ─── Sidebar Nav Item ─────────────────────────────────────────────────────────

function SidebarItem({
  icon,
  label,
  active,
  onClick,
  href,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
  badge?: string;
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

// ─── Project Card ─────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onDelete,
  onRename,
}: {
  project: Project;
  onDelete: (id: string) => void;
  onRename: (id: string, name: string) => void;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(project.name);

  const timeAgo = formatDistanceToNow(new Date(project.updatedAt), { addSuffix: true });

  const handleOpen = () => {
    if (!renaming) router.push(`/project/${project.id}`);
  };

  const handleRenameSubmit = () => {
    if (nameValue.trim() && nameValue.trim() !== project.name) {
      onRename(project.id, nameValue.trim());
    }
    setRenaming(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      className="group flex flex-col gap-2"
    >
      {/* Thumbnail */}
      <div
        onClick={handleOpen}
        className="relative aspect-[4/3] rounded-xl border border-border bg-elevated overflow-hidden cursor-pointer hover:border-border-hover transition-all group-hover:shadow-lg group-hover:shadow-black/30"
      >
        {project.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={project.thumbnail}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2">
            <ImageIcon className="w-8 h-8 text-muted-foreground/40" />
            <span className="text-xs text-muted-foreground/50 font-medium">No images</span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl px-4 py-2 text-sm font-bold text-white flex items-center gap-2">
              <ExternalLink className="w-4 h-4" />
              Open
            </div>
          </div>
        </div>

        {/* 3-dot menu */}
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(true); }}
            className="w-8 h-8 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/80 transition-colors"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Name + meta */}
      <div className="flex items-start justify-between gap-2 px-0.5">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={nameValue}
              onChange={(e) => setNameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') { setRenaming(false); setNameValue(project.name); } }}
              className="w-full bg-elevated border border-primary rounded-md px-2 py-0.5 text-sm font-semibold text-white focus:outline-none"
            />
          ) : (
            <p
              className="text-sm font-semibold text-white truncate cursor-pointer hover:text-primary transition-colors"
              onClick={handleOpen}
            >
              {project.name}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">modified {timeAgo}</p>
        </div>
      </div>

      {/* Context menu */}
      <AnimatePresence>
        {menuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.12 }}
              className="fixed z-50 w-44 bg-elevated border border-border rounded-xl shadow-2xl p-1 overflow-hidden"
              style={{ top: 'auto', left: 'auto' }}
            >
              <button
                onClick={() => { setMenuOpen(false); router.push(`/project/${project.id}`); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <ExternalLink className="w-4 h-4 text-muted-foreground" /> Open
              </button>
              <button
                onClick={() => { setMenuOpen(false); setRenaming(true); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg transition-colors"
              >
                <Pencil className="w-4 h-4 text-muted-foreground" /> Rename
              </button>
              <div className="h-px bg-border my-1" />
              <button
                onClick={() => { setMenuOpen(false); onDelete(project.id); }}
                className="flex items-center gap-2.5 w-full px-3 py-2 text-sm text-error hover:bg-error/10 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Create New Card ──────────────────────────────────────────────────────────

function CreateCard({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      layout
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={onClick}
      className="group flex flex-col gap-2"
    >
      <div className="aspect-[4/3] rounded-xl border-2 border-dashed border-border hover:border-primary/60 bg-elevated/50 hover:bg-primary/5 flex flex-col items-center justify-center gap-3 transition-all cursor-pointer">
        <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
          <Plus className="w-6 h-6 text-primary" />
        </div>
        <span className="text-sm font-semibold text-muted-foreground group-hover:text-white transition-colors">
          New project
        </span>
      </div>
      <p className="text-sm font-semibold text-white px-0.5">Create new project</p>
    </motion.button>
  );
}

// ─── New Project Modal ────────────────────────────────────────────────────────

function NewProjectModal({
  isOpen,
  onClose,
  onCreate,
}: {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
}) {
  const [name, setName] = useState('Untitled');
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    setLoading(true);
    await onCreate(name.trim() || 'Untitled');
    setLoading(false);
    setName('Untitled');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: 'spring', damping: 25, stiffness: 400 }}
            className="relative w-full max-w-sm bg-elevated border border-border rounded-2xl shadow-2xl p-6 flex flex-col gap-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display text-white">New project</h2>
              <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Project name
              </label>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
                className="w-full bg-surface border border-border rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/60 transition-colors"
                placeholder="Untitled"
                maxLength={100}
              />
            </div>

            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleCreate} disabled={loading}>
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const { user } = useUserStore();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabOption>('My projects');
  const [sortBy, setSortBy] = useState<SortOption>('Last opened');
  const [sortOpen, setSortOpen] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ── Fetch projects ──────────────────────────────────────────────────────────
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/projects');
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      setProjects(data);
    } catch {
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // ── Create project ──────────────────────────────────────────────────────────
  const handleCreate = async (name: string) => {
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      const project = await res.json();
      router.push(`/project/${project.id}`);
    } catch {
      toast.error('Failed to create project');
    }
  };

  // ── Delete project ──────────────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== id));
    try {
      const res = await fetch(`/api/projects/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('Project deleted');
    } catch {
      toast.error('Failed to delete project');
      fetchProjects(); // re-sync
    }
  };

  // ── Rename project ──────────────────────────────────────────────────────────
  const handleRename = async (id: string, name: string) => {
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)));
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
    } catch {
      toast.error('Failed to rename project');
      fetchProjects();
    }
  };

  // ── Sort & filter ───────────────────────────────────────────────────────────
  const sortedProjects = [...projects]
    .filter((p) =>
      searchQuery ? p.name.toLowerCase().includes(searchQuery.toLowerCase()) : true
    )
    .sort((a, b) => {
      if (sortBy === 'Last opened' || sortBy === 'Last created') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      return a.name.localeCompare(b.name);
    });

  const tabs: TabOption[] = ['My projects', 'Shared by me', 'Shared with me', 'Featured projects'];
  const sortOptions: SortOption[] = ['Last opened', 'Last created', 'Alphabetically'];

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* ── Sidebar ── */}
      <aside className="w-[220px] shrink-0 border-r border-border bg-background flex flex-col h-full">
        {/* Logo */}
        <div className="p-4 border-b border-border/50">
          <Link href="/" className="flex items-center gap-2 group mb-4">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center group-hover:scale-105 transition-transform">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-display font-bold text-base text-white">Recraft SaaS</span>
          </Link>
          <Button
            className="w-full rounded-xl font-bold text-sm h-9 gap-2 shadow-[0_0_20px_-5px_rgba(124,58,237,0.4)]"
            onClick={() => setShowNewModal(true)}
          >
            <Plus className="w-4 h-4" />
            Create new project
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto p-3 flex flex-col gap-0.5">
          <SidebarItem
            icon={<FolderOpen className="w-4 h-4" />}
            label="Projects"
            active
            onClick={() => {}}
          />
          <SidebarItem
            icon={<Layers className="w-4 h-4" />}
            label="Editing templates"
            href="/projects"
          />
          <SidebarItem
            icon={<Globe className="w-4 h-4" />}
            label="Community"
            href="#"
          />
          <SidebarItem
            icon={<BookOpen className="w-4 h-4" />}
            label="Styles"
            href="/styles"
          />
          <SidebarItem
            icon={<Star className="w-4 h-4" />}
            label="Favorites"
            onClick={() => toast.info('Favorites coming soon')}
          />
          <SidebarItem
            icon={<History className="w-4 h-4" />}
            label="History"
            href="/history"
          />

          <div className="h-px bg-border my-2" />

          <SidebarItem
            icon={<UserCircle className="w-4 h-4" />}
            label="Profile"
            href="/account"
          />
          <SidebarItem
            icon={<Zap className="w-4 h-4" />}
            label="What's new"
            badge="NEW"
            onClick={() => toast.info("You're on the latest version")}
          />
        </nav>

        {/* Bottom */}
        <div className="p-3 border-t border-border flex flex-col gap-2">
          <Button
            variant="outline"
            className="w-full rounded-xl font-bold text-sm h-9 gap-2 border-primary/40 text-primary hover:bg-primary/10 hover:text-primary"
            onClick={() => router.push('/pricing')}
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

      {/* ── Main Content ── */}
      <main className="flex-1 overflow-hidden flex flex-col">
        {/* NEW MODEL Banner */}
        <AnimatePresence>
          {!bannerDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="relative mx-6 mt-5 rounded-2xl overflow-hidden bg-gradient-to-r from-primary/80 via-purple-600/70 to-secondary/60 border border-primary/30 flex items-center"
            >
              {/* BG texture */}
              <div className="absolute inset-0 opacity-10"
                style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, white 1px, transparent 1px)', backgroundSize: '24px 24px' }}
              />
              <div className="relative flex-1 p-6 sm:p-8">
                <div className="inline-flex items-center gap-2 bg-black/30 border border-white/20 rounded-full px-3 py-1 mb-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white">New Model</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-display font-black text-white leading-tight mb-2">
                  Finally, AI that understands design
                </h2>
                <p className="text-sm text-white/80 max-w-lg mb-4">
                  Meet V4, our most advanced image generation model. Deliberate aesthetic decisions, exceptional prompt understanding, and output quality that holds up at any size.
                </p>
                <Button variant="outline" size="sm" className="border-white/30 text-white hover:bg-white/10 rounded-full font-bold" asChild>
                  <Link href="/projects">Learn more</Link>
                </Button>
              </div>
              <div className="hidden sm:block relative w-48 lg:w-64 h-36 shrink-0 mr-4 rounded-xl overflow-hidden border border-white/10">
                {/* Placeholder art */}
                <div className="w-full h-full bg-gradient-to-br from-purple-900/80 to-black/60 flex items-center justify-center">
                  <Sparkles className="w-16 h-16 text-white/20" />
                </div>
              </div>
              <button
                onClick={() => setBannerDismissed(true)}
                className="absolute top-3 right-3 w-7 h-7 rounded-full bg-black/30 border border-white/20 flex items-center justify-center text-white/70 hover:text-white hover:bg-black/50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs + Sort + Search */}
        <div className="px-6 pt-4 pb-0 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            {/* Tabs */}
            <div className="flex items-center gap-1 flex-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={cn(
                    'px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center gap-1.5',
                    activeTab === tab
                      ? 'bg-white/10 text-white'
                      : 'text-muted-foreground hover:text-white hover:bg-white/5'
                  )}
                >
                  {tab}
                  {tab === 'Featured projects' && (
                    <span className="text-[9px] font-black uppercase tracking-wider bg-primary/20 text-primary border border-primary/30 px-1.5 py-0.5 rounded-full">
                      NEW
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search projects…"
                  className="pl-8 pr-3 py-1.5 text-sm bg-elevated border border-border rounded-lg text-white placeholder:text-muted-foreground/50 focus:outline-none focus:border-primary/50 transition-colors w-40 focus:w-52 transition-[width]"
                />
              </div>

              {/* Sort dropdown */}
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-elevated border border-border rounded-lg text-sm font-medium text-white hover:bg-elevated/80 transition-colors"
                >
                  <SortAsc className="w-3.5 h-3.5 text-muted-foreground" />
                  {sortBy}
                  <ChevronDown className={cn('w-3.5 h-3.5 text-muted-foreground transition-transform', sortOpen && 'rotate-180')} />
                </button>

                <AnimatePresence>
                  {sortOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -8 }}
                        transition={{ duration: 0.12 }}
                        className="absolute right-0 top-full mt-1.5 z-40 w-44 bg-elevated border border-border rounded-xl shadow-xl p-1 overflow-hidden"
                      >
                        {sortOptions.map((opt) => (
                          <button
                            key={opt}
                            onClick={() => { setSortBy(opt); setSortOpen(false); }}
                            className="flex items-center justify-between w-full px-3 py-2 text-sm text-white hover:bg-white/5 rounded-lg transition-colors"
                          >
                            {opt}
                            {sortBy === opt && <ChevronRight className="w-3.5 h-3.5 text-primary" />}
                          </button>
                        ))}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab !== 'My projects' ? (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-elevated border border-border flex items-center justify-center">
                <Users className="w-6 h-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-white">
                {activeTab === 'Featured projects' ? 'Featured projects coming soon' : 'Nothing shared yet'}
              </p>
              <p className="text-xs text-muted-foreground max-w-xs">
                {activeTab === 'Featured projects'
                  ? 'We\'re curating the best community projects. Check back soon.'
                  : 'Projects you share or receive from collaborators will appear here.'}
              </p>
            </div>
          ) : loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <motion.div
              layout
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4"
            >
              {/* Create card always first */}
              <CreateCard onClick={() => setShowNewModal(true)} />

              <AnimatePresence>
                {sortedProjects.length === 0 && !searchQuery ? (
                  /* Empty state shown inline */
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="col-span-full flex flex-col items-center justify-center py-16 gap-3 text-center"
                  >
                    <p className="text-sm text-muted-foreground">No projects yet. Create your first one!</p>
                  </motion.div>
                ) : (
                  sortedProjects.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      onDelete={handleDelete}
                      onRename={handleRename}
                    />
                  ))
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </main>

      {/* New Project Modal */}
      <NewProjectModal
        isOpen={showNewModal}
        onClose={() => setShowNewModal(false)}
        onCreate={handleCreate}
      />
    </div>
  );
}
