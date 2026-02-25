import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useThemeStore } from '@/stores/theme-store';
import { getColors } from '@/constants/Colors';
import { documentsApi } from '@/lib/api';

interface Document {
  id?: number;
  type?: string;
  documentType?: {
    id: number;
    name: string;
  };
  documentTypeId?: number;
  media?: {
    id: number;
    address: string;
  } | null;
  status: 'pending' | 'approved' | 'rejected' | 'required';
  expiryDate?: string;
  rejectionNote?: string;
  verifiedAt?: string;
  createdAt?: string;
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
  const navigation = useNavigation();
  const { resolvedTheme } = useThemeStore();
  const isDark = resolvedTheme === 'dark';
  const colors = getColors(isDark);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [uploadingType, setUploadingType] = useState<string | null>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);

  useEffect(() => {
    fetchDocuments();
  }, []);

  const fetchDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentsApi.getMyDocuments();
      const uploadedDocs = response.data || [];

      // Create a map of uploaded documents by document type name
      const docMap = new Map<string, Document>();
      uploadedDocs.forEach((doc: Document) => {
        const typeName = doc.documentType?.name?.toLowerCase().replace(/\s+/g, '_');
        if (typeName) {
          docMap.set(typeName, doc);
        }
      });

      // Merge with required document types
      const mergedDocs = DOCUMENT_TYPES.map((docType) => {
        const uploaded = docMap.get(docType.key);
        return uploaded || { type: docType.key, status: 'required' as const };
      });

      setDocuments(mergedDocs);
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
    return documents.find((d) => d.type === type || d.documentType?.name?.toLowerCase().replace(/\s+/g, '_') === type) || { type, status: 'required' };
  };

  const handleViewDocument = (doc: Document) => {
    if (doc.media?.address) {
      setViewingDocument(doc.media.address);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (doc.media?.address) {
      try {
        await Linking.openURL(doc.media.address);
      } catch (error) {
        Alert.alert('Error', 'Could not open document');
      }
    }
  };

  const approvedCount = documents.filter((d) => d.status === 'approved').length;
  const totalCount = DOCUMENT_TYPES.length;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View className="px-4 py-4 border-b" style={{ borderColor: colors.border }}>
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.dispatch(DrawerActions.openDrawer())}
            className="w-11 h-11 rounded-xl items-center justify-center mr-3"
            style={{ backgroundColor: colors.secondary }}
          >
            <Ionicons name="menu" size={22} color={colors.foreground} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text style={{ color: colors.foreground }} className="text-2xl font-bold">
              {t('documents.title')}
            </Text>
          </View>
        </View>
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
            const hasUploadedDoc = doc.media?.address;

            return (
              <View
                key={docType.key}
                className="p-4 rounded-xl mb-3"
                style={{ backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }}
              >
                <View className="flex-row items-center">
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
                    {doc.rejectionNote && (
                      <Text style={{ color: colors.destructive }} className="text-xs mt-1">
                        {doc.rejectionNote}
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
                    <TouchableOpacity onPress={() => handleUpload(docType.key)}>
                      <Ionicons name="cloud-upload-outline" size={24} color={colors.primary} />
                    </TouchableOpacity>
                  ) : (
                    <Ionicons name="checkmark-circle" size={24} color={colors.success} />
                  )}
                </View>

                {/* Document Preview */}
                {hasUploadedDoc && (
                  <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                    <TouchableOpacity
                      onPress={() => handleViewDocument(doc)}
                      className="flex-row items-center"
                    >
                      <View className="w-16 h-16 rounded-lg overflow-hidden mr-3" style={{ backgroundColor: colors.secondary }}>
                        <Image
                          source={{ uri: doc.media?.address }}
                          className="w-full h-full"
                          resizeMode="cover"
                        />
                      </View>
                      <View className="flex-1">
                        <Text style={{ color: colors.foreground }} className="text-sm font-medium">
                          View Document
                        </Text>
                        <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">
                          Tap to view full size
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.mutedForeground} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
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

      {/* Document Viewer Modal */}
      <Modal
        visible={viewingDocument !== null}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setViewingDocument(null)}
      >
        <View className="flex-1 bg-black">
          <SafeAreaView style={{ flex: 1 }}>
            {/* Header */}
            <View className="flex-row items-center justify-between px-4 py-3" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
              <TouchableOpacity
                onPress={() => setViewingDocument(null)}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Ionicons name="close" size={24} color="#ffffff" />
              </TouchableOpacity>
              <Text className="text-white text-base font-medium">Document Preview</Text>
              <TouchableOpacity
                onPress={() => {
                  const doc = documents.find(d => d.media?.address === viewingDocument);
                  if (doc) handleDownloadDocument(doc);
                }}
                className="w-10 h-10 rounded-full items-center justify-center"
                style={{ backgroundColor: 'rgba(255,255,255,0.2)' }}
              >
                <Ionicons name="download-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>

            {/* Image Viewer */}
            <View className="flex-1 items-center justify-center">
              {viewingDocument && (
                <Image
                  source={{ uri: viewingDocument }}
                  className="w-full h-full"
                  resizeMode="contain"
                />
              )}
            </View>
          </SafeAreaView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
