export interface District {
  id: string;
  name: string;
  city: string;
  coordinates: [number, number]; // [lat, lng]
}

export interface Listing {
  id: string;
  district: string;
  city: string;
  price: number;
  pricePerSqm: number;
  surface: number;
  rooms: number;
  propertyType: 'apartment' | 'house' | 'commercial';
  daysOnMarket: number;
  yearBuilt: number;
  floor?: number;
  hasParking: boolean;
  hasBalcony: boolean;
  energyClass?: string;
  lat: number;
  lng: number;
  listedAt: string; // ISO date
}

export interface BarzelScore {
  district: string;
  overall: number;          // 0-100
  pricing: number;          // 0-100
  liquidity: number;        // 0-100
  yield: number;            // 0-100
  risk: number;             // 0-100
  trend: number;            // 0-100
  label: 'Strong Buy' | 'Buy' | 'Neutral' | 'Sell' | 'Strong Sell';
}

export interface SnapshotKPIs {
  district: string;
  medianPrice: number;
  medianPricePerSqm: number;
  avgDaysOnMarket: number;
  activeListings: number;
  priceChange3m: number;    // percentage
  priceChange12m: number;   // percentage
  absorptionRate: number;   // listings sold per month / active listings
  stockMonths: number;      // months of inventory
  grossYield: number;       // percentage
  netYield: number;         // percentage
  barzelScore: BarzelScore;
  priceHistory: { date: string; median: number }[];
}

export interface PredictInput {
  district: string;
  surface: number;
  rooms: number;
  floor: number;
  hasParking: boolean;
  hasBalcony: boolean;
  yearBuilt: number;
  propertyType: 'apartment' | 'house' | 'commercial';
  energyClass?: string;
}

export interface PredictOutput {
  estimatedPrice: number;
  estimatedPricePerSqm: number;
  confidenceInterval: [number, number];
  comparables: Listing[];
  featureImportance: { feature: string; importance: number }[];
}

export interface CompareData {
  districts: string[];
  metrics: {
    name: string;
    key: string;
    values: Record<string, number>;
    unit: string;
  }[];
}

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
