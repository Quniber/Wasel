'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Service } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Plus, Trash2, Edit, MoreHorizontal, Users } from 'lucide-react';
import { Modal } from '@/components/modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';

export default function ServicesPage() {
  const [page, setPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    baseFare: 0,
    perKilometer: 0,
    perMinuteDrive: 0,
    minimumFare: 0,
    personCapacity: 4,
    currency: 'QAR',
  });
  const [editFormData, setEditFormData] = useState({
    name: '',
    baseFare: 0,
    perKilometer: 0,
    perMinuteDrive: 0,
    minimumFare: 0,
    personCapacity: 4,
    currency: 'QAR',
    isActive: true,
  });
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['services', page],
    queryFn: () => api.getServices({ page, limit: 10 }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteService(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      toast.success('Service deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete service');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createService(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsModalOpen(false);
      setFormData({
        name: '',
        baseFare: 0,
        perKilometer: 0,
        perMinuteDrive: 0,
        minimumFare: 0,
        personCapacity: 4,
        currency: 'QAR',
      });
      toast.success('Service created successfully');
    },
    onError: () => {
      toast.error('Failed to create service');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: typeof editFormData }) =>
      api.updateService(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services'] });
      setIsEditModalOpen(false);
      setEditingService(null);
      toast.success('Service updated successfully');
    },
    onError: () => {
      toast.error('Failed to update service');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, updates: editFormData });
    }
  };

  const handleEditClick = (service: Service) => {
    setEditingService(service);
    setEditFormData({
      name: service.name,
      baseFare: Number(service.baseFare) || 0,
      perKilometer: Number(service.perKilometer) || 0,
      perMinuteDrive: Number(service.perMinuteDrive) || 0,
      minimumFare: Number(service.minimumFare) || 0,
      personCapacity: service.personCapacity || 4,
      currency: service.currency || 'QAR',
      isActive: service.isActive,
    });
    setIsEditModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Services</h1>
          <p className="text-muted-foreground">Configure your taxi services</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Service">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g., Economy, Premium, SUV"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Fare (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.baseFare}
                onChange={(e) => setFormData({ ...formData, baseFare: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Fare (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.minimumFare}
                onChange={(e) => setFormData({ ...formData, minimumFare: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Per Kilometer (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.perKilometer}
                onChange={(e) => setFormData({ ...formData, perKilometer: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Per Minute (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={formData.perMinuteDrive}
                onChange={(e) => setFormData({ ...formData, perMinuteDrive: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Person Capacity</label>
            <input
              type="number"
              min="1"
              max="20"
              value={formData.personCapacity}
              onChange={(e) => setFormData({ ...formData, personCapacity: parseInt(e.target.value) || 4 })}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Service'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Service Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingService(null);
        }}
        title="Edit Service"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Service Name</label>
            <input
              type="text"
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              required
              placeholder="e.g., Economy, Premium, SUV"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Base Fare (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.baseFare}
                onChange={(e) => setEditFormData({ ...editFormData, baseFare: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Minimum Fare (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.minimumFare}
                onChange={(e) => setEditFormData({ ...editFormData, minimumFare: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Per Kilometer (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.perKilometer}
                onChange={(e) => setEditFormData({ ...editFormData, perKilometer: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Per Minute (QR)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={editFormData.perMinuteDrive}
                onChange={(e) => setEditFormData({ ...editFormData, perMinuteDrive: parseFloat(e.target.value) || 0 })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Person Capacity</label>
            <input
              type="number"
              min="1"
              max="20"
              value={editFormData.personCapacity}
              onChange={(e) => setEditFormData({ ...editFormData, personCapacity: parseInt(e.target.value) || 4 })}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="rounded border-input"
              />
              <span className="text-sm font-medium">Active</span>
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingService(null);
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Services Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : data?.data && data.data.length > 0 ? (
          data.data.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onDelete={() => deleteMutation.mutate(service.id)}
              onEdit={() => handleEditClick(service)}
              isDeleting={deleteMutation.isPending}
            />
          ))
        ) : (
          <div className="col-span-full rounded-lg border bg-card p-12 text-center text-muted-foreground">
            No services found
          </div>
        )}
      </div>

      {/* Pagination */}
      {data?.meta && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages} ({data.meta.total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page === 1}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page === data.meta.totalPages}
              className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function ServiceCard({
  service,
  onDelete,
  onEdit,
  isDeleting,
}: {
  service: Service;
  onDelete: () => void;
  onEdit: () => void;
  isDeleting: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const handleMenuClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setMenuPosition({
      top: rect.bottom + 4,
      left: rect.right - 144, // 144px = w-36 (9rem)
    });
    setShowMenu(!showMenu);
  };

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{service.name}</h3>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                  service.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {service.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">ID: {service.id}</p>
          </div>
          <div className="relative">
            <button
              onClick={handleMenuClick}
              className="rounded-md p-1 hover:bg-muted"
            >
              <MoreHorizontal className="h-5 w-5 text-muted-foreground" />
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-[100]"
                  onClick={() => setShowMenu(false)}
                />
                <div
                  className="fixed z-[101] w-36 rounded-md border bg-card py-1 shadow-lg"
                  style={{ top: menuPosition.top, left: menuPosition.left }}
                >
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      onEdit();
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setShowMenu(false);
                      setShowConfirmDelete(true);
                    }}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Base Fare</span>
            <span className="font-medium">{formatCurrency(service.baseFare, service.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Per KM</span>
            <span className="font-medium">{formatCurrency(service.perKilometer, service.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Per Minute</span>
            <span className="font-medium">{formatCurrency(service.perMinuteDrive, service.currency)}</span>
          </div>
          <div className="flex items-center justify-between border-b pb-2">
            <span className="text-sm text-muted-foreground">Minimum Fare</span>
            <span className="font-medium">{formatCurrency(service.minimumFare, service.currency)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Capacity</span>
            <div className="flex items-center gap-1">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{service.personCapacity}</span>
            </div>
          </div>
        </div>

        <div className="mt-4 border-t pt-4">
          <p className="text-xs text-muted-foreground">
            Created {formatDate(service.createdAt)}
          </p>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setShowConfirmDelete(false);
        }}
        title="Delete Service"
        message={`Are you sure you want to delete the "${service.name}" service? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
