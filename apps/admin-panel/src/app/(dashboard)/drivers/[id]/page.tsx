'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DriverDetails, DriverStats, DriverWallet, DriverNote, DriverDocument, Order } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Star, Car, Phone, Mail, MapPin, Calendar,
  CheckCircle, XCircle, Clock, FileText, DollarSign,
  MessageSquare, Plus, TrendingUp, TrendingDown, AlertCircle,
  User, Wallet, ClipboardList, FileCheck, StickyNote
} from 'lucide-react';
import { useToast } from '@/components/toast';
import { Modal } from '@/components/modal';

type TabType = 'overview' | 'documents' | 'orders' | 'wallet' | 'notes';

export default function DriverDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const driverId = Number(params.id);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletType, setWalletType] = useState<'credit' | 'debit'>('credit');
  const [walletDescription, setWalletDescription] = useState('');

  // Fetch driver details
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ['driver', driverId],
    queryFn: () => api.getDriver(driverId),
  });

  // Fetch driver stats
  const { data: stats } = useQuery({
    queryKey: ['driver-stats', driverId],
    queryFn: () => api.getDriverStats(driverId),
  });

  // Fetch driver documents
  const { data: documents } = useQuery({
    queryKey: ['driver-documents', driverId],
    queryFn: () => api.getDriverDocuments(driverId),
    enabled: activeTab === 'documents' || activeTab === 'overview',
  });

  // Fetch driver wallet
  const { data: wallet } = useQuery({
    queryKey: ['driver-wallet', driverId],
    queryFn: () => api.getDriverWallet(driverId),
    enabled: activeTab === 'wallet',
  });

  // Fetch driver orders
  const { data: ordersData } = useQuery({
    queryKey: ['driver-orders', driverId],
    queryFn: () => api.getDriverOrders(driverId, { page: 1, limit: 20 }),
    enabled: activeTab === 'orders',
  });

  // Fetch driver notes
  const { data: notes } = useQuery({
    queryKey: ['driver-notes', driverId],
    queryFn: () => api.getDriverNotes(driverId),
    enabled: activeTab === 'notes',
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: (note: string) => api.addDriverNote(driverId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-notes', driverId] });
      setIsNoteModalOpen(false);
      setNoteText('');
      toast.success('Note added successfully');
    },
    onError: () => {
      toast.error('Failed to add note');
    },
  });

  // Adjust wallet mutation
  const adjustWalletMutation = useMutation({
    mutationFn: () => api.adjustDriverWallet(driverId, Number(walletAmount), walletType, walletDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-wallet', driverId] });
      queryClient.invalidateQueries({ queryKey: ['driver', driverId] });
      setIsWalletModalOpen(false);
      setWalletAmount('');
      setWalletDescription('');
      toast.success('Wallet adjusted successfully');
    },
    onError: () => {
      toast.error('Failed to adjust wallet');
    },
  });

  // Verify document mutation
  const verifyDocumentMutation = useMutation({
    mutationFn: (documentId: number) => api.verifyDriverDocument(documentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['driver-documents', driverId] });
      toast.success('Document verified');
    },
    onError: () => {
      toast.error('Failed to verify document');
    },
  });

  if (driverLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!driver) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Driver not found</p>
        <button
          onClick={() => router.push('/drivers')}
          className="mt-4 text-primary hover:underline"
        >
          Back to drivers
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    in_ride: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    waiting_documents: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending_approval: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
    soft_reject: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    hard_reject: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    blocked: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
    { id: 'documents', label: 'Documents', icon: <FileCheck className="h-4 w-4" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/drivers')}
            className="mt-1 rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{driver.firstName} {driver.lastName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[driver.status] || 'bg-gray-100 text-gray-800'}`}>
                  {driver.status.replace('_', ' ')}
                </span>
                {driver.fleet && (
                  <span className="text-sm text-muted-foreground">
                    Fleet: {driver.fleet.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Rating"
            value={`${Number(stats.rating || 0).toFixed(1)}`}
            subtitle={`${stats.reviewCount} reviews`}
            icon={<Star className="h-5 w-5 text-yellow-500" />}
          />
          <StatCard
            title="Total Orders"
            value={stats.totalOrders.toString()}
            subtitle={`${stats.completedOrders} completed`}
            icon={<ClipboardList className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            title="Acceptance Rate"
            value={`${stats.acceptanceRate}%`}
            subtitle={`${stats.cancelledOrders} cancelled`}
            icon={<CheckCircle className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            title="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            subtitle="All time"
            icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          />
        </div>
      )}

      {/* Tabs */}
      <div className="border-b">
        <nav className="flex gap-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'overview' && (
          <OverviewTab driver={driver} documents={documents} />
        )}
        {activeTab === 'documents' && (
          <DocumentsTab
            documents={documents}
            onVerify={(id) => verifyDocumentMutation.mutate(id)}
            isVerifying={verifyDocumentMutation.isPending}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={ordersData?.orders} />
        )}
        {activeTab === 'wallet' && (
          <WalletTab
            wallet={wallet}
            driverBalance={driver.walletBalance}
            onAdjust={() => setIsWalletModalOpen(true)}
          />
        )}
        {activeTab === 'notes' && (
          <NotesTab
            notes={notes}
            onAddNote={() => setIsNoteModalOpen(true)}
          />
        )}
      </div>

      {/* Add Note Modal */}
      <Modal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        title="Add Note"
      >
        <div className="space-y-4">
          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter note..."
            rows={4}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsNoteModalOpen(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => addNoteMutation.mutate(noteText)}
              disabled={!noteText.trim() || addNoteMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {addNoteMutation.isPending ? 'Adding...' : 'Add Note'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Wallet Modal */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title="Adjust Wallet"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select
              value={walletType}
              onChange={(e) => setWalletType(e.target.value as 'credit' | 'debit')}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="credit">Credit (Add)</option>
              <option value="debit">Debit (Deduct)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Amount</label>
            <input
              type="number"
              value={walletAmount}
              onChange={(e) => setWalletAmount(e.target.value)}
              placeholder="0.00"
              min="0"
              step="0.01"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={walletDescription}
              onChange={(e) => setWalletDescription(e.target.value)}
              placeholder="Reason for adjustment..."
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setIsWalletModalOpen(false)}
              className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
            >
              Cancel
            </button>
            <button
              onClick={() => adjustWalletMutation.mutate()}
              disabled={!walletAmount || !walletDescription || adjustWalletMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {adjustWalletMutation.isPending ? 'Processing...' : 'Adjust Wallet'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

// Stat Card Component
function StatCard({ title, value, subtitle, icon }: { title: string; value: string; subtitle: string; icon: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">{title}</span>
        {icon}
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

// Overview Tab
function OverviewTab({ driver, documents }: { driver: DriverDetails; documents?: DriverDocument[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{driver.mobileNumber}</span>
          </div>
          {driver.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{driver.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {formatDate(driver.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Vehicle Information */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Vehicle Information</h3>
        {driver.carPlate ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <Car className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{driver.carPlate}</span>
            </div>
            {driver.carModel && (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Model:</span>
                <span>{driver.carModel.name}</span>
              </div>
            )}
            {driver.carColor && (
              <div className="flex items-center gap-3">
                <span className="text-muted-foreground">Color:</span>
                <span>{driver.carColor.name}</span>
              </div>
            )}
          </div>
        ) : (
          <p className="text-muted-foreground">No vehicle registered</p>
        )}
      </div>

      {/* Document Summary */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Documents Summary</h3>
        {documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{doc.documentType?.name || 'Document'}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  doc.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
                  doc.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
                  'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
                }`}>
                  {doc.status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No documents uploaded</p>
        )}
      </div>

      {/* Enabled Services */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Enabled Services</h3>
        {driver.enabledServices && driver.enabledServices.length > 0 ? (
          <div className="space-y-2">
            {driver.enabledServices.filter(s => s.isEnabled).map((es) => (
              <div key={es.id} className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span>{es.service.name}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No services enabled</p>
        )}
      </div>
    </div>
  );
}

// Documents Tab
function DocumentsTab({
  documents,
  onVerify,
  isVerifying
}: {
  documents?: DriverDocument[];
  onVerify: (id: number) => void;
  isVerifying: boolean;
}) {
  if (!documents || documents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <FileText className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No documents uploaded</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {documents.map((doc) => (
        <div key={doc.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <h4 className="font-medium">{doc.documentType?.name || 'Document'}</h4>
              <p className="text-sm text-muted-foreground">
                Uploaded {formatDate(doc.createdAt)}
              </p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${
              doc.status === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' :
              doc.status === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' :
              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
            }`}>
              {doc.status}
            </span>
          </div>

          {doc.media?.url && (
            <div className="mb-3 aspect-video bg-muted rounded-md overflow-hidden">
              <img
                src={doc.media.url}
                alt={doc.documentType?.name || 'Document'}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {doc.expiryDate && (
            <p className="text-sm text-muted-foreground mb-2">
              Expires: {formatDate(doc.expiryDate)}
            </p>
          )}

          {doc.rejectionNote && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2">
              Rejection: {doc.rejectionNote}
            </p>
          )}

          {doc.status === 'pending' && (
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => onVerify(doc.id)}
                disabled={isVerifying}
                className="flex-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Approve
              </button>
              <button
                className="flex-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700"
              >
                Reject
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// Orders Tab
function OrdersTab({ orders }: { orders?: Order[] }) {
  if (!orders || orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <ClipboardList className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No orders yet</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    Finished: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    DriverCanceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    RiderCanceled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
    Started: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Order ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Customer</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Service</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Fare</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Date</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-muted/50">
              <td className="px-4 py-3 text-sm font-medium">#{order.id}</td>
              <td className="px-4 py-3 text-sm">
                {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm">{order.service?.name || '-'}</td>
              <td className="px-4 py-3 text-sm">{formatCurrency(order.finalFare || order.estimatedFare || 0)}</td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[order.status] || 'bg-gray-100 text-gray-800'}`}>
                  {order.status}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">{formatDate(order.createdAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Wallet Tab
function WalletTab({
  wallet,
  driverBalance,
  onAdjust
}: {
  wallet?: DriverWallet;
  driverBalance: number;
  onAdjust: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(wallet?.balance ?? driverBalance)}</p>
          </div>
          <button
            onClick={onAdjust}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            <Plus className="h-4 w-4" />
            Adjust Balance
          </button>
        </div>
      </div>

      {/* Transactions */}
      <div className="rounded-lg border bg-card">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Recent Transactions</h3>
        </div>
        {wallet?.transactions && wallet.transactions.length > 0 ? (
          <div className="divide-y">
            {wallet.transactions.map((tx) => (
              <div key={tx.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-full ${
                    tx.type === 'credit'
                      ? 'bg-green-100 dark:bg-green-900/30'
                      : 'bg-red-100 dark:bg-red-900/30'
                  }`}>
                    {tx.type === 'credit' ? (
                      <TrendingUp className="h-4 w-4 text-green-600 dark:text-green-400" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{tx.action}</p>
                    <p className="text-xs text-muted-foreground">{tx.description || 'No description'}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-medium ${tx.type === 'credit' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </p>
                  <p className="text-xs text-muted-foreground">{formatDate(tx.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <Wallet className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No transactions yet</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Notes Tab
function NotesTab({
  notes,
  onAddNote
}: {
  notes?: DriverNote[];
  onAddNote: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          onClick={onAddNote}
          className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="h-4 w-4" />
          Add Note
        </button>
      </div>

      {notes && notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => (
            <div key={note.id} className="rounded-lg border bg-card p-4">
              <p className="text-sm">{note.note}</p>
              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <span>
                  By {note.operator ? `${note.operator.firstName} ${note.operator.lastName}` : 'Unknown'}
                </span>
                <span>•</span>
                <span>{formatDate(note.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12">
          <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-muted-foreground">No notes yet</p>
        </div>
      )}
    </div>
  );
}
