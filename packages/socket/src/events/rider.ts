import { TaxiSocket, LocationUpdate } from '../types';
import { RoomManager } from '../rooms';

/**
 * Register rider event handlers
 */
export function registerRiderEvents(
  socket: TaxiSocket,
  roomManager: RoomManager
): void {
  const user = socket.data.user;

  // Only register for rider sockets
  if (user.type !== 'rider') return;

  const riderId = user.id;

  // Rider requests to track an order
  socket.on('rider:request', async (data) => {
    const { orderId } = data;

    // Join the order room to receive updates
    await roomManager.joinOrderRoom(socket, orderId);

    console.log(`Rider ${riderId} is now tracking order ${orderId}`);
  });

  // Rider cancels order
  socket.on('rider:cancel', async (data) => {
    const { orderId, reasonId } = data;

    roomManager.emitToOrder(orderId, 'order:cancelled', {
      orderId,
      reason: reasonId ? `Cancelled with reason ID: ${reasonId}` : 'Rider cancelled',
      cancelledBy: 'rider',
    });

    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'RiderCanceled',
      message: 'Rider has cancelled the ride',
    });

    // Leave order room
    await roomManager.leaveOrderRoom(socket, orderId);

    console.log(`Rider ${riderId} cancelled order ${orderId}`);
  });

  // Rider location update (for tracking purposes)
  socket.on('rider:location', (location: LocationUpdate) => {
    // Could be used for pickup location verification or tracking
    console.log(`Rider ${riderId} location update:`, location);
  });

  // Join order room (explicit)
  socket.on('join:order', async (data) => {
    const { orderId } = data;
    await roomManager.joinOrderRoom(socket, orderId);
    console.log(`Rider ${riderId} joined order room ${orderId}`);
  });

  // Leave order room (explicit)
  socket.on('leave:order', async (data) => {
    const { orderId } = data;
    await roomManager.leaveOrderRoom(socket, orderId);
    console.log(`Rider ${riderId} left order room ${orderId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`Rider ${riderId} disconnected`);
  });
}

/**
 * Notify rider that a driver was found
 */
export function notifyDriverFound(
  roomManager: RoomManager,
  riderId: number,
  orderId: number,
  driverData: {
    driverId: number;
    driverName: string;
    driverPhone: string;
    driverRating: number;
    vehiclePlate?: string;
    vehicleModel?: string;
    vehicleColor?: string;
    estimatedArrival: number;
    driverLocation: LocationUpdate;
  }
): void {
  // Emit to rider's room
  roomManager.emitToRider(riderId, 'order:driver_found', {
    orderId,
    ...driverData,
  });

  // Also emit to order room
  roomManager.emitToOrder(orderId, 'order:driver_found', {
    orderId,
    ...driverData,
  });

  console.log(`Notified rider ${riderId} that driver ${driverData.driverId} was found for order ${orderId}`);
}

/**
 * Send driver location updates to rider
 */
export function sendDriverLocationToRider(
  roomManager: RoomManager,
  orderId: number,
  location: LocationUpdate
): void {
  roomManager.emitToOrder(orderId, 'location:driver', {
    orderId,
    location,
  });
}
