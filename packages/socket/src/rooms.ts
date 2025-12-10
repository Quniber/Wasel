import { TaxiSocketServer, TaxiSocket, LocationUpdate } from './types';

/**
 * Room naming conventions:
 * - order:{orderId} - Room for order participants (driver + rider)
 * - driver:{driverId} - Individual driver room for targeted messages
 * - rider:{riderId} - Individual rider room for targeted messages
 * - drivers:available - Room for online drivers
 * - drivers:service:{serviceId} - Room for drivers offering a specific service
 */

// In-memory store for online drivers
export interface OnlineDriver {
  socketId: string;
  driverId: number;
  location: LocationUpdate;
  serviceIds: number[];
  lastUpdate: Date;
}

const onlineDrivers = new Map<number, OnlineDriver>();

/**
 * Room manager for handling socket rooms
 */
export class RoomManager {
  private io: TaxiSocketServer;

  constructor(io: TaxiSocketServer) {
    this.io = io;
  }

  // Order room management
  getOrderRoomName(orderId: number): string {
    return `order:${orderId}`;
  }

  async joinOrderRoom(socket: TaxiSocket, orderId: number): Promise<void> {
    const roomName = this.getOrderRoomName(orderId);
    await socket.join(roomName);
  }

  async leaveOrderRoom(socket: TaxiSocket, orderId: number): Promise<void> {
    const roomName = this.getOrderRoomName(orderId);
    await socket.leave(roomName);
  }

  // Driver room management
  getDriverRoomName(driverId: number): string {
    return `driver:${driverId}`;
  }

  async joinDriverRoom(socket: TaxiSocket): Promise<void> {
    if (socket.data.user.type !== 'driver') return;
    const roomName = this.getDriverRoomName(socket.data.user.id);
    await socket.join(roomName);
  }

  // Rider room management
  getRiderRoomName(riderId: number): string {
    return `rider:${riderId}`;
  }

  async joinRiderRoom(socket: TaxiSocket): Promise<void> {
    if (socket.data.user.type !== 'rider') return;
    const roomName = this.getRiderRoomName(socket.data.user.id);
    await socket.join(roomName);
  }

  // Available drivers room
  async joinAvailableDrivers(socket: TaxiSocket, serviceIds: number[]): Promise<void> {
    if (socket.data.user.type !== 'driver') return;

    await socket.join('drivers:available');

    // Join service-specific rooms
    for (const serviceId of serviceIds) {
      await socket.join(`drivers:service:${serviceId}`);
    }
  }

  async leaveAvailableDrivers(socket: TaxiSocket): Promise<void> {
    if (socket.data.user.type !== 'driver') return;

    await socket.leave('drivers:available');

    // Leave all service rooms
    const driver = onlineDrivers.get(socket.data.user.id);
    if (driver) {
      for (const serviceId of driver.serviceIds) {
        await socket.leave(`drivers:service:${serviceId}`);
      }
    }
  }

  // Emit to order room
  emitToOrder<T>(orderId: number, event: string, data: T): void {
    this.io.to(this.getOrderRoomName(orderId)).emit(event as any, data as any);
  }

  // Emit to specific driver
  emitToDriver<T>(driverId: number, event: string, data: T): void {
    this.io.to(this.getDriverRoomName(driverId)).emit(event as any, data as any);
  }

  // Emit to specific rider
  emitToRider<T>(riderId: number, event: string, data: T): void {
    this.io.to(this.getRiderRoomName(riderId)).emit(event as any, data as any);
  }

  // Emit to available drivers for a service
  emitToAvailableDrivers<T>(serviceId: number, event: string, data: T): void {
    this.io.to(`drivers:service:${serviceId}`).emit(event as any, data as any);
  }
}

/**
 * Online driver tracker
 */
export class DriverTracker {
  // Add driver to online list
  static setOnline(
    driverId: number,
    socketId: string,
    location: LocationUpdate,
    serviceIds: number[]
  ): void {
    onlineDrivers.set(driverId, {
      socketId,
      driverId,
      location,
      serviceIds,
      lastUpdate: new Date(),
    });
  }

  // Remove driver from online list
  static setOffline(driverId: number): void {
    onlineDrivers.delete(driverId);
  }

  // Update driver location
  static updateLocation(driverId: number, location: LocationUpdate): void {
    const driver = onlineDrivers.get(driverId);
    if (driver) {
      driver.location = location;
      driver.lastUpdate = new Date();
    }
  }

  // Check if driver is online
  static isOnline(driverId: number): boolean {
    return onlineDrivers.has(driverId);
  }

  // Get online driver
  static getDriver(driverId: number): OnlineDriver | undefined {
    return onlineDrivers.get(driverId);
  }

  // Get all online drivers
  static getAllOnline(): OnlineDriver[] {
    return Array.from(onlineDrivers.values());
  }

  // Get online drivers for a service
  static getDriversForService(serviceId: number): OnlineDriver[] {
    return Array.from(onlineDrivers.values()).filter((d) =>
      d.serviceIds.includes(serviceId)
    );
  }

  // Get nearby drivers (simple distance filter)
  static getNearbyDrivers(
    latitude: number,
    longitude: number,
    radiusKm: number,
    serviceId?: number
  ): OnlineDriver[] {
    let drivers = serviceId
      ? this.getDriversForService(serviceId)
      : this.getAllOnline();

    return drivers.filter((driver) => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        driver.location.latitude,
        driver.location.longitude
      );
      return distance <= radiusKm;
    });
  }

  // Calculate distance between two points (Haversine formula)
  private static calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private static toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  // Cleanup stale drivers (not updated in last 5 minutes)
  static cleanupStale(maxAgeMinutes: number = 5): number {
    const now = new Date();
    let removed = 0;

    for (const [driverId, driver] of onlineDrivers) {
      const ageMinutes =
        (now.getTime() - driver.lastUpdate.getTime()) / (1000 * 60);
      if (ageMinutes > maxAgeMinutes) {
        onlineDrivers.delete(driverId);
        removed++;
      }
    }

    return removed;
  }
}
