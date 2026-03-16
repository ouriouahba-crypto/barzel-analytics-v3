'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getYieldDistribution, getCompare, getPriceScatter, getInsights } from '@/lib/api';
import type { YieldBucket, CompareItem, PriceScatterPoint } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip, Legend,
  CartesianGrid,
  ScatterChart, Scatter,
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

export default function YieldPage() {
  const { selectedDistricts } = useAppStore();

  const [yieldData, setYieldData]     = useState<YieldBucket[]>([]);
  const [compareData, setCompare]     = useState<CompareItem[]>([]);
  const [scatterData, setScatter]     = useState<PriceScatterPoint[]>([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [insights, setInsights]       = useState<any>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      getYieldDistribution(selectedDistricts),
      getCompare(selectedDistricts),
      getPriceScatter(selectedDistricts),
      getInsights(selectedDistricts),
    ]).then(([yd, cmp, sc, ins]) => {
      setYieldData(yd.data);
      setCompare(cmp.data);
      setScatter(sc.data);
      setInsights(ins.yield);
      setLoading(false);
    }).catch((e) => {
      setError(e.message ?? 'Erreur de chargement');
      setLoading(false);
    });
  }, [selectedDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI aggregates ────────────────────────────────────────────────────────
  const n = compareData.length;
  const avgGross   = n ? compareData.reduce((s, d) => s + (d.median_gross_yield ?? 0), 0) / n : 0;
  const avgNet     = n ? compareData.reduce((s, d) => s + (d.median_net_yield ?? 0), 0) / n : 0;
  const avgVacancy = n ? compareData.reduce((s, d) => s + (d.median_vacancy_days ?? 0), 0) / n : 0;
  const spread     = avgGross - avgNet;

  // ── Scatter by district ───────────────────────────────────────────────────
  const scatterByDistrict: Record<string, PriceScatterPoint[]> = {};
  scatterData.forEach(pt => {
    if (!scatterByDistrict[pt.district]) scatterByDistrict[pt.district] = [];
    scatterByDistrict[pt.district].push(pt);
  });

  // ── Ranking sorted by median_net_yield desc ───────────────────────────────
  const netRanked = [...compareData].sort((a, b) => (b.median_net_yield ?? 0) - (a.median_net_yield ?? 0));

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
        Yield Analysis
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        Rendement locatif et distribution · districts sélectionnés
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[80, 300, 300].map((h, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', height: `${h}px`, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: 'YIELD BRUT MÉDIAN', value: `${avgGross.toFixed(1)}%`,   topColor: '#1A7A4A' },
              { label: 'YIELD NET MÉDIAN',  value: `${avgNet.toFixed(1)}%`,     topColor: '#1E5FA8' },
              { label: 'VACANCY ESTIMÉE',   value: `${Math.round(avgVacancy)}d`, topColor: '#C9A84C' },
              { label: 'SPREAD BRUT-NET',   value: `${spread.toFixed(1)} pts`,  topColor: '#6B3FA0' },
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
            <InsightBox color="blue" title="Synthèse rendement">
              <span dangerouslySetInnerHTML={{ __html: insights.synthesis.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 2 : Yield distribution ────────────────────────────── */}
          <div style={{ ...CARD_STYLE, marginBottom: '24px' }}>
            <CardHeader title="Distribution du rendement brut" subtitle="Tranches de 0.5% — gross yield" />
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={yieldData} margin={{ top: 4, right: 16, bottom: 56, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis dataKey="bucket" tick={{ fontSize: 10, fill: '#7A90A8' }} angle={-45} textAnchor="end" height={60} />
                <YAxis tick={{ fontSize: 11, fill: '#7A90A8' }} />
                <Tooltip contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }} />
                <Bar dataKey="count" fill="#1A7A4A" barSize={24} radius={[3, 3, 0, 0]} name="Annonces" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {insights && insights.chart_insight && (
            <InsightBox color="gold" title="Ce que révèle la distribution">
              <span dangerouslySetInnerHTML={{ __html: insights.chart_insight.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 3 : Scatter + Ranking ─────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Scatter yield vs price */}
            <div style={CARD_STYLE}>
              <CardHeader title="Yield vs Prix" subtitle="Rendement brut en fonction du prix/sqm" />
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis
                    dataKey="price_per_sqm_aed"
                    name="Prix/sqm (AED)"
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                    tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                  />
                  <YAxis
                    dataKey="gross_yield_pct"
                    name="Yield (%)"
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as PriceScatterPoint;
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: dc(d.district), marginBottom: '4px' }}>{d.district}</div>
                          <div>Prix/sqm : {d.price_per_sqm_aed?.toLocaleString('en-US')} AED</div>
                          <div>Yield : {d.gross_yield_pct?.toFixed(1)}%</div>
                          <div>Surface : {d.size_sqm?.toLocaleString('en-US')} sqm</div>
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
                      fillOpacity={0.5}
                    />
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Yield net ranking — horizontal bars */}
            <div style={CARD_STYLE}>
              <CardHeader title="Yield net par district" subtitle="Classement par rendement net médian" />
              <ResponsiveContainer width="100%" height={Math.max(45 * netRanked.length + 40, 200)}>
                <BarChart data={netRanked} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                  <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#7A90A8' }} width={110} />
                  <Tooltip
                    contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }}
                    formatter={(v: number) => [`${v.toFixed(2)}%`, 'Yield net médian']}
                  />
                  <Bar dataKey="median_net_yield" barSize={18} radius={[0, 3, 3, 0]}>
                    {netRanked.map((entry) => (
                      <Cell key={entry.district} fill={dc(entry.district)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {insights && insights.verdict && (
            <InsightBox color="green" title="Verdict rendement">
              <span dangerouslySetInnerHTML={{ __html: insights.verdict.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}
        </>
      )}
    </div>
  );
}
