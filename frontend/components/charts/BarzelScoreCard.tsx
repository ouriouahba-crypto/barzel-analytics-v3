'use client';

import { cn } from '@/lib/utils';
import type { BarzelPillar } from '@/lib/types';

interface BarzelScoreCardProps {
  score: BarzelPillar & { districts?: string[] };
  title?: string;
  loading?: boolean;
  className?: string;
  language?: 'fr' | 'en';
}

const PILLARS = [
  { key: 'liquidity' as const, label_fr: 'Liquidité',  label_en: 'Liquidity', color: '#3B82F6', max: 25 },
  { key: 'yield'     as const, label_fr: 'Rendement',  label_en: 'Yield',     color: '#10B981', max: 25 },
  { key: 'risk'      as const, label_fr: 'Stabilité',  label_en: 'Stability', color: '#F59E0B', max: 25 },
  { key: 'trend'     as const, label_fr: 'Tendance',   label_en: 'Trend',     color: '#8B5CF6', max: 25 },
];

function scoreColor(total: number): string {
  if (total >= 65) return '#10B981';
  if (total >= 40) return '#F59E0B';
  return '#EF4444';
}

function labelColor(label: string): string {
  switch (label) {
    case 'Strong Buy': return '#10B981';
    case 'Buy':        return '#34D399';
    case 'Neutral':    return '#F59E0B';
    case 'Sell':       return '#F87171';
    case 'Strong Sell':return '#EF4444';
    default:           return '#9A9AAA';
  }
}

const LABEL_FR: Record<string, string> = {
  'Strong Buy':  'Très haussier',
  'Buy':         'Haussier',
  'Neutral':     'Neutre',
  'Sell':        'Baissier',
  'Strong Sell': 'Très baissier',
};

export function BarzelScoreCard({
  score,
  title,
  loading = false,
  className,
  language = 'fr',
}: BarzelScoreCardProps) {
  if (loading) {
    return (
      <div
        className={cn('rounded-lg p-5 flex flex-col gap-4', className)}
        style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
      >
        <div className="h-4 w-32 rounded animate-pulse" style={{ background: '#252538' }} />
        <div className="flex items-center justify-center h-24">
          <div className="h-20 w-20 rounded-full animate-pulse" style={{ background: '#252538' }} />
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-4 rounded animate-pulse" style={{ background: '#252538' }} />
        ))}
      </div>
    );
  }

  const color = scoreColor(score.total);
  const displayLabel = language === 'fr'
    ? (LABEL_FR[score.label] ?? score.label)
    : score.label;

  return (
    <div
      className={cn('rounded-lg p-5 flex flex-col gap-5', className)}
      style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
    >
      {title && (
        <p className="text-sm font-semibold text-white">{title}</p>
      )}

      {/* Total score ring */}
      <div className="flex flex-col items-center gap-2">
        <div
          className="w-24 h-24 rounded-full flex flex-col items-center justify-center"
          style={{
            border: `4px solid ${color}`,
            boxShadow: `0 0 24px ${color}33`,
          }}
        >
          <span className="text-3xl font-bold" style={{ color }}>
            {score.total.toFixed(0)}
          </span>
          <span className="text-xs" style={{ color: '#9A9AAA' }}>/100</span>
        </div>
        <span
          className="text-sm font-semibold px-3 py-0.5 rounded-full"
          style={{ background: `${labelColor(score.label)}22`, color: labelColor(score.label) }}
        >
          {displayLabel}
        </span>
      </div>

      {/* Pillar bars */}
      <div className="flex flex-col gap-3">
        {PILLARS.map(({ key, label_fr, label_en, color: pColor, max }) => {
          const val = score[key];
          const pct = (val / max) * 100;
          return (
            <div key={key}>
              <div className="flex justify-between items-center mb-1">
                <span className="text-xs font-medium" style={{ color: '#9A9AAA' }}>
                  {language === 'fr' ? label_fr : label_en}
                </span>
                <span className="text-xs font-semibold" style={{ color: pColor }}>
                  {val.toFixed(1)}<span style={{ color: '#9A9AAA' }}>/{max}</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#252538' }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, background: pColor }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
