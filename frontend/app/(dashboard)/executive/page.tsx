'use client';

import { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';

import { useAppStore } from '@/lib/store';
import { getSnapshot, getTimeseries, getTypology, getScore } from '@/lib/api';
import type {
  SnapshotResponse, TimeseriesPoint, TypologyItem, ScoreResponse,
} from '@/lib/types';

import { KPICard } from '@/components/charts/KPICard';
import { BarzelScoreCard } from '@/components/charts/BarzelScoreCard';

// ─── Constants ───────────────────────────────────────────────────────────────

const DISTRICT_COLORS: Record<string, string> = {
  'Dubai Marina':    '#3B82F6',
  'Business Bay':    '#F59E0B',
  'JVC':             '#10B981',
  'Downtown Dubai':  '#8B5CF6',
  'Palm Jumeirah':   '#EC4899',
  'Dubai Hills':     '#14B8A6',
  'DIFC':            '#F97316',
  'Al Barsha':       '#84CC16',
  'Jumeirah':        '#A78BFA',
};

// ─── Translations ─────────────────────────────────────────────────────────────

const T = {
  fr: {
    title:          'Executive Snapshot',
    subtitle:       'Vue synthétique du marché sélectionné',
    noDistrict:     'Sélectionnez au moins un district',
    noDistrictSub:  'Utilisez la barre supérieure pour choisir vos marchés cibles',
    kpi_price:      'AED/sqm médian',
    kpi_dom:        'Jours sur le marché',
    kpi_yield:      'Rendement net',
    kpi_listings:   'Annonces actives',
    chart_price:    'Évolution du prix médian',
    chart_typo:     'Distribution par typologie',
    chart_price_y:  'AED/sqm',
    score_title:    'Score Barzel',
    score_agg:      'Score agrégé',
    takeaways:      'Signaux clés',
    vsMarket:       'vs marché',
    bedrooms: ['Studio', '1 ch.', '2 ch.', '3 ch.', '4 ch.', '5 ch.+'],
  },
  en: {
    title:          'Executive Snapshot',
    subtitle:       'Synthetic view of the selected market',
    noDistrict:     'Select at least one district',
    noDistrictSub:  'Use the top bar to choose your target markets',
    kpi_price:      'Median AED/sqm',
    kpi_dom:        'Days on market',
    kpi_yield:      'Net yield',
    kpi_listings:   'Active listings',
    chart_price:    'Median price evolution',
    chart_typo:     'Typology breakdown',
    chart_price_y:  'AED/sqm',
    score_title:    'Barzel Score',
    score_agg:      'Aggregate score',
    takeaways:      'Key signals',
    vsMarket:       'vs market',
    bedrooms: ['Studio', '1BR', '2BR', '3BR', '4BR', '5BR+'],
  },
} as const;

// ─── Takeaways logic ──────────────────────────────────────────────────────────

type TakeawayItem = { text: string; color: string };

function buildTakeaways(
  snap: SnapshotResponse | null,
  lang: 'fr' | 'en',
): TakeawayItem[] {
  if (!snap) return [];
  const out: TakeawayItem[] = [];

  const isFr = lang === 'fr';
  const G = '#10B981';  // positive
  const R = '#EF4444';  // negative / risk
  const A = '#F59E0B';  // neutral / warning

  if (snap.median_dom < 45)
    out.push({ text: isFr
      ? 'Marché liquide — vitesse de vente supérieure à la moyenne'
      : 'Liquid market — above-average sale speed', color: G });

  if (snap.median_dom > 70)
    out.push({ text: isFr
      ? 'Délais de vente élevés — marché moins liquide que la moyenne'
      : 'High time-to-sell — market liquidity below average', color: R });

  if (snap.median_net_yield > 6)
    out.push({ text: isFr
      ? `Rendement net de ${snap.median_net_yield.toFixed(1)}% — attractif pour un profil opportuniste`
      : `Net yield of ${snap.median_net_yield.toFixed(1)}% — attractive for opportunistic investors`, color: G });

  if (snap.median_net_yield < 4)
    out.push({ text: isFr
      ? `Rendement net de ${snap.median_net_yield.toFixed(1)}% — marché premium à rendement compressé`
      : `Net yield of ${snap.median_net_yield.toFixed(1)}% — premium market with compressed yield`, color: A });

  if (snap.price_trend_6m > 4)
    out.push({ text: isFr
      ? `Momentum haussier confirmé sur 6 mois (+${snap.price_trend_6m.toFixed(1)}%)`
      : `Confirmed bullish momentum over 6 months (+${snap.price_trend_6m.toFixed(1)}%)`, color: G });

  if (snap.price_trend_6m < 0)
    out.push({ text: isFr
      ? `Tendance baissière sur 6 mois (${snap.price_trend_6m.toFixed(1)}%) — vigilance requise`
      : `Bearish trend over 6 months (${snap.price_trend_6m.toFixed(1)}%) — caution advised`, color: R });

  if (snap.price_trend_12m > 8)
    out.push({ text: isFr
      ? `Forte croissance annuelle (+${snap.price_trend_12m.toFixed(1)}%) — marché en accélération`
      : `Strong annual growth (+${snap.price_trend_12m.toFixed(1)}%) — accelerating market`, color: G });

  if (snap.liquidity_depth_ratio > 80)
    out.push({ text: isFr
      ? `${snap.liquidity_depth_ratio.toFixed(0)}% des biens vendus en moins de 60 jours — absorption élevée`
      : `${snap.liquidity_depth_ratio.toFixed(0)}% of properties sold within 60 days — high absorption`, color: G });

  if (snap.fast_sale_30d_pct > 25)
    out.push({ text: isFr
      ? `${snap.fast_sale_30d_pct.toFixed(0)}% des biens partent en moins de 30 jours — forte demande`
      : `${snap.fast_sale_30d_pct.toFixed(0)}% of properties sell in under 30 days — strong demand`, color: G });

  if (snap.price_consistency_cv < 12)
    out.push({ text: isFr
      ? 'Marché homogène — faible dispersion des prix (CV < 12%)'
      : 'Homogeneous market — low price dispersion (CV < 12%)', color: G });

  if (snap.price_consistency_cv > 25)
    out.push({ text: isFr
      ? 'Fort écart-type des prix — marché hétérogène, opportunités de sous-valorisation possibles'
      : 'High price dispersion — heterogeneous market, potential undervaluation opportunities', color: A });

  if (snap.median_vacancy_days > 20)
    out.push({ text: isFr
      ? `Vacance locative estimée à ${snap.median_vacancy_days.toFixed(0)}j — à intégrer dans le business plan`
      : `Estimated vacancy of ${snap.median_vacancy_days.toFixed(0)}d — factor into investment model`, color: A });

  return out.slice(0, 5); // max 5 takeaways
}

// ─── Pivot timeseries for Recharts ───────────────────────────────────────────

type PivotRow = Record<string, string | number> & { period: string };

function pivotTimeseries(data: TimeseriesPoint[]): PivotRow[] {
  const map = new Map<string, PivotRow>();
  for (const pt of data) {
    if (!map.has(pt.period)) map.set(pt.period, { period: pt.period });
    const row = map.get(pt.period)!;
    row[pt.district] = pt.median_price_sqm;
  }
  return Array.from(map.values()).sort((a, b) => a.period.localeCompare(b.period));
}

// ─── Skeleton helper ─────────────────────────────────────────────────────────

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={`rounded animate-pulse ${className ?? ''}`}
      style={{ background: '#252538' }}
    />
  );
}

// ─── Chart tooltip ───────────────────────────────────────────────────────────

function PriceTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg p-3 text-xs shadow-xl"
      style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
    >
      <p className="font-semibold mb-2 text-white">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name}: <strong>{p.value.toLocaleString('fr-FR')} AED/sqm</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExecutivePage() {
  const { selectedDistricts, language } = useAppStore();
  const t = T[language];

  const [snapshot,    setSnapshot]    = useState<SnapshotResponse | null>(null);
  const [marketSnap,  setMarketSnap]  = useState<SnapshotResponse | null>(null);
  const [timeseries,  setTimeseries]  = useState<TimeseriesPoint[]>([]);
  const [typology,    setTypology]    = useState<TypologyItem[]>([]);
  const [scoreData,   setScoreData]   = useState<ScoreResponse | null>(null);
  const [loading,     setLoading]     = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) {
      setSnapshot(null);
      setTimeseries([]);
      setTypology([]);
      setScoreData(null);
      return;
    }

    setLoading(true);
    setError(null);

    Promise.all([
      getSnapshot(selectedDistricts),
      getSnapshot([]),               // market-wide for delta
      getTimeseries(selectedDistricts),
      getTypology(selectedDistricts),
      getScore(selectedDistricts),
    ])
      .then(([snap, mktSnap, ts, typo, score]) => {
        setSnapshot(snap);
        setMarketSnap(mktSnap);
        setTimeseries(ts.data);
        setTypology(typo.data);
        setScoreData(score);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedDistricts]);

  // ── Empty state ──────────────────────────────────────────────────────────
  if (selectedDistricts.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-56px)]">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
          style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
        >
          <span className="text-3xl font-bold" style={{ color: '#C9A84C' }}>B</span>
        </div>
        <h2 className="text-xl font-semibold text-white mb-2">{t.noDistrict}</h2>
        <p className="text-sm" style={{ color: '#9A9AAA' }}>{t.noDistrictSub}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="rounded-lg p-4" style={{ background: '#2D1B1B', border: '1px solid #EF4444' }}>
          <p className="text-sm text-red-400">Error: {error}</p>
        </div>
      </div>
    );
  }

  const pivoted   = pivotTimeseries(timeseries);
  const takeaways = buildTakeaways(snapshot, language);
  const districts = selectedDistricts;

  return (
    <div className="p-6 flex flex-col gap-6">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-white">{t.title}</h1>
        <p className="text-sm mt-1" style={{ color: '#9A9AAA' }}>
          {t.subtitle} — {districts.join(', ')}
        </p>
      </div>

      {/* ── Section 1: KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-4 gap-4">
        <KPICard
          loading={loading}
          label={t.kpi_price}
          value={snapshot ? `${(snapshot.median_price_sqm / 1000).toFixed(1)}k` : '—'}
          subValue={snapshot ? `P25 ${Math.round(snapshot.p25_price_sqm / 1000)}k – P75 ${Math.round(snapshot.p75_price_sqm / 1000)}k AED` : undefined}
          delta={snapshot && marketSnap ? snapshot.median_price_sqm - marketSnap.median_price_sqm : null}
          deltaLabel="AED/sqm"
        />
        <KPICard
          loading={loading}
          label={t.kpi_dom}
          value={snapshot ? `${Math.round(snapshot.median_dom)}j` : '—'}
          subValue={snapshot ? `${snapshot.fast_sale_60d_pct}% sold <60d` : undefined}
          delta={snapshot && marketSnap ? -(snapshot.median_dom - marketSnap.median_dom) : null}
          deltaLabel="days"
          deltaInvert
        />
        <KPICard
          loading={loading}
          label={t.kpi_yield}
          value={snapshot ? `${snapshot.median_net_yield.toFixed(1)}%` : '—'}
          subValue={snapshot ? `Gross ${snapshot.median_gross_yield.toFixed(1)}%` : undefined}
          delta={snapshot && marketSnap ? snapshot.median_net_yield - marketSnap.median_net_yield : null}
          deltaLabel="%"
        />
        <KPICard
          loading={loading}
          label={t.kpi_listings}
          value={snapshot ? snapshot.n_listings.toLocaleString('fr-FR') : '—'}
          subValue={snapshot ? `CV prix ${snapshot.price_consistency_cv?.toFixed(1)}%` : undefined}
        />
      </div>

      {/* ── Section 2: Charts ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">

        {/* Price timeseries */}
        <div
          className="rounded-lg p-4"
          style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
        >
          <p className="text-sm font-semibold text-white mb-4">{t.chart_price}</p>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={pivoted} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" />
                <XAxis
                  dataKey="period"
                  tick={{ fill: '#9A9AAA', fontSize: 10 }}
                  tickFormatter={(v: string) => {
                    const [y, m] = v.split('-');
                    return m === '01' ? y : m === '07' ? `'${y.slice(2)}` : '';
                  }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: '#9A9AAA', fontSize: 10 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                  width={36}
                />
                <Tooltip content={<PriceTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                  formatter={(v: string) => (
                    <span style={{ color: DISTRICT_COLORS[v] ?? '#9A9AAA' }}>{v}</span>
                  )}
                />
                {districts.map((d) => (
                  <Line
                    key={d}
                    type="monotone"
                    dataKey={d}
                    stroke={DISTRICT_COLORS[d] ?? '#9A9AAA'}
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Typology breakdown */}
        <div
          className="rounded-lg p-4"
          style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
        >
          <p className="text-sm font-semibold text-white mb-4">{t.chart_typo}</p>
          {loading ? (
            <Skeleton className="h-56 w-full" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={typology.map((row) => ({
                  ...row,
                  label: t.bedrooms[row.bedrooms] ?? `${row.bedrooms}BR`,
                }))}
                layout="vertical"
                margin={{ top: 4, right: 16, bottom: 0, left: 24 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2E2E42" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fill: '#9A9AAA', fontSize: 10 }}
                  tickFormatter={(v: number) => `${Math.round(v / 1000)}k`}
                />
                <YAxis
                  dataKey="label"
                  type="category"
                  tick={{ fill: '#9A9AAA', fontSize: 11 }}
                  width={40}
                />
                <Tooltip
                  formatter={(value: number) => [`${value.toLocaleString('fr-FR')} AED/sqm`, 'Médiane']}
                  contentStyle={{
                    background: '#1A1A2E',
                    border: '1px solid #2E2E42',
                    borderRadius: 6,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#fff' }}
                />
                <Bar dataKey="median_price_sqm" fill="#C9A84C" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Section 3: Barzel Score ──────────────────────────────────────── */}
      <div>
        <p className="text-sm font-semibold text-white mb-3">{t.score_title}</p>
        {loading ? (
          <div className="grid grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-64" />
            ))}
          </div>
        ) : scoreData ? (
          <div
            className="grid gap-4"
            style={{ gridTemplateColumns: `repeat(${Math.min(scoreData.by_district.length + 1, 5)}, 1fr)` }}
          >
            {/* Aggregate */}
            <BarzelScoreCard
              score={scoreData.aggregate}
              title={t.score_agg}
              language={language}
            />
            {/* Per district */}
            {scoreData.by_district.map((d) => (
              <BarzelScoreCard
                key={d.district}
                score={d}
                title={d.district}
                language={language}
              />
            ))}
          </div>
        ) : null}
      </div>

      {/* ── Section 4: Takeaways ─────────────────────────────────────────── */}
      {!loading && takeaways.length > 0 && (
        <div
          className="rounded-lg p-4"
          style={{ background: '#1A1A2E', border: '1px solid #2E2E42' }}
        >
          <p className="text-sm font-semibold text-white mb-3">{t.takeaways}</p>
          <div className="flex flex-col gap-2">
            {takeaways.map((tw, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="mt-0.5 text-xs" style={{ color: tw.color }}>●</span>
                <p className="text-sm" style={{ color: '#D1D1E0' }}>{tw.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
