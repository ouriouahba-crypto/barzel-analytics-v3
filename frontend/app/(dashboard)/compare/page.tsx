'use client';

import { useEffect, useState } from 'react';
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
  ResponsiveContainer, Legend, Tooltip,
} from 'recharts';

import { useAppStore } from '@/lib/store';
import { getCompare, getScore } from '@/lib/api';
import type { CompareItem, BarzelDistrictScore } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────

const DISTRICT_COLORS: Record<string, string> = {
  'Dubai Marina':   '#1E5FA8',
  'JVC':            '#1A7A4A',
  'Business Bay':   '#C9A84C',
  'Downtown Dubai': '#6B3FA0',
  'Palm Jumeirah':  '#C0392B',
  'DIFC':           '#2E86D4',
  'Dubai Hills':    '#E67E22',
  'Al Barsha':      '#7A90A8',
  'Jumeirah':       '#0A1628',
};

function distColor(d: string) { return DISTRICT_COLORS[d] ?? '#3D5470'; }

// ─── Metric definitions ───────────────────────────────────────────────────────

interface MetricDef {
  key: keyof CompareItem;
  label_fr: string;
  label_en: string;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const METRICS: MetricDef[] = [
  { key: 'median_price_sqm',    label_fr: 'Médiane AED/sqm',   label_en: 'Median AED/sqm',    format: (v) => `${Math.round(v).toLocaleString('en-US')}`,  higherIsBetter: false },
  { key: 'median_dom',          label_fr: 'DOM médian',         label_en: 'Median DOM',         format: (v) => `${Math.round(v)}d`,                         higherIsBetter: false },
  { key: 'fast_sale_60d_pct',   label_fr: 'Fast-sale ≤60j',    label_en: 'Fast-sale ≤60d',    format: (v) => `${v.toFixed(1)}%`,                          higherIsBetter: true  },
  { key: 'median_net_yield',    label_fr: 'Yield net',          label_en: 'Net yield',          format: (v) => `${v.toFixed(2)}%`,                          higherIsBetter: true  },
  { key: 'median_gross_yield',  label_fr: 'Yield brut',         label_en: 'Gross yield',        format: (v) => `${v.toFixed(2)}%`,                          higherIsBetter: true  },
  { key: 'median_service_charge',label_fr: 'Service charge',    label_en: 'Service charge',     format: (v) => `${v.toFixed(0)} AED/sqm/yr`,                higherIsBetter: false },
  { key: 'median_vacancy_days', label_fr: 'Vacancy estimée',    label_en: 'Est. vacancy',       format: (v) => `${Math.round(v)}d`,                         higherIsBetter: false },
  { key: 'n_listings',          label_fr: 'Nb annonces',        label_en: 'Listings',           format: (v) => `${Math.round(v).toLocaleString('en-US')}`,  higherIsBetter: true  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(total: number) {
  if (total >= 65) return '#1A7A4A';
  if (total >= 40) return '#C9A84C';
  return '#C0392B';
}

function Skel({ w, h, radius = 6 }: { w: string | number; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #EEF1F6 25%, #E2E8F0 50%, #EEF1F6 75%)',
    }} />
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: 8,
      border: '1px solid #D8E2EE',
      boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    title: 'Compare Markets', subtitle: 'Analyse comparative des districts sélectionnés',
    minDistricts: 'Sélectionnez au moins 2 districts pour comparer',
    minSub: 'Utilisez la barre supérieure pour ajouter des marchés',
    table: 'Tableau comparatif', radar: 'Profil Barzel Score',
    ranking: 'Classement', pillars: { liquidity: 'Liquidité', yield: 'Rendement', risk: 'Stabilité', trend: 'Tendance' },
    best: 'Meilleur', rank: 'Rang',
  },
  en: {
    title: 'Compare Markets', subtitle: 'Side-by-side district analysis',
    minDistricts: 'Select at least 2 districts to compare',
    minSub: 'Use the top bar to add markets',
    table: 'Comparison table', radar: 'Barzel Score Profile',
    ranking: 'Ranking', pillars: { liquidity: 'Liquidity', yield: 'Yield', risk: 'Stability', trend: 'Trend' },
    best: 'Best', rank: 'Rank',
  },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ComparePage() {
  const { selectedDistricts, language } = useAppStore();
  const t = T[language];

  const [compareData, setCompareData] = useState<CompareItem[]>([]);
  const [scores,      setScores]      = useState<BarzelDistrictScore[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (selectedDistricts.length < 2) {
      setCompareData([]); setScores([]);
      return;
    }
    setLoading(true); setError(null);
    Promise.all([getCompare(selectedDistricts), getScore(selectedDistricts)])
      .then(([cmp, sc]) => {
        setCompareData(cmp.data);
        setScores(sc.by_district);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDistricts]);

  // ── Guard states ────────────────────────────────────────────────────────────
  if (selectedDistricts.length < 2) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#C9A84C', fontSize: 22, fontWeight: 700 }}>≈</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0A1628' }}>{t.minDistricts}</p>
        <p style={{ fontSize: 13, color: '#7A90A8' }}>{t.minSub}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: 32 }}>
        <div style={{ background: '#FDEDED', border: '1px solid #C0392B', borderRadius: 8, padding: '14px 18px' }}>
          <p style={{ fontSize: 13, color: '#C0392B' }}>Error: {error}</p>
        </div>
      </div>
    );
  }

  // ── Derived data ─────────────────────────────────────────────────────────────

  // Map district → compare item for quick lookup
  const byDistrict = new Map(compareData.map((d) => [d.district, d]));

  // Scores sorted descending
  const sortedScores = [...scores].sort((a, b) => b.total - a.total);

  // Radar data: one entry per pillar, value for each district
  const radarData = [
    { pillar: t.pillars.liquidity, key: 'liquidity' as const },
    { pillar: t.pillars.yield,     key: 'yield'     as const },
    { pillar: t.pillars.risk,      key: 'risk'      as const },
    { pillar: t.pillars.trend,     key: 'trend'     as const },
  ].map(({ pillar, key }) => {
    const row: Record<string, string | number> = { pillar };
    for (const sc of scores) row[sc.district] = parseFloat((sc[key] * 4).toFixed(1)); // scale 0-25 → 0-100
    return row;
  });

  // For each metric, find best district value
  function getBest(metric: MetricDef): number | null {
    if (compareData.length === 0) return null;
    const vals = compareData.map((d) => d[metric.key] as number).filter((v) => typeof v === 'number');
    return metric.higherIsBetter ? Math.max(...vals) : Math.min(...vals);
  }

  return (
    <div style={{ padding: '32px', background: '#F4F6F9', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: '#0A1628', marginBottom: '6px' }}>
          {t.title}
        </h1>
        <p style={{ fontSize: '13px', color: '#7A90A8' }}>{t.subtitle} · {selectedDistricts.length} districts</p>
        <div style={{ width: '40px', height: '2px', background: '#C9A84C', marginTop: '10px' }} />
      </div>

      {/* ── Section 1: Comparison table ───────────────────────────────────── */}
      <Card style={{ marginBottom: 24, overflow: 'hidden' }}>
        <div style={{ padding: '20px 24px 0' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 16 }}>{t.table}</div>
        </div>

        {loading ? (
          <div style={{ padding: '0 24px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[...Array(9)].map((_, i) => <Skel key={i} w="100%" h={40} />)}
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              {/* Header */}
              <thead>
                <tr>
                  <th style={{
                    background: '#0A1628', color: '#FFFFFF', padding: '12px 16px',
                    textAlign: 'left', fontSize: 11, fontWeight: 600,
                    letterSpacing: '1.5px', textTransform: 'uppercase',
                    position: 'sticky', left: 0, zIndex: 1,
                    border: '1px solid rgba(255,255,255,0.08)',
                    minWidth: 160,
                  }}>
                    Metric
                  </th>
                  {selectedDistricts.map((d) => (
                    <th key={d} style={{
                      background: '#0A1628', color: '#FFFFFF', padding: '12px 16px',
                      textAlign: 'center', fontSize: 11, fontWeight: 600,
                      letterSpacing: '1px', border: '1px solid rgba(255,255,255,0.08)',
                      minWidth: 140, whiteSpace: 'nowrap',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: distColor(d) }} />
                        {d}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {METRICS.map((metric, rowIdx) => {
                  const best = getBest(metric);
                  const label = language === 'fr' ? metric.label_fr : metric.label_en;
                  return (
                    <tr key={metric.key}>
                      {/* Metric name */}
                      <td style={{
                        padding: '12px 16px', fontSize: 12, fontWeight: 500,
                        color: '#3D5470', background: '#F4F6F9',
                        border: '1px solid #D8E2EE',
                        position: 'sticky', left: 0, zIndex: 1,
                      }}>
                        {label}
                      </td>

                      {/* District values */}
                      {selectedDistricts.map((d) => {
                        const item = byDistrict.get(d);
                        const raw = item ? (item[metric.key] as number) : null;
                        const isBest = raw !== null && raw === best;
                        return (
                          <td key={d} style={{
                            padding: '12px 16px', textAlign: 'center',
                            background: isBest ? '#E8F5EE' : rowIdx % 2 === 0 ? '#FFFFFF' : '#F4F6F9',
                            color: isBest ? '#1A7A4A' : '#0A1628',
                            fontWeight: isBest ? 700 : 500,
                            border: '1px solid #D8E2EE',
                            fontSize: 12,
                          }}>
                            {raw !== null ? metric.format(raw) : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}

                {/* Barzel Score row */}
                {(() => {
                  const scoreMap = new Map(scores.map((s) => [s.district, s]));
                  const scoreVals = scores.map((s) => s.total);
                  const bestScore = scoreVals.length ? Math.max(...scoreVals) : null;
                  return (
                    <tr style={{ background: '#0A1628' }}>
                      <td style={{
                        padding: '12px 16px', fontSize: 11, fontWeight: 700,
                        color: '#C9A84C', letterSpacing: '1.5px', textTransform: 'uppercase',
                        border: '1px solid rgba(255,255,255,0.08)',
                        position: 'sticky', left: 0, background: '#0A1628', zIndex: 1,
                      }}>
                        Barzel Score
                      </td>
                      {selectedDistricts.map((d) => {
                        const sc = scoreMap.get(d);
                        const isBest = sc && sc.total === bestScore;
                        return (
                          <td key={d} style={{
                            padding: '12px 16px', textAlign: 'center',
                            background: isBest ? 'rgba(201,168,76,0.15)' : 'transparent',
                            color: sc ? scoreColor(sc.total) : '#7A90A8',
                            fontWeight: 700, fontSize: 14,
                            border: '1px solid rgba(255,255,255,0.08)',
                          }}>
                            {sc ? `${sc.total.toFixed(1)} — ${sc.label}` : '—'}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Section 2 + 3 side by side ────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>

        {/* Radar chart */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>{t.radar}</div>
          <div style={{ fontSize: 11, color: '#7A90A8', marginBottom: 16 }}>Scores normalisés /100 · 4 piliers</div>
          <div style={{ height: 1, background: '#EEF1F6', marginBottom: 16 }} />

          {loading ? <Skel w="100%" h={260} /> : (
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#EEF1F6" />
                <PolarAngleAxis
                  dataKey="pillar"
                  tick={{ fill: '#7A90A8', fontSize: 11, fontWeight: 500 }}
                />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: 6, fontSize: 12 }}
                  formatter={(v: number) => [`${v.toFixed(1)}/100`]}
                />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v: string) => <span style={{ color: distColor(v) }}>{v}</span>}
                />
                {selectedDistricts.map((d) => (
                  <Radar
                    key={d} name={d} dataKey={d}
                    stroke={distColor(d)} fill={distColor(d)} fillOpacity={0.12}
                    strokeWidth={2}
                  />
                ))}
              </RadarChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Ranking cards */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 4 }}>{t.ranking}</div>
          <div style={{ fontSize: 11, color: '#7A90A8', marginBottom: 16 }}>{language === 'fr' ? 'Classé par Barzel Score total' : 'Ranked by total Barzel Score'}</div>
          <div style={{ height: 1, background: '#EEF1F6', marginBottom: 16 }} />

          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {selectedDistricts.map((_, i) => <Skel key={i} w="100%" h={80} />)}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {sortedScores.map((sc, idx) => {
                const item = byDistrict.get(sc.district);
                const color = distColor(sc.district);
                const sColor = scoreColor(sc.total);
                return (
                  <div key={sc.district} style={{
                    borderTop: `3px solid ${color}`,
                    borderRadius: '0 0 6px 6px',
                    border: `1px solid #D8E2EE`,
                    borderTopColor: color,
                    borderTopWidth: 3,
                    padding: '14px 16px',
                    background: '#FAFBFC',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 14,
                  }}>
                    {/* Rank badge */}
                    <div style={{
                      width: 28, height: 28, borderRadius: 4,
                      background: '#0A1628', color: '#FFFFFF',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}>
                      #{idx + 1}
                    </div>

                    {/* District name + score */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#0A1628', marginBottom: 2 }}>
                        {sc.district}
                      </div>
                      <div style={{ fontSize: 10, color: '#7A90A8' }}>{sc.label}</div>
                    </div>

                    {/* Score + 3 mini KPIs */}
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: 28, fontWeight: 600, color: sColor, lineHeight: 1 }}>
                        {sc.total.toFixed(0)}
                      </div>
                      {item && (
                        <div style={{ marginTop: 6, display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                          {[
                            { label: 'Price', v: `${Math.round(item.median_price_sqm / 1000)}k` },
                            { label: 'DOM',   v: `${Math.round(item.median_dom)}d` },
                            { label: 'Yield', v: `${item.median_net_yield.toFixed(1)}%` },
                          ].map(({ label, v }) => (
                            <div key={label} style={{ textAlign: 'center' }}>
                              <div style={{ fontSize: 9, color: '#7A90A8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#0A1628' }}>{v}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
