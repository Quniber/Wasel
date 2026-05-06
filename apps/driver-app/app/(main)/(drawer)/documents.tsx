import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Image, Modal, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, DrawerActions } from '@react-navigation/native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
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

// `name` MUST match the server's DocumentType.name exactly (case + punctuation).
// We compare by raw equality — the server is the source of truth.
const DOCUMENT_TYPES = [
  { name: "Driver's License",       icon: 'card-outline'              as const, label: 'documents.driversLicense' },
  { name: 'Insurance Certificate',  icon: 'shield-checkmark-outline'  as const, label: 'documents.insurance' },
  { name: 'Vehicle Registration',   icon: 'document-text-outline'     as const, label: 'documents.vehicleRegistration' },
  { name: 'Profile Photo',          icon: 'person-circle-outline'     as const, label: 'documents.profilePhoto' },
  { name: 'Vehicle Photo (Front)',  icon: 'car-outline'               as const, label: 'documents.vehiclePhotoFront' },
  { name: 'Vehicle Photo (Back)',   icon: 'car-outline'               as const, label: 'documents.vehiclePhotoBack' },
];

export default function DocumentsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
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

      // Map uploaded docs by their exact server name
      const docMap = new Map<string, Document>();
      uploadedDocs.forEach((doc: Document) => {
        const name = doc.documentType?.name;
        if (name) docMap.set(name, doc);
      });

      const mergedDocs = DOCUMENT_TYPES.map((docType) => {
        const uploaded = docMap.get(docType.name);
        return uploaded || { type: docType.name, status: 'required' as const };
      });

      setDocuments(mergedDocs);
    } catch (error) {
      console.error('Error fetching documents:', error);
      // Set default required documents
      setDocuments(DOCUMENT_TYPES.map((d) => ({ type: d.name, status: 'required' })));
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

  const pickPhoto = async (): Promise<{ uri: string; name: string; mime: string } | null> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('errors.permissionRequired'), t('errors.photoPermission'));
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.8,
      presentationStyle: ImagePicker.UIImagePickerPresentationStyle.FULL_SCREEN,
    });
    if (result.canceled || !result.assets[0]) return null;
    const a = result.assets[0];
    const ext = a.uri.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = a.mimeType || (ext === 'png' ? 'image/png' : 'image/jpeg');
    return { uri: a.uri, name: `doc_${Date.now()}.${ext}`, mime };
  };

  const pickFile = async (): Promise<{ uri: string; name: string; mime: string } | null> => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const a = result.assets[0];
    return {
      uri: a.uri,
      name: a.name || `doc_${Date.now()}`,
      mime: a.mimeType || 'application/octet-stream',
    };
  };

  const performUpload = async (type: string, picked: { uri: string; name: string; mime: string }) => {
    setUploadingType(type);
    try {
      const requiredResp = await documentsApi.getRequired();
      const required = requiredResp.data || [];
      const matched = required.find((dt: { id: number; name: string }) => dt.name === type);
      if (!matched) throw new Error(`Document type "${type}" not found on server`);

      const mediaResp = await documentsApi.uploadFile({
        uri: picked.uri,
        name: picked.name,
        type: picked.mime,
      });

      await documentsApi.upload({
        documentTypeId: matched.id,
        mediaId: mediaResp.data.id,
      });

      await fetchDocuments();
      Alert.alert(t('documents.uploadedTitle') || 'Uploaded', t('documents.uploadedMessage') || 'Document submitted for review.');
    } catch (error: any) {
      console.error('Error uploading document:', error?.response?.data || error);
      Alert.alert(t('errors.uploadFailed') || 'Upload failed', t('errors.tryAgain') || 'Please try again.');
    } finally {
      setUploadingType(null);
    }
  };

  const handleUpload = async (type: string) => {
    Alert.alert(
      t('documents.uploadTitle') || 'Upload document',
      t('documents.uploadPrompt') || 'Choose a source',
      [
        { text: t('documents.photo') || 'Photo', onPress: async () => { const f = await pickPhoto(); if (f) await performUpload(type, f); } },
        { text: t('documents.pdfOrFile') || 'PDF / File', onPress: async () => { const f = await pickFile(); if (f) await performUpload(type, f); } },
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
      ],
    );
  };

  const getDocumentStatus = (name: string): Document => {
    return documents.find((d) => d.type === name || d.documentType?.name === name) || { type: name, status: 'required' };
  };

  const isPdfUrl = (url?: string | null) => !!url && /\.pdf(\?|#|$)/i.test(url);

  const handleViewDocument = async (doc: Document) => {
    const url = doc.media?.address;
    if (!url) return;
    // PDFs (and anything not an image) → open in the system viewer / browser.
    // Images stay in the in-app modal so the driver can pinch-zoom.
    if (isPdfUrl(url)) {
      try { await Linking.openURL(url); }
      catch { Alert.alert(t('errors.uploadFailed') || 'Error', 'Could not open document'); }
      return;
    }
    setViewingDocument(url);
  };

  const handleDownloadDocument = async (doc: Document) => {
    if (doc.media?.address) {
      try { await Linking.openURL(doc.media.address); }
      catch { Alert.alert('Error', 'Could not open document'); }
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
            const doc = getDocumentStatus(docType.name);
            const statusInfo = getStatusInfo(doc.status);
            const isUploading = uploadingType === docType.name;
            const hasUploadedDoc = doc.media?.address;

            return (
              <View
                key={docType.name}
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
                  ) : (
                    <TouchableOpacity onPress={() => handleUpload(docType.name)} hitSlop={10}>
                      <Ionicons
                        name={hasUploadedDoc ? 'refresh' : 'cloud-upload-outline'}
                        size={24}
                        color={colors.primary}
                      />
                    </TouchableOpacity>
                  )}
                </View>

                {/* Document Preview */}
                {hasUploadedDoc && (
                  <View className="mt-3 pt-3 border-t" style={{ borderColor: colors.border }}>
                    <TouchableOpacity
                      onPress={() => handleViewDocument(doc)}
                      className="flex-row items-center"
                    >
                      {isPdfUrl(doc.media?.address) ? (
                        <View
                          className="w-16 h-16 rounded-lg items-center justify-center mr-3"
                          style={{ backgroundColor: colors.primary + '20' }}
                        >
                          <Ionicons name="document-text" size={28} color={colors.primary} />
                        </View>
                      ) : (
                        <View className="w-16 h-16 rounded-lg overflow-hidden mr-3" style={{ backgroundColor: colors.secondary }}>
                          <Image
                            source={{ uri: doc.media?.address }}
                            className="w-full h-full"
                            resizeMode="cover"
                          />
                        </View>
                      )}
                      <View className="flex-1">
                        <Text style={{ color: colors.foreground }} className="text-sm font-medium">
                          {t('documents.viewDocument') || 'View Document'}
                        </Text>
                        <Text style={{ color: colors.mutedForeground }} className="text-xs mt-1">
                          {isPdfUrl(doc.media?.address)
                            ? (t('documents.tapToOpenPdf') || 'Tap to open PDF')
                            : (t('documents.tapToView') || 'Tap to view full size')}
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
        animationType="fade"
        presentationStyle="overFullScreen"
        statusBarTranslucent
        onRequestClose={() => setViewingDocument(null)}
      >
        <View style={{ flex: 1, backgroundColor: '#000' }}>
          {/* Image fills the screen and sits BEHIND the header so the header
              never shares hit-testing with it. */}
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
            {viewingDocument && (
              <Image
                source={{ uri: viewingDocument }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Header — explicit safe-area top inset because Modal can swallow
              the SafeAreaView context on iOS. zIndex/elevation guarantees it
              receives touches over the Image. */}
          <View
            style={{
              position: 'absolute',
              top: 0, left: 0, right: 0,
              paddingTop: insets.top,
              paddingHorizontal: 12,
              backgroundColor: 'rgba(0,0,0,0.6)',
              zIndex: 10,
              elevation: 10,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', height: 56 }}>
              <TouchableOpacity
                onPress={() => setViewingDocument(null)}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}
              >
                <Ionicons name="close" size={26} color="#ffffff" />
              </TouchableOpacity>
              <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>
                {t('documents.viewDocument') || 'Document Preview'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  const doc = documents.find(d => d.media?.address === viewingDocument);
                  if (doc) handleDownloadDocument(doc);
                }}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={{ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.22)' }}
              >
                <Ionicons name="download-outline" size={24} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
