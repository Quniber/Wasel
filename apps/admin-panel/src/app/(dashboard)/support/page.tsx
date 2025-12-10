'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import { Search, MessageSquare, Clock, CheckCircle, XCircle, AlertCircle, Eye } from 'lucide-react';
import { useToast } from '@/components/toast';

type ComplaintStatus = 'pending' | 'in_progress' | 'resolved' | 'closed';

const statusConfig: Record<ComplaintStatus, { label: string; icon: any; className: string }> = {
  pending: { label: 'Pending', icon: Clock, className: 'bg-yellow-100 text-yellow-800' },
  in_progress: { label: 'In Progress', icon: AlertCircle, className: 'bg-blue-100 text-blue-800' },
  resolved: { label: 'Resolved', icon: CheckCircle, className: 'bg-green-100 text-green-800' },
  closed: { label: 'Closed', icon: XCircle, className: 'bg-gray-100 text-gray-800' },
};

export default function SupportPage() {
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [selectedComplaint, setSelectedComplaint] = useState<any>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ['complaints', page, statusFilter],
    queryFn: () => api.getComplaints({ page, limit: 10, status: statusFilter || undefined }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, status, response }: { id: number; status: string; response?: string }) =>
      api.updateComplaintStatus(id, status, response),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['complaints'] });
      toast.success('Ticket updated successfully');
      setSelectedComplaint(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const complaints = data?.data || [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Support</h1>
        <p className="text-muted-foreground">Manage customer complaints and support tickets</p>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="">All Status</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In Progress</option>
          <option value="resolved">Resolved</option>
          <option value="closed">Closed</option>
        </select>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <p className="text-sm text-muted-foreground">Pending</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{complaints.filter((c: any) => c.status === 'pending').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-blue-500" />
            <p className="text-sm text-muted-foreground">In Progress</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{complaints.filter((c: any) => c.status === 'in_progress').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <p className="text-sm text-muted-foreground">Resolved</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{complaints.filter((c: any) => c.status === 'resolved').length}</p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <p className="text-sm text-muted-foreground">Total Tickets</p>
          </div>
          <p className="mt-1 text-2xl font-bold">{meta?.total || 0}</p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Subject</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Order</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Created</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : complaints.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  No support tickets found
                </td>
              </tr>
            ) : (
              complaints.map((complaint: any) => {
                const config = statusConfig[complaint.status as ComplaintStatus] || statusConfig.pending;
                const StatusIcon = config.icon;
                return (
                  <tr key={complaint.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-mono text-sm">#{complaint.id}</td>
                    <td className="px-6 py-4">
                      {complaint.customer ? (
                        <div>
                          <p className="font-medium">
                            {complaint.customer.firstName} {complaint.customer.lastName}
                          </p>
                          <p className="text-sm text-muted-foreground">{complaint.customer.mobileNumber}</p>
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-medium max-w-xs truncate">{complaint.subject}</p>
                      <p className="text-sm text-muted-foreground max-w-xs truncate">{complaint.content}</p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {complaint.order ? (
                        <span className="font-mono text-sm">#{complaint.order.id}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(complaint.createdAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setSelectedComplaint(complaint)}
                        className="rounded p-1 hover:bg-muted"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
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

      {/* Detail Modal */}
      {selectedComplaint && (
        <ComplaintModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onUpdate={(status, response) => {
            updateMutation.mutate({ id: selectedComplaint.id, status, response });
          }}
          isUpdating={updateMutation.isPending}
        />
      )}
    </div>
  );
}

function ComplaintModal({
  complaint,
  onClose,
  onUpdate,
  isUpdating,
}: {
  complaint: any;
  onClose: () => void;
  onUpdate: (status: string, response?: string) => void;
  isUpdating: boolean;
}) {
  const [status, setStatus] = useState(complaint.status);
  const [response, setResponse] = useState(complaint.response || '');

  const config = statusConfig[complaint.status as ComplaintStatus] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Ticket #{complaint.id}</h2>
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${config.className}`}>
            <StatusIcon className="h-3 w-3" />
            {config.label}
          </span>
        </div>

        <div className="space-y-4">
          {/* Customer Info */}
          {complaint.customer && (
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Customer</p>
              <p className="font-medium">
                {complaint.customer.firstName} {complaint.customer.lastName}
              </p>
              <p className="text-sm text-muted-foreground">{complaint.customer.mobileNumber}</p>
            </div>
          )}

          {/* Order Info */}
          {complaint.order && (
            <div className="rounded-lg border p-3">
              <p className="text-sm text-muted-foreground">Related Order</p>
              <p className="font-mono font-medium">#{complaint.order.id}</p>
            </div>
          )}

          {/* Subject & Content */}
          <div>
            <p className="text-sm font-medium text-muted-foreground">Subject</p>
            <p className="font-medium">{complaint.subject}</p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground">Description</p>
            <p className="whitespace-pre-wrap rounded-lg border bg-muted/50 p-3 text-sm">
              {complaint.content}
            </p>
          </div>

          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Created</p>
            <p className="text-sm">{formatDateTime(complaint.createdAt)}</p>
          </div>

          <hr />

          {/* Update Status */}
          <div>
            <label className="block text-sm font-medium mb-1">Update Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="w-full rounded-md border px-3 py-2"
            >
              <option value="pending">Pending</option>
              <option value="in_progress">In Progress</option>
              <option value="resolved">Resolved</option>
              <option value="closed">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Response</label>
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              rows={4}
              className="w-full rounded-md border px-3 py-2 resize-none"
              placeholder="Enter your response to the customer..."
            />
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
              onClick={() => onUpdate(status, response)}
              disabled={isUpdating}
              className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              {isUpdating ? 'Updating...' : 'Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
