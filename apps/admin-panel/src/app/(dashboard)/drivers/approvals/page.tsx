'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Driver, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import {
  CheckCircle,
  XCircle,
  Eye,
  FileText,
  User,
  Phone,
  Mail,
  Car,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { Modal } from '@/components/modal';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';

const PENDING_STATUSES = ['pending_approval', 'waiting_documents'];

export default function DriverApprovalsPage() {
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [rejectNote, setRejectNote] = useState('');
  const [rejectType, setRejectType] = useState<'soft_reject' | 'hard_reject'>('soft_reject');
  const [expandedDriverId, setExpandedDriverId] = useState<number | null>(null);
  const [showConfirmApprove, setShowConfirmApprove] = useState(false);
  const [approvingDriver, setApprovingDriver] = useState<Driver | null>(null);
  const queryClient = useQueryClient();
  const toast = useToast();

  // Fetch pending drivers
  const { data: pendingData, isLoading: loadingPending } = useQuery({
    queryKey: ['drivers', 'pending_approval'],
    queryFn: () => api.getDrivers({ status: 'pending_approval', limit: 50 }),
  });

  const { data: waitingData, isLoading: loadingWaiting } = useQuery({
    queryKey: ['drivers', 'waiting_documents'],
    queryFn: () => api.getDrivers({ status: 'waiting_documents', limit: 50 }),
  });

  // Combine pending drivers
  const pendingDrivers = [
    ...(pendingData?.data || []),
    ...(waitingData?.data || []),
  ];

  const isLoading = loadingPending || loadingWaiting;

  // Approve mutation
  const approveMutation = useMutation({
    mutationFn: (driverId: number) => api.updateDriver(driverId, { status: 'offline' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver approved successfully');
      setShowConfirmApprove(false);
      setApprovingDriver(null);
      setSelectedDriver(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setShowConfirmApprove(false);
      setApprovingDriver(null);
    },
  });

  // Reject mutation
  const rejectMutation = useMutation({
    mutationFn: ({ driverId, status, note }: { driverId: number; status: string; note: string }) =>
      api.updateDriver(driverId, { status: status as any, softRejectionNote: note }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['drivers'] });
      toast.success('Driver rejected successfully');
      setIsRejectModalOpen(false);
      setRejectNote('');
      setSelectedDriver(null);
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
      setIsRejectModalOpen(false);
      setRejectNote('');
    },
  });

  const handleApprove = (driver: Driver) => {
    setApprovingDriver(driver);
    setShowConfirmApprove(true);
  };

  const handleRejectClick = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = () => {
    if (!selectedDriver) return;
    rejectMutation.mutate({
      driverId: selectedDriver.id,
      status: rejectType,
      note: rejectNote,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; label: string }> = {
      pending_approval: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending Approval' },
      waiting_documents: { color: 'bg-blue-100 text-blue-800', label: 'Waiting Documents' },
      soft_reject: { color: 'bg-orange-100 text-orange-800', label: 'Soft Rejected' },
      hard_reject: { color: 'bg-red-100 text-red-800', label: 'Hard Rejected' },
    };
    const config = statusConfig[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Driver Approvals</h1>
        <p className="text-muted-foreground">Review and approve new driver registrations</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-yellow-100 p-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingData?.data?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Pending Approval</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-blue-100 p-2">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{waitingData?.data?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Waiting Documents</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-100 p-2">
              <AlertCircle className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{pendingDrivers.length}</p>
              <p className="text-sm text-muted-foreground">Total Pending</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Drivers List */}
      <div className="rounded-lg border bg-card">
        <div className="border-b px-6 py-4">
          <h2 className="font-semibold">Pending Driver Requests</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : pendingDrivers.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <CheckCircle className="mx-auto h-12 w-12 text-green-500 mb-3" />
            <p>No pending driver requests</p>
          </div>
        ) : (
          <div className="divide-y">
            {pendingDrivers.map((driver) => (
              <DriverApprovalCard
                key={driver.id}
                driver={driver}
                isExpanded={expandedDriverId === driver.id}
                onToggleExpand={() => setExpandedDriverId(
                  expandedDriverId === driver.id ? null : driver.id
                )}
                onApprove={() => handleApprove(driver)}
                onReject={() => handleRejectClick(driver)}
                isApproving={approveMutation.isPending}
                getStatusBadge={getStatusBadge}
              />
            ))}
          </div>
        )}
      </div>

      {/* Approve Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirmApprove}
        onClose={() => {
          setShowConfirmApprove(false);
          setApprovingDriver(null);
        }}
        onConfirm={() => {
          if (approvingDriver) {
            approveMutation.mutate(approvingDriver.id);
          }
        }}
        title="Approve Driver"
        message={`Are you sure you want to approve ${approvingDriver?.firstName} ${approvingDriver?.lastName}?`}
        confirmText="Approve"
        cancelText="Cancel"
        variant="default"
        isLoading={approveMutation.isPending}
      />

      {/* Reject Modal */}
      <Modal
        isOpen={isRejectModalOpen}
        onClose={() => {
          setIsRejectModalOpen(false);
          setRejectNote('');
        }}
        title={`Reject Driver: ${selectedDriver?.firstName} ${selectedDriver?.lastName}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Rejection Type</label>
            <div className="space-y-2">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rejectType"
                  value="soft_reject"
                  checked={rejectType === 'soft_reject'}
                  onChange={() => setRejectType('soft_reject')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Soft Reject</span>
                <span className="text-xs text-muted-foreground">- Driver can resubmit</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="rejectType"
                  value="hard_reject"
                  checked={rejectType === 'hard_reject'}
                  onChange={() => setRejectType('hard_reject')}
                  className="h-4 w-4"
                />
                <span className="text-sm">Hard Reject</span>
                <span className="text-xs text-muted-foreground">- Permanent rejection</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Rejection Note <span className="text-muted-foreground">(will be sent to driver)</span>
            </label>
            <textarea
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              rows={4}
              placeholder="Please provide a reason for rejection. This will help the driver understand what needs to be corrected..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={() => {
                setIsRejectModalOpen(false);
                setRejectNote('');
              }}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={handleRejectSubmit}
              disabled={rejectMutation.isPending}
              className="rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50"
            >
              {rejectMutation.isPending ? 'Rejecting...' : 'Reject Driver'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

function DriverApprovalCard({
  driver,
  isExpanded,
  onToggleExpand,
  onApprove,
  onReject,
  isApproving,
  getStatusBadge,
}: {
  driver: Driver;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onApprove: () => void;
  onReject: () => void;
  isApproving: boolean;
  getStatusBadge: (status: string) => React.ReactNode;
}) {
  // Fetch driver documents when expanded
  const { data: documents, isLoading: loadingDocs } = useQuery({
    queryKey: ['driver-documents', driver.id],
    queryFn: () => api.getDriverDocuments(driver.id),
    enabled: isExpanded,
  });

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium text-lg">
            {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{driver.firstName} {driver.lastName}</h3>
              {getStatusBadge(driver.status)}
            </div>
            <div className="mt-1 flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {driver.mobileNumber}
              </span>
              {driver.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {driver.email}
                </span>
              )}
              {driver.carPlate && (
                <span className="flex items-center gap-1">
                  <Car className="h-3 w-3" />
                  {driver.carPlate}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Registered: {formatDate(driver.createdAt)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onApprove}
            disabled={isApproving}
            className="flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            <CheckCircle className="h-4 w-4" />
            Approve
          </button>
          <button
            onClick={onReject}
            className="flex items-center gap-1 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            <XCircle className="h-4 w-4" />
            Reject
          </button>
          <button
            onClick={onToggleExpand}
            className="rounded-md border p-1.5 hover:bg-muted"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-4 border-t pt-4">
          <h4 className="font-medium mb-3 flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Documents
          </h4>

          {loadingDocs ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            </div>
          ) : documents && documents.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {documents.map((doc: any) => (
                <DocumentCard key={doc.id} doc={doc} driverId={driver.id} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No documents uploaded yet
            </p>
          )}

          {/* Driver Details */}
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-lg bg-muted/50 p-3">
              <h5 className="text-sm font-medium mb-2">Vehicle Information</h5>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Plate:</span> {driver.carPlate || 'Not provided'}</p>
                <p><span className="text-muted-foreground">Model:</span> {driver.carModel?.name || 'Not provided'}</p>
                <p><span className="text-muted-foreground">Color:</span> {driver.carColor?.name || 'Not provided'}</p>
              </div>
            </div>
            <div className="rounded-lg bg-muted/50 p-3">
              <h5 className="text-sm font-medium mb-2">Fleet Information</h5>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Fleet:</span> {driver.fleet?.name || 'Independent'}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DocumentCard({ doc, driverId }: { doc: any; driverId: number }) {
  const [showPreview, setShowPreview] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionNote, setRejectionNote] = useState('');
  const queryClient = useQueryClient();
  const toast = useToast();

  // Check if media address is base64 or URL
  const isBase64 = doc.media?.address?.startsWith('data:');
  const isImage = doc.media?.mimeType?.startsWith('image/') ||
                  doc.media?.address?.startsWith('data:image/');
  const isPdf = doc.media?.mimeType === 'application/pdf' ||
                doc.media?.address?.startsWith('data:application/pdf');

  const mediaUrl = doc.media?.address || doc.media?.url;

  // Verify document mutation
  const verifyMutation = useMutation({
    mutationFn: () => api.verifyDriverDocument(doc.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
      toast.success('Document approved');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Reject document mutation
  const rejectMutation = useMutation({
    mutationFn: (note: string) => api.rejectDriverDocument(doc.id, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
      toast.success('Document rejected');
      setShowRejectModal(false);
      setRejectionNote('');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  const handleReject = () => {
    if (!rejectionNote.trim()) {
      toast.error('Please provide a rejection note');
      return;
    }
    rejectMutation.mutate(rejectionNote);
  };

  const isPending = doc.status === 'pending';

  return (
    <>
      <div className="rounded-lg border p-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="font-medium text-sm">{doc.documentType?.name || 'Document'}</p>
            <p className="text-xs text-muted-foreground mt-1">
              Status: {' '}
              <span className={`font-medium ${
                doc.status === 'approved' ? 'text-green-600' :
                doc.status === 'rejected' ? 'text-red-600' :
                'text-yellow-600'
              }`}>
                {doc.status}
              </span>
            </p>
            {doc.expiryDate && (
              <p className="text-xs text-muted-foreground">
                Expires: {formatDate(doc.expiryDate)}
              </p>
            )}
          </div>
          {mediaUrl && (
            <button
              onClick={() => setShowPreview(true)}
              className="rounded-md border p-1 hover:bg-muted"
              title="View document"
            >
              <Eye className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Thumbnail preview for images */}
        {isImage && mediaUrl && (
          <div className="mt-2">
            <img
              src={mediaUrl}
              alt={doc.documentType?.name || 'Document'}
              className="w-full h-24 object-cover rounded cursor-pointer hover:opacity-80"
              onClick={() => setShowPreview(true)}
            />
          </div>
        )}

        {doc.rejectionNote && (
          <p className="mt-2 text-xs text-red-600 bg-red-50 p-2 rounded">
            Note: {doc.rejectionNote}
          </p>
        )}

        {/* Document approval buttons */}
        {isPending && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => verifyMutation.mutate()}
              disabled={verifyMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-green-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              <CheckCircle className="h-3 w-3" />
              {verifyMutation.isPending ? 'Approving...' : 'Approve'}
            </button>
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={rejectMutation.isPending}
              className="flex-1 flex items-center justify-center gap-1 rounded-md bg-red-600 px-2 py-1.5 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
            >
              <XCircle className="h-3 w-3" />
              Reject
            </button>
          </div>
        )}
      </div>

      {/* Document Reject Modal */}
      {showRejectModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={() => setShowRejectModal(false)}
        >
          <div
            className="bg-background rounded-lg p-4 w-full max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-3">Reject Document</h3>
            <p className="text-sm text-muted-foreground mb-3">
              Rejecting: {doc.documentType?.name || 'Document'}
            </p>
            <textarea
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Enter reason for rejection..."
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm mb-3"
            />
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowRejectModal(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={rejectMutation.isPending}
                className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {rejectMutation.isPending ? 'Rejecting...' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Preview Modal */}
      {showPreview && mediaUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
          onClick={() => setShowPreview(false)}
        >
          <div
            className="relative max-w-4xl max-h-[90vh] overflow-auto bg-white rounded-lg p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowPreview(false)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <XCircle className="h-5 w-5" />
            </button>

            <div className="p-4">
              <h3 className="font-medium mb-2">{doc.documentType?.name || 'Document'}</h3>

              {isImage ? (
                <img
                  src={mediaUrl}
                  alt={doc.documentType?.name || 'Document'}
                  className="max-w-full max-h-[70vh] object-contain mx-auto"
                />
              ) : isPdf ? (
                <iframe
                  src={mediaUrl}
                  className="w-full h-[70vh]"
                  title={doc.documentType?.name || 'Document'}
                />
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    {doc.media?.fileName || 'Document file'}
                  </p>
                  <a
                    href={mediaUrl}
                    download={doc.media?.fileName || 'document'}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    Download File
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
