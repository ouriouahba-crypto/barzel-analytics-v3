'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getPriceDistribution, getPriceScatter, getTimeseries, getInsights } from '@/lib/api';
import type { PriceBucket, PriceScatterPoint, TimeseriesPoint } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  ScatterChart, Scatter,
  LineChart, Line,
  CartesianGrid,
} from 'recharts';

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

function dc(district: string): string {
  return DISTRICT_COLORS[district] ?? '#1E5FA8';
}

function median(arr: number[]): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function percentile(arr: number[], p: number): number {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (s.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  return s[lo] + (s[hi] - s[lo]) * (idx - lo);
}

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D8E2EE',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
  padding: '20px 24px',
};

function InsightBox({ color, title, children }: { color: 'blue' | 'gold' | 'green'; title: string; children: React.ReactNode }) {
  const configs = {
    blue:  { bg: '#E8F1FA', border: '#1E5FA8', titleColor: '#1E5FA8', icon: '📊' },
    gold:  { bg: '#F5EDD6', border: '#C9A84C', titleColor: '#8B7A3A', icon: '💡' },
    green: { bg: '#E8F5EE', border: '#1A7A4A', titleColor: '#1A7A4A', icon: '✅' },
  };
  const c = configs[color];
  return (
    <div style={{
      background: c.bg, borderLeft: `3px solid ${c.border}`,
      borderRadius: '0 8px 8px 0', padding: '12px 16px', marginBottom: 20,
    }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: c.titleColor, marginBottom: 4 }}>
        {c.icon} {title}
      </div>
      <div style={{ fontSize: 12, color: '#3D5470', lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: '#7A90A8', marginBottom: '12px' }}>{subtitle}</div>
      <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '16px' }} />
    </>
  );
}

const tooltipStyle = {
  contentStyle: { background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' },
};

export default function PricingPage() {
  const { selectedDistricts, language } = useAppStore();

  const [distBuckets, setDistBuckets] = useState<PriceBucket[]>([]);
  const [scatter, setScatter]         = useState<PriceScatterPoint[]>([]);
  const [timeseries, setTimeseries]   = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [insights, setInsights]       = useState<any>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      getPriceDistribution(selectedDistricts),
      getPriceScatter(selectedDistricts),
      getTimeseries(selectedDistricts),
      getInsights(selectedDistricts, language),
    ]).then(([dist, sc, ts, ins]) => {
      setDistBuckets(dist.data);
      setScatter(sc.data);
      setTimeseries(ts.data);
      setInsights(ins.pricing);
      setLoading(false);
    }).catch((e) => {
      setError(e.message ?? 'Erreur de chargement');
      setLoading(false);
    });
  }, [selectedDistricts, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Timeseries pivot ──────────────────────────────────────────────────────
  const timeseriesData: Record<string, string | number>[] = (() => {
    const map = new Map<string, Record<string, string | number>>();
    timeseries.forEach(pt => {
      if (!map.has(pt.period)) map.set(pt.period, { period: pt.period });
      map.get(pt.period)![pt.district] = pt.median_price_sqm;
    });
    return Array.from(map.values()).sort((a, b) =>
      (a.period as string).localeCompare(b.period as string)
    );
  })();

  // ── Price distribution pivot ──────────────────────────────────────────────
  const distData: Record<string, string | number>[] = (() => {
    const map = new Map<number, Record<string, string | number>>();
    distBuckets.forEach(b => {
      if (!map.has(b.bucket_start)) map.set(b.bucket_start, { bucket: b.bucket, bucket_start: b.bucket_start });
      map.get(b.bucket_start)![b.district] = b.count;
    });
    return Array.from(map.values()).sort((a, b) => (a.bucket_start as number) - (b.bucket_start as number));
  })();

  // ── Scatter by district ───────────────────────────────────────────────────
  const scatterByDistrict: Record<string, PriceScatterPoint[]> = {};
  scatter.forEach(pt => {
    if (!scatterByDistrict[pt.district]) scatterByDistrict[pt.district] = [];
    scatterByDistrict[pt.district].push(pt);
  });

  // ── KPI summary ───────────────────────────────────────────────────────────
  const prices   = scatter.map(p => p.price_per_sqm_aed).filter(Boolean);
  const totals   = scatter.map(p => p.sale_price_aed).filter(Boolean);
  const surfaces = scatter.map(p => p.size_sqm).filter(Boolean);
  const medPpsqm = median(prices);
  const medTotal = median(totals);
  const medSqm   = median(surfaces);
  const p25      = percentile(prices, 25);
  const p75      = percentile(prices, 75);

  // ── Guards ────────────────────────────────────────────────────────────────
  if (selectedDistricts.length === 0) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', background: '#F4F6F9' }}>
        <div style={{ textAlign: 'center', color: '#7A90A8', fontSize: '14px' }}>
          Sélectionnez au moins 1 district
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px', background: '#F4F6F9', minHeight: '100%' }}>
        <div style={{ color: '#C0392B', fontSize: '14px' }}>{error}</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', background: '#F4F6F9', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: '#0A1628' }}>
        Pricing Lab
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        {language === 'fr' ? 'Analyse des prix · districts sélectionnés' : 'Price analysis · selected districts'}
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {loading ? (
        /* Skeleton */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[300, 300, 80].map((h, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', height: `${h}px`, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1 : Timeseries ─────────────────────────────────────── */}
          <div style={{ ...CARD_STYLE, marginBottom: '24px' }}>
            <CardHeader title={language === 'fr' ? 'Évolution du prix médian' : 'Median price evolution'} subtitle={language === 'fr' ? 'Médiane mensuelle AED/sqm par district' : 'Monthly median AED/sqm by district'} />
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={timeseriesData} margin={{ top: 4, right: 16, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="period" tick={{ fontSize: 11, fill: '#7A90A8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7A90A8' }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  {...tooltipStyle}
                  formatter={(v: number) => [v.toLocaleString('en-US') + ' AED/sqm']}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                {selectedDistricts.map(d => (
                  <Line
                    key={d}
                    type="monotone"
                    dataKey={d}
                    stroke={dc(d)}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {insights && insights.chart_insight && (
            <InsightBox color="gold" title={language === 'fr' ? 'Dynamique des prix' : 'Price dynamics'}>
              <span dangerouslySetInnerHTML={{ __html: insights.chart_insight.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 2 : Distribution + Scatter ────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Distribution */}
            <div style={CARD_STYLE}>
              <CardHeader title={language === 'fr' ? 'Distribution des prix' : 'Price distribution'} subtitle={language === 'fr' ? 'Prix par sqm — tranches de 2 000 AED' : 'Price per sqm — 2,000 AED brackets'} />
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={distData} margin={{ top: 4, right: 8, bottom: 56, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#7A90A8' }} angle={-45} textAnchor="end" height={60} />
                  <YAxis tick={{ fontSize: 11, fill: '#7A90A8' }} />
                  <Tooltip {...tooltipStyle} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {selectedDistricts.map(d => (
                    <Bar key={d} dataKey={d} stackId="a" fill={dc(d)} maxBarSize={20} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Scatter */}
            <div style={CARD_STYLE}>
              <CardHeader title={language === 'fr' ? 'Prix vs Surface' : 'Price vs Size'} subtitle={language === 'fr' ? 'Prix/sqm en fonction de la surface' : 'Price/sqm by property size'} />
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis
                    dataKey="size_sqm"
                    name="Surface (sqm)"
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                  />
                  <YAxis
                    dataKey="price_per_sqm_aed"
                    name="Prix/sqm (AED)"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as PriceScatterPoint;
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: dc(d.district), marginBottom: '4px' }}>{d.district}</div>
                          <div>Surface : {d.size_sqm?.toLocaleString('en-US')} sqm</div>
                          <div>Prix/sqm : {d.price_per_sqm_aed?.toLocaleString('en-US')} AED</div>
                          <div>Yield : {d.gross_yield_pct?.toFixed(1)}%</div>
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  {selectedDistricts.map(d => (
                    <Scatter
                      key={d}
                      name={d}
                      data={scatterByDistrict[d] ?? []}
                      fill={dc(d)}
                      fillOpacity={0.6}
                      r={4}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>

          {insights && insights.verdict && (
            <InsightBox color="green" title={language === 'fr' ? 'Verdict pricing' : 'Pricing verdict'}>
              <span dangerouslySetInnerHTML={{ __html: insights.verdict.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 3 : KPI cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              {
                label: language === 'fr' ? 'PRIX MÉDIAN/SQM' : 'MEDIAN PRICE/SQM',
                value: medPpsqm ? `${(medPpsqm / 1000).toFixed(1)}k AED` : '—',
              },
              {
                label: language === 'fr' ? 'PRIX MÉDIAN TOTAL' : 'MEDIAN TOTAL PRICE',
                value: medTotal ? `${(medTotal / 1_000_000).toFixed(2)}M AED` : '—',
              },
              {
                label: language === 'fr' ? 'SURFACE MÉDIANE' : 'MEDIAN SIZE',
                value: medSqm ? `${Math.round(medSqm)} sqm` : '—',
              },
              {
                label: language === 'fr' ? 'FOURCHETTE P25–P75' : 'P25–P75 RANGE',
                value: p25 && p75 ? `${(p25 / 1000).toFixed(0)}k–${(p75 / 1000).toFixed(0)}k AED` : '—',
              },
            ].map(({ label, value }) => (
              <div key={label} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#0A1628' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {insights && insights.synthesis && (
            <InsightBox color="blue" title={language === 'fr' ? 'Synthèse prix' : 'Pricing summary'}>
              <span dangerouslySetInnerHTML={{ __html: insights.synthesis.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}
        </>
      )}
    </div>
  );
}
