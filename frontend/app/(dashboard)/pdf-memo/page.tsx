'use client';

import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { generatePdf } from '@/lib/api';

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

const DownloadIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

export default function PdfMemoPage() {
  const { selectedDistricts, language } = useAppStore();
  const [pdfLang, setPdfLang] = useState<'fr' | 'en'>(language);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (selectedDistricts.length === 0 || loading) return;
    setLoading(true);
    setSuccess(false);
    setError(null);
    try {
      const blob = await generatePdf(selectedDistricts, pdfLang);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'barzel-memo.pdf';
      a.click();
      URL.revokeObjectURL(url);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erreur lors de la génération du PDF');
    } finally {
      setLoading(false);
    }
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 10,
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '1.5px',
    color: '#7A90A8',
    marginBottom: 8,
    display: 'block',
  };

  return (
    <div style={{ padding: 32, background: '#F4F6F9', minHeight: '100%' }}>
      {/* Header */}
      <div style={{ fontFamily: '"Playfair Display", serif', fontSize: 26, fontWeight: 600, color: '#0A1628' }}>
        PDF Memo Builder
      </div>
      <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 13, color: '#7A90A8', marginTop: 4 }}>
        {language === 'fr' ? "Générer un mémo d'investissement professionnel" : 'Generate a professional investment memo'}
      </div>
      <div style={{ width: 40, height: 2, background: '#C9A84C', margin: '12px 0 24px' }} />

      {/* Two-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

        {/* ── Left column: Configuration ── */}
        <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 16 }}>
            {language === 'fr' ? 'Configuration du rapport' : 'Report configuration'}
          </div>
          <div style={{ height: 1, background: '#EEF1F6', marginBottom: 16 }} />

          {/* Districts */}
          <div>
            <span style={labelStyle}>{language === 'fr' ? 'DISTRICTS SÉLECTIONNÉS' : 'SELECTED DISTRICTS'}</span>
            {selectedDistricts.length === 0 ? (
              <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#C0392B' }}>
                {language === 'fr' ? 'Aucun district sélectionné' : 'No district selected'}
              </div>
            ) : (
              <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                {selectedDistricts.map(d => (
                  <div key={d} style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    background: '#F4F6F9', border: '1px solid #D8E2EE',
                    borderRadius: 4, padding: '4px 10px', fontSize: 12,
                    fontFamily: 'Inter, sans-serif', color: '#0A1628',
                    marginRight: 6, marginBottom: 6,
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: DISTRICT_COLORS[d] ?? '#7A90A8', flexShrink: 0,
                    }} />
                    {d}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Language */}
          <div style={{ marginTop: 20 }}>
            <span style={labelStyle}>{language === 'fr' ? 'LANGUE' : 'LANGUAGE'}</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['fr', 'en'] as const).map(l => (
                <button
                  key={l}
                  onClick={() => setPdfLang(l)}
                  style={{
                    padding: '8px 20px', borderRadius: 6, fontSize: 13, fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'Inter, sans-serif',
                    background: pdfLang === l ? '#0A1628' : '#FFFFFF',
                    color: pdfLang === l ? '#FFFFFF' : '#3D5470',
                    border: `1px solid ${pdfLang === l ? '#0A1628' : '#D8E2EE'}`,
                    transition: 'all 0.15s',
                  }}
                >
                  {l === 'fr' ? 'Français' : 'English'}
                </button>
              ))}
            </div>
          </div>

          {/* Sections */}
          <div style={{ marginTop: 20 }}>
            <span style={labelStyle}>{language === 'fr' ? 'SECTIONS DU RAPPORT' : 'REPORT SECTIONS'}</span>
            {[
              language === 'fr' ? "Vue d'ensemble — KPIs agrégés" : 'Overview — Aggregate KPIs',
              language === 'fr' ? 'Comparaison des districts — tableau détaillé' : 'District comparison — detailed table',
              language === 'fr' ? 'Barzel Scores — scoring par district' : 'Barzel Scores — scoring by district',
            ].map(item => (
              <div key={item} style={{
                display: 'flex', gap: 8, alignItems: 'center',
                padding: '6px 0', fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#3D5470',
              }}>
                <span style={{ color: '#1A7A4A', fontWeight: 700 }}>✓</span>
                {item}
              </div>
            ))}
          </div>

          {/* Generate button */}
          <div style={{ marginTop: 24 }}>
            <button
              onClick={handleGenerate}
              disabled={selectedDistricts.length === 0 || loading}
              style={{
                width: '100%', padding: 14, background: '#0A1628', color: '#FFFFFF',
                borderRadius: 6, fontSize: 14, fontWeight: 600,
                fontFamily: 'Inter, sans-serif', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                cursor: selectedDistricts.length === 0 || loading ? 'not-allowed' : 'pointer',
                opacity: selectedDistricts.length === 0 || loading ? 0.7 : 1,
                transition: 'opacity 0.15s',
              }}
            >
              <DownloadIcon />
              {loading ? (language === 'fr' ? 'Génération en cours...' : 'Generating...') : (language === 'fr' ? 'Générer le PDF' : 'Generate PDF')}
            </button>

            {success && (
              <div style={{
                background: '#E8F5EE', border: '1px solid #1A7A4A', borderRadius: 6,
                padding: 10, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#1A7A4A',
                marginTop: 8,
              }}>
                {language === 'fr' ? '✓ PDF généré avec succès — téléchargement lancé' : '✓ PDF generated successfully — download started'}
              </div>
            )}
            {error && (
              <div style={{
                background: '#FDF0EE', border: '1px solid #C0392B', borderRadius: 6,
                padding: 10, fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#C0392B',
                marginTop: 8,
              }}>
                ✗ {error}
              </div>
            )}
          </div>
        </div>

        {/* ── Right column: Preview ── */}
        <div style={{ background: '#FFFFFF', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 14, fontWeight: 600, color: '#0A1628', marginBottom: 16 }}>
            {language === 'fr' ? 'Aperçu du mémo' : 'Memo preview'}
          </div>
          <div style={{ height: 1, background: '#EEF1F6', marginBottom: 16 }} />

          {/* Fake PDF preview */}
          <div style={{
            border: '1px solid #D8E2EE', borderRadius: 4, padding: 24,
            background: '#FFFFFF', minHeight: 500,
          }}>
            {/* Header */}
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 9, textTransform: 'uppercase', letterSpacing: '2px', color: '#7A90A8' }}>
              Barzel Analytics
            </div>
            <div style={{ width: 30, height: 2, background: '#C9A84C', marginTop: 4, marginBottom: 16 }} />
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 18, fontWeight: 700, color: '#0A1628' }}>
              Barzel Investment Memo
            </div>
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: '#7A90A8', marginTop: 2 }}>
              Market Analysis · Dubai · {selectedDistricts.length} district{selectedDistricts.length !== 1 ? 's' : ''} · — listings
            </div>

            <div style={{ height: 20 }} />

            {/* Fake Overview */}
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>
              Overview
            </div>
            <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
              {[0, 1, 2, 3].map(i => (
                <div key={i} style={{ width: 60, height: 20, background: '#EEF1F6', borderRadius: 3 }} />
              ))}
            </div>

            {/* Fake Comparison */}
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>
              District Comparison
            </div>
            <div style={{ marginBottom: 16 }}>
              {[0, 1, 2, 3, 4].map(i => (
                <div key={i} style={{
                  height: 12, borderRadius: 2, marginBottom: 3,
                  background: i % 2 === 0 ? '#EEF1F6' : '#FFFFFF',
                  border: '1px solid #EEF1F6',
                }} />
              ))}
            </div>

            {/* Fake Barzel Score */}
            <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, fontWeight: 600, color: '#0A1628', marginBottom: 8 }}>
              Barzel Score
            </div>
            <div>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  height: 12, borderRadius: 2, marginBottom: 3,
                  background: i % 2 === 0 ? '#EEF1F6' : '#FFFFFF',
                  border: '1px solid #EEF1F6',
                }} />
              ))}
            </div>

            {/* Disclaimer */}
            <div style={{
              marginTop: 40, fontFamily: 'Inter, sans-serif', fontSize: 8,
              color: '#7A90A8', fontStyle: 'italic',
            }}>
              {language === 'fr' ? 'Ce document est généré automatiquement par Barzel Analytics V3. Il ne constitue pas un conseil en investissement.' : 'This document is automatically generated by Barzel Analytics V3. It does not constitute investment advice.'}
            </div>
          </div>

          <div style={{
            marginTop: 12, fontFamily: 'Inter, sans-serif', fontSize: 11,
            color: '#7A90A8', fontStyle: 'italic', textAlign: 'center',
          }}>
            {language === 'fr' ? 'Le PDF généré contiendra les données réelles des districts sélectionnés' : 'The generated PDF will contain real data from selected districts'}
          </div>
        </div>
      </div>
    </div>
  );
}
