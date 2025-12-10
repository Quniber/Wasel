'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, Fleet, FleetStats, FleetWallet, Driver, Order, getErrorMessage } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';
import {
  ArrowLeft, Building2, Phone, Mail, Calendar, MapPin,
  DollarSign, Plus, TrendingUp, TrendingDown,
  AlertCircle, Users, Wallet, ClipboardList, Percent,
  UserMinus, Car, Star, Loader2
} from 'lucide-react';
import { useToast } from '@/components/toast';
import { Modal } from '@/components/modal';

type TabType = 'overview' | 'drivers' | 'orders' | 'wallet';

export default function FleetDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const fleetId = Number(params.id);

  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [isWalletModalOpen, setIsWalletModalOpen] = useState(false);
  const [walletAmount, setWalletAmount] = useState('');
  const [walletType, setWalletType] = useState<'credit' | 'debit'>('credit');
  const [walletDescription, setWalletDescription] = useState('');

  // Fetch fleet details
  const { data: fleet, isLoading: fleetLoading } = useQuery({
    queryKey: ['fleet', fleetId],
    queryFn: () => api.getFleet(fleetId),
  });

  // Fetch fleet stats
  const { data: stats } = useQuery({
    queryKey: ['fleet-stats', fleetId],
    queryFn: () => api.getFleetStats(fleetId),
  });

  // Fetch fleet drivers
  const { data: driversData } = useQuery({
    queryKey: ['fleet-drivers', fleetId],
    queryFn: () => api.getFleetDrivers(fleetId, { page: 1, limit: 50 }),
    enabled: activeTab === 'drivers' || activeTab === 'overview',
  });

  // Fetch fleet orders
  const { data: ordersData } = useQuery({
    queryKey: ['fleet-orders', fleetId],
    queryFn: () => api.getFleetOrders(fleetId, { page: 1, limit: 20 }),
    enabled: activeTab === 'orders',
  });

  // Fetch fleet wallet
  const { data: wallet } = useQuery({
    queryKey: ['fleet-wallet', fleetId],
    queryFn: () => api.getFleetWallet(fleetId),
    enabled: activeTab === 'wallet',
  });

  // Remove driver from fleet mutation
  const removeDriverMutation = useMutation({
    mutationFn: (driverId: number) => api.removeDriverFromFleet(fleetId, driverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-drivers', fleetId] });
      queryClient.invalidateQueries({ queryKey: ['fleet-stats', fleetId] });
      toast.success('Driver removed from fleet');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  // Adjust wallet mutation
  const adjustWalletMutation = useMutation({
    mutationFn: () => api.adjustFleetWallet(fleetId, Number(walletAmount), walletType, walletDescription),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fleet-wallet', fleetId] });
      queryClient.invalidateQueries({ queryKey: ['fleet', fleetId] });
      queryClient.invalidateQueries({ queryKey: ['fleet-stats', fleetId] });
      setIsWalletModalOpen(false);
      setWalletAmount('');
      setWalletDescription('');
      toast.success('Wallet adjusted successfully');
    },
    onError: (error) => {
      toast.error(getErrorMessage(error));
    },
  });

  if (fleetLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!fleet) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">Fleet not found</p>
        <button
          onClick={() => router.push('/fleets')}
          className="mt-4 text-primary hover:underline"
        >
          Back to fleets
        </button>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Building2 className="h-4 w-4" /> },
    { id: 'drivers', label: 'Drivers', icon: <Users className="h-4 w-4" /> },
    { id: 'orders', label: 'Orders', icon: <ClipboardList className="h-4 w-4" /> },
    { id: 'wallet', label: 'Wallet', icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <button
            onClick={() => router.push('/fleets')}
            className="mt-1 rounded-md p-2 hover:bg-muted"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Building2 className="h-8 w-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{fleet.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${
                  fleet.isActive
                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                    : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
                }`}>
                  {fleet.isActive ? 'Active' : 'Inactive'}
                </span>
                <span className="text-sm text-muted-foreground">ID: {fleet.id}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            title="Drivers"
            value={stats.totalDrivers.toString()}
            subtitle={`${stats.activeDrivers} active`}
            icon={<Users className="h-5 w-5 text-blue-500" />}
          />
          <StatCard
            title="Orders"
            value={stats.totalOrders.toString()}
            subtitle={`${stats.completedOrders} completed`}
            icon={<ClipboardList className="h-5 w-5 text-purple-500" />}
          />
          <StatCard
            title="Commission"
            value={`${stats.commissionPercent}%`}
            subtitle={stats.commissionFlat > 0 ? `+ ${formatCurrency(stats.commissionFlat)} flat` : 'No flat fee'}
            icon={<Percent className="h-5 w-5 text-orange-500" />}
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
          <OverviewTab fleet={fleet} stats={stats} drivers={driversData?.drivers} />
        )}
        {activeTab === 'drivers' && (
          <DriversTab
            drivers={driversData?.drivers}
            onRemoveDriver={(id) => removeDriverMutation.mutate(id)}
            isRemoving={removeDriverMutation.isPending}
          />
        )}
        {activeTab === 'orders' && (
          <OrdersTab orders={ordersData?.orders} />
        )}
        {activeTab === 'wallet' && (
          <WalletTab
            wallet={wallet}
            fleetBalance={stats?.walletBalance || 0}
            onAdjust={() => setIsWalletModalOpen(true)}
          />
        )}
      </div>

      {/* Adjust Wallet Modal */}
      <Modal
        isOpen={isWalletModalOpen}
        onClose={() => setIsWalletModalOpen(false)}
        title="Adjust Fleet Wallet"
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
function OverviewTab({ fleet, stats, drivers }: { fleet: Fleet; stats?: FleetStats; drivers?: Driver[] }) {
  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Contact Information */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
        <div className="space-y-3">
          {fleet.phoneNumber && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{fleet.phoneNumber}</span>
            </div>
          )}
          {fleet.email && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{fleet.email}</span>
            </div>
          )}
          {fleet.address && (
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span>{fleet.address}</span>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>Created {formatDate(fleet.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Commission Settings */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="text-lg font-semibold mb-4">Commission Settings</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Commission Rate</span>
            <span className="font-medium">{fleet.commissionSharePercent}%</span>
          </div>
          {stats && stats.commissionFlat > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Flat Fee</span>
              <span className="font-medium">{formatCurrency(stats.commissionFlat)}</span>
            </div>
          )}
          {stats && (
            <>
              <div className="border-t pt-3 mt-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Wallet Balance</span>
                  <span className="font-medium text-lg">{formatCurrency(stats.walletBalance)}</span>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Recent Drivers */}
      <div className="rounded-lg border bg-card p-6 md:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Fleet Drivers</h3>
          <span className="text-sm text-muted-foreground">
            {drivers?.length || 0} total
          </span>
        </div>
        {drivers && drivers.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drivers.slice(0, 6).map((driver) => (
              <Link
                key={driver.id}
                href={`/drivers/${driver.id}`}
                className="flex items-center gap-3 p-3 rounded-md bg-muted/50 hover:bg-muted transition-colors"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-bold">
                  {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">
                    {driver.firstName} {driver.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    {driver.carPlate && (
                      <span className="flex items-center gap-1">
                        <Car className="h-3 w-3" />
                        {driver.carPlate}
                      </span>
                    )}
                    {driver.rating && (
                      <span className="flex items-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {Number(driver.rating).toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-muted-foreground">No drivers in this fleet</p>
        )}
      </div>
    </div>
  );
}

// Drivers Tab
function DriversTab({
  drivers,
  onRemoveDriver,
  isRemoving
}: {
  drivers?: Driver[];
  onRemoveDriver: (id: number) => void;
  isRemoving: boolean;
}) {
  const [confirmRemove, setConfirmRemove] = useState<number | null>(null);

  if (!drivers || drivers.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Users className="h-12 w-12 text-muted-foreground mb-4" />
        <p className="text-muted-foreground">No drivers in this fleet</p>
      </div>
    );
  }

  const statusColors: Record<string, string> = {
    online: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    offline: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400',
    in_ride: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    waiting_documents: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    pending_approval: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
  };

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <table className="w-full">
        <thead>
          <tr className="border-b bg-muted/50">
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Driver</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Vehicle</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Rating</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Status</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">Joined</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-muted-foreground">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {drivers.map((driver) => (
            <tr key={driver.id} className="hover:bg-muted/50">
              <td className="px-4 py-3">
                <Link href={`/drivers/${driver.id}`} className="flex items-center gap-3 hover:underline">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold">
                    {driver.firstName.charAt(0)}{driver.lastName.charAt(0)}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{driver.firstName} {driver.lastName}</p>
                    <p className="text-xs text-muted-foreground">{driver.mobileNumber}</p>
                  </div>
                </Link>
              </td>
              <td className="px-4 py-3 text-sm">
                {driver.carPlate ? (
                  <div>
                    <p className="font-medium">{driver.carPlate}</p>
                    {driver.carModel && (
                      <p className="text-xs text-muted-foreground">{driver.carModel.name}</p>
                    )}
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                {driver.rating ? (
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 text-yellow-500" />
                    <span>{Number(driver.rating).toFixed(1)}</span>
                  </div>
                ) : (
                  <span className="text-muted-foreground">-</span>
                )}
              </td>
              <td className="px-4 py-3">
                <span className={`text-xs px-2 py-1 rounded-full ${statusColors[driver.status] || 'bg-gray-100 text-gray-800'}`}>
                  {driver.status.replace('_', ' ')}
                </span>
              </td>
              <td className="px-4 py-3 text-sm text-muted-foreground">
                {formatDate(driver.createdAt)}
              </td>
              <td className="px-4 py-3 text-right">
                {confirmRemove === driver.id ? (
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={() => {
                        onRemoveDriver(driver.id);
                        setConfirmRemove(null);
                      }}
                      disabled={isRemoving}
                      className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 disabled:opacity-50"
                    >
                      Confirm
                    </button>
                    <button
                      onClick={() => setConfirmRemove(null)}
                      className="rounded-md border px-3 py-1 text-xs hover:bg-muted"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmRemove(driver.id)}
                    className="flex items-center gap-1 text-sm text-red-600 hover:text-red-700"
                  >
                    <UserMinus className="h-4 w-4" />
                    Remove
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
                {order.customer ? `${order.customer.firstName} ${order.customer.lastName}` : '-'}
              </td>
              <td className="px-4 py-3 text-sm">
                {order.driver ? (
                  <Link href={`/drivers/${order.driver.id}`} className="text-primary hover:underline">
                    {order.driver.firstName} {order.driver.lastName}
                  </Link>
                ) : '-'}
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
  fleetBalance,
  onAdjust
}: {
  wallet?: FleetWallet;
  fleetBalance: number;
  onAdjust: () => void;
}) {
  return (
    <div className="space-y-6">
      {/* Balance Card */}
      <div className="rounded-lg border bg-card p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="text-3xl font-bold mt-1">{formatCurrency(wallet?.balance ?? fleetBalance)}</p>
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
