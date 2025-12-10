import { Server, Socket } from 'socket.io';

// User types for socket connections
export type UserType = 'driver' | 'rider';

export interface AuthenticatedUser {
  id: number;
  type: UserType;
  mobileNumber?: string;
}

export interface AuthenticatedSocket extends Socket {
  user: AuthenticatedUser;
}

// Location update payload
export interface LocationUpdate {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp?: number;
}

// Order status events
export interface OrderStatusUpdate {
  orderId: number;
  status: string;
  driverId?: number;
  estimatedArrival?: number;
  message?: string;
}

// Driver availability
export interface DriverAvailability {
  driverId: number;
  status: 'online' | 'offline' | 'in_ride';
  location?: LocationUpdate;
  serviceIds?: number[];
}

// New order request (sent to available drivers)
export interface NewOrderRequest {
  orderId: number;
  pickupAddress: string;
  pickupLatitude: number;
  pickupLongitude: number;
  dropoffAddress: string;
  dropoffLatitude: number;
  dropoffLongitude: number;
  serviceId: number;
  serviceName: string;
  estimatedFare: number;
  distanceToPickup: number;
  customerId: number;
  customerName: string;
}

// Chat message
export interface ChatMessage {
  orderId: number;
  senderId: number;
  senderType: UserType;
  content: string;
  timestamp: Date;
}

// Driver found response
export interface DriverFoundEvent {
  orderId: number;
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

// Socket server events (server -> client)
export interface ServerToClientEvents {
  // Order events
  'order:new': (data: NewOrderRequest) => void;
  'order:status': (data: OrderStatusUpdate) => void;
  'order:driver_found': (data: DriverFoundEvent) => void;
  'order:driver_arrived': (data: { orderId: number }) => void;
  'order:started': (data: { orderId: number; startTime: Date }) => void;
  'order:completed': (data: { orderId: number; fare: number; distance: number; duration: number }) => void;
  'order:cancelled': (data: { orderId: number; reason: string; cancelledBy: UserType }) => void;

  // Location events
  'location:driver': (data: { orderId: number; location: LocationUpdate }) => void;

  // Chat events
  'chat:message': (data: ChatMessage) => void;
  'chat:typing': (data: { orderId: number; userId: number; userType: UserType }) => void;

  // Connection events
  'connected': (data: { userId: number; userType: UserType }) => void;
  'error': (data: { message: string; code?: string }) => void;
}

// Socket client events (client -> server)
export interface ClientToServerEvents {
  // Driver events
  'driver:online': (data: { serviceIds: number[]; location: LocationUpdate }) => void;
  'driver:offline': () => void;
  'driver:location': (data: LocationUpdate) => void;
  'driver:accept': (data: { orderId: number }) => void;
  'driver:reject': (data: { orderId: number; reason?: string }) => void;
  'driver:arrived': (data: { orderId: number }) => void;
  'driver:start': (data: { orderId: number }) => void;
  'driver:complete': (data: { orderId: number; fare: number; distance: number; duration: number }) => void;
  'driver:cancel': (data: { orderId: number; reasonId: number }) => void;

  // Rider events
  'rider:request': (data: { orderId: number }) => void;
  'rider:cancel': (data: { orderId: number; reasonId?: number }) => void;
  'rider:location': (data: LocationUpdate) => void;

  // Chat events
  'chat:send': (data: { orderId: number; content: string }) => void;
  'chat:typing': (data: { orderId: number }) => void;

  // Room events
  'join:order': (data: { orderId: number }) => void;
  'leave:order': (data: { orderId: number }) => void;
}

// Inter-server events (for scaling)
export interface InterServerEvents {
  ping: () => void;
}

// Socket data stored on socket instance
export interface SocketData {
  user: AuthenticatedUser;
}

// Typed socket server
export type TaxiSocketServer = Server<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;

// Typed socket
export type TaxiSocket = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  InterServerEvents,
  SocketData
>;
