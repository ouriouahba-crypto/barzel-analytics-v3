'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { getDataQuality } from '@/lib/api';
import type { DataQualityResponse } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip,
  CartesianGrid,
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

function completenessColor(pct: number): string {
  if (pct >= 95) return '#1A7A4A';
  if (pct >= 80) return '#C9A84C';
  return '#C0392B';
}

function globalScoreColor(pct: number): string {
  if (pct >= 90) return '#1A7A4A';
  if (pct >= 70) return '#C9A84C';
  return '#C0392B';
}

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D8E2EE',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
  padding: '20px 24px',
};

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <>
      <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '2px' }}>{title}</div>
      <div style={{ fontSize: '11px', color: '#7A90A8', marginBottom: '12px' }}>{subtitle}</div>
      <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '16px' }} />
    </>
  );
}

export default function QualityPage() {
  const { selectedDistricts } = useAppStore();
  const [data, setData]     = useState<DataQualityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);

  useEffect(() => {
    if (selectedDistricts.length === 0) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    getDataQuality(selectedDistricts)
      .then((d) => { setData(d); setLoading(false); })
      .catch((e) => { setError(e.message ?? 'Erreur de chargement'); setLoading(false); });
  }, [selectedDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

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
        Data Quality
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        Couverture et complétude des données · districts sélectionnés
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {loading || !data ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {[80, 500, 280].map((h, i) => (
            <div key={i} style={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '8px', height: `${h}px`, opacity: 0.5 }} />
          ))}
        </div>
      ) : (
        <>
          {/* ── Section 1 : KPI cards ──────────────────────────────────────── */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px' }}>
            <div style={{
              background: '#FFFFFF', borderRadius: '8px', border: '1px solid #D8E2EE',
              borderTop: `3px solid ${globalScoreColor(data.overall_completeness)}`, padding: '16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                SCORE GLOBAL
              </div>
              <div style={{ fontSize: '32px', fontWeight: 700, color: globalScoreColor(data.overall_completeness) }}>
                {data.overall_completeness.toFixed(1)}%
              </div>
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: '8px', border: '1px solid #D8E2EE',
              borderTop: '3px solid #1E5FA8', padding: '16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                ANNONCES ANALYSÉES
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1628' }}>
                {data.n_listings.toLocaleString('en-US')}
              </div>
            </div>
            <div style={{
              background: '#FFFFFF', borderRadius: '8px', border: '1px solid #D8E2EE',
              borderTop: '3px solid #6B3FA0', padding: '16px',
            }}>
              <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '8px' }}>
                CHAMPS SUIVIS
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#0A1628' }}>
                {data.fields.length} champs
              </div>
            </div>
          </div>

          {/* ── Section 2 : Complétude par champ ──────────────────────────── */}
          <div style={{ ...CARD_STYLE, marginBottom: '24px' }}>
            <CardHeader title="Complétude par champ" subtitle="Pourcentage de données renseignées" />
            <div>
              {data.fields.map((field, idx) => {
                const color = completenessColor(field.completeness_pct);
                return (
                  <div
                    key={field.column}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px',
                      padding: '8px 0',
                      borderBottom: idx < data.fields.length - 1 ? '1px solid #EEF1F6' : 'none',
                    }}
                  >
                    <div style={{ width: '180px', flexShrink: 0, fontSize: '13px', fontWeight: 500, color: '#0A1628' }}>
                      {field.label}
                    </div>
                    <div style={{ flex: 1, height: '8px', borderRadius: '4px', background: '#EEF1F6' }}>
                      <div style={{
                        height: '8px', borderRadius: '4px',
                        width: `${field.completeness_pct}%`,
                        background: color,
                        transition: 'width 0.3s',
                      }} />
                    </div>
                    <div style={{ width: '60px', textAlign: 'right', fontSize: '12px', fontWeight: 600, color, flexShrink: 0 }}>
                      {field.completeness_pct.toFixed(1)}%
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Section 3 : Complétude par district ───────────────────────── */}
          <div style={CARD_STYLE}>
            <CardHeader title="Complétude par district" subtitle="Score moyen de remplissage" />
            <ResponsiveContainer width="100%" height={Math.max(40 * data.by_district.length + 40, 200)}>
              <BarChart data={data.by_district} layout="vertical" margin={{ top: 4, right: 48, bottom: 4, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis
                  type="number"
                  domain={[0, 100]}
                  tick={{ fontSize: 11, fill: '#7A90A8' }}
                  tickFormatter={(v) => `${v}%`}
                />
                <YAxis type="category" dataKey="district" tick={{ fontSize: 11, fill: '#7A90A8' }} width={110} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '12px' }}
                  formatter={(v: number) => [`${v.toFixed(1)}%`, 'Complétude']}
                />
                <Bar dataKey="completeness_pct" barSize={18} radius={[0, 3, 3, 0]}>
                  {data.by_district.map((entry) => (
                    <Cell key={entry.district} fill={dc(entry.district)} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
