import { create } from 'zustand';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface ActiveRide {
  orderId: number;
  status: 'accepted' | 'arrived' | 'started' | 'completed';
  pickup: Location;
  dropoff: Location;
  rider: {
    id: number;
    firstName: string;
    lastName: string;
    mobileNumber: string;
    rating: number;
  };
  estimatedFare: number;
  distance: number;
  duration: number;
  paymentMethod: string;
  startedAt?: string;
}

export interface IncomingOrder {
  orderId: number;
  pickup: Location;
  dropoff: Location;
  rider: {
    id: number;
    firstName: string;
    lastName: string;
    rating: number;
  };
  estimatedFare: number;
  distance: number;
  duration: number;
  paymentMethod: string;
  expiresAt: number; // timestamp
}

export interface DailyStats {
  earnings: number;
  trips: number;
  onlineHours: number;
  acceptanceRate: number;
}

interface DriverState {
  // Online status
  isOnline: boolean;
  setOnline: (online: boolean) => void;

  // Current location
  currentLocation: Location | null;
  setCurrentLocation: (location: Location | null) => void;

  // Active ride
  activeRide: ActiveRide | null;
  setActiveRide: (ride: ActiveRide | null) => void;
  updateRideStatus: (status: ActiveRide['status']) => void;

  // Incoming order request
  incomingOrder: IncomingOrder | null;
  setIncomingOrder: (order: IncomingOrder | null) => void;
  clearIncomingOrder: () => void;

  // Daily stats
  todayStats: DailyStats;
  updateStats: (stats: Partial<DailyStats>) => void;

  // Balance
  balance: number;
  setBalance: (balance: number) => void;

  // Reset all driver state (on logout)
  reset: () => void;
}

const initialStats: DailyStats = {
  earnings: 0,
  trips: 0,
  onlineHours: 0,
  acceptanceRate: 100,
};

export const useDriverStore = create<DriverState>((set, get) => ({
  // Online status
  isOnline: false,
  setOnline: (isOnline) => set({ isOnline }),

  // Current location
  currentLocation: null,
  setCurrentLocation: (currentLocation) => set({ currentLocation }),

  // Active ride
  activeRide: null,
  setActiveRide: (activeRide) => set({ activeRide }),
  updateRideStatus: (status) => {
    const { activeRide } = get();
    if (activeRide) {
      set({ activeRide: { ...activeRide, status } });
    }
  },

  // Incoming order request
  incomingOrder: null,
  setIncomingOrder: (incomingOrder) => set({ incomingOrder }),
  clearIncomingOrder: () => set({ incomingOrder: null }),

  // Daily stats
  todayStats: initialStats,
  updateStats: (stats) => {
    const { todayStats } = get();
    set({ todayStats: { ...todayStats, ...stats } });
  },

  // Balance
  balance: 0,
  setBalance: (balance) => set({ balance }),

  // Reset all driver state
  reset: () => set({
    isOnline: false,
    currentLocation: null,
    activeRide: null,
    incomingOrder: null,
    todayStats: initialStats,
    balance: 0,
  }),
}));
