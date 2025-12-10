'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, CarColor, getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Palette,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function CarColorsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingColor, setEditingColor] = useState<CarColor | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: carColors, isLoading, error } = useQuery({
    queryKey: ['carColors', showInactive],
    queryFn: () => api.getCarColors(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: (data: { name: string; hexCode?: string }) =>
      api.createCarColor(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carColors'] });
      toast.success('Car color created successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { name?: string; hexCode?: string; isActive?: boolean } }) =>
      api.updateCarColor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carColors'] });
      toast.success('Car color updated successfully');
      setIsModalOpen(false);
      setEditingColor(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCarColor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carColors'] });
      toast.success('Car color deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.updateCarColor(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carColors'] });
      toast.success('Car color status updated');
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
      hexCode: (formData.get('hexCode') as string) || undefined,
    };

    if (editingColor) {
      updateMutation.mutate({ id: editingColor.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (color: CarColor) => {
    setEditingColor(color);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingColor(null);
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
            <h1 className="text-2xl font-bold">Car Colors</h1>
            <p className="text-muted-foreground">
              Manage available car colors for drivers
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Car Color
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

      {/* Car Colors Grid */}
      <div className="rounded-lg border bg-card p-6">
        {!carColors || carColors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Palette className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No car colors configured</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary hover:underline"
            >
              Add your first car color
            </button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
            {carColors.map((color) => (
              <div
                key={color.id}
                className={`flex items-center justify-between rounded-lg border p-3 ${
                  !color.isActive ? 'opacity-50 bg-muted/30' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-8 w-8 rounded-full border-2 border-white shadow-sm"
                    style={{
                      backgroundColor: color.hexCode || '#808080',
                    }}
                  />
                  <div>
                    <p className="font-medium">{color.name}</p>
                    {color.hexCode && (
                      <p className="text-xs text-muted-foreground uppercase">{color.hexCode}</p>
                    )}
                    {!color.isActive && (
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 mt-1">
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleActiveMutation.mutate({ id: color.id, isActive: !color.isActive })}
                    className={`flex items-center justify-center h-7 w-7 rounded border ${
                      color.isActive
                        ? 'text-green-600 hover:bg-green-50'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                    title={color.isActive ? 'Deactivate' : 'Activate'}
                  >
                    {color.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                  </button>

                  <button
                    onClick={() => openEditModal(color)}
                    className="flex items-center justify-center h-7 w-7 rounded border hover:bg-muted"
                    title="Edit"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>

                  {deleteConfirm === color.id ? (
                    <div className="flex items-center gap-0.5">
                      <button
                        onClick={() => deleteMutation.mutate(color.id)}
                        className="flex items-center justify-center h-7 w-7 rounded bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        title="Confirm delete"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex items-center justify-center h-7 w-7 rounded border hover:bg-muted"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(color.id)}
                      className="flex items-center justify-center h-7 w-7 rounded border text-destructive hover:bg-destructive/10"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
              {editingColor ? 'Edit Car Color' : 'Add Car Color'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Color Name *</label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingColor?.name || ''}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Black, White, Silver"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Hex Color Code (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    name="colorPicker"
                    defaultValue={editingColor?.hexCode || '#000000'}
                    className="h-10 w-10 rounded border cursor-pointer"
                    onChange={(e) => {
                      const input = e.currentTarget.form?.querySelector('input[name="hexCode"]') as HTMLInputElement;
                      if (input) input.value = e.target.value;
                    }}
                  />
                  <input
                    type="text"
                    name="hexCode"
                    defaultValue={editingColor?.hexCode || ''}
                    className="flex-1 rounded-md border px-3 py-2 text-sm uppercase"
                    placeholder="#000000"
                    pattern="^#[0-9A-Fa-f]{6}$"
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Used for visual representation (e.g., #FF0000 for red)
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingColor(null);
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
                    : editingColor
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
