import { create } from 'zustand';

// Minimal listing shape for global store (raw CSV row subset)
export interface Listing {
  id: string;
  district: string;
  sale_price_aed: number;
  price_per_sqm_aed: number;
  size_sqm: number;
  bedrooms: number;
  property_type: string;
  days_on_market: number;
  latitude: number;
  longitude: number;
  first_seen: string;
}

interface AppState {
  selectedDistricts: string[];
  listings: Listing[];
  language: 'en' | 'fr';
  setSelectedDistricts: (districts: string[]) => void;
  toggleDistrict: (district: string) => void;
  setListings: (listings: Listing[]) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedDistricts: [],
  listings: [],
  language: 'fr',

  setSelectedDistricts: (districts) =>
    set({ selectedDistricts: districts }),

  toggleDistrict: (district) =>
    set((state) => ({
      selectedDistricts: state.selectedDistricts.includes(district)
        ? state.selectedDistricts.filter((d) => d !== district)
        : [...state.selectedDistricts, district],
    })),

  setListings: (listings) => set({ listings }),

  setLanguage: (language) => set({ language }),
}));
