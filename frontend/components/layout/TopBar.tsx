'use client';

import { X } from 'lucide-react';
import { useAppStore } from '@/lib/store';

export function TopBar() {
  const { selectedDistricts, toggleDistrict, language, setLanguage } = useAppStore();

  return (
    <header className="fixed top-0 left-56 right-0 h-14 flex items-center justify-between px-6 border-b z-10"
      style={{ background: '#1A1A2E', borderColor: '#2E2E42' }}>
      {/* Selected Districts */}
      <div className="flex items-center gap-2 flex-1 min-w-0">
        {selectedDistricts.length === 0 ? (
          <span className="text-sm" style={{ color: '#9A9AAA' }}>
            No districts selected — select districts to begin analysis
          </span>
        ) : (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium" style={{ color: '#9A9AAA' }}>Districts:</span>
            {selectedDistricts.map((district) => (
              <span
                key={district}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium"
                style={{ background: '#252538', color: '#C9A84C', border: '1px solid #2E2E42' }}
              >
                {district}
                <button
                  onClick={() => toggleDistrict(district)}
                  className="hover:text-white transition-colors ml-0.5"
                >
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right side */}
      <div className="flex items-center gap-4 ml-4">
        {/* Language toggle */}
        <div className="flex items-center rounded-md overflow-hidden border"
          style={{ borderColor: '#2E2E42' }}>
          {(['fr', 'en'] as const).map((lang) => (
            <button
              key={lang}
              onClick={() => setLanguage(lang)}
              className="px-3 py-1 text-xs font-medium transition-all"
              style={language === lang
                ? { background: '#C9A84C', color: '#000' }
                : { background: 'transparent', color: '#9A9AAA' }
              }
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Logo text */}
        <span className="text-sm font-semibold" style={{ color: '#C9A84C' }}>
          Barzel Analytics
        </span>
      </div>
    </header>
  );
}
