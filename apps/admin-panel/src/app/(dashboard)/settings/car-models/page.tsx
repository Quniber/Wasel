'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import { api, CarModel, getErrorMessage } from '@/lib/api';
import { useToast } from '@/components/toast';
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  Car,
  Check,
  X,
  AlertCircle,
  Loader2,
} from 'lucide-react';

export default function CarModelsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const [showInactive, setShowInactive] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<CarModel | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const { data: carModels, isLoading, error } = useQuery({
    queryKey: ['carModels', showInactive],
    queryFn: () => api.getCarModels(showInactive),
  });

  const createMutation = useMutation({
    mutationFn: (data: { brand: string; model: string; year?: number }) =>
      api.createCarModel(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carModels'] });
      toast.success('Car model created successfully');
      setIsModalOpen(false);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: { brand?: string; model?: string; year?: number; isActive?: boolean } }) =>
      api.updateCarModel(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carModels'] });
      toast.success('Car model updated successfully');
      setIsModalOpen(false);
      setEditingModel(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteCarModel(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carModels'] });
      toast.success('Car model deleted successfully');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: number; isActive: boolean }) =>
      api.updateCarModel(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carModels'] });
      toast.success('Car model status updated');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data = {
      brand: formData.get('brand') as string,
      model: formData.get('model') as string,
      year: formData.get('year') ? parseInt(formData.get('year') as string) : undefined,
    };

    if (editingModel) {
      updateMutation.mutate({ id: editingModel.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const openEditModal = (model: CarModel) => {
    setEditingModel(model);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingModel(null);
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

  // Group by brand
  const modelsByBrand = (carModels || []).reduce((acc, model) => {
    if (!acc[model.brand]) {
      acc[model.brand] = [];
    }
    acc[model.brand].push(model);
    return acc;
  }, {} as Record<string, CarModel[]>);

  const brands = Object.keys(modelsByBrand).sort();

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
            <h1 className="text-2xl font-bold">Car Models</h1>
            <p className="text-muted-foreground">
              Manage available car brands and models for drivers
            </p>
          </div>
        </div>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Car Model
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

      {/* Car Models List */}
      <div className="rounded-lg border bg-card">
        {brands.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Car className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No car models configured</p>
            <button
              onClick={openCreateModal}
              className="mt-4 text-primary hover:underline"
            >
              Add your first car model
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {brands.map((brand) => (
              <div key={brand} className="p-4">
                <h3 className="font-semibold text-lg mb-3">{brand}</h3>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {modelsByBrand[brand].map((model) => (
                    <div
                      key={model.id}
                      className={`flex items-center justify-between rounded-lg border p-3 ${
                        !model.isActive ? 'opacity-50 bg-muted/30' : ''
                      }`}
                    >
                      <div>
                        <p className="font-medium">{model.model}</p>
                        {model.year && (
                          <p className="text-xs text-muted-foreground">Year: {model.year}</p>
                        )}
                        {!model.isActive && (
                          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600 mt-1">
                            Inactive
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleActiveMutation.mutate({ id: model.id, isActive: !model.isActive })}
                          className={`flex items-center justify-center h-7 w-7 rounded border ${
                            model.isActive
                              ? 'text-green-600 hover:bg-green-50'
                              : 'text-muted-foreground hover:bg-muted'
                          }`}
                          title={model.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {model.isActive ? <Check className="h-3.5 w-3.5" /> : <X className="h-3.5 w-3.5" />}
                        </button>

                        <button
                          onClick={() => openEditModal(model)}
                          className="flex items-center justify-center h-7 w-7 rounded border hover:bg-muted"
                          title="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>

                        {deleteConfirm === model.id ? (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => deleteMutation.mutate(model.id)}
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
                            onClick={() => setDeleteConfirm(model.id)}
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
              {editingModel ? 'Edit Car Model' : 'Add Car Model'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Brand *</label>
                <input
                  type="text"
                  name="brand"
                  defaultValue={editingModel?.brand || ''}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Toyota, Honda, BMW"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Model *</label>
                <input
                  type="text"
                  name="model"
                  defaultValue={editingModel?.model || ''}
                  required
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., Camry, Civic, X5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Year (Optional)</label>
                <input
                  type="number"
                  name="year"
                  defaultValue={editingModel?.year || ''}
                  min="1990"
                  max="2030"
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  placeholder="e.g., 2023"
                />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingModel(null);
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
                    : editingModel
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
