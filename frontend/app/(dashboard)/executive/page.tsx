'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

import { useAppStore } from '@/lib/store';
import { getSnapshot, getTimeseries, getTypology, getScore } from '@/lib/api';
import type { SnapshotResponse, TimeseriesPoint, TypologyItem, ScoreResponse } from '@/lib/types';

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

const PILLAR_COLORS = {
  liquidity: '#1E5FA8',
  yield:     '#1A7A4A',
  risk:      '#C9A84C',
  trend:     '#6B3FA0',
};

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    noDistrict:    'Sélectionnez au moins un district',
    noDistrictSub: 'Utilisez la barre supérieure pour choisir vos marchés cibles',
    kpi_price:     'Médiane AED/sqm',
    kpi_dom:       'Jours sur le marché',
    kpi_yield:     'Yield net',
    kpi_listings:  'Annonces',
    chart_price:   'Évolution du prix médian',
    chart_price_sub: 'Médiane mensuelle AED/sqm par district',
    chart_typo:    'Répartition par typologie',
    chart_typo_sub: 'Médiane AED/sqm par nombre de chambres',
    score_sub:     'Scoring propriétaire · 4 piliers · /100',
    signals:       'Signaux clés',
    pillars:       { liquidity: 'Liquidité', yield: 'Rendement', risk: 'Stabilité', trend: 'Tendance' },
  },
  en: {
    noDistrict:    'Select at least one district',
    noDistrictSub: 'Use the top bar to choose your target markets',
    kpi_price:     'Median AED/sqm',
    kpi_dom:       'Days on market',
    kpi_yield:     'Net yield',
    kpi_listings:  'Listings',
    chart_price:   'Median price evolution',
    chart_price_sub: 'Monthly median AED/sqm by district',
    chart_typo:    'Typology breakdown',
    chart_typo_sub: 'Median AED/sqm by bedroom count',
    score_sub:     'Proprietary scoring · 4 pillars · /100',
    signals:       'Key signals',
    pillars:       { liquidity: 'Liquidity', yield: 'Yield', risk: 'Stability', trend: 'Trend' },
  },
} as const;

// ─── Pivot timeseries ─────────────────────────────────────────────────────────

type PivotRow = Record<string, string | number> & { period: string };

function pivotTimeseries(data: TimeseriesPoint[]): PivotRow[] {
  const map = new Map<string, PivotRow>();
  for (const pt of data) {
    if (!map.has(pt.period)) map.set(pt.period, { period: pt.period });
    map.get(pt.period)![pt.district] = pt.median_price_sqm;
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

// ─── Takeaways ────────────────────────────────────────────────────────────────

function buildSignals(snap: SnapshotResponse, lang: 'fr' | 'en') {
  const out: { text: string; color: string }[] = [];
  const fr = lang === 'fr';
  const G = '#1A7A4A', R = '#C0392B', A = '#C9A84C';

  if (snap.median_dom < 45)
    out.push({ color: G, text: fr ? 'Marché liquide — vitesse de vente supérieure à la moyenne' : 'Liquid market — above-average sale speed' });
  if (snap.median_dom > 70)
    out.push({ color: R, text: fr ? 'Délais de vente élevés — liquidité sous la moyenne' : 'High time-to-sell — liquidity below average' });
  if (snap.median_net_yield > 6)
    out.push({ color: G, text: fr ? `Yield net ${snap.median_net_yield.toFixed(1)}% — attractif pour un profil opportuniste` : `Net yield ${snap.median_net_yield.toFixed(1)}% — attractive for opportunistic investors` });
  if (snap.median_net_yield < 4)
    out.push({ color: A, text: fr ? `Yield net ${snap.median_net_yield.toFixed(1)}% — marché premium à rendement compressé` : `Net yield ${snap.median_net_yield.toFixed(1)}% — premium market, compressed yield` });
  if (snap.price_trend_6m > 4)
    out.push({ color: G, text: fr ? `Momentum haussier sur 6 mois (+${snap.price_trend_6m.toFixed(1)}%)` : `Bullish momentum over 6 months (+${snap.price_trend_6m.toFixed(1)}%)` });
  if (snap.price_trend_6m < 0)
    out.push({ color: R, text: fr ? `Tendance baissière 6 mois (${snap.price_trend_6m.toFixed(1)}%)` : `Bearish 6-month trend (${snap.price_trend_6m.toFixed(1)}%)` });
  if (snap.price_trend_12m > 8)
    out.push({ color: G, text: fr ? `Forte croissance annuelle +${snap.price_trend_12m.toFixed(1)}%` : `Strong annual growth +${snap.price_trend_12m.toFixed(1)}%` });
  if (snap.liquidity_depth_ratio > 80)
    out.push({ color: G, text: fr ? `${snap.liquidity_depth_ratio.toFixed(0)}% des biens vendus en < 60j` : `${snap.liquidity_depth_ratio.toFixed(0)}% of properties sold in < 60 days` });
  if (snap.fast_sale_30d_pct > 25)
    out.push({ color: G, text: fr ? `${snap.fast_sale_30d_pct.toFixed(0)}% des biens partent en < 30j — forte demande` : `${snap.fast_sale_30d_pct.toFixed(0)}% sell in < 30 days — strong demand` });
  if (snap.price_consistency_cv < 12)
    out.push({ color: G, text: fr ? 'Faible dispersion des prix — marché homogène' : 'Low price dispersion — homogeneous market' });
  if (snap.price_consistency_cv > 25)
    out.push({ color: A, text: fr ? 'Forte hétérogénéité des prix — opportunités de sous-valorisation' : 'High price heterogeneity — potential undervaluation opportunities' });

  return out.slice(0, 5);
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skel({ w, h, radius = 6 }: { w: string | number; h: number; radius?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: radius,
      background: 'linear-gradient(90deg, #EEF1F6 25%, #E2E8F0 50%, #EEF1F6 75%)',
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  );
}

// ─── Tooltip Recharts ─────────────────────────────────────────────────────────

function PriceTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#FFFFFF', border: '1px solid #D8E2EE',
      borderRadius: 6, padding: '10px 14px', fontSize: 12, boxShadow: '0 2px 8px rgba(10,22,40,0.1)',
    }}>
      <p style={{ fontWeight: 600, color: '#0A1628', marginBottom: 6 }}>{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color, marginBottom: 2 }}>
          {p.name}: <strong>{p.value.toLocaleString('fr-FR')} AED/sqm</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Card wrapper ─────────────────────────────────────────────────────────────

function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: '#FFFFFF', borderRadius: '8px',
      border: '1px solid #D8E2EE',
      boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
      ...style,
    }}>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const { selectedDistricts, language } = useAppStore();
  const t = T[language];

  const [snapshot,   setSnapshot]   = useState<SnapshotResponse | null>(null);
  const [mktSnap,    setMktSnap]    = useState<SnapshotResponse | null>(null);
  const [timeseries, setTimeseries] = useState<TimeseriesPoint[]>([]);
  const [typology,   setTypology]   = useState<TypologyItem[]>([]);
  const [scoreData,  setScoreData]  = useState<ScoreResponse | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) {
      setSnapshot(null); setTimeseries([]); setTypology([]); setScoreData(null);
      return;
    }
    setLoading(true); setError(null);
    Promise.all([
      getSnapshot(selectedDistricts),
      getSnapshot([]),
      getTimeseries(selectedDistricts),
      getTypology(selectedDistricts),
      getScore(selectedDistricts),
    ])
      .then(([snap, mkt, ts, typo, score]) => {
        setSnapshot(snap); setMktSnap(mkt);
        setTimeseries(ts.data); setTypology(typo.data); setScoreData(score);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDistricts]);

  // ── Empty state ────────────────────────────────────────────────────────────
  if (selectedDistricts.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#0A1628', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ color: '#C9A84C', fontSize: 24, fontWeight: 700 }}>B</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: '#0A1628' }}>{t.noDistrict}</p>
        <p style={{ fontSize: 13, color: '#7A90A8' }}>{t.noDistrictSub}</p>
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

  const pivoted  = pivotTimeseries(timeseries);
  const signals  = snapshot ? buildSignals(snapshot, language) : [];
  const bedLabels = language === 'fr'
    ? ['Studio', '1 ch.', '2 ch.', '3 ch.', '4 ch.+']
    : ['Studio', '1BR', '2BR', '3BR', '4BR+'];

  const typoData = typology.map((row) => ({
    ...row,
    label: bedLabels[row.bedrooms] ?? `${row.bedrooms}BR`,
  }));

  // KPI deltas vs market
  const d_price   = snapshot && mktSnap ? snapshot.median_price_sqm - mktSnap.median_price_sqm : null;
  const d_dom     = snapshot && mktSnap ? snapshot.median_dom - mktSnap.median_dom : null;
  const d_yield   = snapshot && mktSnap ? snapshot.median_net_yield - mktSnap.median_net_yield : null;

  const kpis = [
    {
      label: t.kpi_price,
      value: loading ? null : snapshot ? `${Math.round(snapshot.median_price_sqm / 1000)}k` : '—',
      unit: 'AED',
      sub: snapshot ? `P25 ${Math.round(snapshot.p25_price_sqm / 1000)}k – P75 ${Math.round(snapshot.p75_price_sqm / 1000)}k` : undefined,
      delta: d_price !== null ? Math.round(d_price) : null,
      deltaLabel: 'AED/sqm vs market',
      topColor: '#1E5FA8',
      positiveWhenUp: true,
    },
    {
      label: t.kpi_dom,
      value: loading ? null : snapshot ? `${Math.round(snapshot.median_dom)}` : '—',
      unit: 'days',
      sub: snapshot ? `${snapshot.fast_sale_60d_pct}% sold < 60d` : undefined,
      delta: d_dom !== null ? Math.round(d_dom) : null,
      deltaLabel: 'days vs market',
      topColor: '#1A7A4A',
      positiveWhenUp: false,
    },
    {
      label: t.kpi_yield,
      value: loading ? null : snapshot ? `${snapshot.median_net_yield.toFixed(1)}` : '—',
      unit: '%',
      sub: snapshot ? `Gross ${snapshot.median_gross_yield.toFixed(1)}%` : undefined,
      delta: d_yield !== null ? parseFloat(d_yield.toFixed(2)) : null,
      deltaLabel: '% vs market',
      topColor: '#C9A84C',
      positiveWhenUp: true,
    },
    {
      label: t.kpi_listings,
      value: loading ? null : snapshot ? snapshot.n_listings.toLocaleString('fr-FR') : '—',
      unit: '',
      sub: snapshot ? `CV ${snapshot.price_consistency_cv?.toFixed(1)}%` : undefined,
      delta: null,
      deltaLabel: '',
      topColor: '#0A1628',
      positiveWhenUp: true,
    },
  ];

  const score = scoreData?.aggregate;
  const pillarsArr = score ? [
    { key: 'liquidity' as const, name: t.pillars.liquidity, value: score.liquidity, color: PILLAR_COLORS.liquidity },
    { key: 'yield'     as const, name: t.pillars.yield,     value: score.yield,     color: PILLAR_COLORS.yield },
    { key: 'risk'      as const, name: t.pillars.risk,      value: score.risk,      color: PILLAR_COLORS.risk },
    { key: 'trend'     as const, name: t.pillars.trend,     value: score.trend,     color: PILLAR_COLORS.trend },
  ] : [];

  return (
    <div style={{ padding: '32px', background: '#F4F6F9', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: '#0A1628', marginBottom: '6px' }}>
          Executive Snapshot
        </h1>
        <p style={{ fontSize: '13px', color: '#7A90A8' }}>
          Market overview · {snapshot ? `${snapshot.n_listings.toLocaleString()} listings` : '…'} · Dubai 2026
        </p>
        <div style={{ width: '40px', height: '2px', background: '#C9A84C', marginTop: '10px' }} />
      </div>

      {/* ── KPI Strip ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {kpis.map((kpi) => {
          const isGood = kpi.delta !== null
            ? (kpi.positiveWhenUp ? kpi.delta > 0 : kpi.delta < 0)
            : null;
          return (
            <Card key={kpi.label} style={{ borderTop: `3px solid ${kpi.topColor}`, padding: '20px 24px' }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '10px' }}>
                {kpi.label}
              </div>
              {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Skel w="80%" h={36} />
                  <Skel w="60%" h={16} />
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                    <span style={{ fontSize: '32px', fontWeight: 700, color: '#0A1628', lineHeight: 1 }}>{kpi.value}</span>
                    {kpi.unit && <span style={{ fontSize: '13px', color: '#3D5470' }}>{kpi.unit}</span>}
                  </div>
                  {kpi.sub && <p style={{ fontSize: '11px', color: '#7A90A8', marginBottom: 6 }}>{kpi.sub}</p>}
                  {kpi.delta !== null && (
                    <div style={{
                      display: 'inline-flex', alignItems: 'center', gap: 3,
                      padding: '2px 7px', borderRadius: 3, fontSize: 11, fontWeight: 600,
                      background: isGood ? '#E8F5EE' : '#FDEDED',
                      color: isGood ? '#1A7A4A' : '#C0392B',
                    }}>
                      {isGood ? '↑' : '↓'} {Math.abs(kpi.delta)} {kpi.deltaLabel}
                    </div>
                  )}
                </>
              )}
            </Card>
          );
        })}
      </div>

      {/* ── Charts ──────────────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.65fr', gap: '16px', marginBottom: '24px' }}>

        {/* Price timeseries */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628' }}>{t.chart_price}</div>
            <div style={{ fontSize: '11px', color: '#7A90A8', marginTop: 2 }}>{t.chart_price_sub}</div>
          </div>
          <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '16px' }} />
          {loading ? <Skel w="100%" h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pivoted} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#7A90A8', fontSize: 10 }}
                  tickFormatter={(v: string) => {
                    const [y, m] = v.split('-');
                    return m === '01' ? y : m === '07' ? `'${y.slice(2)}` : '';
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#7A90A8', fontSize: 10 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={36}
                />
                <Tooltip content={<PriceTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v: string) => (
                    <span style={{ color: DISTRICT_COLORS[v] ?? '#7A90A8' }}>{v}</span>
                  )}
                />
                {selectedDistricts.map((d) => (
                  <Line key={d} type="monotone" dataKey={d}
                    stroke={DISTRICT_COLORS[d] ?? '#7A90A8'}
                    strokeWidth={2} dot={false} connectNulls />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        {/* Typology */}
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ marginBottom: '16px' }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628' }}>{t.chart_typo}</div>
            <div style={{ fontSize: '11px', color: '#7A90A8', marginTop: 2 }}>{t.chart_typo_sub}</div>
          </div>
          <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '16px' }} />
          {loading ? <Skel w="100%" h={220} /> : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={typoData} layout="vertical" margin={{ top: 4, right: 16, bottom: 0, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" horizontal={false} />
                <XAxis type="number" tick={{ fill: '#7A90A8', fontSize: 10 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`} />
                <YAxis dataKey="label" type="category" tick={{ fill: '#7A90A8', fontSize: 11 }} width={36} />
                <Tooltip
                  formatter={(v: number) => [`${v.toLocaleString('fr-FR')} AED/sqm`, 'Médiane']}
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: 6, fontSize: 12 }}
                  labelStyle={{ color: '#0A1628', fontWeight: 600 }}
                />
                <Bar dataKey="median_price_sqm" fill="#1E5FA8" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </Card>
      </div>

      {/* ── Barzel Score ─────────────────────────────────────────────────────── */}
      <Card style={{ padding: '24px', marginBottom: '24px' }}>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628', marginBottom: '4px' }}>Barzel Score</div>
        <div style={{ fontSize: '11px', color: '#7A90A8', marginBottom: '20px' }}>{t.score_sub}</div>
        <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '20px' }} />

        {loading || !score ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: 20 }}>
            <Skel w={100} h={80} />
            {[1, 2, 3, 4].map((i) => <Skel key={i} w="100%" h={80} />)}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr 1fr 1fr 1fr', gap: '20px', alignItems: 'center' }}>
            {/* Total score */}
            <div style={{ textAlign: 'center', padding: '0 24px 0 0', borderRight: '1px solid #EEF1F6' }}>
              <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '48px', fontWeight: 600, color: '#0A1628', lineHeight: 1 }}>
                {score.total.toFixed(0)}
              </div>
              <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '2px', color: '#7A90A8', textTransform: 'uppercase', marginTop: '6px' }}>
                Barzel Score
              </div>
              <div style={{
                marginTop: 10, display: 'inline-block', padding: '3px 10px', borderRadius: 4,
                fontSize: 11, fontWeight: 600,
                background: score.total >= 65 ? '#E8F5EE' : score.total >= 40 ? '#FFF8E6' : '#FDEDED',
                color: score.total >= 65 ? '#1A7A4A' : score.total >= 40 ? '#C9A84C' : '#C0392B',
              }}>
                {score.label}
              </div>
            </div>

            {/* 4 pillars */}
            {pillarsArr.map(({ name, value, color }) => (
              <div key={name} style={{
                borderTop: `3px solid ${color}`,
                padding: '14px 16px',
                background: '#F4F6F9',
                borderRadius: '0 0 6px 6px',
              }}>
                <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                  {name}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 700, color, marginBottom: '8px' }}>
                  {value.toFixed(1)}
                </div>
                <div style={{ height: '4px', background: '#D8E2EE', borderRadius: '2px' }}>
                  <div style={{ height: '4px', borderRadius: '2px', background: color, width: `${(value / 25) * 100}%`, transition: 'width 0.6s' }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* ── Key Signals ──────────────────────────────────────────────────────── */}
      {!loading && signals.length > 0 && (
        <Card style={{ padding: '20px 24px' }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628', marginBottom: '16px' }}>{t.signals}</div>
          {signals.map((signal, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 0',
              borderBottom: i < signals.length - 1 ? '1px solid #EEF1F6' : 'none',
            }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: signal.color, flexShrink: 0 }} />
              <span style={{ fontSize: '13px', color: '#0A1628' }}>{signal.text}</span>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
