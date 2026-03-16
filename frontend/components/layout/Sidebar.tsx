'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_GROUPS = [
  {
    label: 'Core Modules',
    items: [
      { href: '/executive', label: 'Executive' },
      { href: '/compare',   label: 'Compare'   },
      { href: '/map',       label: 'Map'        },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { href: '/pricing',   label: 'Pricing'   },
      { href: '/liquidity', label: 'Liquidity' },
      { href: '/yield',     label: 'Yield'     },
      { href: '/costs',     label: 'Costs'     },
      { href: '/quality',   label: 'Quality'   },
    ],
  },
  {
    label: 'Tools',
    items: [
      { href: '/pdf-memo',    label: 'PDF Memo'   },
      { href: '/predictive',  label: 'Predictive' },
      { href: '/ai-analyst',  label: 'AI Analyst' },
    ],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: '#0A1628',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid rgba(255,255,255,0.06)',
    }}>

      {/* Header / Logo */}
      <div style={{ padding: '24px 20px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <rect x="4" y="10" width="8" height="14" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
            <rect x="16" y="6" width="8" height="18" fill="none" stroke="#C9A84C" strokeWidth="1.5"/>
            <line x1="2" y1="24" x2="26" y2="24" stroke="#C9A84C" strokeWidth="1.5"/>
            <polyline points="18,2 24,6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
            <polyline points="24,6 22,6" stroke="#C9A84C" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <div style={{ color: '#FFFFFF', fontSize: '13px', fontWeight: 700, letterSpacing: '1px' }}>
              BARZEL
            </div>
            <div style={{ color: '#C9A84C', fontSize: '9px', fontWeight: 500, letterSpacing: '2px', marginTop: '1px' }}>
              ANALYTICS
            </div>
          </div>
        </div>
        <div style={{ height: '1px', background: 'rgba(201,168,76,0.3)' }} />
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div style={{
              padding: '12px 20px 6px',
              fontSize: '9px',
              fontWeight: 600,
              letterSpacing: '2px',
              color: 'rgba(255,255,255,0.3)',
              textTransform: 'uppercase',
            }}>
              {group.label}
            </div>
            {group.items.map(({ href, label }) => {
              const isActive = pathname === href || pathname.startsWith(href + '/');
              return (
                <Link key={href} href={href} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '9px 20px',
                  cursor: 'pointer',
                  fontSize: '13px',
                  textDecoration: 'none',
                  transition: 'all 0.15s',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.6)',
                  background: isActive ? 'rgba(30,95,168,0.2)' : 'transparent',
                  borderLeft: isActive ? '3px solid #C9A84C' : '3px solid transparent',
                }}>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        fontSize: '10px',
        color: 'rgba(255,255,255,0.3)',
      }}>
        Dubai Market · v3.0
      </div>
    </aside>
  );
}
