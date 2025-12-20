import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import { documentsApi } from '@/lib/api';

interface Document {
  id?: number;
  type: string;
  documentTypeId?: number;
  status: 'pending' | 'approved' | 'rejected' | 'required';
  expiryDate?: string;
  rejectionReason?: string;
}

const DOCUMENT_TYPES = [
  { key: 'drivers_license', icon: 'card-outline' as const, label: 'documents.driversLicense' },
  { key: 'vehicle_registration', icon: 'document-text-outline' as const, label: 'documents.vehicleRegistration' },
  { key: 'insurance', icon: 'shield-checkmark-outline' as const, label: 'documents.insurance' },
  { key: 'profile_photo', icon: 'person-circle-outline' as const, label: 'documents.profilePhoto' },
  { key: 'vehicle_photo', icon: 'car-outline' as const, label: 'documents.vehiclePhoto' },
];

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentsApi.getMyDocuments();
      setDocuments(response.data);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Set default required documents
      setDocuments(DOCUMENT_TYPES.map((d) => ({ type: d.key, status: 'required' })));
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'approved':
        return { color: colors.success, icon: 'checkmark-circle' as const, label: t('documents.approved') };
      case 'pending':
        return { color: '#f59e0b', icon: 'time' as const, label: t('documents.pending') };
      case 'rejected':
        return { color: colors.destructive, icon: 'close-circle' as const, label: t('documents.rejected') };
      default:
        return { color: colors.mutedForeground, icon: 'add-circle-outline' as const, label: t('documents.required') };
    }
  };

  const handleUpload = async (type: string) => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(t('errors.permissionRequired'), t('errors.photoPermission'));
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setUploadingType(type);
        try {
          // Note: In a real implementation, you would first upload the image
          // to get a mediaId, then call documentsApi.upload with documentTypeId and mediaId
          // For now, we'll show an alert that media upload is needed
          Alert.alert(
            'Document Selected',
            'The document upload flow requires integration with media upload service.',
            [{ text: 'OK' }]
          );
          // Example of how it would work with proper media upload:
          // const mediaResponse = await mediaApi.upload(result.assets[0]);
          // await documentsApi.upload({
          //   documentTypeId: getDocumentTypeId(type),
          //   mediaId: mediaResponse.data.id,
          // });
          // fetchDocuments();
        } catch (error) {
          console.error('Error uploading document:', error);
          Alert.alert(t('errors.uploadFailed'), t('errors.tryAgain'));
        } finally {
          setUploadingType(null);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
    }
  };

  const getDocumentStatus = (type: string): Document => {
    return documents.find((d) => d.type === type) || { type, status: 'required' };
  };

  const approvedCount = documents.filter((d) => d.status === 'approved').length;
  const totalCount = DOCUMENT_TYPES.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="flex-row items-center px-4 py-3 border-b" style={{ borderColor: colors.border }}>
        <TouchableOpacity
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full items-center justify-center"
          style={{ backgroundColor: colors.secondary }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.foreground} />
        </TouchableOpacity>
        <Text style={{ color: colors.foreground }} className="text-xl font-bold ml-4">
          {t('documents.title')}
        </Text>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView className="flex-1" contentContainerStyle={{ padding: 16 }}>
          {/* Progress Card */}
          <View
            className="p-4 rounded-xl mb-6"
            style={{ backgroundColor: colors.primary + '15' }}
          >
            <View className="flex-row items-center justify-between mb-3">
              <Text style={{ color: colors.foreground }} className="text-base font-medium">
                {t('documents.verificationProgress')}
              </Text>
              <Text style={{ color: colors.primary }} className="text-base font-bold">
                {approvedCount}/{totalCount}
              </Text>
            </View>
            <View className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: colors.muted }}>
              <View
                className="h-full rounded-full"
                style={{
                  backgroundColor: colors.primary,
                  width: `${(approvedCount / totalCount) * 100}%`,
                }}
              />
            </View>
            {approvedCount < totalCount && (
              <Text style={{ color: colors.mutedForeground }} className="text-sm mt-2">
                {t('documents.uploadRemaining')}
              </Text>
            )}
          </View>

          {/* Document List */}
          {DOCUMENT_TYPES.map((docType) => {
            const doc = getDocumentStatus(docType.key);
            const statusInfo = getStatusInfo(doc.status);
            const isUploading = uploadingType === docType.key;

            return (
              <TouchableOpacity
                key={docType.key}
                onPress={() => doc.status !== 'approved' && handleUpload(docType.key)}
                disabled={isUploading}
                className="flex-row items-center p-4 rounded-xl mb-3"
                style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
              >
                <View
                  className="w-12 h-12 rounded-full items-center justify-center mr-4"
                  style={{ backgroundColor: statusInfo.color + '20' }}
                >
                  <Ionicons name={docType.icon} size={24} color={statusInfo.color} />
                </View>

                <View className="flex-1">
                  <Text style={{ color: colors.foreground }} className="text-base font-medium">
                    {t(docType.label)}
                  </Text>
                  <View className="flex-row items-center mt-1">
                    <Ionicons name={statusInfo.icon} size={14} color={statusInfo.color} />
                    <Text style={{ color: statusInfo.color }} className="text-sm ml-1">
                      {statusInfo.label}
                    </Text>
                  </View>
                  {doc.rejectionReason && (
                    <Text style={{ color: colors.destructive }} className="text-xs mt-1">
                      {doc.rejectionReason}
                    </Text>
                  )}
                  {doc.expiryDate && doc.status === 'approved' && (
                    <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">
                      {t('documents.expires')}: {new Date(doc.expiryDate).toLocaleDateString()}
                    </Text>
                  )}
                </View>

                {isUploading ? (
                  <ActivityIndicator size="small" color={colors.primary} />
                ) : doc.status !== 'approved' ? (
                  <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                ) : (
                  <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                )}
              </TouchableOpacity>
            );
          })}

          {/* Info Note */}
          <View
            className="p-4 rounded-xl mt-4"
            style={{ backgroundColor: colors.secondary }}
          >
            <View className="flex-row items-start">
              <Ionicons name="information-circle-outline" size={20} color={colors.mutedForeground} />
              <Text style={{ color: colors.mutedForeground }} className="text-sm ml-2 flex-1">
                {t('documents.note')}
              </Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
