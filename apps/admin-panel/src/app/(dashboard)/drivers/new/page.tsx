'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DocumentType, CarModel, CarColor, Fleet, getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  ArrowLeft,
  Save,
  User,
  Phone,
  Mail,
  Car,
  FileText,
  Upload,
  X,
  Check,
  AlertCircle,
  Loader2,
  Calendar,
  Building2,
} from 'lucide-react';

interface DocumentUpload {
  documentTypeId: number;
  file: File | null;
  preview: string | null;
  expiryDate: string;
}

export default function NewDriverPage() {
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fileInputRefs = useRef<{ [key: number]: HTMLInputElement | null }>({});

  // Form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    carPlate: '',
    carModelId: '',
    carColorId: '',
    fleetId: '',
  });

  // Document uploads state - keyed by documentTypeId
  const [documentUploads, setDocumentUploads] = useState<{ [key: number]: DocumentUpload }>({});

  // Fetch document types, car models, car colors, and fleets
  const { data: documentTypes, isLoading: loadingDocTypes } = useQuery({
    queryKey: ['documentTypes', false],
    queryFn: () => api.getDocumentTypes(false), // Only active types
  });

  const { data: carModels, isLoading: loadingCarModels } = useQuery({
    queryKey: ['carModels', false],
    queryFn: () => api.getCarModels(false),
  });

  const { data: carColors, isLoading: loadingCarColors } = useQuery({
    queryKey: ['carColors', false],
    queryFn: () => api.getCarColors(false),
  });

  const { data: fleetsData } = useQuery({
    queryKey: ['fleets'],
    queryFn: () => api.getFleets({ limit: 100 }),
  });

  const fleets = fleetsData?.data || [];

  // Register driver mutation
  const registerMutation = useMutation({
    mutationFn: async () => {
      // Convert file uploads to data URLs
      const documents: Array<{
        documentTypeId: number;
        fileUrl: string;
        fileName: string;
        mimeType: string;
        expiryDate?: string;
      }> = [];

      for (const docTypeId of Object.keys(documentUploads)) {
        const upload = documentUploads[parseInt(docTypeId)];
        if (upload.file) {
          // Convert file to base64
          const base64 = await fileToBase64(upload.file);
          documents.push({
            documentTypeId: parseInt(docTypeId),
            fileUrl: base64,
            fileName: upload.file.name,
            mimeType: upload.file.type,
            expiryDate: upload.expiryDate || undefined,
          });
        }
      }

      return api.registerDriver({
        firstName: formData.firstName,
        lastName: formData.lastName,
        mobileNumber: formData.mobileNumber,
        email: formData.email || undefined,
        carPlate: formData.carPlate || undefined,
        carModelId: formData.carModelId ? parseInt(formData.carModelId) : undefined,
        carColorId: formData.carColorId ? parseInt(formData.carColorId) : undefined,
        fleetId: formData.fleetId ? parseInt(formData.fleetId) : undefined,
        documents: documents.length > 0 ? documents : undefined,
      });
    },
    onSuccess: (driver) => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver registered successfully');
      router.push(`/drivers/${driver.id}`);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileSelect = (documentTypeId: number, file: File | null) => {
    if (file) {
      // Create preview URL
      const preview = URL.createObjectURL(file);
      setDocumentUploads((prev) => ({
        ...prev,
        [documentTypeId]: {
          ...prev[documentTypeId],
          documentTypeId,
          file,
          preview,
          expiryDate: prev[documentTypeId]?.expiryDate || '',
        },
      }));
    }
  };

  const handleRemoveFile = (documentTypeId: number) => {
    setDocumentUploads((prev) => {
      const updated = { ...prev };
      if (updated[documentTypeId]?.preview) {
        URL.revokeObjectURL(updated[documentTypeId].preview!);
      }
      delete updated[documentTypeId];
      return updated;
    });
    // Clear the file input
    if (fileInputRefs.current[documentTypeId]) {
      fileInputRefs.current[documentTypeId]!.value = '';
    }
  };

  const handleExpiryDateChange = (documentTypeId: number, date: string) => {
    setDocumentUploads((prev) => ({
      ...prev,
      [documentTypeId]: {
        ...prev[documentTypeId],
        documentTypeId,
        file: prev[documentTypeId]?.file || null,
        preview: prev[documentTypeId]?.preview || null,
        expiryDate: date,
      },
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validate required fields
    if (!formData.firstName || !formData.lastName || !formData.mobileNumber) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Check for required documents
    const requiredDocs = documentTypes?.filter((dt) => dt.isRequired) || [];
    const missingDocs = requiredDocs.filter((dt) => !documentUploads[dt.id]?.file);
    if (missingDocs.length > 0) {
      toast.error(`Please upload required documents: ${missingDocs.map((d) => d.name).join(', ')}`);
      return;
    }

    registerMutation.mutate();
  };

  const isLoading = loadingDocTypes || loadingCarModels || loadingCarColors;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const sortedDocTypes = [...(documentTypes || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/drivers"
          className="flex items-center justify-center h-10 w-10 rounded-lg border hover:bg-muted"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold">Register New Driver</h1>
          <p className="text-muted-foreground">
            Fill in the driver details and upload required documents
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Personal Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">
                First Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter first name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Last Name <span className="text-destructive">*</span>
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="Enter last name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Phone className="h-4 w-4 inline mr-1" />
                Mobile Number <span className="text-destructive">*</span>
              </label>
              <input
                type="tel"
                name="mobileNumber"
                value={formData.mobileNumber}
                onChange={handleInputChange}
                required
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Mail className="h-4 w-4 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="driver@example.com"
              />
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <Car className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Vehicle Information</h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium mb-1">Car Plate</label>
              <input
                type="text"
                name="carPlate"
                value={formData.carPlate}
                onChange={handleInputChange}
                className="w-full rounded-md border px-3 py-2 text-sm"
                placeholder="ABC 1234"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Car Model</label>
              <select
                name="carModelId"
                value={formData.carModelId}
                onChange={handleInputChange}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select car model</option>
                {carModels?.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.brand} {model.model} {model.year ? `(${model.year})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Car Color</label>
              <select
                name="carColorId"
                value={formData.carColorId}
                onChange={handleInputChange}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Select car color</option>
                {carColors?.map((color) => (
                  <option key={color.id} value={color.id}>
                    {color.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                <Building2 className="h-4 w-4 inline mr-1" />
                Fleet (Optional)
              </label>
              <select
                name="fleetId"
                value={formData.fleetId}
                onChange={handleInputChange}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">No fleet (Independent)</option>
                {fleets.map((fleet) => (
                  <option key={fleet.id} value={fleet.id}>
                    {fleet.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-lg border bg-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Documents</h2>
          </div>

          {sortedDocTypes.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No document types configured.</p>
              <Link href="/settings/document-types" className="text-primary hover:underline">
                Configure document types in settings
              </Link>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {sortedDocTypes.map((docType) => {
                const upload = documentUploads[docType.id];
                const hasFile = upload?.file;

                return (
                  <div key={docType.id} className="rounded-lg border p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-medium">
                          {docType.name}
                          {docType.isRequired && (
                            <span className="text-destructive ml-1">*</span>
                          )}
                        </h3>
                        {docType.description && (
                          <p className="text-xs text-muted-foreground">{docType.description}</p>
                        )}
                      </div>
                      {hasFile && (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                          <Check className="h-3 w-3 mr-1" />
                          Uploaded
                        </span>
                      )}
                    </div>

                    {!hasFile ? (
                      <div
                        className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer hover:border-primary/50 hover:bg-muted/50 transition-colors"
                        onClick={() => fileInputRefs.current[docType.id]?.click()}
                      >
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                        <p className="text-sm text-muted-foreground">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          PNG, JPG, PDF up to 10MB
                        </p>
                        <input
                          ref={(el) => { fileInputRefs.current[docType.id] = el; }}
                          type="file"
                          accept="image/*,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileSelect(docType.id, e.target.files?.[0] || null)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                          {upload.preview && upload.file?.type.startsWith('image/') ? (
                            <img
                              src={upload.preview}
                              alt="Preview"
                              className="h-12 w-12 rounded object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded bg-primary/10 flex items-center justify-center">
                              <FileText className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{upload.file?.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(upload.file?.size || 0)}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFile(docType.id)}
                            className="p-1 rounded hover:bg-destructive/10 text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>

                        {docType.hasExpiry && (
                          <div>
                            <label className="block text-xs font-medium mb-1">
                              <Calendar className="h-3 w-3 inline mr-1" />
                              Expiry Date
                            </label>
                            <input
                              type="date"
                              value={upload.expiryDate}
                              onChange={(e) => handleExpiryDateChange(docType.id, e.target.value)}
                              className="w-full rounded-md border px-3 py-1.5 text-sm"
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3">
          <Link
            href="/drivers"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {registerMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Register Driver
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

// Helper function to convert file to base64
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
  });
}

// Helper function to format file size
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
