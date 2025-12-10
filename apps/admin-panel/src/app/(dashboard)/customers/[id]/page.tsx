'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Customer, CustomerStats, CustomerWallet, CustomerNote, CustomerAddress, Order } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Phone, Mail, Calendar, MapPin,
  DollarSign, MessageSquare, Plus, TrendingUp, TrendingDown,
  AlertCircle, User, Wallet, ClipboardList, StickyNote, Home
} from 'lucide-react';
import { useToast } from '@/components/toast';
import { Modal } from '@/components/modal';

type TabType = 'overview' | 'orders' | 'wallet' | 'addresses' | 'notes';

export default function CustomerDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const customerId = Number(params.id);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [walletAmount, setWalletAmount] = useState('');
  const [walletType, setWalletType] = useState<'credit' | 'debit'>('credit');
  const [walletDescription, setWalletDescription] = useState('');

  // Fetch customer details
  const { data: customer, isLoading: customerLoading } = useQuery({
    queryKey: ['customer', customerId],
    queryFn: () => api.getCustomer(customerId),
  });

  // Fetch customer stats
  const { data: stats } = useQuery({
    queryKey: ['customer-stats', customerId],
    queryFn: () => api.getCustomerStats(customerId),
  });

  // Fetch customer wallet
  const { data: wallet } = useQuery({
    queryKey: ['customer-wallet', customerId],
    queryFn: () => api.getCustomerWallet(customerId),
    enabled: activeTab === 'wallet',
  });

  // Fetch customer orders
  const { data: ordersData } = useQuery({
    queryKey: ['customer-orders', customerId],
    queryFn: () => api.getCustomerOrders(customerId, { page: 1, limit: 20 }),
    enabled: activeTab === 'orders',
  });

  // Fetch customer addresses
  const { data: addresses } = useQuery({
    queryKey: ['customer-addresses', customerId],
    queryFn: () => api.getCustomerAddresses(customerId),
    enabled: activeTab === 'addresses' || activeTab === 'overview',
  });

  // Fetch customer notes
  const { data: notes } = useQuery({
    queryKey: ['customer-notes', customerId],
    queryFn: () => api.getCustomerNotes(customerId),
    enabled: activeTab === 'notes',
  });

  // Add note mutation
  const addNoteMutation = useMutation({
    mutationFn: (note: string) => api.addCustomerNote(customerId, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-notes', customerId] });
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
    mutationFn: () => api.adjustCustomerWallet(customerId, Number(walletAmount), walletType, walletDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-wallet', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer', customerId] });
      queryClient.invalidateQueries({ queryKey: ['customer-stats', customerId] });
      setIsWalletModalOpen(false);
      setWalletAmount('');
      setWalletDescription('');
      toast.success('Wallet adjusted successfully');
    },
    onError: () => {
      toast.error('Failed to adjust wallet');
    },
  });

  if (customerLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Customer not found</p>
        <button
          onClick={() => router.push('/customers')}
          className="mt-4 text-primary hover:underline"
        >
          Back to customers
        </button>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    enabled: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    disabled: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <User className="h-4 w-4" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
    { id: 'addresses', label: 'Addresses', icon: <Home className="h-4 w-4" /> },
    { id: 'notes', label: 'Notes', icon: <StickyNote className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/customers')}
            className="mt-1 rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary text-xl font-bold">
              {customer.firstName.charAt(0)}{customer.lastName.charAt(0)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{customer.firstName} {customer.lastName}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[customer.status] || 'bg-gray-100 text-gray-800'}`}>
                  {customer.status === 'enabled' ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-muted-foreground">ID: {customer.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Total Orders"
            value={stats.totalOrders.toString()}
            subtitle={`${stats.completedOrders} completed`}
            icon={<ClipboardList className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            title="Wallet Balance"
            value={formatCurrency(stats.walletBalance)}
            subtitle="Current balance"
            icon={<Wallet className="h-5 w-5 text-green-500" />}
          />
          <StatCard
            title="Total Spent"
            value={formatCurrency(stats.totalSpent)}
            subtitle="All time"
            icon={<DollarSign className="h-5 w-5 text-emerald-500" />}
          />
          <StatCard
            title="Member Since"
            value={formatDate(stats.memberSince)}
            subtitle={stats.lastActivity ? `Last active ${formatDate(stats.lastActivity)}` : 'No recent activity'}
            icon={<Calendar className="h-5 w-5 text-purple-500" />}
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
          <OverviewTab customer={customer} stats={stats} addresses={addresses} />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={ordersData?.orders} />
        )}
        {activeTab === 'wallet' && (
          <WalletTab
            wallet={wallet}
            customerBalance={stats?.walletBalance || 0}
            onAdjust={() => setIsWalletModalOpen(true)}
          />
        )}
        {activeTab === 'addresses' && (
          <AddressesTab addresses={addresses} />
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
function OverviewTab({ customer, stats, addresses }: { customer: Customer; stats?: CustomerStats; addresses?: CustomerAddress[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span>{customer.mobileNumber}</span>
          </div>
          {customer.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{customer.email}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Joined {formatDate(customer.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Account Summary */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Account Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
              customer.status === 'enabled'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
            }`}>
              {customer.status === 'enabled' ? 'Active' : 'Inactive'}
            </span>
          </div>
          {stats && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Orders</span>
                <span className="font-medium">{stats.totalOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Completed</span>
                <span className="font-medium text-green-600">{stats.completedOrders}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cancelled</span>
                <span className="font-medium text-red-600">{stats.cancelledOrders}</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Saved Addresses */}
      <div className="rounded-lg border bg-card p-6 md:col-span-2">
        <h3 className="text-lg font-semibold mb-4">Saved Addresses</h3>
        {addresses && addresses.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-4">
            {addresses.slice(0, 4).map((addr) => (
              <div key={addr.id} className="flex items-start gap-3 p-3 rounded-md bg-muted/50">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium text-sm">
                    {addr.title || addr.type}
                    {addr.isDefault && <span className="ml-2 text-xs text-primary">(Default)</span>}
                  </p>
                  <p className="text-sm text-muted-foreground">{addr.address}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No saved addresses</p>
        )}
      </div>
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
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Driver</th>
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
                {order.driver ? `${order.driver.firstName} ${order.driver.lastName}` : '-'}
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
  customerBalance,
  onAdjust
}: {
  wallet?: CustomerWallet;
  customerBalance: number;
  onAdjust: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(wallet?.balance ?? customerBalance)}</p>
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

// Addresses Tab
function AddressesTab({ addresses }: { addresses?: CustomerAddress[] }) {
  if (!addresses || addresses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <MapPin className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No saved addresses</p>
      </div>
    );
  }

  const typeIcons: Record<string, string> = {
    home: 'Home',
    work: 'Work',
    other: 'Other',
  };

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
      {addresses.map((addr) => (
        <div key={addr.id} className="rounded-lg border bg-card p-4">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <Home className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{addr.title || typeIcons[addr.type] || addr.type}</span>
            </div>
            {addr.isDefault && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">Default</span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{addr.address}</p>
          <p className="text-xs text-muted-foreground mt-2">
            Added {formatDate(addr.createdAt)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Notes Tab
function NotesTab({
  notes,
  onAddNote
}: {
  notes?: CustomerNote[];
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
