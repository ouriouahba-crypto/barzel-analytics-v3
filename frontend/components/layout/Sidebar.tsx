'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  GitCompare,
  Map,
  TrendingUp,
  Droplets,
  PiggyBank,
  Calculator,
  Star,
  FileText,
  Brain,
  Bot,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/executive', label: 'Executive', icon: LayoutDashboard },
  { href: '/compare', label: 'Compare', icon: GitCompare },
  { href: '/map', label: 'Map', icon: Map },
  { href: '/pricing', label: 'Pricing', icon: TrendingUp },
  { href: '/liquidity', label: 'Liquidity', icon: Droplets },
  { href: '/yield', label: 'Yield', icon: PiggyBank },
  { href: '/costs', label: 'Costs', icon: Calculator },
  { href: '/quality', label: 'Quality', icon: Star },
  { href: '/pdf-memo', label: 'PDF Memo', icon: FileText },
  { href: '/predictive', label: 'Predictive', icon: Brain },
  { href: '/ai-analyst', label: 'AI Analyst', icon: Bot },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: '220px',
      minWidth: '220px',
      height: '100vh',
      background: '#0D0D0D',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      borderRight: '1px solid #2E2E42',
    }}>
      {/* Logo */}
      <div className="px-4 py-5 border-b" style={{ borderColor: '#2E2E42' }}>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-md flex items-center justify-center"
            style={{ background: '#C9A84C' }}>
            <span className="text-black font-bold text-xs">B</span>
          </div>
          <div>
            <p className="font-semibold text-sm text-white leading-none">Barzel</p>
            <p className="text-xs leading-none mt-0.5" style={{ color: '#C9A84C' }}>Analytics</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 overflow-y-auto">
        <p className="px-2 mb-2 text-xs font-medium uppercase tracking-wider"
          style={{ color: '#9A9AAA' }}>
          Modules
        </p>
        <ul className="space-y-0.5">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'text-black'
                      : 'hover:bg-white/5'
                  )}
                  style={isActive
                    ? { background: '#C9A84C', color: '#000' }
                    : { color: '#9A9AAA' }
                  }
                >
                  <Icon size={16} className={isActive ? 'text-black' : ''} />
                  <span>{label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="px-4 py-3 border-t text-xs" style={{ borderColor: '#2E2E42', color: '#9A9AAA' }}>
        v3.0.0
      </div>
    </aside>
  );
}
