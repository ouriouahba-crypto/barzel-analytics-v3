import {
  SnapshotKPIs,
  CompareData,
  BarzelScore,
  PredictInput,
  PredictOutput,
  AskRequest,
  AskResponse,
} from './types';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchApi<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const error = await res.text();
    throw new Error(`API error ${res.status}: ${error}`);
  }
  return res.json();
}

export async function getSnapshot(district: string): Promise<SnapshotKPIs> {
  return fetchApi<SnapshotKPIs>(`/api/analytics/snapshot?district=${encodeURIComponent(district)}`);
}

export async function getCompare(districts: string[]): Promise<CompareData> {
  const params = districts.map((d) => `districts=${encodeURIComponent(d)}`).join('&');
  return fetchApi<CompareData>(`/api/analytics/compare?${params}`);
}

export async function getScore(district: string): Promise<BarzelScore> {
  return fetchApi<BarzelScore>(`/api/analytics/score?district=${encodeURIComponent(district)}`);
}

export async function predict(input: PredictInput): Promise<PredictOutput> {
  return fetchApi<PredictOutput>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

export async function ask(request: AskRequest): Promise<AskResponse> {
  return fetchApi<AskResponse>('/api/ask', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

export async function generatePdf(districts: string[], language: 'en' | 'fr'): Promise<Blob> {
  const res = await fetch(`${BASE_URL}/api/pdf/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ districts, language }),
  });
  if (!res.ok) throw new Error(`PDF error ${res.status}`);
  return res.blob();
}

export async function checkHealth(): Promise<{ status: string }> {
  return fetchApi<{ status: string }>('/api/health');
}
