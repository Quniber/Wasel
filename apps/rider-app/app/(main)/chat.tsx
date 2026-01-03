import { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, FlatList, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';

interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: Date;
  isDriver: boolean;
}

export default function ChatScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { activeOrder } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const flatListRef = useRef<FlatList>(null);
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const quickReplies = [
    { key: 'onMyWay', label: t('chat.quickReplies.onMyWay') },
    { key: 'waitPlease', label: t('chat.quickReplies.waitPlease') },
    { key: 'outside', label: t('chat.quickReplies.outside') },
    { key: 'callMe', label: t('chat.quickReplies.callMe') },
  ];

  useEffect(() => {
    // Listen for incoming messages (matches driver app event name)
    const unsubscribe = socketService.on('chat:message', (data: {
      orderId: number;
      senderId: number;
      senderType: 'driver' | 'rider';
      content: string;
      timestamp: string;
    }) => {
      const newMessage: ChatMessage = {
        id: `${data.senderId}-${data.timestamp}`,
        text: data.content,
        senderId: data.senderId.toString(),
        timestamp: new Date(data.timestamp),
        isDriver: data.senderType === 'driver',
      };

      // Check if message already exists (avoid duplicates)
      setMessages((prev) => {
        const exists = prev.some(msg => msg.id === newMessage.id);
        if (exists) return prev;
        return [...prev, newMessage];
      });
    });

    return () => {
      unsubscribe?.();
    };
  }, []);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;

    const messageText = text.trim();
    setMessage('');

    // Send via socket (matches driver app event name)
    // Message will come back via 'chat:message' event and be displayed
    socketService.emit('chat:send', {
      orderId: activeOrder?.id ? Number(activeOrder.id) : undefined,
      content: messageText,
    });

    // Scroll to bottom after a brief delay for the message to arrive
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleQuickReply = (text: string) => {
    sendMessage(text);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const driver = activeOrder?.driver;

  const renderMessage = ({ item }: { item: ChatMessage }) => (
    <View className={`px-4 mb-3 ${item.isDriver ? 'items-start' : 'items-end'}`}>
      <View
        className={`max-w-[80%] px-4 py-3 rounded-2xl ${
          item.isDriver
            ? isDark
              ? 'bg-muted-dark rounded-bl-none'
              : 'bg-muted rounded-bl-none'
            : 'bg-primary rounded-br-none'
        }`}
      >
        <Text className={item.isDriver ? (isDark ? 'text-foreground-dark' : 'text-foreground') : 'text-white'}>
          {item.text}
        </Text>
      </View>
      <Text className="text-muted-foreground text-xs mt-1">{formatTime(item.timestamp)}</Text>
    </View>
  );

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`} edges={['top']}>
      {/* Header */}
      <View className={`flex-row items-center px-4 py-4 border-b ${isDark ? 'border-border-dark' : 'border-border'}`}>
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <View className="flex-row items-center flex-1 ml-2">
          <View className="w-10 h-10 rounded-full bg-primary items-center justify-center">
            <Text className="text-white font-bold">
              {driver?.firstName?.[0]}{driver?.lastName?.[0] || 'D'}
            </Text>
          </View>
          <View className="ml-3">
            <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {driver?.firstName || t('chat.driver')}
            </Text>
            <Text className="text-muted-foreground text-sm">{t('chat.yourDriver')}</Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={() => {
            if (driver?.mobileNumber) {
              // Linking.openURL(`tel:${driver.mobileNumber}`);
            }
          }}
          className="w-10 h-10 items-center justify-center"
        >
          <Ionicons name="call" size={24} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
        keyboardVerticalOffset={0}
      >
        {/* Messages List */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingVertical: 16 }}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
        />

        {/* Quick Replies */}
        <View className={`px-4 py-2 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
          <FlatList
            horizontal
            data={quickReplies}
            keyExtractor={(item) => item.key}
            showsHorizontalScrollIndicator={false}
            renderItem={({ item }) => (
              <TouchableOpacity
                onPress={() => handleQuickReply(item.label)}
                className={`px-4 py-2 rounded-full mr-2 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}
              >
                <Text className={`${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>{item.label}</Text>
              </TouchableOpacity>
            )}
          />
        </View>

        {/* Input */}
        <SafeAreaView edges={['bottom']} className={`${isDark ? 'bg-background-dark' : 'bg-background'}`}>
          <View className={`flex-row items-center px-4 py-3 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
            <View className={`flex-1 flex-row items-center rounded-full px-4 py-2 ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
              <TextInput
                className={`flex-1 text-base ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}
                placeholder={t('chat.placeholder')}
                placeholderTextColor={isDark ? '#757575' : '#9E9E9E'}
                value={message}
                onChangeText={setMessage}
                multiline
                maxLength={500}
              />
            </View>
            <TouchableOpacity
              onPress={() => sendMessage(message)}
              disabled={!message.trim()}
              className={`ml-3 w-12 h-12 rounded-full items-center justify-center ${
                message.trim() ? 'bg-primary' : isDark ? 'bg-muted-dark' : 'bg-muted'
              }`}
            >
              <Ionicons name="send" size={20} color={message.trim() ? '#FFFFFF' : '#9E9E9E'} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
