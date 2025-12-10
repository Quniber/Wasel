'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Driver } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { Plus, Search, Trash2, Edit, MoreHorizontal, Star, Download, Eye } from 'lucide-react';
import Link from 'next/link';
import { Modal } from '@/components/modal';
import { ConfirmDialog } from '@/components/confirm-dialog';
import { useToast } from '@/components/toast';
import { exportToCSV, driverColumns } from '@/lib/export-csv';

export default function DriversPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    carPlate: '',
  });
  const [editFormData, setEditFormData] = useState({
    firstName: '',
    lastName: '',
    mobileNumber: '',
    email: '',
    carPlate: '',
    status: '' as string,
  });
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['drivers', page, search, statusFilter],
    queryFn: () =>
      api.getDrivers({
        page,
        limit: 10,
        search: search || undefined,
        status: statusFilter || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.deleteDriver(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete driver');
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => api.createDriver(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsModalOpen(false);
      setFormData({
        firstName: '',
        lastName: '',
        mobileNumber: '',
        email: '',
        carPlate: '',
      });
      toast.success('Driver created successfully');
    },
    onError: () => {
      toast.error('Failed to create driver');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; updates: typeof editFormData }) =>
      api.updateDriver(data.id, data.updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      setIsEditModalOpen(false);
      setEditingDriver(null);
      toast.success('Driver updated successfully');
    },
    onError: () => {
      toast.error('Failed to update driver');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingDriver) {
      updateMutation.mutate({ id: editingDriver.id, updates: editFormData });
    }
  };

  const handleEditClick = (driver: Driver) => {
    setEditingDriver(driver);
    setEditFormData({
      firstName: driver.firstName,
      lastName: driver.lastName,
      mobileNumber: driver.mobileNumber,
      email: driver.email || '',
      carPlate: driver.carPlate || '',
      status: driver.status,
    });
    setIsEditModalOpen(true);
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const exportData = await api.getDrivers({ page: 1, limit: 1000, search: search || undefined, status: statusFilter || undefined });
      if (exportData.data.length === 0) {
        toast.error('No drivers to export');
        return;
      }
      const filename = `drivers_${new Date().toISOString().split('T')[0]}`;
      exportToCSV(exportData.data, driverColumns, filename);
      toast.success(`Exported ${exportData.data.length} drivers`);
    } catch (error) {
      toast.error('Failed to export drivers');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Drivers</h1>
          <p className="text-muted-foreground">Manage your driver fleet</p>
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
          <Link
            href="/drivers/new"
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Add Driver
          </Link>
        </div>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Driver">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile Number</label>
            <input
              type="tel"
              value={formData.mobileNumber}
              onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (Optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="border-t pt-4 mt-4">
            <p className="text-sm font-medium mb-3">Vehicle Information (Optional)</p>
            <div>
              <label className="block text-sm font-medium mb-1">Car Plate Number</label>
              <input
                type="text"
                value={formData.carPlate}
                onChange={(e) => setFormData({ ...formData, carPlate: e.target.value })}
                placeholder="e.g., ABC-1234"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
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
              {createMutation.isPending ? 'Creating...' : 'Create Driver'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Driver Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          setEditingDriver(null);
        }}
        title="Edit Driver"
      >
        <form onSubmit={handleEditSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">First Name</label>
              <input
                type="text"
                value={editFormData.firstName}
                onChange={(e) => setEditFormData({ ...editFormData, firstName: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Name</label>
              <input
                type="text"
                value={editFormData.lastName}
                onChange={(e) => setEditFormData({ ...editFormData, lastName: e.target.value })}
                required
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Mobile Number</label>
            <input
              type="tel"
              value={editFormData.mobileNumber}
              onChange={(e) => setEditFormData({ ...editFormData, mobileNumber: e.target.value })}
              required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email (Optional)</label>
            <input
              type="email"
              value={editFormData.email}
              onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Car Plate Number</label>
            <input
              type="text"
              value={editFormData.carPlate}
              onChange={(e) => setEditFormData({ ...editFormData, carPlate: e.target.value })}
              placeholder="e.g., ABC-1234"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={editFormData.status}
              onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="online">Online</option>
              <option value="offline">Offline</option>
              <option value="in_ride">In Ride</option>
              <option value="waiting_documents">Waiting Documents</option>
              <option value="pending_approval">Pending Approval</option>
              <option value="soft_reject">Soft Reject</option>
              <option value="hard_reject">Hard Reject</option>
              <option value="blocked">Blocked</option>
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsEditModalOpen(false);
                setEditingDriver(null);
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

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search drivers..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="w-full rounded-md border border-input bg-background py-2 pl-10 pr-4 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <option value="">All Statuses</option>
          <option value="online">Online</option>
          <option value="offline">Offline</option>
          <option value="in_ride">In Ride</option>
          <option value="waiting_documents">Waiting Documents</option>
          <option value="pending_approval">Pending Approval</option>
          <option value="soft_reject">Soft Reject</option>
          <option value="hard_reject">Hard Reject</option>
          <option value="blocked">Blocked</option>
        </select>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Driver
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Vehicle
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Rating
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Reviews
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Joined
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : data?.data && data.data.length > 0 ? (
                data.data.map((driver) => (
                  <DriverRow
                    key={driver.id}
                    driver={driver}
                    onDelete={() => deleteMutation.mutate(driver.id)}
                    onEdit={() => handleEditClick(driver)}
                    isDeleting={deleteMutation.isPending}
                  />
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                    No drivers found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {data?.meta && data.meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-3">
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
    </div>
  );
}

function DriverRow({
  driver,
  onDelete,
  onEdit,
  isDeleting,
}: {
  driver: Driver;
  onDelete: () => void;
  onEdit: () => void;
  isDeleting: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  const statusColors: Record<string, string> = {
    available: 'bg-green-100 text-green-800',
    busy: 'bg-yellow-100 text-yellow-800',
    offline: 'bg-gray-100 text-gray-800',
  };

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
      <tr className="hover:bg-muted/50">
        <td className="px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary font-medium">
              {driver.firstName.charAt(0)}
              {driver.lastName.charAt(0)}
            </div>
            <div>
              <p className="font-medium">
                {driver.firstName} {driver.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{driver.mobileNumber}</p>
            </div>
          </div>
        </td>
        <td className="px-6 py-4">
          {driver.carPlate ? (
            <div>
              <p className="text-sm font-medium">{driver.carPlate}</p>
              <p className="text-sm text-muted-foreground">
                {driver.carModel?.name} {driver.carColor?.name && `(${driver.carColor.name})`}
              </p>
            </div>
          ) : (
            <span className="text-sm text-muted-foreground">No vehicle</span>
          )}
        </td>
        <td className="px-6 py-4">
          <div className="flex items-center gap-1">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{Number(driver.rating || 0).toFixed(1)}</span>
          </div>
        </td>
        <td className="px-6 py-4">
          <span className="text-sm">{driver.reviewCount || 0}</span>
        </td>
        <td className="px-6 py-4">
          <span
            className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
              statusColors[driver.status] || 'bg-gray-100 text-gray-800'
            }`}
          >
            {driver.status}
          </span>
        </td>
        <td className="px-6 py-4 text-sm text-muted-foreground">
          {formatDate(driver.createdAt)}
        </td>
        <td className="px-6 py-4 text-right">
          <div className="relative inline-block">
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
                  <Link
                    href={`/drivers/${driver.id}`}
                    onClick={() => setShowMenu(false)}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm hover:bg-muted"
                  >
                    <Eye className="h-4 w-4" />
                    View
                  </Link>
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
        </td>
      </tr>

      <ConfirmDialog
        isOpen={showConfirmDelete}
        onClose={() => setShowConfirmDelete(false)}
        onConfirm={() => {
          onDelete();
          setShowConfirmDelete(false);
        }}
        title="Delete Driver"
        message={`Are you sure you want to delete ${driver.firstName} ${driver.lastName}? This action cannot be undone.`}
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={isDeleting}
      />
    </>
  );
}
