'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || 'http://localhost:3000';

interface SocketContextType {
  isConnected: boolean;
  onlineDriversCount: number;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineDriversCount, setOnlineDriversCount] = useState(0);
  const queryClient = useQueryClient();

  const connect = useCallback(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    newSocket.on('connect', () => {
      console.log('[Socket] Connected to admin-api');
      setIsConnected(true);

      // Subscribe to dashboard updates
      newSocket.emit('dashboard:subscribe');
    });

    newSocket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('[Socket] Authenticated:', data);
    });

    // Driver connection events
    newSocket.on('driver:connected', (data: { driverId: number; onlineDriversCount: number }) => {
      console.log('[Socket] Driver connected:', data);
      setOnlineDriversCount(data.onlineDriversCount);

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-locations'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    });

    newSocket.on('driver:disconnected', (data: { driverId: number; onlineDriversCount: number }) => {
      console.log('[Socket] Driver disconnected:', data);
      setOnlineDriversCount(data.onlineDriversCount);

      // Invalidate queries to refetch fresh data
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['drivers-locations'] });
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
    });

    // Order status events
    newSocket.on('order:status', (data: { orderId: number; status: string; driverId?: number }) => {
      console.log('[Socket] Order status update:', data);
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['recent-orders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    });

    newSocket.on('order:rejected', (data: { orderId: number; driverId: number; reason: string }) => {
      console.log('[Socket] Order rejected:', data);
    });

    setSocket(newSocket);

    return () => {
      newSocket.emit('dashboard:unsubscribe');
      newSocket.disconnect();
    };
  }, [queryClient]);

  useEffect(() => {
    // Check for token and connect
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
        } else if (socket) {
          socket.disconnect();
          setSocket(null);
          setIsConnected(false);
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
