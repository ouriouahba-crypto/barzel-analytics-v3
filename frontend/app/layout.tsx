import type { Metadata } from 'next';
import './globals.css';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';

export const metadata: Metadata = {
  title: 'Barzel Analytics V3',
  description: 'Professional Real Estate Market Intelligence',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Sidebar />
        <TopBar />
        <main
          className="ml-56 pt-14 min-h-screen"
          style={{ background: '#0D0D0D' }}
        >
          {children}
        </main>
      </body>
    </html>
  );
}
