'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getDomDistribution, getCompare, getInsights } from '@/lib/api';
import type { DomBucket, CompareItem } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid,
  ComposedChart,
  Line,
  Cell,
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

function fastColor(pct: number): string {
  if (pct >= 30) return '#1A7A4A';
  if (pct >= 20) return '#C9A84C';
  return '#C0392B';
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

export default function LiquidityPage() {
  const { selectedDistricts, language } = useAppStore();

  const [domData, setDomData]       = useState<DomBucket[]>([]);
  const [compareData, setCompare]   = useState<CompareItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [insights, setInsights]     = useState<any>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      getDomDistribution(selectedDistricts),
      getCompare(selectedDistricts),
      getInsights(selectedDistricts, language),
    ]).then(([dom, cmp, ins]) => {
      setDomData(dom.data);
      setCompare(cmp.data);
      setInsights(ins.liquidity);
      setLoading(false);
    }).catch((e) => {
      setError(e.message ?? 'Erreur de chargement');
      setLoading(false);
    });
  }, [selectedDistricts, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Aggregate KPIs from compareData ──────────────────────────────────────
  const n = compareData.length;
  const avgDom      = n ? compareData.reduce((s, d) => s + (d.median_dom ?? 0), 0) / n : 0;
  const avgFast60   = n ? compareData.reduce((s, d) => s + (d.fast_sale_60d_pct ?? 0), 0) / n : 0;
  const avgFast30   = n ? compareData.reduce((s, d) => s + (d.fast_sale_30d_pct ?? 0), 0) / n : 0;
  const totalN      = compareData.reduce((s, d) => s + (d.n_listings ?? 0), 0);

  // ── Ranking sorted by fast_sale_60d_pct desc ─────────────────────────────
  const ranked = [...compareData].sort((a, b) => (b.fast_sale_60d_pct ?? 0) - (a.fast_sale_60d_pct ?? 0));

  // ── DOM bar chart sorted by median_dom asc ────────────────────────────────
  const domRanked = [...compareData]
    .sort((a, b) => (a.median_dom ?? 0) - (b.median_dom ?? 0))
    .map(d => ({ district: d.district, median_dom: d.median_dom ?? 0 }));

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
        Liquidity Analysis
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        Vitesse d'absorption et temps de vente · districts sélectionnés
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[80, 320, 300].map((h, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', height: `${h}px`, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'DOM MÉDIAN',       value: `${Math.round(avgDom)}d`,                    topColor: '#1E5FA8' },
              { label: 'FAST-SALE ≤60J',   value: `${avgFast60.toFixed(1)}%`,                  topColor: '#1A7A4A' },
              { label: 'FAST-SALE ≤30J',   value: `${avgFast30.toFixed(1)}%`,                  topColor: '#C9A84C' },
              { label: 'ANNONCES ACTIVES', value: totalN.toLocaleString('en-US'),              topColor: '#6B3FA0' },
            ].map(({ label, value, topColor }) => (
              <div key={label} style={{
                background: '#FFFFFF',
                borderRadius: '8px',
                border: '1px solid #D8E2EE',
                borderTop: `3px solid ${topColor}`,
                padding: '16px',
              }}>
                <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                  {label}
                </div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1628' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>

          {insights && insights.synthesis && (
            <InsightBox color="blue" title="Synthèse liquidité">
              <span dangerouslySetInnerHTML={{ __html: insights.synthesis.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 2 : DOM Distribution ──────────────────────────────── */}
          <div style={{ ...CARD_STYLE, marginBottom: '24px' }}>
            <CardHeader
              title="Distribution des jours sur le marché"
              subtitle="Tranches de 15 jours · courbe = % cumulé"
            />
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={domData} margin={{ top: 4, right: 48, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#7A90A8' }} />
                <YAxis tick={{ fontSize: 11, fill: '#7A90A8' }} label={{ value: 'Annonces', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#7A90A8' } }} />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#7A90A8' }}
                  tickFormatter={(v) => `${v}%`}
                  domain={[0, 100]}
                />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }}
                />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="count" fill="#1E5FA8" barSize={28} radius={[3, 3, 0, 0]} name="Nb annonces" />
                <Line
                  dataKey="cumulative_pct"
                  stroke="#C9A84C"
                  strokeWidth={2}
                  dot={false}
                  yAxisId="right"
                  name="% cumulé"
                  type="monotone"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          {insights && insights.chart_insight && (
            <InsightBox color="gold" title="Ce que révèle la distribution">
              <span dangerouslySetInnerHTML={{ __html: insights.chart_insight.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 3 : Ranking + DOM horizontal bars ─────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Ranking */}
            <div style={CARD_STYLE}>
              <CardHeader title="Classement liquidité" subtitle="Districts classés par fast-sale ≤60j" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {ranked.map((item, idx) => (
                  <div key={item.district}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      {/* Rank badge */}
                      <div style={{
                        width: '24px', height: '24px', borderRadius: '4px',
                        background: '#0A1628', color: '#FFFFFF',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '10px', fontWeight: 700, flexShrink: 0,
                      }}>
                        #{idx + 1}
                      </div>
                      {/* Color dot */}
                      <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: dc(item.district), flexShrink: 0 }} />
                      {/* Name */}
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#0A1628', flex: 1 }}>{item.district}</span>
                      {/* Value */}
                      <span style={{ fontSize: '14px', fontWeight: 700, color: fastColor(item.fast_sale_60d_pct ?? 0) }}>
                        {(item.fast_sale_60d_pct ?? 0).toFixed(1)}%
                      </span>
                    </div>
                    {/* Progress bar */}
                    <div style={{ height: '4px', borderRadius: '2px', background: '#EEF1F6' }}>
                      <div style={{
                        height: '4px', borderRadius: '2px',
                        background: dc(item.district),
                        width: `${Math.min(item.fast_sale_60d_pct ?? 0, 100)}%`,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* DOM horizontal bar chart */}
            <div style={CARD_STYLE}>
              <CardHeader title="DOM par district" subtitle="Jours médians sur le marché" />
              <ResponsiveContainer width="100%" height={Math.max(40 * domRanked.length + 40, 200)}>
                <BarChart data={domRanked} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#7A90A8' }} />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#7A90A8' }} width={100} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(v: number) => [`${v} jours`, 'DOM médian']}
                  />
                  <Bar dataKey="median_dom" barSize={18} radius={[0, 3, 3, 0]}>
                    {domRanked.map((entry) => (
                      <Cell key={entry.district} fill={dc(entry.district)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          {insights && insights.verdict && (
            <InsightBox color="green" title="Verdict liquidité">
              <span dangerouslySetInnerHTML={{ __html: insights.verdict.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}
        </>
      )}
    </div>
  );
}
