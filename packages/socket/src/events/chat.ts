import { TaxiSocket, ChatMessage } from '../types';
import { RoomManager } from '../rooms';

/**
 * Register chat event handlers
 */
export function registerChatEvents(
  socket: TaxiSocket,
  roomManager: RoomManager
): void {
  const user = socket.data.user;

  // Send chat message
  socket.on('chat:send', async (data) => {
    const { orderId, content } = data;

    const message: ChatMessage = {
      orderId,
      senderId: user.id,
      senderType: user.type,
      content,
      timestamp: new Date(),
    };

    // Broadcast to all participants in the order room
    roomManager.emitToOrder(orderId, 'chat:message', message);

    console.log(`Chat message in order ${orderId} from ${user.type} ${user.id}: ${content.substring(0, 50)}...`);
  });

  // Typing indicator
  socket.on('chat:typing', async (data) => {
    const { orderId } = data;

    // Broadcast typing indicator to other participants
    socket.to(roomManager.getOrderRoomName(orderId)).emit('chat:typing', {
      orderId,
      userId: user.id,
      userType: user.type,
    });
  });
}

/**
 * Send a system message to an order room
 */
export function sendSystemMessage(
  roomManager: RoomManager,
  orderId: number,
  content: string
): void {
  const message: ChatMessage = {
    orderId,
    senderId: 0, // System
    senderType: 'rider', // Use rider as default for system
    content,
    timestamp: new Date(),
  };

  roomManager.emitToOrder(orderId, 'chat:message', message);
}
