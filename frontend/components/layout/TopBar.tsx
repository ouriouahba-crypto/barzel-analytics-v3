'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAppStore } from '@/lib/store';

const DEFAULT_SELECTED = ['Dubai Marina', 'JVC', 'Business Bay'];
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const PAGE_NAMES: Record<string, string> = {
  '/executive':  'Executive',
  '/compare':    'Compare',
  '/map':        'Map',
  '/pricing':    'Pricing',
  '/liquidity':  'Liquidity',
  '/yield':      'Yield',
  '/costs':      'Costs',
  '/quality':    'Quality',
  '/pdf-memo':   'PDF Memo',
  '/predictive': 'Predictive',
  '/ai-analyst': 'AI Analyst',
};

export function TopBar() {
  const pathname = usePathname();
  const pageName = PAGE_NAMES[pathname] ?? 'Dashboard';

  const {
    availableDistricts, setAvailableDistricts,
    selectedDistricts, setSelectedDistricts, toggleDistrict,
    language, setLanguage,
  } = useAppStore();

  useEffect(() => {
    fetch(`${BASE_URL}/api/analytics/districts`)
      .then((r) => r.json())
      .then((data: { available_districts: string[] }) => {
        const all = data.available_districts;
        setAvailableDistricts(all);
        const defaults = DEFAULT_SELECTED.filter((d) => all.includes(d));
        setSelectedDistricts(defaults.length ? defaults : all.slice(0, 3));
      })
      .catch(() => {
        const fallback = [
          'Al Barsha', 'Business Bay', 'DIFC', 'Downtown Dubai',
          'Dubai Hills', 'Dubai Marina', 'JVC', 'Jumeirah', 'Palm Jumeirah',
        ];
        setAvailableDistricts(fallback);
        setSelectedDistricts(DEFAULT_SELECTED);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <header style={{
      height: '56px',
      minHeight: '56px',
      width: '100%',
      background: '#FFFFFF',
      borderBottom: '1px solid #D8E2EE',
      boxShadow: '0 1px 3px rgba(10,22,40,0.06)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: '16px',
      overflow: 'hidden',
    }}>

      {/* Breadcrumb */}
      <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628', whiteSpace: 'nowrap', flexShrink: 0 }}>
        {pageName}
        <span style={{ color: '#7A90A8', fontWeight: 400, margin: '0 6px' }}>/</span>
        <span style={{ color: '#7A90A8', fontWeight: 400 }}>Dubai</span>
      </div>

      {/* Separator */}
      <div style={{ width: '1px', height: '20px', background: '#D8E2EE', flexShrink: 0 }} />

      {/* Markets label */}
      <span style={{
        fontSize: '9px', fontWeight: 600, letterSpacing: '2px',
        color: '#7A90A8', textTransform: 'uppercase', whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        Markets
      </span>

      {/* Chips scrollables */}
      <div style={{
        display: 'flex', gap: '6px', overflowX: 'auto', flex: 1,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      } as React.CSSProperties}>
        {availableDistricts.map((district) => {
          const isSelected = selectedDistricts.includes(district);
          return (
            <button
              key={district}
              onClick={() => toggleDistrict(district)}
              style={{
                padding: '5px 12px',
                borderRadius: '4px',
                fontSize: '12px',
                fontWeight: isSelected ? 600 : 500,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'all 0.15s',
                background: isSelected ? '#0A1628' : '#F4F6F9',
                color: isSelected ? '#FFFFFF' : '#3D5470',
                border: `1px solid ${isSelected ? '#0A1628' : '#D8E2EE'}`,
                outline: 'none',
              }}
            >
              {district}
            </button>
          );
        })}
      </div>

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0, whiteSpace: 'nowrap' }}>

        {/* Lang toggle */}
        <div style={{ display: 'flex', gap: '2px' }}>
          {(['FR', 'EN'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLanguage(l.toLowerCase() as 'fr' | 'en')}
              style={{
                padding: '4px 8px',
                fontSize: '11px',
                fontWeight: language === l.toLowerCase() ? 700 : 400,
                color: language === l.toLowerCase() ? '#0A1628' : '#7A90A8',
                background: 'none',
                borderRadius: '3px',
                outline: 'none',
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Export PDF */}
        <button
          onClick={() => window.location.assign('/pdf-memo')}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '7px 14px',
            background: '#0A1628', color: '#FFFFFF',
            borderRadius: '4px', fontSize: '12px', fontWeight: 500,
            outline: 'none',
          }}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
            <path d="M6.5 1v8M3 6.5l3.5 3.5 3.5-3.5M1 11h11" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Export PDF
        </button>
      </div>
    </header>
  );
}
