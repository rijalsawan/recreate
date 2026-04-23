import React from 'react';
import Nav from '@/components/landing/Nav';
import Footer from '@/components/landing/Footer';
import { SmoothScrollProvider } from '@/providers/SmoothScrollProvider';

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <SmoothScrollProvider>
      <div className="min-h-screen flex flex-col bg-[#080810]">
        <Nav />
        <main className="flex-1">{children}</main>
        <Footer />
      </div>
    </SmoothScrollProvider>
  );
}
