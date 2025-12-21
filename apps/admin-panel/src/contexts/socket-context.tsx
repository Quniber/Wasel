'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

// Socket API URL - centralized socket service
const SOCKET_API_URL = process.env.NEXT_PUBLIC_SOCKET_API_URL || 'https://wasel.shafrah.qa';

interface DriverLocationUpdate {
  driverId: number;
  latitude: number;
  longitude: number;
  timestamp: Date;
}

interface SocketContextType {
  isConnected: boolean;
  onlineDriversCount: number;
  driverLocations: Map<number, DriverLocationUpdate>;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineDriversCount, setOnlineDriversCount] = useState(0);
  const [driverLocations, setDriverLocations] = useState<Map<number, DriverLocationUpdate>>(new Map());
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Connect to centralized socket-api
    const newSocket = io(SOCKET_API_URL, {
      path: '/socket-api/socket.io',
      auth: { token, type: 'admin' },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to socket-api');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('[Socket] Authenticated:', data);
    });

    // Driver status events
    newSocket.on('driver:status', (data: { driverId: number; status: string }) => {
      console.log('[Socket] Driver status:', data);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-locations'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    });

    // Driver location events
    newSocket.on('driver:location', (data: DriverLocationUpdate) => {
      console.log('[Socket] Driver location update:', data);
      setDriverLocations((prev) => {
        const newMap = new Map(prev);
        newMap.set(data.driverId, data);
        return newMap;
      });
      queryClient.invalidateQueries({ queryKey: ['drivers-locations'] });
    });

    // Order status events
    newSocket.on('order:status', (data: { orderId: number; status: string; driverId?: number }) => {
      console.log('[Socket] Order status update:', data);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    newSocket.on('order:new', (data) => {
      console.log('[Socket] New order:', data);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    // Dashboard updates
    newSocket.on('dashboard:update', (data) => {
      console.log('[Socket] Dashboard update:', data);
      if (data.onlineDrivers !== undefined) {
        setOnlineDriversCount(data.onlineDrivers);
      }
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    });

    // Customer events
    newSocket.on('customer:new', (data) => {
      console.log('[Socket] New customer:', data);
      queryClient.invalidateQueries({ queryKey: ['customers'] });
    });

    // Driver events
    newSocket.on('driver:new', (data) => {
      console.log('[Socket] New driver:', data);
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    });

    // Alert events
    newSocket.on('alert', (data) => {
      console.log('[Socket] Alert:', data);
      // Could show a toast notification here
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const cleanup = connect();
      return cleanup;
    }
  }, [connect]);

  // Reconnect when token changes (login/logout)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'token') {
        if (e.newValue) {
          connect();
        } else {
          if (socket) {
            socket.disconnect();
            setSocket(null);
          }
          setIsConnected(false);
          setDriverLocations(new Map());
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [connect, socket]);

  return (
    <SocketContext.Provider
      value={{
        isConnected,
        onlineDriversCount,
        driverLocations,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
