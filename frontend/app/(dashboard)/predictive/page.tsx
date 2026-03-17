'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { predict } from '@/lib/api';
import type { PredictInput, PredictOutput } from '@/lib/types';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

const DISTRICTS = [
  'Dubai Marina', 'JVC', 'Business Bay', 'Downtown Dubai',
  'Palm Jumeirah', 'DIFC', 'Dubai Hills', 'Al Barsha', 'Jumeirah',
];

const INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #D8E2EE',
  borderRadius: '6px',
  fontSize: '13px',
  fontFamily: 'Inter, sans-serif',
  color: '#0A1628',
  background: '#FFFFFF',
  outline: 'none',
  boxSizing: 'border-box',
};

const LABEL_STYLE: React.CSSProperties = {
  display: 'block',
  fontSize: '11px',
  fontWeight: 500,
  textTransform: 'uppercase',
  letterSpacing: '1px',
  color: '#7A90A8',
  marginBottom: '4px',
};

const CARD_STYLE: React.CSSProperties = {
  background: '#FFFFFF',
  border: '1px solid #D8E2EE',
  borderRadius: '8px',
  boxShadow: '0 1px 4px rgba(10,22,40,0.06)',
  padding: '24px',
};

function r2Color(r2: number): string {
  if (r2 >= 0.8) return '#1A7A4A';
  if (r2 >= 0.6) return '#C9A84C';
  return '#C0392B';
}

function fmtPrice(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M AED`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}k AED`;
  return `${Math.round(n)} AED`;
}

const NOW = new Date();

type FormState = {
  district: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  size_sqm: number;
  floor_percentile: number;
  view_quality: number;
  renovation_status: string;
  age_years: number;
  parking_spaces: number;
  has_balcony: boolean;
  has_maids_room: boolean;
  furnishing: string;
  dist_to_metro_m: number;
  dist_to_mall_m: number;
  dist_to_beach_m: number;
  service_charge_aed_per_sqm_year: number;
  month_listed: number;
  year_listed: number;
};

const DEFAULTS: FormState = {
  district: 'Dubai Marina',
  property_type: 'apartment',
  bedrooms: 2,
  bathrooms: 2,
  size_sqm: 85,
  floor_percentile: 0.5,
  view_quality: 3,
  renovation_status: 'original',
  age_years: 5,
  parking_spaces: 1,
  has_balcony: true,
  has_maids_room: false,
  furnishing: 'unfurnished',
  dist_to_metro_m: 500,
  dist_to_mall_m: 1000,
  dist_to_beach_m: 2000,
  service_charge_aed_per_sqm_year: 30,
  month_listed: NOW.getMonth() + 1,
  year_listed: 2026,
};

function FieldWrap({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={LABEL_STYLE}>{label}</label>
      {children}
    </div>
  );
}

export default function PredictivePage() {
  const { selectedDistricts, language } = useAppStore();
  const [form, setForm]       = useState<FormState>({ ...DEFAULTS, district: selectedDistricts[0] ?? 'Dubai Marina' });
  const [result, setResult]   = useState<PredictOutput | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const [btnHover, setBtnHover] = useState(false);

  function set<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    setLoading(true);
    setError(null);
    const input: PredictInput = {
      district:                        form.district,
      property_type:                   form.property_type,
      bedrooms:                        Number(form.bedrooms),
      bathrooms:                       Number(form.bathrooms),
      size_sqm:                        Number(form.size_sqm),
      floor_percentile:                Number(form.floor_percentile),
      view_quality:                    Number(form.view_quality),
      renovation_status:               form.renovation_status,
      age_years:                       Number(form.age_years),
      parking_spaces:                  Number(form.parking_spaces),
      has_balcony:                     Boolean(form.has_balcony),
      has_maids_room:                  Boolean(form.has_maids_room),
      furnishing:                      form.furnishing,
      dist_to_metro_m:                 Number(form.dist_to_metro_m),
      dist_to_mall_m:                  Number(form.dist_to_mall_m),
      dist_to_beach_m:                 Number(form.dist_to_beach_m),
      service_charge_aed_per_sqm_year: Number(form.service_charge_aed_per_sqm_year),
      month_listed:                    Number(form.month_listed),
      year_listed:                     Number(form.year_listed),
    };
    try {
      const out = await predict(input);
      setResult(out);
    } catch (e: any) {
      setError(e.message ?? 'Erreur de prédiction');
    } finally {
      setLoading(false);
    }
  }

  const topFeatures = result
    ? [...result.feature_importance.price]
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 8)
    : [];

  return (
    <div style={{ padding: '32px', background: '#F4F6F9', minHeight: '100%' }}>

      {/* Page header */}
      <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '26px', fontWeight: 600, color: '#0A1628' }}>
        Predictive Model
      </div>
      <div style={{ fontSize: '13px', color: '#7A90A8', marginTop: '4px' }}>
        {language === 'fr' ? 'Estimation prix, yield et DOM par machine learning' : 'Price, yield and DOM estimation using machine learning'}
      </div>
      <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '12px 0 24px' }} />

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '24px', alignItems: 'start' }}>

        {/* ── Left : Form ───────────────────────────────────────────────── */}
        <div style={CARD_STYLE}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '12px' }}>
            {language === 'fr' ? 'Paramètres du bien' : 'Property parameters'}
          </div>
          <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '20px' }} />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>

            <FieldWrap label="District">
              <select style={INPUT_STYLE} value={form.district} onChange={e => set('district', e.target.value)}>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Type de bien' : 'Property type'}>
              <select style={INPUT_STYLE} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {['apartment', 'villa', 'townhouse', 'penthouse'].map(v => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Chambres' : 'Bedrooms'}>
              <select style={INPUT_STYLE} value={form.bedrooms} onChange={e => set('bedrooms', Number(e.target.value))}>
                {[0, 1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Salles de bain' : 'Bathrooms'}>
              <select style={INPUT_STYLE} value={form.bathrooms} onChange={e => set('bathrooms', Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Surface (sqm)' : 'Size (sqm)'}>
              <input type="number" style={INPUT_STYLE} min={20} max={1000}
                value={form.size_sqm} onChange={e => set('size_sqm', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label="Floor percentile">
              <input type="number" style={INPUT_STYLE} min={0} max={1} step={0.1}
                value={form.floor_percentile} onChange={e => set('floor_percentile', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Vue (1–5)' : 'View (1–5)'}>
              <select style={INPUT_STYLE} value={form.view_quality} onChange={e => set('view_quality', Number(e.target.value))}>
                {[1, 2, 3, 4, 5].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Rénovation' : 'Renovation'}>
              <select style={INPUT_STYLE} value={form.renovation_status} onChange={e => set('renovation_status', e.target.value)}>
                {['new', 'renovated', 'original'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Âge (années)' : 'Age (years)'}>
              <input type="number" style={INPUT_STYLE} min={0} max={30}
                value={form.age_years} onChange={e => set('age_years', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label="Parking">
              <select style={INPUT_STYLE} value={form.parking_spaces} onChange={e => set('parking_spaces', Number(e.target.value))}>
                {[0, 1, 2, 3].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Balcon' : 'Balcony'}>
              <select style={INPUT_STYLE}
                value={form.has_balcony ? 'true' : 'false'}
                onChange={e => set('has_balcony', e.target.value === 'true')}>
                <option value="true">{language === 'fr' ? 'Oui' : 'Yes'}</option>
                <option value="false">{language === 'fr' ? 'Non' : 'No'}</option>
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Chambre de bonne' : "Maid's room"}>
              <select style={INPUT_STYLE}
                value={form.has_maids_room ? 'true' : 'false'}
                onChange={e => set('has_maids_room', e.target.value === 'true')}>
                <option value="true">{language === 'fr' ? 'Oui' : 'Yes'}</option>
                <option value="false">{language === 'fr' ? 'Non' : 'No'}</option>
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Ameublement' : 'Furnishing'}>
              <select style={INPUT_STYLE} value={form.furnishing} onChange={e => set('furnishing', e.target.value)}>
                {['unfurnished', 'semi-furnished', 'furnished'].map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Dist. metro (m)' : 'Dist. to metro (m)'}>
              <input type="number" style={INPUT_STYLE} min={0} max={5000}
                value={form.dist_to_metro_m} onChange={e => set('dist_to_metro_m', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Dist. mall (m)' : 'Dist. to mall (m)'}>
              <input type="number" style={INPUT_STYLE} min={0} max={5000}
                value={form.dist_to_mall_m} onChange={e => set('dist_to_mall_m', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Dist. plage (m)' : 'Dist. to beach (m)'}>
              <input type="number" style={INPUT_STYLE} min={0} max={10000}
                value={form.dist_to_beach_m} onChange={e => set('dist_to_beach_m', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label="Service charge (AED/sqm/yr)">
              <input type="number" style={INPUT_STYLE} min={0} max={200}
                value={form.service_charge_aed_per_sqm_year}
                onChange={e => set('service_charge_aed_per_sqm_year', Number(e.target.value))} />
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Mois' : 'Month'}>
              <select style={INPUT_STYLE} value={form.month_listed} onChange={e => set('month_listed', Number(e.target.value))}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </FieldWrap>

            <FieldWrap label={language === 'fr' ? 'Année' : 'Year'}>
              <select style={INPUT_STYLE} value={form.year_listed} onChange={e => set('year_listed', Number(e.target.value))}>
                {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </FieldWrap>

            {/* Submit button spanning 2 columns */}
            <div style={{ gridColumn: 'span 2', marginTop: '8px' }}>
              {error && (
                <div style={{ color: '#C0392B', fontSize: '12px', marginBottom: '10px' }}>{error}</div>
              )}
              <button
                onClick={handleSubmit}
                disabled={loading}
                onMouseEnter={() => setBtnHover(true)}
                onMouseLeave={() => setBtnHover(false)}
                style={{
                  width: '100%',
                  padding: '12px',
                  background: loading ? '#0A1628' : btnHover ? '#1B3A5C' : '#0A1628',
                  color: '#FFFFFF',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  border: 'none',
                  transition: 'background 0.15s',
                }}
              >
                {loading ? (language === 'fr' ? 'Calcul en cours...' : 'Calculating...') : (language === 'fr' ? 'Lancer la prédiction' : 'Run prediction')}
              </button>
            </div>
          </div>
        </div>

        {/* ── Right : Results ───────────────────────────────────────────── */}
        {result && (
          <div style={CARD_STYLE}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#0A1628', marginBottom: '12px' }}>
              {language === 'fr' ? 'Résultat de la prédiction' : 'Prediction result'}
            </div>
            <div style={{ height: '1px', background: '#EEF1F6', marginBottom: '20px' }} />

            {/* KPI mini-cards */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                {
                  label: language === 'fr' ? 'PRIX ESTIMÉ/SQM' : 'EST. PRICE/SQM',
                  value: `${result.predicted_price_per_sqm.toLocaleString('en-US')} AED`,
                  topColor: '#1E5FA8',
                },
                {
                  label: language === 'fr' ? 'PRIX TOTAL ESTIMÉ' : 'EST. TOTAL PRICE',
                  value: fmtPrice(result.predicted_total_price),
                  topColor: '#0A1628',
                },
                {
                  label: language === 'fr' ? 'YIELD BRUT ESTIMÉ' : 'EST. GROSS YIELD',
                  value: `${result.predicted_gross_yield_pct.toFixed(2)}%`,
                  topColor: '#1A7A4A',
                },
                {
                  label: language === 'fr' ? 'DOM ESTIMÉ' : 'EST. DOM',
                  value: `${Math.round(result.predicted_days_on_market)} ${language === 'fr' ? 'jours' : 'days'}`,
                  topColor: '#C9A84C',
                },
              ].map(({ label, value, topColor }) => (
                <div key={label} style={{
                  border: '1px solid #D8E2EE',
                  borderTop: `3px solid ${topColor}`,
                  borderRadius: '8px',
                  padding: '14px',
                }}>
                  <div style={{ fontSize: '9px', fontWeight: 600, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#7A90A8', marginBottom: '4px' }}>
                    {label}
                  </div>
                  <div style={{ fontSize: '22px', fontWeight: 700, color: '#0A1628' }}>
                    {value}
                  </div>
                </div>
              ))}
            </div>

            {/* Model confidence */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0A1628', marginTop: '20px', marginBottom: '10px' }}>
              {language === 'fr' ? 'Confiance du modèle' : 'Model confidence'}
            </div>
            {[
              { label: 'Prix R²',  r2: result.confidence.price_r2 },
              { label: 'Yield R²', r2: result.confidence.yield_r2 },
              { label: 'DOM R²',   r2: result.confidence.dom_r2 },
            ].map(({ label, r2 }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                <div style={{ width: '70px', flexShrink: 0, fontSize: '11px', color: '#7A90A8' }}>{label}</div>
                <div style={{ flex: 1, height: '6px', borderRadius: '3px', background: '#EEF1F6' }}>
                  <div style={{
                    height: '6px', borderRadius: '3px',
                    width: `${r2 * 100}%`,
                    background: r2Color(r2),
                    transition: 'width 0.3s',
                  }} />
                </div>
                <div style={{ width: '48px', textAlign: 'right', fontSize: '11px', fontWeight: 600, color: r2Color(r2), flexShrink: 0 }}>
                  {r2.toFixed(3)}
                </div>
              </div>
            ))}

            {/* Feature importance */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#0A1628', marginTop: '20px', marginBottom: '10px' }}>
              {language === 'fr' ? 'Variables clés (prix)' : 'Key features (price)'}
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={topFeatures} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" />
                <XAxis type="number" tick={{ fontSize: 10, fill: '#7A90A8' }} />
                <YAxis type="category" dataKey="feature" tick={{ fontSize: 10, fill: '#7A90A8' }} width={120} />
                <Tooltip
                  contentStyle={{ background: '#FFFFFF', border: '1px solid #D8E2EE', borderRadius: '6px', fontSize: '11px' }}
                  formatter={(v: number) => [v.toFixed(4), 'Importance']}
                />
                <Bar dataKey="importance" fill="#1E5FA8" barSize={14} radius={[0, 3, 3, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
