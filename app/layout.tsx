import type { Metadata } from 'next';
import { Inter, Syne, Plus_Jakarta_Sans, Space_Mono } from 'next/font/google';
import { Toaster } from 'sonner';
import { AuthModal } from '@/components/auth/AuthModal';
import { SessionProvider } from '@/components/providers/SessionProvider';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const syne = Syne({ subsets: ['latin'], variable: '--font-syne', weight: ['400', '600', '700', '800'] });
const plusJakarta = Plus_Jakarta_Sans({ subsets: ['latin'], variable: '--font-plus-jakarta', weight: ['400', '500', '600', '700', '800'] });
const spaceMono = Space_Mono({ subsets: ['latin'], variable: '--font-space-mono', weight: ['400', '700'] });

export const metadata: Metadata = {
  title: 'Recraft SaaS — AI Image Suite',
  description: 'Generate, edit, vectorize, and upscale AI images with 15 professional tools.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${syne.variable} ${plusJakarta.variable} ${spaceMono.variable} font-sans bg-background text-foreground antialiased`}>
        <SessionProvider>
          {children}
          <AuthModal />
          <Toaster richColors theme="dark" position="bottom-right" />
        </SessionProvider>
      </body>
    </html>
  );
}
