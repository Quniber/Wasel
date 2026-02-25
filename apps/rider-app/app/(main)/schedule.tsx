import { useState } from 'react';
import { View, Text, TouchableOpacity, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useThemeStore } from '@/stores/theme-store';
import { useBookingStore } from '@/stores/booking-store';

export default function ScheduleScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const { pickup, dropoff, selectedService, fareEstimate } = useBookingStore();
  const isDark = resolvedTheme === 'dark';

  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Minimum scheduling time is 30 minutes from now
  const minDate = new Date(Date.now() + 30 * 60 * 1000);

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      const newDate = new Date(date);
      newDate.setFullYear(selectedDate.getFullYear());
      newDate.setMonth(selectedDate.getMonth());
      newDate.setDate(selectedDate.getDate());
      setDate(newDate);
    }
  };

  const handleTimeChange = (event: any, selectedTime?: Date) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedTime) {
      const newDate = new Date(date);
      newDate.setHours(selectedTime.getHours());
      newDate.setMinutes(selectedTime.getMinutes());
      setDate(newDate);
    }
  };

  const handleSchedule = async () => {
    if (date < minDate) {
      Alert.alert(
        t('schedule.error'),
        t('schedule.minTimeError')
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // API call to schedule ride
      // await orderApi.scheduleRide({ pickup, dropoff, service: selectedService, scheduledTime: date });

      Alert.alert(
        t('schedule.success'),
        t('schedule.successMessage'),
        [
          {
            text: t('common.ok'),
            onPress: () => router.replace('/(main)/(drawer)/scheduled'),
          },
        ]
      );
    } catch (error) {
      Alert.alert(t('common.error'), t('schedule.submitError'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (d: Date) => {
    return d.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (d: Date) => {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-background-dark' : 'bg-background'}`}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-4">
        <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
          <Ionicons name="arrow-back" size={24} color={isDark ? '#FAFAFA' : '#212121'} />
        </TouchableOpacity>
        <Text className={`flex-1 text-xl font-semibold text-center mr-10 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
          {t('schedule.title')}
        </Text>
      </View>

      <View className="flex-1 px-4">
        {/* Trip Summary */}
        {pickup && dropoff && (
          <View className={`p-4 rounded-xl mb-6 ${isDark ? 'bg-card-dark' : 'bg-card'}`}>
            <View className="flex-row items-center mb-2">
              <View className="w-3 h-3 rounded-full bg-primary" />
              <Text className={`ml-3 flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
                {pickup.address}
              </Text>
            </View>
            <View className="w-0.5 h-4 bg-border ml-1.5" />
            <View className="flex-row items-center">
              <View className="w-3 h-3 rounded-full bg-destructive" />
              <Text className={`ml-3 flex-1 ${isDark ? 'text-foreground-dark' : 'text-foreground'}`} numberOfLines={1}>
                {dropoff.address}
              </Text>
            </View>
            {selectedService && fareEstimate && (
              <View className={`flex-row justify-between mt-4 pt-4 border-t ${isDark ? 'border-border-dark' : 'border-border'}`}>
                <Text className="text-muted-foreground">{selectedService.name}</Text>
                <Text className={`font-semibold ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
                  ~QAR {fareEstimate.toFixed(2)}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Date Picker */}
        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
          {t('schedule.selectDate')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          className={`flex-row items-center justify-between p-4 rounded-xl mb-4 ${isDark ? 'bg-card-dark' : 'bg-card'}`}
        >
          <View className="flex-row items-center">
            <Ionicons name="calendar" size={24} color="#4CAF50" />
            <Text className={`ml-3 text-lg ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {formatDate(date)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
        </TouchableOpacity>

        {/* Time Picker */}
        <Text className={`text-sm font-semibold mb-2 ${isDark ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
          {t('schedule.selectTime')}
        </Text>
        <TouchableOpacity
          onPress={() => setShowTimePicker(true)}
          className={`flex-row items-center justify-between p-4 rounded-xl mb-4 ${isDark ? 'bg-card-dark' : 'bg-card'}`}
        >
          <View className="flex-row items-center">
            <Ionicons name="time" size={24} color="#4CAF50" />
            <Text className={`ml-3 text-lg ${isDark ? 'text-foreground-dark' : 'text-foreground'}`}>
              {formatTime(date)}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={isDark ? '#757575' : '#9E9E9E'} />
        </TouchableOpacity>

        {/* Note */}
        <View className={`flex-row items-start p-4 rounded-xl ${isDark ? 'bg-muted-dark' : 'bg-muted'}`}>
          <Ionicons name="information-circle" size={20} color="#4CAF50" />
          <Text className="text-muted-foreground ml-2 flex-1">
            {t('schedule.note')}
          </Text>
        </View>

        {/* Date/Time Pickers */}
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            minimumDate={minDate}
            onChange={handleDateChange}
          />
        )}

        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={handleTimeChange}
          />
        )}
      </View>

      {/* Confirm Button */}
      <View className="px-4 pb-4">
        <TouchableOpacity
          onPress={handleSchedule}
          disabled={isSubmitting}
          className="bg-primary py-4 rounded-xl items-center"
        >
          <Text className="text-white text-lg font-semibold">
            {isSubmitting ? t('common.loading') : t('schedule.confirm')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
