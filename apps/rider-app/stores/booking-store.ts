import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Location {
  latitude: number;
  longitude: number;
  address: string;
}

export interface Service {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  baseFare: number;
  perKilometer: number;
  perMinute: number;
  minimumFare: number;
  personCapacity: number;
}

export interface FareEstimate {
  serviceId: string;
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  totalFare: number;
  currency: string;
  distance: number;
  duration: number;
  eta: number;
}

export type PaymentMethod = 'cash' | 'wallet' | 'card';

export interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  mobileNumber: string;
  rating: number;
  reviewCount?: number;
  avatar?: string;
  carModel: string;
  carColor: string;
  carPlate: string;
  latitude: number;
  longitude: number;
}

export interface ActiveOrder {
  id: string;
  status: string;
  pickup: Location;
  dropoff: Location;
  service: Service;
  fare: number;
  driver?: Driver;
  createdAt: string;
  scheduledAt?: string;
}

interface BookingState {
  // Location selection
  pickup: Location | null;
  dropoff: Location | null;

  // Service selection
  services: Service[];
  selectedService: Service | null;
  fareEstimates: FareEstimate[];

  // Coupon
  couponCode: string | null;
  couponDiscount: number;

  // Payment
  paymentMethod: PaymentMethod;

  // Scheduling
  isScheduled: boolean;
  scheduledDate: Date | null;

  // Active order
  activeOrder: ActiveOrder | null;

  // Hydration state
  _hasHydrated: boolean;
  setHasHydrated: (state: boolean) => void;

  // Actions
  setPickup: (location: Location | null) => void;
  setDropoff: (location: Location | null) => void;
  setServices: (services: Service[]) => void;
  setSelectedService: (service: Service | null) => void;
  setFareEstimates: (estimates: FareEstimate[]) => void;
  setCoupon: (code: string | null, discount: number) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setScheduled: (isScheduled: boolean, date: Date | null) => void;
  setActiveOrder: (order: ActiveOrder | null) => void;
  updateDriverLocation: (latitude: number, longitude: number) => void;
  updateOrderStatus: (status: string) => void;
  resetBooking: () => void;
}

export const useBookingStore = create<BookingState>()(
  persist(
    (set, get) => ({
      pickup: null,
      dropoff: null,
      services: [],
      selectedService: null,
      fareEstimates: [],
      couponCode: null,
      couponDiscount: 0,
      paymentMethod: 'cash',
      isScheduled: false,
      scheduledDate: null,
      activeOrder: null,
      _hasHydrated: false,
      setHasHydrated: (state) => set({ _hasHydrated: state }),

      setPickup: (pickup) => set({ pickup }),
      setDropoff: (dropoff) => set({ dropoff }),
      setServices: (services) => set({ services }),
      setSelectedService: (selectedService) => set({ selectedService }),
      setFareEstimates: (fareEstimates) => set({ fareEstimates }),
      setCoupon: (couponCode, couponDiscount) => set({ couponCode, couponDiscount }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setScheduled: (isScheduled, scheduledDate) => set({ isScheduled, scheduledDate }),
      setActiveOrder: (activeOrder) => set({ activeOrder }),

      updateDriverLocation: (latitude, longitude) => {
        const { activeOrder } = get();
        if (activeOrder?.driver) {
          set({
            activeOrder: {
              ...activeOrder,
              driver: {
                ...activeOrder.driver,
                latitude,
                longitude,
              },
            },
          });
        }
      },

      updateOrderStatus: (status) => {
        const { activeOrder } = get();
        if (activeOrder) {
          set({
            activeOrder: {
              ...activeOrder,
              status,
            },
          });
        }
      },

      resetBooking: () => set({
        pickup: null,
        dropoff: null,
        selectedService: null,
        fareEstimates: [],
        couponCode: null,
        couponDiscount: 0,
        paymentMethod: 'cash',
        isScheduled: false,
        scheduledDate: null,
        activeOrder: null,
      }),
    }),
    {
      name: 'booking-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        activeOrder: state.activeOrder,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
