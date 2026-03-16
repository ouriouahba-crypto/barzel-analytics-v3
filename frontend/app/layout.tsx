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
      <body style={{ margin: 0, padding: 0, background: '#0D0D0D' }}>
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

          {/* Sidebar fixe à gauche */}
          <Sidebar />

          {/* Colonne droite : TopBar + contenu scrollable */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            minWidth: 0,
          }}>
            <TopBar />

            <main style={{
              flex: 1,
              overflow: 'auto',
              background: '#0D0D0D',
            }}>
              {children}
            </main>
          </div>

        </div>
      </body>
    </html>
  );
}
