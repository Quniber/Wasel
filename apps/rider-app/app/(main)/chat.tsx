import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Linking,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useBookingStore } from '@/stores/booking-store';
import { socketService } from '@/lib/socket';

const BASE_W = 393;

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  at: Date;
}

const formatTime = (d: Date) =>
  d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });

export default function ChatScreen() {
  const { t, i18n } = useTranslation();
  const { activeOrder } = useBookingStore();
  const { width } = useWindowDimensions();
  const s = width / BASE_W;
  const isRTL = i18n.language === 'ar';
  const writingDirection: 'rtl' | 'ltr' = isRTL ? 'rtl' : 'ltr';
  const textAlign: 'left' | 'right' = isRTL ? 'right' : 'left';

  const driver = activeOrder?.driver;

  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const scrollRef = useRef<ScrollView>(null);

  // Listen for chat events
  useEffect(() => {
    if (!activeOrder?.id) return;
    socketService.connect();
    socketService.joinOrderRoom(Number(activeOrder.id));
    const unsub = socketService.on('chat:message', (data: any) => {
      if (!data?.text) return;
      setMessages((prev) => [
        ...prev,
        {
          id: data.id?.toString() || String(Date.now()),
          text: data.text,
          fromMe: data.from === 'rider',
          at: new Date(data.at || Date.now()),
        },
      ]);
    });
    return () => {
      unsub?.();
    };
  }, [activeOrder?.id]);

  useEffect(() => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const sendQuick = (q: string) => {
    setText(q);
    setTimeout(send, 0);
  };

  const send = () => {
    const v = text.trim();
    if (!v || !activeOrder?.id) return;
    setMessages((prev) => [
      ...prev,
      { id: String(Date.now()), text: v, fromMe: true, at: new Date() },
    ]);
    setText('');
    socketService.emit?.('chat:send', {
      orderId: activeOrder.id,
      from: 'rider',
      text: v,
    });
  };

  const callDriver = () => {
    if (!driver?.mobileNumber) return;
    Linking.openURL(`tel:${driver.mobileNumber}`).catch(() => {});
  };

  const Bubble = ({ m }: { m: Message }) => (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: m.fromMe ? 'flex-end' : 'flex-start',
        marginBottom: 14 * s,
      }}
    >
      <View style={{ maxWidth: 280 * s }}>
        <View
          style={{
            backgroundColor: m.fromMe ? '#101969' : '#EDF0F7',
            borderRadius: 18 * s,
            borderTopLeftRadius: m.fromMe ? 18 * s : 4 * s,
            borderBottomRightRadius: m.fromMe ? 4 * s : 18 * s,
            paddingHorizontal: 14 * s,
            paddingVertical: 10 * s,
          }}
        >
          <Text
            style={{
              color: m.fromMe ? '#FFFFFF' : '#111111',
              fontSize: 15 * s,
              lineHeight: 22 * s,
            }}
          >
            {m.text}
          </Text>
        </View>
        <Text
          style={{
            color: '#6B7380',
            fontSize: 11 * s,
            fontWeight: '500',
            marginTop: 4 * s,
            textAlign: m.fromMe ? 'right' : 'left',
          }}
        >
          {formatTime(m.at)}
        </Text>
      </View>
    </View>
  );

  const quickReplies = [
    t('chat.quick1', 'On my way'),
    t('chat.quick2', 'Wait please'),
    t('chat.quick3', "I'm outside"),
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#FFFFFF' }} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={{
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 12 * s,
          paddingHorizontal: 12 * s,
          height: 70 * s,
          borderBottomWidth: 1,
          borderBottomColor: '#E5EBF2',
        }}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => router.back()}
          style={{
            width: 40 * s,
            height: 40 * s,
            borderRadius: 12 * s,
            backgroundColor: '#F5F7FC',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons
            name={isRTL ? 'chevron-forward' : 'chevron-back'}
            size={20 * s}
            color="#111111"
          />
        </TouchableOpacity>
        <View
          style={{
            width: 40 * s,
            height: 40 * s,
            borderRadius: 20 * s,
            backgroundColor: '#101969',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Text style={{ color: '#FFFFFF', fontSize: 14 * s, fontWeight: '700' }}>
            {(driver?.firstName?.[0] || 'D').toUpperCase()}
          </Text>
        </View>
        <View style={{ flex: 1, gap: 2 * s }}>
          <Text
            numberOfLines={1}
            style={{ color: '#111111', fontSize: 15 * s, fontWeight: '700', textAlign }}
          >
            {[driver?.firstName, driver?.lastName].filter(Boolean).join(' ') ||
              t('common.driver', 'Driver')}
          </Text>
          <View style={{ flexDirection: isRTL ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 * s }}>
            <View
              style={{
                width: 6 * s,
                height: 6 * s,
                borderRadius: 3 * s,
                backgroundColor: '#33BF73',
              }}
            />
            <Text style={{ color: '#6B7380', fontSize: 12 * s, fontWeight: '500' }}>
              {t('chat.onTheWay', 'On the way')} · {driver?.carModel || ''}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={callDriver}
          style={{
            width: 40 * s,
            height: 40 * s,
            borderRadius: 20 * s,
            backgroundColor: '#F5F7FC',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Ionicons name="call" size={20 * s} color="#101969" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          ref={scrollRef}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 20 * s, paddingVertical: 16 * s }}
        >
          <Text
            style={{
              color: '#6B7380',
              fontSize: 11 * s,
              fontWeight: '600',
              letterSpacing: 0.8,
              textAlign: 'center',
              marginBottom: 14 * s,
            }}
          >
            {t('chat.todayHeader', 'TODAY')}
          </Text>
          {messages.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
        </ScrollView>

        {/* Quick replies */}
        {messages.length === 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{
              gap: 8 * s,
              paddingHorizontal: 20 * s,
              paddingVertical: 10 * s,
            }}
          >
            {quickReplies.map((q) => (
              <TouchableOpacity
                key={q}
                activeOpacity={0.85}
                onPress={() => sendQuick(q)}
                style={{
                  paddingHorizontal: 14 * s,
                  paddingVertical: 8 * s,
                  borderRadius: 999,
                  backgroundColor: '#F5F7FC',
                  borderWidth: 1,
                  borderColor: '#E5EBF2',
                }}
              >
                <Text style={{ color: '#111111', fontSize: 13 * s, fontWeight: '600' }}>
                  {q}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Compose */}
        <View
          style={{
            borderTopWidth: 1,
            borderTopColor: '#E5EBF2',
            backgroundColor: '#FFFFFF',
            paddingHorizontal: 16 * s,
            paddingTop: 12 * s,
            paddingBottom: 18 * s,
            flexDirection: isRTL ? 'row-reverse' : 'row',
            alignItems: 'center',
            gap: 10 * s,
          }}
        >
          <TouchableOpacity
            activeOpacity={0.85}
            style={{
              width: 40 * s,
              height: 40 * s,
              borderRadius: 20 * s,
              backgroundColor: '#F5F7FC',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name="add" size={20 * s} color="#101969" />
          </TouchableOpacity>
          <View
            style={{
              flex: 1,
              minHeight: 44 * s,
              maxHeight: 100 * s,
              paddingHorizontal: 16 * s,
              paddingVertical: 10 * s,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: '#E5EBF2',
              backgroundColor: '#F5F7FC',
              justifyContent: 'center',
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder={t('chat.message', 'Message')}
              placeholderTextColor="#6B7380"
              multiline
              style={{
                fontSize: 15 * s,
                color: '#111111',
                padding: 0,
                textAlign,
                writingDirection,
              }}
            />
          </View>
          <TouchableOpacity
            activeOpacity={0.9}
            disabled={!text.trim()}
            onPress={send}
            style={{
              width: 44 * s,
              height: 44 * s,
              borderRadius: 22 * s,
              backgroundColor: text.trim() ? '#101969' : '#C7CDD8',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Ionicons name={isRTL ? 'send' : 'send'} size={20 * s} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
