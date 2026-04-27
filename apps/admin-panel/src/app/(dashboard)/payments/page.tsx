'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { ArrowUpRight, ArrowDownLeft, RotateCcw, X } from 'lucide-react';

type RefundTarget = {
  orderId: number;
  amount: number;
  customerName: string;
  description: string;
};

export default function PaymentsPage() {
  const [tab, setTab] = useState<'customers' | 'drivers'>('customers');
  const [page, setPage] = useState(1);
  const [refundTarget, setRefundTarget] = useState<RefundTarget | null>(null);
  const queryClient = useQueryClient();

  const { data: customerTxns, isLoading: customerLoading } = useQuery({
    queryKey: ['customer-transactions', page],
    queryFn: () => api.getCustomerTransactions({ page, limit: 20 }),
    enabled: tab === 'customers',
  });

  const { data: driverTxns, isLoading: driverLoading } = useQuery({
    queryKey: ['driver-transactions', page],
    queryFn: () => api.getDriverTransactions({ page, limit: 20 }),
    enabled: tab === 'drivers',
  });

  const { data: stats } = useQuery({
    queryKey: ['payment-stats'],
    queryFn: () => api.getPaymentStats(),
  });

  const transactions = tab === 'customers' ? customerTxns?.transactions : driverTxns?.transactions;
  const pagination = tab === 'customers' ? customerTxns?.pagination : driverTxns?.pagination;
  const isLoading = tab === 'customers' ? customerLoading : driverLoading;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Payments</h1>
        <p className="text-muted-foreground">View transactions and payment history</p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Customer Credits</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats?.customerTransactions?.totalCredits || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Customer Debits</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats?.customerTransactions?.totalDebits || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Driver Earnings</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats?.driverTransactions?.totalCredits || 0)}
          </p>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <p className="text-sm text-muted-foreground">Driver Withdrawals</p>
          <p className="text-2xl font-bold text-red-600">
            {formatCurrency(stats?.driverTransactions?.totalDebits || 0)}
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b">
        <button
          onClick={() => { setTab('customers'); setPage(1); }}
          className={`pb-2 text-sm font-medium ${
            tab === 'customers'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Customer Transactions
        </button>
        <button
          onClick={() => { setTab('drivers'); setPage(1); }}
          className={`pb-2 text-sm font-medium ${
            tab === 'drivers'
              ? 'border-b-2 border-primary text-primary'
              : 'text-muted-foreground'
          }`}
        >
          Driver Transactions
        </button>
      </div>

      {/* Transactions Table */}
      <div className="rounded-lg border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                {tab === 'customers' ? 'Customer' : 'Driver'}
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Type</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Action</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Amount</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Description</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
              {tab === 'customers' && (
                <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase">Action</th>
              )}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={tab === 'customers' ? 8 : 7} className="px-6 py-8 text-center">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                  </div>
                </td>
              </tr>
            ) : !transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={tab === 'customers' ? 8 : 7} className="px-6 py-8 text-center text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((txn: any) => {
                const isRefundable =
                  tab === 'customers' &&
                  txn.type === 'debit' &&
                  txn.action === 'ride_payment' &&
                  txn.order?.id;
                return (
                  <tr key={txn.id} className="border-b hover:bg-muted/50">
                    <td className="px-6 py-4 font-mono text-sm">#{txn.id}</td>
                    <td className="px-6 py-4">
                      {tab === 'customers' ? (
                        txn.customer ? (
                          <span>{txn.customer.firstName} {txn.customer.lastName}</span>
                        ) : '-'
                      ) : (
                        txn.driver ? (
                          <span>{txn.driver.firstName} {txn.driver.lastName}</span>
                        ) : '-'
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${
                        txn.type === 'credit'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {txn.type === 'credit' ? (
                          <ArrowDownLeft className="h-3 w-3" />
                        ) : (
                          <ArrowUpRight className="h-3 w-3" />
                        )}
                        {txn.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded bg-muted px-2 py-1 text-xs">
                        {txn.action.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right font-medium">
                      <span className={txn.type === 'credit' ? 'text-green-600' : 'text-red-600'}>
                        {txn.type === 'credit' ? '+' : '-'}{formatCurrency(txn.amount)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground max-w-xs truncate">
                      {txn.description}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {formatDateTime(txn.createdAt)}
                    </td>
                    {tab === 'customers' && (
                      <td className="px-6 py-4 text-right">
                        {isRefundable ? (
                          <button
                            onClick={() =>
                              setRefundTarget({
                                orderId: txn.order.id,
                                amount: txn.amount,
                                customerName: txn.customer
                                  ? `${txn.customer.firstName ?? ''} ${txn.customer.lastName ?? ''}`.trim()
                                  : 'Customer',
                                description: txn.description ?? '',
                              })
                            }
                            className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700 hover:bg-orange-100"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Refund
                          </button>
                        ) : null}
                      </td>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Page {pagination.page} of {pagination.totalPages}
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
                disabled={page === pagination.totalPages}
                className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {refundTarget && (
        <RefundDialog
          target={refundTarget}
          onClose={() => setRefundTarget(null)}
          onSuccess={() => {
            setRefundTarget(null);
            queryClient.invalidateQueries({ queryKey: ['customer-transactions'] });
            queryClient.invalidateQueries({ queryKey: ['payment-stats'] });
          }}
        />
      )}
    </div>
  );
}

function RefundDialog({
  target,
  onClose,
  onSuccess,
}: {
  target: RefundTarget;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(String(target.amount));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () => api.refundOrder(target.orderId, parseFloat(amount), reason.trim()),
    onSuccess: (data) => {
      const msg =
        data.type === 'gateway_refund'
          ? `Gateway refund initiated (refundId: ${data.refundId}). The card will be credited within ~1 day.`
          : `Wallet refund applied. New balance: ${data.customerNewBalance ?? '?'}`;
      setResult(msg);
      setTimeout(onSuccess, 1800);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      setError('Amount must be greater than zero');
      return;
    }
    if (amt > target.amount) {
      setError(`Cannot refund more than the original payment (${target.amount})`);
      return;
    }
    if (!reason.trim()) {
      setError('Please provide a refund reason');
      return;
    }
    mutation.mutate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-lg bg-card shadow-lg">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h2 className="text-lg font-semibold">Refund order #{target.orderId}</h2>
          <button onClick={onClose} className="rounded-md p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-4">
          <div className="rounded-md bg-muted/50 p-3 text-sm">
            <p><span className="text-muted-foreground">Customer:</span> {target.customerName}</p>
            <p><span className="text-muted-foreground">Original payment:</span> {formatCurrency(target.amount)}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{target.description}</p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Refund amount (QAR)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={target.amount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={mutation.isPending || !!result}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Customer reported overcharge"
              rows={3}
              className="w-full rounded-md border px-3 py-2 text-sm"
              disabled={mutation.isPending || !!result}
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}
          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
              {result}
            </div>
          )}

          <div className="flex justify-end gap-2 border-t pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border px-4 py-2 text-sm font-medium"
              disabled={mutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !!result}
              className="inline-flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Refunding…' : 'Confirm refund'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
