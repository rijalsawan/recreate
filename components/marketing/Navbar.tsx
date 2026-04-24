"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { LogOut } from 'lucide-react';
import { useAuthModal } from '@/stores/useAuthModal';
import { useSession, signOut } from 'next-auth/react';

export const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const { openModal } = useAuthModal();
  const { data: session, status } = useSession();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isLoggedIn = status === 'authenticated' && session?.user;

  return (
    <nav className={cn(
      "fixed top-0 w-full z-50 transition-all duration-300 border-b border-transparent",
      scrolled ? "bg-background/80 backdrop-blur-md border-border/50 py-3" : "bg-transparent py-5"
    )}>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 flex items-center justify-between">
        <Link href="/" className="group">
          <span className="font-display font-black uppercase tracking-[0.16em] text-lg text-white group-hover:text-white/85 transition-colors">RECREATE</span>
        </Link>
        
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <Link href="#features" className="hover:text-white transition-colors">Features</Link>
          <Link href="#tools" className="hover:text-white transition-colors">Tools</Link>
          <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-8 h-8 rounded-full overflow-hidden border border-white/10">
                  {session.user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={session.user.image} alt={session.user.name ?? 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-primary font-bold text-xs uppercase">
                      {session.user.name?.[0] ?? 'U'}
                    </div>
                  )}
                </div>
                <span className="text-sm font-medium text-white">{session.user.name?.split(' ')[0]}</span>
              </div>
              <Button asChild className="rounded-full font-bold px-6 shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
                <Link href="/projects">My Projects</Link>
              </Button>
              <button
                onClick={() => signOut({ callbackUrl: '/' })}
                className="text-sm font-medium text-muted-foreground hover:text-white transition-colors hidden sm:flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </>
          ) : (
            <>
              <button onClick={() => openModal('login')} className="text-sm font-medium text-white hover:text-primary transition-colors hidden sm:block">
                Sign In
              </button>
              <Button onClick={() => openModal('signup')} className="rounded-full font-bold px-6 shadow-[0_0_20px_-5px_rgba(124,58,237,0.5)]">
                Start for Free
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};
