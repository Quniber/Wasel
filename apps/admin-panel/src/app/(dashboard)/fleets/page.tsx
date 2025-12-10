'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage, Fleet } from '@/lib/api';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { Plus, Search, Building2, MoreVertical, Pencil, Trash2, Users, Download, Eye } from 'lucide-react';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { exportToCSV, fleetColumns } from '@/lib/export-csv';

export default function FleetsPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editingFleet, setEditingFleet] = useState<Fleet | null>(null);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [deletingFleet, setDeletingFleet] = useState<Fleet | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['fleets', page, search],
    queryFn: () => api.getFleets({ page, limit: 10, search }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteFleet(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet deleted successfully');
      setShowConfirmDelete(false);
      setDeletingFleet(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setShowConfirmDelete(false);
      setDeletingFleet(null);
    },
  });

  const fleets = data?.data || [];
  const meta = data?.meta;

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await api.getFleets({ page: 1, limit: 1000, search });
      if (exportData.data.length === 0) {
        toast.error('No fleets to export');
        return;
      }
      const filename = `fleets_${new Date().toISOString().split('T')[0]}`;
      exportToCSV(exportData.data, fleetColumns, filename);
      toast.success(`Exported ${exportData.data.length} fleets`);
    } catch (error) {
      toast.error('Failed to export fleets');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Fleets</h1>
          <p className="text-muted-foreground">Manage taxi fleet companies</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
          <button
            onClick={() => {
              setEditingFleet(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Fleet
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search fleets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border bg-background pl-9 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fleet</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Commission</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Drivers</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : fleets.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-muted-foreground">
                  No fleets found
                </td>
              </tr>
            ) : (
              fleets.map((fleet) => (
                <tr key={fleet.id} className="border-b hover:bg-muted/50">
                  <td className="px-6 py-4">
                    <Link href={`/fleets/${fleet.id}`} className="flex items-center gap-3 hover:opacity-80">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <Building2 className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium hover:underline">{fleet.name}</p>
                        {fleet.phoneNumber && (
                          <p className="text-sm text-muted-foreground">{fleet.phoneNumber}</p>
                        )}
                      </div>
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-medium">{fleet.commissionSharePercent}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>{fleet._count?.drivers || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                        fleet.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {fleet.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {formatDateTime(fleet.createdAt)}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        href={`/fleets/${fleet.id}`}
                        className="rounded p-1 hover:bg-muted"
                        title="View details"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button
                        onClick={() => {
                          setEditingFleet(fleet);
                          setShowModal(true);
                        }}
                        className="rounded p-1 hover:bg-muted"
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingFleet(fleet);
                          setShowConfirmDelete(true);
                        }}
                        className="rounded p-1 hover:bg-destructive/10 text-destructive"
                        title="Delete"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing {(page - 1) * 10 + 1} to {Math.min(page * 10, meta.total)} of {meta.total}
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
                disabled={page === meta.totalPages}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <FleetModal
          fleet={editingFleet}
          onClose={() => {
            setShowModal(false);
            setEditingFleet(null);
          }}
        />
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => {
          setShowConfirmDelete(false);
          setDeletingFleet(null);
        }}
        onConfirm={() => {
          if (deletingFleet) {
            deleteMutation.mutate(deletingFleet.id);
          }
        }}
        title="Delete Fleet"
        message={`Are you sure you want to delete ${deletingFleet?.name}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function FleetModal({ fleet, onClose }: { fleet: Fleet | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const toast = useToast();
  const [formData, setFormData] = useState({
    name: fleet?.name || '',
    commissionSharePercent: fleet?.commissionSharePercent || 0,
    phoneNumber: fleet?.phoneNumber || '',
    mobileNumber: fleet?.mobileNumber || '',
    address: fleet?.address || '',
    isActive: fleet?.isActive ?? true,
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createFleet(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet created successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      onClose();
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: typeof formData) => api.updateFleet(fleet!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleets'] });
      toast.success('Fleet updated successfully');
      onClose();
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (fleet) {
      updateMutation.mutate(formData);
    } else {
      createMutation.mutate(formData);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-background p-6 shadow-lg">
        <h2 className="text-lg font-semibold mb-4">
          {fleet ? 'Edit Fleet' : 'Add Fleet'}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border px-3 py-2"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Commission %</label>
            <input
              type="number"
              value={formData.commissionSharePercent}
              onChange={(e) => setFormData({ ...formData, commissionSharePercent: parseFloat(e.target.value) })}
              className="w-full rounded-md border px-3 py-2"
              min="0"
              max="100"
              step="0.1"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone Number</label>
            <input
              type="text"
              value={formData.phoneNumber}
              onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Office phone"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile Number</label>
            <input
              type="text"
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Mobile contact"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full rounded-md border px-3 py-2"
              placeholder="Fleet office address"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="rounded"
            />
            <label htmlFor="isActive" className="text-sm">Active</label>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {fleet ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
