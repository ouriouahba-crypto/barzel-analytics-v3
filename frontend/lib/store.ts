import { create } from 'zustand';
import { Listing } from './types';

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
