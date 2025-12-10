'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, CancelReason, getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  XCircle,
  Check,
  X,
  AlertCircle,
  Loader2,
  Car,
  User,
} from 'lucide-react';

export default function CancelReasonsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReason, setEditingReason] = useState<CancelReason | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: cancelReasons, isLoading, error } = useQuery({
    queryKey: ['cancelReasons', showInactive],
    queryFn: () => api.getCancelReasons(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: (data: { title: string; isForDriver?: boolean; isForRider?: boolean }) =>
      api.createCancelReason(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelReasons'] });
      toast.success('Cancel reason created successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { title?: string; isForDriver?: boolean; isForRider?: boolean; isActive?: boolean } }) =>
      api.updateCancelReason(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelReasons'] });
      toast.success('Cancel reason updated successfully');
      setIsModalOpen(false);
      setEditingReason(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCancelReason(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelReasons'] });
      toast.success('Cancel reason deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.updateCancelReason(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cancelReasons'] });
      toast.success('Cancel reason status updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      title: formData.get('title') as string,
      isForDriver: formData.get('isForDriver') === 'on',
      isForRider: formData.get('isForRider') === 'on',
    };

    if (editingReason) {
      updateMutation.mutate({ id: editingReason.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (reason: CancelReason) => {
    setEditingReason(reason);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingReason(null);
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
            <h1 className="text-2xl font-bold">Cancel Reasons</h1>
            <p className="text-muted-foreground">
              Configure reasons for order cancellation
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Cancel Reason
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

      {/* Cancel Reasons List */}
      <div className="rounded-lg border bg-card">
        {!cancelReasons || cancelReasons.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <XCircle className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No cancel reasons configured</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary hover:underline"
            >
              Add your first cancel reason
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {cancelReasons.map((reason) => (
              <div
                key={reason.id}
                className={`flex items-center gap-4 p-4 ${
                  !reason.isActive ? 'opacity-50 bg-muted/30' : ''
                }`}
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{reason.title}</h3>
                    {!reason.isActive && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    {reason.isForRider && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <User className="h-3 w-3" />
                        For Riders
                      </span>
                    )}
                    {reason.isForDriver && (
                      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                        <Car className="h-3 w-3" />
                        For Drivers
                      </span>
                    )}
                    {reason._count?.orders !== undefined && reason._count.orders > 0 && (
                      <span className="text-xs text-muted-foreground">
                        Used {reason._count.orders} times
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: reason.id, isActive: !reason.isActive })}
                    className={`flex items-center justify-center h-8 w-8 rounded-lg border ${
                      reason.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={reason.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {reason.isActive ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </button>

                  <button
                    onClick={() => openEditModal(reason)}
                    className="flex items-center justify-center h-8 w-8 rounded-lg border hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>

                  {deleteConfirm === reason.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => deleteMutation.mutate(reason.id)}
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
                      onClick={() => setDeleteConfirm(reason.id)}
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
              {editingReason ? 'Edit Cancel Reason' : 'Add Cancel Reason'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Reason *</label>
                <input
                  type="text"
                  name="title"
                  defaultValue={editingReason?.title || ''}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Driver took too long, Changed my mind"
                />
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium">Available For:</p>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isForRider"
                    defaultChecked={editingReason?.isForRider ?? true}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <User className="h-4 w-4" />
                    Riders (Customers)
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    name="isForDriver"
                    defaultChecked={editingReason?.isForDriver ?? false}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm flex items-center gap-1">
                    <Car className="h-4 w-4" />
                    Drivers
                  </span>
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingReason(null);
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
                    : editingReason
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
