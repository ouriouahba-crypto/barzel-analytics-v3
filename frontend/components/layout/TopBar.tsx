'use client';

import { useEffect } from 'react';
import { FileText } from 'lucide-react';
import { useAppStore } from '@/lib/store';

const DEFAULT_SELECTED = ['Dubai Marina', 'JVC', 'Business Bay'];
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export function TopBar() {
  const {
    availableDistricts, setAvailableDistricts,
    selectedDistricts, setSelectedDistricts, toggleDistrict,
    language, setLanguage,
  } = useAppStore();

  // Fetch available districts once on mount
  useEffect(() => {
    fetch(`${BASE_URL}/api/analytics/districts`)
      .then((r) => r.json())
      .then((data: { available_districts: string[] }) => {
        const all = data.available_districts;
        setAvailableDistricts(all);
        // Pre-select first 3 defaults that exist in the dataset
        const defaults = DEFAULT_SELECTED.filter((d) => all.includes(d));
        setSelectedDistricts(defaults.length ? defaults : all.slice(0, 3));
      })
      .catch(() => {
        // Fallback: use hardcoded list if backend unreachable
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
      background: '#1A1A2E',
      borderBottom: '1px solid #2E2E42',
      display: 'flex',
      alignItems: 'center',
      padding: '0 20px',
      gap: '16px',
      overflow: 'hidden',
    }}>
      {/* Label */}
      <span className="text-xs font-medium shrink-0" style={{ color: '#9A9AAA' }}>
        Markets:
      </span>

      {/* Scrollable chip row */}
      <div className="flex items-center gap-2 overflow-x-auto flex-1 min-w-0 scrollbar-none">
        {availableDistricts.map((district) => {
          const active = selectedDistricts.includes(district);
          return (
            <button
              key={district}
              onClick={() => toggleDistrict(district)}
              className="shrink-0 transition-all duration-150 hover:opacity-80 active:scale-95"
              style={{
                padding: '5px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: active ? 600 : 400,
                background: active ? '#C9A84C' : '#0D0D0D',
                color: active ? '#0D0D0D' : '#9A9AAA',
                border: `1px solid ${active ? '#C9A84C' : '#2E2E42'}`,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {district}
            </button>
          );
        })}
      </div>

      {/* Separator */}
      <div className="w-px h-6 shrink-0" style={{ background: '#2E2E42' }} />

      {/* Language toggle */}
      <div
        className="flex items-center rounded-md overflow-hidden border shrink-0"
        style={{ borderColor: '#2E2E42' }}
      >
        {(['fr', 'en'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className="px-3 py-1 text-xs font-medium transition-all"
            style={
              language === lang
                ? { background: '#C9A84C', color: '#000' }
                : { background: 'transparent', color: '#9A9AAA' }
            }
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>

      {/* PDF button */}
      <button
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium shrink-0 transition-all hover:opacity-80"
        style={{ background: '#252538', color: '#C9A84C', border: '1px solid #2E2E42' }}
        onClick={() => window.location.assign('/pdf-memo')}
      >
        <FileText size={13} />
        PDF
      </button>
    </header>
  );
}
