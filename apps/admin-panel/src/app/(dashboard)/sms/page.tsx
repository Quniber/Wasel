'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, getErrorMessage } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { useToast } from '@/components/toast';
import { ConfirmDialog } from '@/components/confirm-dialog';
import {
  MessageSquare,
  Users,
  Car,
  Hash,
  Plus,
  X,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  Bookmark,
  Trash2,
  Save,
} from 'lucide-react';

type Tab = 'drivers' | 'customers' | 'manual';

function detectLanguage(body: string): 'en' | 'ar' {
  return /[؀-ۿ]/.test(body) ? 'ar' : 'en';
}
function smsSegmentCount(body: string, lang: 'en' | 'ar'): number {
  const len = body.length;
  if (len === 0) return 0;
  if (lang === 'ar') return len <= 70 ? 1 : Math.ceil(len / 67);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}
const fullName = (p: { firstName: string | null; lastName: string | null }) =>
  [p.firstName, p.lastName].filter(Boolean).join(' ') || '(no name)';

export default function SmsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  // Compose
  const [body, setBody] = useState('');

  // Selection state
  const [selectedDrivers, setSelectedDrivers] = useState<Set<number>>(new Set());
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [manualNumbers, setManualNumbers] = useState<string[]>([]);

  // Picker UI state
  const [tab, setTab] = useState<Tab>('drivers');
  const [driverSearch, setDriverSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [manualInput, setManualInput] = useState('');

  // Group state
  const [activeGroupId, setActiveGroupId] = useState<number | null>(null);
  const [groupNameInput, setGroupNameInput] = useState('');
  const [saveOpen, setSaveOpen] = useState(false);
  const [confirmSend, setConfirmSend] = useState(false);
  const [confirmDeleteGroup, setConfirmDeleteGroup] = useState<number | null>(null);

  const lang = useMemo(() => detectLanguage(body), [body]);
  const segments = useMemo(() => smsSegmentCount(body, lang), [body, lang]);

  // Data fetches
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['sms', 'drivers', driverSearch],
    queryFn: () => api.listSmsDrivers(driverSearch || undefined),
  });
  const { data: customers = [], isLoading: customersLoading } = useQuery({
    queryKey: ['sms', 'customers', customerSearch],
    queryFn: () => api.listSmsCustomers(customerSearch || undefined),
  });
  const { data: groups = [] } = useQuery({
    queryKey: ['sms', 'groups'],
    queryFn: () => api.listSmsGroups(),
  });
  const { data: batchesData } = useQuery({
    queryKey: ['sms', 'batches'],
    queryFn: () => api.getSmsBatches({ limit: 20 }),
  });

  const totalSelected = selectedDrivers.size + selectedCustomers.size + manualNumbers.length;

  // Selection helpers
  const toggleDriver = (id: number) => {
    setSelectedDrivers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const toggleCustomer = (id: number) => {
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };
  const selectAllDrivers = () => {
    const all = new Set(drivers.map((d) => d.id));
    setSelectedDrivers(all);
  };
  const clearDrivers = () => setSelectedDrivers(new Set());
  const selectAllCustomers = () => {
    const all = new Set(customers.map((c) => c.id));
    setSelectedCustomers(all);
  };
  const clearCustomers = () => setSelectedCustomers(new Set());

  const addManualNumber = () => {
    const raw = manualInput.trim();
    if (!raw) return;
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
    setManualNumbers((prev) => Array.from(new Set([...prev, ...parts])));
    setManualInput('');
  };
  const removeManualNumber = (n: string) => {
    setManualNumbers((prev) => prev.filter((x) => x !== n));
  };

  const clearAllSelection = () => {
    setSelectedDrivers(new Set());
    setSelectedCustomers(new Set());
    setManualNumbers([]);
    setActiveGroupId(null);
  };

  // Group: load
  const loadGroup = async (groupId: number) => {
    const g = await api.getSmsGroup(groupId);
    setSelectedDrivers(new Set(g.driverIds));
    setSelectedCustomers(new Set(g.customerIds));
    setManualNumbers(g.manualNumbers);
    setActiveGroupId(g.id);
    toast.success(`Loaded "${g.name}"`);
  };

  // Group: save
  const saveGroupMutation = useMutation({
    mutationFn: async (name: string) => {
      const payload = {
        name,
        driverIds: Array.from(selectedDrivers),
        customerIds: Array.from(selectedCustomers),
        manualNumbers,
      };
      if (activeGroupId) {
        return api.updateSmsGroup(activeGroupId, payload);
      }
      return api.createSmsGroup(payload);
    },
    onSuccess: (g) => {
      toast.success(activeGroupId ? 'Group updated' : 'Group saved');
      setSaveOpen(false);
      setGroupNameInput('');
      queryClient.invalidateQueries({ queryKey: ['sms', 'groups'] });
      if (!activeGroupId && 'id' in g) setActiveGroupId((g as any).id);
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  const deleteGroupMutation = useMutation({
    mutationFn: (id: number) => api.deleteSmsGroup(id),
    onSuccess: () => {
      toast.success('Group deleted');
      queryClient.invalidateQueries({ queryKey: ['sms', 'groups'] });
      setConfirmDeleteGroup(null);
      if (activeGroupId === confirmDeleteGroup) clearAllSelection();
    },
    onError: (err) => toast.error(getErrorMessage(err)),
  });

  // Send
  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendSms({
        body,
        language: lang,
        driverIds: Array.from(selectedDrivers),
        customerIds: Array.from(selectedCustomers),
        manualNumbers,
      }),
    onSuccess: (res) => {
      const msg = res.failedCount === 0
        ? `Sent ${res.successCount} SMS`
        : `Sent ${res.successCount}, failed ${res.failedCount}`;
      toast.success(msg);
      setBody('');
      setConfirmSend(false);
      queryClient.invalidateQueries({ queryKey: ['sms', 'batches'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setConfirmSend(false);
    },
  });

  const canSend = body.trim().length > 0 && totalSelected > 0 && !sendMutation.isPending;
  const canSave = totalSelected > 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SMS</h1>
        <p className="text-sm text-muted-foreground">
          Build an audience from drivers, customers, and custom numbers — save it as a group and reuse anytime.
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* ============ LEFT: Picker ============ */}
        <div className="lg:col-span-2 rounded-lg border bg-card">
          <div className="border-b">
            <div className="flex">
              <TabBtn active={tab === 'drivers'} onClick={() => setTab('drivers')}>
                <Car className="h-4 w-4" /> Drivers ({drivers.length})
              </TabBtn>
              <TabBtn active={tab === 'customers'} onClick={() => setTab('customers')}>
                <Users className="h-4 w-4" /> Customers ({customers.length})
              </TabBtn>
              <TabBtn active={tab === 'manual'} onClick={() => setTab('manual')}>
                <Hash className="h-4 w-4" /> Manual
              </TabBtn>
            </div>
          </div>

          {tab === 'drivers' && (
            <PickerList
              kind="driver"
              loading={driversLoading}
              items={drivers.map((d) => ({
                id: d.id,
                name: fullName(d),
                phone: d.mobileNumber,
                meta: d.status,
              }))}
              selected={selectedDrivers}
              onToggle={toggleDriver}
              onSelectAll={selectAllDrivers}
              onClear={clearDrivers}
              search={driverSearch}
              onSearchChange={setDriverSearch}
            />
          )}
          {tab === 'customers' && (
            <PickerList
              kind="customer"
              loading={customersLoading}
              items={customers.map((c) => ({
                id: c.id,
                name: fullName(c),
                phone: c.mobileNumber,
              }))}
              selected={selectedCustomers}
              onToggle={toggleCustomer}
              onSelectAll={selectAllCustomers}
              onClear={clearCustomers}
              search={customerSearch}
              onSearchChange={setCustomerSearch}
            />
          )}
          {tab === 'manual' && (
            <div className="p-4 space-y-3">
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addManualNumber();
                    }
                  }}
                  placeholder="+97455123456 — or paste a comma-separated list"
                  className="flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="button"
                  onClick={addManualNumber}
                  className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                  disabled={!manualInput.trim()}
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              {manualNumbers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No manual numbers added yet.</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {manualNumbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                    >
                      {n}
                      <button onClick={() => removeManualNumber(n)} className="hover:text-destructive">
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ RIGHT: Selection + Compose + Groups ============ */}
        <div className="space-y-6">
          {/* Selected summary */}
          <div className="rounded-lg border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">
                Selected recipients{' '}
                <span className="text-muted-foreground font-normal">({totalSelected})</span>
              </h3>
              {totalSelected > 0 && (
                <button
                  type="button"
                  onClick={clearAllSelection}
                  className="text-xs text-muted-foreground hover:text-destructive"
                >
                  Clear all
                </button>
              )}
            </div>
            <div className="space-y-1.5 text-xs">
              <SelLine icon={<Car className="h-3 w-3" />} label="Drivers" count={selectedDrivers.size} />
              <SelLine icon={<Users className="h-3 w-3" />} label="Customers" count={selectedCustomers.size} />
              <SelLine icon={<Hash className="h-3 w-3" />} label="Manual numbers" count={manualNumbers.length} />
            </div>
            {totalSelected > 0 && (
              <button
                type="button"
                onClick={() => {
                  setGroupNameInput(activeGroupId ? (groups.find((g) => g.id === activeGroupId)?.name ?? '') : '');
                  setSaveOpen(true);
                }}
                className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                <Save className="h-3 w-3" />
                {activeGroupId ? 'Update saved group' : 'Save as group'}
              </button>
            )}
          </div>

          {/* Saved groups */}
          <div className="rounded-lg border bg-card p-4">
            <h3 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Bookmark className="h-3.5 w-3.5" /> Saved groups
            </h3>
            {groups.length === 0 ? (
              <p className="text-xs text-muted-foreground">No saved groups yet.</p>
            ) : (
              <div className="space-y-1">
                {groups.map((g) => (
                  <div
                    key={g.id}
                    className={[
                      'flex items-center justify-between rounded-md px-2 py-1.5 text-sm border',
                      activeGroupId === g.id ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() => loadGroup(g.id)}
                      className="flex-1 text-left truncate"
                      title={g.name}
                    >
                      <span className="font-medium">{g.name}</span>
                      <span className="text-muted-foreground text-xs ml-2">
                        ({(g.driverIds?.length ?? 0) + (g.customerIds?.length ?? 0) + (g.manualNumbers?.length ?? 0)})
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteGroup(g.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Compose */}
          <div className="rounded-lg border bg-card p-4 space-y-3">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <MessageSquare className="h-4 w-4" /> Message
            </h3>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Write your message…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{lang === 'ar' ? 'Arabic (Unicode)' : 'Latin'}</span>
              <span>
                {body.length} chars · {segments} segment{segments === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setConfirmSend(true)}
              disabled={!canSend}
              className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sendMutation.isPending
                ? 'Sending…'
                : `Send to ${totalSelected} recipient${totalSelected === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>

      {/* ============ History ============ */}
      <div className="rounded-lg border bg-card p-5">
        <h2 className="font-semibold mb-4">History</h2>
        {!batchesData?.batches.length ? (
          <p className="text-sm text-muted-foreground">No SMS sent yet.</p>
        ) : (
          <div className="space-y-2">
            {batchesData.batches.map((b) => (
              <BatchRow key={b.batchId} batch={b} />
            ))}
          </div>
        )}
      </div>

      {/* Save-group modal */}
      {saveOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg bg-card border p-5 space-y-4">
            <h3 className="font-semibold">
              {activeGroupId ? 'Update saved group' : 'Save as group'}
            </h3>
            <input
              autoFocus
              value={groupNameInput}
              onChange={(e) => setGroupNameInput(e.target.value)}
              placeholder="Group name (e.g. Doha drivers, October promo)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSaveOpen(false)}
                className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => saveGroupMutation.mutate(groupNameInput)}
                disabled={!groupNameInput.trim() || saveGroupMutation.isPending}
                className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {saveGroupMutation.isPending ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={confirmSend}
        onClose={() => setConfirmSend(false)}
        onConfirm={() => sendMutation.mutate()}
        title={`Send to ${totalSelected} recipient${totalSelected === 1 ? '' : 's'}?`}
        message={`"${body.slice(0, 80)}${body.length > 80 ? '…' : ''}"${segments > 1 ? ` — ${segments} segments per message.` : ''}`}
        confirmText="Send"
        cancelText="Cancel"
        variant="warning"
        isLoading={sendMutation.isPending}
      />

      <ConfirmDialog
        isOpen={confirmDeleteGroup !== null}
        onClose={() => setConfirmDeleteGroup(null)}
        onConfirm={() => confirmDeleteGroup !== null && deleteGroupMutation.mutate(confirmDeleteGroup)}
        title="Delete this group?"
        message="The saved selection is gone. Past SMS sent to this group stay in history."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteGroupMutation.isPending}
      />
    </div>
  );
}

// ===================== sub-components =====================

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium',
        active
          ? 'border-primary text-primary'
          : 'border-transparent text-muted-foreground hover:text-foreground',
      ].join(' ')}
    >
      {children}
    </button>
  );
}

function SelLine({ icon, label, count }: { icon: React.ReactNode; label: string; count: number }) {
  return (
    <div
      className={count > 0 ? 'text-foreground flex items-center gap-2' : 'text-muted-foreground flex items-center gap-2'}
    >
      {icon}
      <span>{label}</span>
      <span className="ml-auto font-medium">{count}</span>
    </div>
  );
}

function PickerList({
  kind,
  loading,
  items,
  selected,
  onToggle,
  onSelectAll,
  onClear,
  search,
  onSearchChange,
}: {
  kind: 'driver' | 'customer';
  loading: boolean;
  items: Array<{ id: number; name: string; phone: string; meta?: string }>;
  selected: Set<number>;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  search: string;
  onSearchChange: (v: string) => void;
}) {
  const allSelected = items.length > 0 && items.every((i) => selected.has(i.id));
  return (
    <div className="p-4">
      <div className="flex gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={`Search ${kind}s by name, phone, or email…`}
            className="w-full rounded-md border bg-background pl-9 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <button
          type="button"
          onClick={allSelected ? onClear : onSelectAll}
          className="rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted whitespace-nowrap"
        >
          {allSelected ? 'Clear all' : 'Select all'}
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">No matches.</p>
      ) : (
        <div className="max-h-[420px] overflow-y-auto border rounded-md divide-y">
          {items.map((item) => {
            const isSel = selected.has(item.id);
            return (
              <label
                key={item.id}
                className="flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-muted/50"
              >
                <input
                  type="checkbox"
                  checked={isSel}
                  onChange={() => onToggle(item.id)}
                  className="h-4 w-4 rounded border-input"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{item.phone}</p>
                </div>
                {item.meta && (
                  <span className="text-xs text-muted-foreground capitalize">{item.meta.replace(/_/g, ' ')}</span>
                )}
              </label>
            );
          })}
        </div>
      )}
      <p className="mt-2 text-xs text-muted-foreground">
        {selected.size} selected · {items.length} shown
      </p>
    </div>
  );
}

function BatchRow({ batch }: { batch: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: detail } = useQuery({
    queryKey: ['sms', 'messages', batch.batchId],
    queryFn: () => api.getSmsMessages({ batchId: batch.batchId, limit: 50 }),
    enabled: expanded,
  });
  return (
    <div className="rounded-md border">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start gap-3 p-3 hover:bg-muted/50 text-left"
      >
        {expanded ? (
          <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm truncate">{batch.body}</p>
          <div className="mt-1 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{formatDate(batch.firstCreatedAt)}</span>
            <span className="capitalize">{batch.recipientType}</span>
            <span className="text-green-600 flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {batch.success}
            </span>
            {batch.failed > 0 && (
              <span className="text-red-600 flex items-center gap-1">
                <XCircle className="h-3 w-3" />
                {batch.failed}
              </span>
            )}
            {batch.pending > 0 && (
              <span className="text-amber-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {batch.pending}
              </span>
            )}
          </div>
        </div>
      </button>
      {expanded && detail && (
        <div className="border-t bg-muted/30 px-3 py-2 space-y-1">
          {detail.messages.map((m) => (
            <div key={m.id} className="text-xs flex items-center justify-between gap-2">
              <span className="font-mono">{m.recipient}</span>
              <span className="text-muted-foreground truncate flex-1">{m.recipientName || ''}</span>
              <span className="text-muted-foreground capitalize">{m.recipientType}</span>
              {m.status === 'sent' ? (
                <span className="text-green-600">✓ sent</span>
              ) : m.status === 'pending' ? (
                <span className="text-amber-600">pending</span>
              ) : (
                <span className="text-red-600" title={m.errorMessage || ''}>
                  ✕ failed
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
