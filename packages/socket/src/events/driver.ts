import { TaxiSocket, LocationUpdate } from '../types';
import { RoomManager, DriverTracker } from '../rooms';

/**
 * Register driver event handlers
 */
export function registerDriverEvents(
  socket: TaxiSocket,
  roomManager: RoomManager
): void {
  const user = socket.data.user;

  // Only register for driver sockets
  if (user.type !== 'driver') return;

  const driverId = user.id;

  // Driver goes online
  socket.on('driver:online', async (data) => {
    const { serviceIds, location } = data;

    // Track driver as online
    DriverTracker.setOnline(driverId, socket.id, location, serviceIds);

    // Join available drivers rooms
    await roomManager.joinAvailableDrivers(socket, serviceIds);

    console.log(`Driver ${driverId} is now online with services: ${serviceIds.join(', ')}`);
  });

  // Driver goes offline
  socket.on('driver:offline', async () => {
    // Remove from online drivers
    DriverTracker.setOffline(driverId);

    // Leave available drivers rooms
    await roomManager.leaveAvailableDrivers(socket);

    console.log(`Driver ${driverId} is now offline`);
  });

  // Driver location update
  socket.on('driver:location', (location: LocationUpdate) => {
    // Update location in tracker
    DriverTracker.updateLocation(driverId, location);

    // If driver is on an active order, broadcast to rider
    // This would typically be done through the order room
  });

  // Driver accepts order
  socket.on('driver:accept', async (data) => {
    const { orderId } = data;

    // Join the order room
    await roomManager.joinOrderRoom(socket, orderId);

    // Emit acceptance to order room (rider will receive)
    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'DriverAccepted',
      driverId,
      message: 'Driver has accepted your ride request',
    });

    console.log(`Driver ${driverId} accepted order ${orderId}`);
  });

  // Driver rejects order
  socket.on('driver:reject', async (data) => {
    const { orderId, reason } = data;

    console.log(`Driver ${driverId} rejected order ${orderId}: ${reason || 'No reason'}`);

    // Order will be reassigned to another driver by the API
  });

  // Driver arrived at pickup
  socket.on('driver:arrived', async (data) => {
    const { orderId } = data;

    roomManager.emitToOrder(orderId, 'order:driver_arrived', {
      orderId,
    });

    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Arrived',
      message: 'Driver has arrived at pickup location',
    });

    console.log(`Driver ${driverId} arrived at pickup for order ${orderId}`);
  });

  // Driver starts ride
  socket.on('driver:start', async (data) => {
    const { orderId } = data;

    roomManager.emitToOrder(orderId, 'order:started', {
      orderId,
      startTime: new Date(),
    });

    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Started',
      message: 'Ride has started',
    });

    console.log(`Driver ${driverId} started ride for order ${orderId}`);
  });

  // Driver completes ride
  socket.on('driver:complete', async (data) => {
    const { orderId, fare, distance, duration } = data;

    roomManager.emitToOrder(orderId, 'order:completed', {
      orderId,
      fare,
      distance,
      duration,
    });

    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'Finished',
      message: 'Ride completed',
    });

    // Leave order room
    await roomManager.leaveOrderRoom(socket, orderId);

    console.log(`Driver ${driverId} completed order ${orderId}`);
  });

  // Driver cancels order
  socket.on('driver:cancel', async (data) => {
    const { orderId, reasonId } = data;

    roomManager.emitToOrder(orderId, 'order:cancelled', {
      orderId,
      reason: `Cancelled with reason ID: ${reasonId}`,
      cancelledBy: 'driver',
    });

    roomManager.emitToOrder(orderId, 'order:status', {
      orderId,
      status: 'DriverCanceled',
      message: 'Driver has cancelled the ride',
    });

    // Leave order room
    await roomManager.leaveOrderRoom(socket, orderId);

    console.log(`Driver ${driverId} cancelled order ${orderId}`);
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    DriverTracker.setOffline(driverId);
    console.log(`Driver ${driverId} disconnected`);
  });
}

/**
 * Broadcast new order to nearby available drivers
 */
export function broadcastNewOrder(
  roomManager: RoomManager,
  orderId: number,
  serviceId: number,
  orderData: {
    pickupAddress: string;
    pickupLatitude: number;
    pickupLongitude: number;
    dropoffAddress: string;
    dropoffLatitude: number;
    dropoffLongitude: number;
    serviceName: string;
    estimatedFare: number;
    customerId: number;
    customerName: string;
  }
): void {
  // Get nearby drivers for this service
  const nearbyDrivers = DriverTracker.getNearbyDrivers(
    orderData.pickupLatitude,
    orderData.pickupLongitude,
    10, // 10km radius
    serviceId
  );

  // Send order to each nearby driver
  for (const driver of nearbyDrivers) {
    const distance = calculateDistance(
      orderData.pickupLatitude,
      orderData.pickupLongitude,
      driver.location.latitude,
      driver.location.longitude
    );

    roomManager.emitToDriver(driver.driverId, 'order:new', {
      orderId,
      serviceId,
      distanceToPickup: distance,
      ...orderData,
    });
  }

  console.log(`Broadcasted order ${orderId} to ${nearbyDrivers.length} nearby drivers`);
}

// Helper to calculate distance
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}
