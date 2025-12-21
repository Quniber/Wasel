import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private gateway: SocketGateway) {}

  // ========== Emit Methods ==========

  emitToDriver(driverId: number, event: string, data: any): boolean {
    return this.gateway.emitToDriver(driverId, event, data);
  }

  emitToRider(riderId: number, event: string, data: any): boolean {
    return this.gateway.emitToRider(riderId, event, data);
  }

  emitToAdmin(adminId: number, event: string, data: any): boolean {
    return this.gateway.emitToAdmin(adminId, event, data);
  }

  emitToAdmins(event: string, data: any) {
    this.gateway.emitToAdmins(event, data);
  }

  emitToDrivers(event: string, data: any) {
    this.gateway.emitToDrivers(event, data);
  }

  emitToRiders(event: string, data: any) {
    this.gateway.emitToRiders(event, data);
  }

  emitToOrder(orderId: number, event: string, data: any) {
    this.gateway.emitToOrder(orderId, event, data);
  }

  emitToAll(event: string, data: any) {
    this.gateway.emitToAll(event, data);
  }

  // ========== Status Methods ==========

  isDriverOnline(driverId: number): boolean {
    return this.gateway.isDriverOnline(driverId);
  }

  isRiderOnline(riderId: number): boolean {
    return this.gateway.isRiderOnline(riderId);
  }

  getOnlineDriverIds(): number[] {
    return this.gateway.getOnlineDriverIds();
  }

  getOnlineRiderIds(): number[] {
    return this.gateway.getOnlineRiderIds();
  }

  getOnlineAdminIds(): number[] {
    return this.gateway.getOnlineAdminIds();
  }

  getStats() {
    return this.gateway.getStats();
  }

  setDriverOrder(driverId: number, orderId: number | null) {
    this.gateway.setDriverOrder(driverId, orderId);
  }
}
