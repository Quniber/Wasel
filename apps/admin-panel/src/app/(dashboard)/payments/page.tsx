'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { formatDateTime, formatCurrency } from '@/lib/utils';
import { CreditCard, ArrowUpRight, ArrowDownLeft, Filter } from 'lucide-react';

export default function PaymentsPage() {
  const [tab, setTab] = useState<'customers' | 'drivers'>('customers');
  const [page, setPage] = useState(1);

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
            ) : !transactions || transactions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-muted-foreground">
                  No transactions found
                </td>
              </tr>
            ) : (
              transactions.map((txn: any) => (
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
                </tr>
              ))
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
    </div>
  );
}
