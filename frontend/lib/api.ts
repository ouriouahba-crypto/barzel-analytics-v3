import {
  SnapshotResponse,
  CompareResponse,
  ScoreResponse,
  TypologyResponse,
  TimeseriesResponse,
  YieldDistributionResponse,
  DomDistributionResponse,
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
  return res.json() as Promise<T>;
}

function districtsParam(districts: string[]): string {
  return districts.map((d) => `districts=${encodeURIComponent(d)}`).join('&');
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export async function getSnapshot(districts: string[]): Promise<SnapshotResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<SnapshotResponse>(`/api/analytics/snapshot${q}`);
}

export async function getCompare(districts: string[]): Promise<CompareResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<CompareResponse>(`/api/analytics/compare${q}`);
}

export async function getScore(districts: string[]): Promise<ScoreResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<ScoreResponse>(`/api/analytics/score${q}`);
}

export async function getTypology(districts: string[]): Promise<TypologyResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<TypologyResponse>(`/api/analytics/typology${q}`);
}

export async function getTimeseries(districts: string[]): Promise<TimeseriesResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<TimeseriesResponse>(`/api/analytics/timeseries${q}`);
}

export async function getYieldDistribution(districts: string[]): Promise<YieldDistributionResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<YieldDistributionResponse>(`/api/analytics/yield-distribution${q}`);
}

export async function getDomDistribution(districts: string[]): Promise<DomDistributionResponse> {
  const q = districts.length ? `?${districtsParam(districts)}` : '';
  return fetchApi<DomDistributionResponse>(`/api/analytics/dom-distribution${q}`);
}

// ─── Predict ─────────────────────────────────────────────────────────────────

export async function predict(input: PredictInput): Promise<PredictOutput> {
  return fetchApi<PredictOutput>('/api/predict', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

// ─── Ask ─────────────────────────────────────────────────────────────────────

export async function ask(request: AskRequest): Promise<AskResponse> {
  return fetchApi<AskResponse>('/api/ask', {
    method: 'POST',
    body: JSON.stringify(request),
  });
}

// ─── PDF ─────────────────────────────────────────────────────────────────────

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
