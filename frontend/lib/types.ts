// ─── Backend API response shapes ───────────────────────────────────────────

export interface SnapshotResponse {
  n_listings: number;
  median_price_sqm: number;
  p25_price_sqm: number;
  p75_price_sqm: number;
  median_dom: number;
  fast_sale_30d_pct: number;
  fast_sale_60d_pct: number;
  median_gross_yield: number;
  median_net_yield: number;
  median_vacancy_days: number;
  median_service_charge: number;
  price_consistency_cv: number;
  liquidity_depth_ratio: number;
  price_trend_3m: number;
  price_trend_6m: number;
  price_trend_12m: number;
  districts: string[];
}

export interface CompareItem extends SnapshotResponse {
  district: string;
}

export interface CompareResponse {
  data: CompareItem[];
}

export interface BarzelPillar {
  liquidity: number;   // 0-25
  yield: number;       // 0-25
  risk: number;        // 0-25
  trend: number;       // 0-25
  total: number;       // 0-100
  label: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
}

export interface BarzelDistrictScore extends BarzelPillar {
  district: string;
  n_listings: number;
  median_price_sqm: number;
  median_net_yield: number;
  median_dom: number;
  price_trend_6m: number;
  price_consistency_cv: number;
}

export interface ScoreResponse {
  aggregate: BarzelPillar & { districts: string[] };
  by_district: BarzelDistrictScore[];
}

export interface TypologyItem {
  bedrooms: number;
  count: number;
  share: number;
  median_price_sqm: number;
  median_price: number;
  median_yield: number;
  median_dom: number;
}

export interface TypologyResponse {
  data: TypologyItem[];
}

export interface TimeseriesPoint {
  period: string;
  district: string;
  median_price_sqm: number;
  n_listings: number;
}

export interface TimeseriesResponse {
  data: TimeseriesPoint[];
}

export interface YieldBucket {
  bucket: string;
  count: number;
  share: number;
}

export interface YieldDistributionResponse {
  data: YieldBucket[];
}

export interface DomBucket {
  bucket: string;
  count: number;
  share: number;
  cumulative_pct: number;
}

export interface DomDistributionResponse {
  data: DomBucket[];
}

// ─── Map ─────────────────────────────────────────────────────────────────────

export interface MapListing {
  id: string;
  district: string;
  property_type: string;
  bedrooms: number;
  size_sqm: number;
  sale_price_aed: number;
  price_per_sqm: number;
  gross_yield_pct: number;
  days_on_market: number;
  lat: number;
  lng: number;
}

export interface MapListingsResponse {
  data: MapListing[];
}

// ─── Costs ───────────────────────────────────────────────────────────────────

export interface ServiceChargeTypology {
  district: string;
  bedrooms: number;
  median_service_charge: number;
  median_net_yield: number;
  median_gross_yield: number;
  cost_to_yield_ratio: number | null;
  count: number;
}

export interface ServiceChargeTypologyResponse {
  data: ServiceChargeTypology[];
}

// ─── Pricing ─────────────────────────────────────────────────────────────────

export interface PriceBucket {
  district: string;
  bucket: string;
  bucket_start: number;
  count: number;
  share: number;
}

export interface PriceDistributionResponse {
  data: PriceBucket[];
}

export interface PriceScatterPoint {
  district: string;
  size_sqm: number;
  price_per_sqm_aed: number;
  sale_price_aed: number;
  bedrooms: number;
  property_type: string;
  gross_yield_pct: number;
}

export interface PriceScatterResponse {
  data: PriceScatterPoint[];
}

// ─── Predict ────────────────────────────────────────────────────────────────

export interface PredictInput {
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
}

export interface FeatureImportanceItem {
  feature: string;
  importance: number;
}

export interface PredictOutput {
  predicted_price_per_sqm: number;
  predicted_total_price: number;
  predicted_gross_yield_pct: number;
  predicted_days_on_market: number;
  confidence: {
    price_r2: number;
    price_mae_aed_sqm: number;
    yield_r2: number;
    yield_mae_pct: number;
    dom_r2: number;
    dom_mae_days: number;
  };
  feature_importance: {
    price: FeatureImportanceItem[];
    yield: FeatureImportanceItem[];
    dom: FeatureImportanceItem[];
  };
}

// ─── Ask ────────────────────────────────────────────────────────────────────

export interface AskRequest {
  question: string;
  language: 'en' | 'fr';
  context?: {
    selectedDistricts?: string[];
    currentPage?: string;
  };
}

export interface AskResponse {
  answer: string;
  sources?: string[];
}
