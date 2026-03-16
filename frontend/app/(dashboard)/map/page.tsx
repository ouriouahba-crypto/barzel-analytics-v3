'use client';

import { useEffect, useState, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { getMapListings, getScore } from '@/lib/api';
import type { MapListing, BarzelDistrictScore } from '@/lib/types';

const DISTRICT_COLORS: Record<string, string> = {
  'Dubai Marina':    '#1E5FA8',
  'JVC':             '#1A7A4A',
  'Business Bay':    '#C9A84C',
  'Downtown Dubai':  '#6B3FA0',
  'Palm Jumeirah':   '#C0392B',
  'DIFC':            '#2E86D4',
  'Dubai Hills':     '#E67E22',
  'Al Barsha':       '#7A90A8',
  'Jumeirah':        '#0A1628',
};

function districtColor(district: string): string {
  return DISTRICT_COLORS[district] ?? '#1E5FA8';
}

function scoreColor(total: number): string {
  if (total >= 70) return '#1A7A4A';
  if (total >= 55) return '#1E5FA8';
  if (total >= 40) return '#C9A84C';
  return '#C0392B';
}

function fmt(n: number): string {
  return n.toLocaleString('en-US');
}

export default function MapPage() {
  const { selectedDistricts } = useAppStore();
  const [listings, setListings] = useState<MapListing[]>([]);
  const [scores, setScores] = useState<BarzelDistrictScore[]>([]);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);

  // ── Data fetch ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (selectedDistricts.length === 0) return;
    setLoading(true);
    Promise.all([
      getMapListings(selectedDistricts),
      getScore(selectedDistricts),
    ]).then(([mapData, scoreData]) => {
      setListings(mapData.data);
      setScores(scoreData.by_district);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [selectedDistricts]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Leaflet map ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapRef.current || listings.length === 0) return;

    Promise.all([
      import('leaflet'),
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore – CSS module import, no type declarations needed
      import('leaflet/dist/leaflet.css'),
    ]).then(([L]) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.default.map(mapRef.current!, {
        center: [25.20, 55.27],
        zoom: 12,
        zoomControl: true,
      });

      mapInstanceRef.current = map;

      L.default.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© CartoDB © OpenStreetMap',
        maxZoom: 18,
      }).addTo(map);

      listings.forEach((listing) => {
        if (listing.lat == null || listing.lng == null) return;
        const color = districtColor(listing.district);

        const popup = L.default.popup({ maxWidth: 240 }).setContent(`
          <div style="font-family: Inter, sans-serif; font-size: 12px; line-height: 1.6;">
            <div style="font-weight: 700; color: ${color}; margin-bottom: 6px;">${listing.district}</div>
            <div>${listing.property_type} · ${listing.bedrooms} BR</div>
            <div>${fmt(listing.size_sqm)} sqm</div>
            <div style="margin-top: 4px;">
              <span style="font-weight: 600;">${fmt(listing.sale_price_aed)}</span> AED
            </div>
            <div>${fmt(listing.price_per_sqm)} AED/sqm</div>
            <div>Yield: <strong>${listing.gross_yield_pct?.toFixed(1)}%</strong></div>
            <div>DOM: <strong>${listing.days_on_market}</strong> days</div>
          </div>
        `);

        L.default.circleMarker([listing.lat, listing.lng], {
          radius: 5,
          fillColor: color,
          color: color,
          weight: 1,
          opacity: 0.9,
          fillOpacity: 0.7,
        }).bindPopup(popup).addTo(map);
      });

      const validListings = listings.filter(l => l.lat != null && l.lng != null);
      if (validListings.length > 0) {
        const bounds = L.default.latLngBounds(validListings.map(l => [l.lat, l.lng]));
        map.fitBounds(bounds, { padding: [30, 30] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [listings]);

  // ── District listing counts ───────────────────────────────────────────────
  const districtCounts: Record<string, number> = {};
  listings.forEach(l => {
    districtCounts[l.district] = (districtCounts[l.district] ?? 0) + 1;
  });

  return (
    <div style={{ position: 'relative', height: '100%', background: '#F4F6F9', overflow: 'hidden' }}>

      {/* Leaflet map container */}
      <div ref={mapRef} style={{ width: '100%', height: '100%' }} />

      {/* Top-left overlay panel */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 1000,
        background: '#FFFFFF',
        borderRadius: '8px',
        border: '1px solid #D8E2EE',
        boxShadow: '0 4px 16px rgba(10,22,40,0.10)',
        padding: '16px 20px',
        minWidth: '200px',
        maxWidth: '260px',
      }}>
        <div style={{ fontFamily: 'Playfair Display, serif', fontSize: '22px', fontWeight: 600, color: '#0A1628', lineHeight: 1.2 }}>
          Market Map
        </div>
        <div style={{ width: '40px', height: '2px', background: '#C9A84C', margin: '6px 0 10px' }} />

        {loading ? (
          <div style={{ fontSize: '12px', color: '#7A90A8' }}>Loading listings…</div>
        ) : (
          <div style={{ fontSize: '12px', color: '#7A90A8', marginBottom: '12px' }}>
            {listings.length.toLocaleString()} listings displayed
          </div>
        )}

        {/* District legend */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {selectedDistricts.map(d => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: districtColor(d), flexShrink: 0,
              }} />
              <span style={{ fontSize: '12px', color: '#0A1628', fontWeight: 500 }}>{d}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom-right scores panel */}
      {scores.length > 0 && (
        <div style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          zIndex: 1000,
          background: '#FFFFFF',
          borderRadius: '8px',
          border: '1px solid #D8E2EE',
          boxShadow: '0 4px 16px rgba(10,22,40,0.10)',
          padding: '16px',
          maxWidth: '280px',
          minWidth: '220px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 600, letterSpacing: '2px', color: '#7A90A8', textTransform: 'uppercase', marginBottom: '12px' }}>
            Barzel Scores
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {scores.map(s => (
              <div key={s.district}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '8px', height: '8px', borderRadius: '50%',
                      background: districtColor(s.district), flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '12px', color: '#0A1628', fontWeight: 500 }}>{s.district}</span>
                  </div>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: scoreColor(s.total) }}>
                    {s.total}
                  </span>
                </div>
                <div style={{ fontSize: '10px', color: '#7A90A8', marginLeft: '16px', marginTop: '1px' }}>
                  {(districtCounts[s.district] ?? 0).toLocaleString()} listings
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
