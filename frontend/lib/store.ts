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
  availableDistricts: string[];
  selectedDistricts: string[];
  listings: Listing[];
  language: 'en' | 'fr';
  setAvailableDistricts: (districts: string[]) => void;
  setSelectedDistricts: (districts: string[]) => void;
  toggleDistrict: (district: string) => void;
  setListings: (listings: Listing[]) => void;
  setLanguage: (lang: 'en' | 'fr') => void;
}

export const useAppStore = create<AppState>((set) => ({
  availableDistricts: [],
  selectedDistricts: [],
  listings: [],
  language: 'fr',

  setAvailableDistricts: (districts) =>
    set({ availableDistricts: districts }),

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
