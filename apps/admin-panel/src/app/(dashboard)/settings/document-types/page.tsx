'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, DocumentType, CreateDocumentTypeDto, UpdateDocumentTypeDto, getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  FileText,
  Check,
  X,
  GripVertical,
  Calendar,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function DocumentTypesPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<DocumentType | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: documentTypes, isLoading, error } = useQuery({
    queryKey: ['documentTypes', showInactive],
    queryFn: () => api.getDocumentTypes(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateDocumentTypeDto) => api.createDocumentType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type created successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateDocumentTypeDto }) =>
      api.updateDocumentType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type updated successfully');
      setIsModalOpen(false);
      setEditingType(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDocumentType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.updateDocumentType(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documentTypes'] });
      toast.success('Document type status updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      name: formData.get('name') as string,
      description: formData.get('description') as string || undefined,
      isRequired: formData.get('isRequired') === 'on',
      hasExpiry: formData.get('hasExpiry') === 'on',
      sortOrder: parseInt(formData.get('sortOrder') as string) || 0,
    };

    if (editingType) {
      updateMutation.mutate({ id: editingType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (type: DocumentType) => {
    setEditingType(type);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingType(null);
    setIsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-8 w-8 text-destructive mb-2" />
        <p className="text-destructive">{getErrorMessage(error)}</p>
      </div>
    );
  }

  const sortedTypes = [...(documentTypes || [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="flex items-center justify-center h-10 w-10 rounded-lg border hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Document Types</h1>
            <p className="text-muted-foreground">
              Configure documents that drivers need to upload during registration
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Document Type
        </button>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showInactive}
            onChange={(e) => setShowInactive(e.target.checked)}
            className="rounded border-gray-300"
          />
          Show inactive
        </label>
      </div>

      {/* Document Types List */}
      <div className="rounded-lg border bg-card">
        {sortedTypes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No document types configured</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary hover:underline"
            >
              Add your first document type
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {sortedTypes.map((type) => (
              <div
                key={type.id}
                className={`flex items-center gap-4 p-4 ${
                  !type.isActive ? 'opacity-50 bg-muted/30' : ''
                }`}
              >
                <div className="text-muted-foreground">
                  <GripVertical className="h-5 w-5" />
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{type.name}</h3>
                    {type.isRequired && (
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Required
                      </span>
                    )}
                    {type.hasExpiry && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                        <Calendar className="h-3 w-3" />
                        Has Expiry
                      </span>
                    )}
                    {!type.isActive && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  {type.description && (
                    <p className="text-sm text-muted-foreground mt-1">{type.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: type.id, isActive: !type.isActive })}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg border ${
                      type.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={type.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {type.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => openEditModal(type)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg border hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {deleteConfirm === type.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(type.id)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        title="Confirm delete"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex items-center justify-center h-8 w-8 rounded-lg border hover:bg-muted"
                        title="Cancel"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(type.id)}
                      className="flex items-center justify-center h-8 w-8 rounded-lg border text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold mb-4">
              {editingType ? 'Edit Document Type' : 'Add Document Type'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingType?.name || ''}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., National ID, Driving License"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  name="description"
                  defaultValue={editingType?.description || ''}
                  rows={2}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="Optional description or instructions"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Sort Order</label>
                <input
                  type="number"
                  name="sortOrder"
                  defaultValue={editingType?.sortOrder || 0}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="0"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Lower numbers appear first
                </p>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isRequired"
                    defaultChecked={editingType?.isRequired ?? true}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Required document</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="hasExpiry"
                    defaultChecked={editingType?.hasExpiry ?? false}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">Document has expiry date</span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingType(null);
                  }}
                  className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? 'Saving...'
                    : editingType
                    ? 'Save Changes'
                    : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
