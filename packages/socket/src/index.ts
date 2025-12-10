// Main exports for the socket package

// Server
export { createTaxiSocketServer, SocketService } from './server';
export type { TaxiSocketServerOptions } from './server';

// Auth
export { createAuthMiddleware, generateSocketToken, verifySocketToken } from './auth';

// Room management
export { RoomManager, DriverTracker } from './rooms';
export type { OnlineDriver } from './rooms';

// Types
export type {
  UserType,
  AuthenticatedUser,
  AuthenticatedSocket,
  LocationUpdate,
  OrderStatusUpdate,
  DriverAvailability,
  NewOrderRequest,
  ChatMessage,
  DriverFoundEvent,
  ServerToClientEvents,
  ClientToServerEvents,
  InterServerEvents,
  SocketData,
  TaxiSocketServer,
  TaxiSocket,
} from './types';

// Events
export {
  registerDriverEvents,
  broadcastNewOrder,
  registerRiderEvents,
  notifyDriverFound,
  sendDriverLocationToRider,
  registerChatEvents,
  sendSystemMessage,
} from './events';
