'use client';

import { cn } from '@/lib/utils';

interface KPICardProps {
  label: string;
  value: string;
  subValue?: string;
  delta?: number | null;   // positive = good, negative = bad (direction depends on metric)
  deltaLabel?: string;
  deltaInvert?: boolean;   // true = lower is better (e.g. DOM, CV)
  loading?: boolean;
  unit?: string;
  className?: string;
}

export function KPICard({
  label,
  value,
  subValue,
  delta,
  deltaLabel,
  deltaInvert = false,
  loading = false,
  className,
}: KPICardProps) {
  const isPositive = delta !== null && delta !== undefined
    ? deltaInvert ? delta < 0 : delta > 0
    : null;

  const deltaColor =
    isPositive === true  ? '#10B981' :
    isPositive === false ? '#EF4444' :
    '#9A9AAA';

  if (loading) {
    return (
      <div
        className={cn('rounded-lg p-4 flex flex-col gap-2', className)}
        style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
      >
        <div className="h-3 w-20 rounded animate-pulse" style={{ background: '#252538' }} />
        <div className="h-8 w-32 rounded animate-pulse" style={{ background: '#252538' }} />
        <div className="h-3 w-24 rounded animate-pulse" style={{ background: '#252538' }} />
      </div>
    );
  }

  return (
    <div
      className={cn('rounded-lg p-4 flex flex-col gap-1', className)}
      style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
    >
      <p className="text-xs font-medium uppercase tracking-wider" style={{ color: '#9A9AAA' }}>
        {label}
      </p>

      <p className="text-3xl font-bold text-white leading-none mt-1">
        {value}
      </p>

      {subValue && (
        <p className="text-sm" style={{ color: '#9A9AAA' }}>
          {subValue}
        </p>
      )}

      {delta !== null && delta !== undefined && (
        <p className="text-xs font-medium mt-1" style={{ color: deltaColor }}>
          {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'}{' '}
          {Math.abs(delta).toFixed(1)}
          {deltaLabel ? ` ${deltaLabel}` : ''}
          <span style={{ color: '#9A9AAA' }}> vs market</span>
        </p>
      )}
    </div>
  );
}
