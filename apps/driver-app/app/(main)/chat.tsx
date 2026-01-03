import { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useDriverStore } from '@/stores/driver-store';
import { getColors } from '@/constants/Colors';
import { socketService } from '@/lib/socket';

interface Message {
  id: string;
  text: string;
  sender: 'driver' | 'rider';
  timestamp: Date;
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeRide } = useDriverStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [isInRoom, setIsInRoom] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const quickMessages = [
    t('chat.onMyWay'),
    t('chat.arrivedAtPickup'),
    t('chat.waitingOutside'),
    t('chat.trafficDelay'),
  ];

  // Ensure socket is connected and in order room
  useEffect(() => {
    if (!activeRide?.orderId) return;

    const setupChat = async () => {
      console.log('[Chat] Setting up chat for order:', activeRide.orderId);

      // Ensure socket is connected
      await socketService.connect();
      console.log('[Chat] Socket connected');
      setIsConnected(true);

      // Join order room
      socketService.joinOrderRoom(activeRide.orderId);
      console.log('[Chat] Joined order room:', activeRide.orderId);
      setIsInRoom(true);
    };

    setupChat();

    return () => {
      if (activeRide?.orderId) {
        console.log('[Chat] Leaving order room:', activeRide.orderId);
        // Don't leave room here - let active-ride manage it
      }
    };
  }, [activeRide?.orderId]);

  useEffect(() => {
    // Listen for incoming messages from backend
    // Backend sends: { orderId, senderId, senderType, content, timestamp }
    const unsubscribe = socketService.on('chat:message', (data: {
      orderId: number;
      senderId: number;
      senderType: 'driver' | 'rider';
      content: string;
      timestamp: string;
    }) => {
      console.log('[Chat] Received message:', data);

      // Only show messages from the rider (we already added our own messages locally)
      if (data.senderType === 'rider') {
        const newMessage: Message = {
          id: Date.now().toString(),
          text: data.content,
          sender: 'rider',
          timestamp: new Date(data.timestamp),
        };
        setMessages((prev) => [...prev, newMessage]);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    // Validate socket connection and room membership
    if (!isConnected || !isInRoom) {
      console.warn('[Chat] Cannot send message: socket not connected or not in room');
      return;
    }

    if (!activeRide?.orderId) {
      console.warn('[Chat] Cannot send message: no active ride');
      return;
    }

    const messageText = text.trim();
    setInputText('');

    const newMessage: Message = {
      id: Date.now().toString(),
      text: messageText,
      sender: 'driver',
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, newMessage]);

    console.log('[Chat] Sending message:', { orderId: activeRide.orderId, content: messageText });

    // Send via socket using 'chat:send' event
    // Backend expects: { orderId, content }
    socketService.emit('chat:send', {
      orderId: activeRide.orderId,
      content: messageText,
    });

    // Scroll to bottom
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isDriver = item.sender === 'driver';
    return (
      <View
        className={`max-w-[80%] mb-3 ${isDriver ? 'self-end' : 'self-start'}`}
      >
        <View
          className="px-4 py-3 rounded-2xl"
          style={{
            backgroundColor: isDriver ? colors.primary : colors.secondary,
            borderBottomRightRadius: isDriver ? 4 : 16,
            borderBottomLeftRadius: isDriver ? 16 : 4,
          }}
        >
          <Text
            style={{ color: isDriver ? '#fff' : colors.foreground }}
            className="text-base"
          >
            {item.text}
          </Text>
        </View>
        <Text
          style={{ color: colors.mutedForeground }}
          className={`text-xs mt-1 ${isDriver ? 'text-right' : 'text-left'}`}
        >
          {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View
        className="flex-row items-center px-4 py-3 border-b"
        style={{ borderColor: colors.border }}
      >
        <TouchableOpacity
          onPress={() => router.replace('/(main)/active-ride')}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <View className="ml-3 flex-1">
          <Text style={{ color: colors.foreground }} className="text-lg font-semibold">
            {activeRide?.rider ? `${activeRide.rider.firstName} ${activeRide.rider.lastName}` : 'Rider'}
          </Text>
          <Text style={{ color: colors.mutedForeground }} className="text-sm">
            {t('chat.subtitle')}
          </Text>
        </View>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center">
              <Ionicons name="chatbubbles-outline" size={48} color={colors.muted} />
              <Text style={{ color: colors.mutedForeground }} className="mt-2 text-center">
                {t('chat.noMessages')}
              </Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Quick Messages */}
        <View className="px-4 pb-2">
          <FlatList
            horizontal
            data={quickMessages}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => sendMessage(item)}
                className="mr-2 px-4 py-2 rounded-full"
                style={{ backgroundColor: colors.secondary, borderColor: colors.border, borderWidth: 1 }}
              >
                <Text style={{ color: colors.foreground }} className="text-sm">
                  {item}
                </Text>
              </TouchableOpacity>
            )}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        {/* Input */}
        <View
          className="flex-row items-center px-4 py-3 border-t"
          style={{ borderColor: colors.border, backgroundColor: colors.background }}
        >
          <View
            className="flex-1 flex-row items-center rounded-full px-4"
            style={{ backgroundColor: colors.secondary }}
          >
            <TextInput
              style={{ color: colors.foreground }}
              className="flex-1 py-3 text-base"
              placeholder={t('chat.placeholder')}
              placeholderTextColor={colors.mutedForeground}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
            />
          </View>
          <TouchableOpacity
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim()}
            className="w-12 h-12 rounded-full items-center justify-center ml-2"
            style={{ backgroundColor: inputText.trim() ? colors.primary : colors.muted }}
          >
            <Ionicons
              name="send"
              size={20}
              color={inputText.trim() ? '#fff' : colors.mutedForeground}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
