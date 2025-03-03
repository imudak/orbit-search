import { create } from 'zustand';
import type { Location, SearchFilters, Satellite, Pass } from '@/types';

interface AppState {
  selectedSatellite: Satellite | undefined;
  searchFilters: SearchFilters;
  satellites: Array<Satellite & { passes: Pass[] }>;
  isLoading: boolean;
  selectedLocation: Location;
}

interface AppActions {
  setSelectedSatellite: (satellite: Satellite | undefined) => void;
  setSearchFilters: (filters: SearchFilters) => void;
  setSatellites: (satellites: Array<Satellite & { passes: Pass[] }>) => void;
  setIsLoading: (isLoading: boolean) => void;
  setSelectedLocation: (location: Location) => void;
}

export const useAppStore = create<AppState & AppActions>((set) => ({
  selectedSatellite: undefined,
  searchFilters: {
    startDate: new Date(),
    endDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
    location: { lat: 35.6812, lng: 139.7671 },
    minElevation: 10,
    considerDaylight: false,
  },
  satellites: [],
  isLoading: false,
  selectedLocation: { lat: 35.6812, lng: 139.7671 },

  setSelectedSatellite: (satellite) => set({ selectedSatellite: satellite }),
  setSearchFilters: (filters) => set({ searchFilters: filters }),
  setSatellites: (satellites) => set({ satellites }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setSelectedLocation: (location) => set((state) => ({
    selectedLocation: location,
    searchFilters: {
      ...state.searchFilters,
      location,
    }
  })),
}));
