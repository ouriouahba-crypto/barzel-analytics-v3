'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getCompare, getServiceChargeTypology, getInsights } from '@/lib/api';
import type { CompareItem, ServiceChargeTypology } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip,
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

function spreadColor(spread: number): string {
  if (spread > 2) return '#C0392B';
  if (spread > 1) return '#C9A84C';
  return '#1A7A4A';
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

export default function CostsPage() {
  const { selectedDistricts, language } = useAppStore();

  const [compareData, setCompare]   = useState<CompareItem[]>([]);
  const [, setTypology]             = useState<ServiceChargeTypology[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [insights, setInsights]     = useState<any>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    Promise.all([
      getCompare(selectedDistricts),
      getServiceChargeTypology(selectedDistricts),
      getInsights(selectedDistricts, language),
    ]).then(([cmp, typ, ins]) => {
      setCompare(cmp.data);
      setTypology(typ.data);
      setInsights(ins.costs);
      setLoading(false);
    }).catch((e) => {
      setError(e.message ?? 'Erreur de chargement');
      setLoading(false);
    });
  }, [selectedDistricts, language]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── KPI aggregates ────────────────────────────────────────────────────────
  const n = compareData.length;
  const avgSC    = n ? compareData.reduce((s, d) => s + (d.median_service_charge ?? 0), 0) / n : 0;
  const avgGross = n ? compareData.reduce((s, d) => s + (d.median_gross_yield ?? 0), 0) / n : 0;
  const avgNet   = n ? compareData.reduce((s, d) => s + (d.median_net_yield ?? 0), 0) / n : 0;
  const impact   = avgGross - avgNet;

  // ── Sorted data ───────────────────────────────────────────────────────────
  const scSorted = [...compareData].sort((a, b) => (a.median_service_charge ?? 0) - (b.median_service_charge ?? 0));

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
        Cost Analysis
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        {language === 'fr' ? 'Service charges et impact sur le rendement · districts sélectionnés' : 'Service charges and yield impact · selected districts'}
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[80, 280, 300].map((h, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', height: `${h}px`, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {[
              { label: language === 'fr' ? 'SERVICE CHARGE MÉDIAN' : 'MEDIAN SERVICE CHARGE', value: `${Math.round(avgSC)} AED/sqm/yr`, topColor: '#1E5FA8' },
              { label: language === 'fr' ? 'YIELD BRUT MÉDIAN' : 'MEDIAN GROSS YIELD',     value: `${avgGross.toFixed(1)}%`,          topColor: '#1A7A4A' },
              { label: language === 'fr' ? 'YIELD NET MÉDIAN' : 'MEDIAN NET YIELD',        value: `${avgNet.toFixed(1)}%`,            topColor: '#C9A84C' },
              { label: language === 'fr' ? 'IMPACT CHARGES' : 'CHARGE IMPACT',             value: `${impact.toFixed(1)} pts`,         topColor: '#C0392B' },
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
            <InsightBox color="blue" title={language === 'fr' ? 'Synthèse charges' : 'Cost summary'}>
              <span dangerouslySetInnerHTML={{ __html: insights.synthesis.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 2 : Service charges par district ──────────────────── */}
          <div style={{ ...CARD_STYLE, marginBottom: '24px' }}>
            <CardHeader title={language === 'fr' ? 'Service charges par district' : 'Service charges by district'} subtitle={language === 'fr' ? 'Médiane AED/sqm/an' : 'Median AED/sqm/year'} />
            <ResponsiveContainer width="100%" height={Math.max(40 * scSorted.length + 40, 200)}>
              <BarChart data={scSorted} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis type="number" tick={{ fontSize: 11, fill: '#7A90A8' }} />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#7A90A8' }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(v: number) => [`${Math.round(v)} AED/sqm/yr`, 'Service charge']}
                />
                <Bar dataKey="median_service_charge" barSize={20} radius={[0, 3, 3, 0]}>
                  {scSorted.map((entry) => (
                    <Cell key={entry.district} fill={dc(entry.district)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {insights && insights.chart_insight && (
            <InsightBox color="gold" title={language === 'fr' ? 'Ce que révèlent les charges' : 'What the charges reveal'}>
              <span dangerouslySetInnerHTML={{ __html: insights.chart_insight.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}

          {/* ── Section 3 : Scatter + Table ────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>

            {/* Scatter charges vs yield */}
            <div style={CARD_STYLE}>
              <CardHeader title={language === 'fr' ? 'Charges vs Rendement' : 'Charges vs Yield'} subtitle={language === 'fr' ? 'Service charge vs yield net par district' : 'Service charge vs net yield by district'} />
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                  <XAxis
                    dataKey="median_service_charge"
                    name="Service charge (AED/sqm/yr)"
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                  />
                  <YAxis
                    dataKey="median_net_yield"
                    name="Yield net (%)"
                    type="number"
                    tick={{ fontSize: 11, fill: '#7A90A8' }}
                    tickFormatter={(v) => `${v.toFixed(1)}%`}
                  />
                  <Tooltip
                    content={({ payload }) => {
                      if (!payload?.length) return null;
                      const d = payload[0].payload as CompareItem;
                      return (
                        <div style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', padding: '8px 12px', fontSize: '12px' }}>
                          <div style={{ fontWeight: 600, color: dc(d.district), marginBottom: '4px' }}>{d.district}</div>
                          <div>Service charge : {Math.round(d.median_service_charge ?? 0)} AED/sqm/yr</div>
                          <div>Yield net : {(d.median_net_yield ?? 0).toFixed(2)}%</div>
                        </div>
                      );
                    }}
                  />
                  <Scatter
                    data={compareData}
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      return <circle cx={cx} cy={cy} r={8} fill={dc(payload.district)} fillOpacity={0.85} stroke="#FFFFFF" strokeWidth={1.5} />;
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>

            {/* Detail table */}
            <div style={CARD_STYLE}>
              <CardHeader title={language === 'fr' ? 'Détail par district' : 'Detail by district'} subtitle={language === 'fr' ? 'Spread brut → net' : 'Gross → net spread'} />
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                  <thead>
                    <tr style={{ background: '#0A1628' }}>
                      {(['District', language === 'fr' ? 'Brut' : 'Gross', 'Net', 'Spread', 'Charges'] as string[]).map((h) => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: h === 'District' ? 'left' : 'center', color: '#FFFFFF', fontSize: '11px', fontWeight: 600, whiteSpace: 'nowrap' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {scSorted.map((row, idx) => {
                      const sp = (row.median_gross_yield ?? 0) - (row.median_net_yield ?? 0);
                      return (
                        <tr key={row.district} style={{ background: idx % 2 === 0 ? '#FFFFFF' : '#F4F6F9' }}>
                          <td style={{ padding: '8px 10px', fontWeight: 600, color: '#0A1628' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: dc(row.district), flexShrink: 0 }} />
                              {row.district}
                            </div>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#0A1628' }}>
                            {(row.median_gross_yield ?? 0).toFixed(1)}%
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#0A1628' }}>
                            {(row.median_net_yield ?? 0).toFixed(1)}%
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', fontWeight: 700, color: spreadColor(sp) }}>
                            {sp.toFixed(1)} pts
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'center', color: '#0A1628' }}>
                            {Math.round(row.median_service_charge ?? 0)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {insights && insights.verdict && (
            <InsightBox color="green" title={language === 'fr' ? 'Verdict coûts' : 'Cost verdict'}>
              <span dangerouslySetInnerHTML={{ __html: insights.verdict.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') }} />
            </InsightBox>
          )}
        </>
      )}
    </div>
  );
}
