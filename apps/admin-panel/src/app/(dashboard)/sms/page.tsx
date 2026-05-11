'use client';

import { useState, useMemo, useEffect } from 'react';
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
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';

type Mode = 'customers' | 'drivers' | 'manual';

// Detect Arabic (U+0600..U+06FF). Same heuristic the Ooredoo client uses.
function detectLanguage(body: string): 'en' | 'ar' {
  return /[؀-ۿ]/.test(body) ? 'ar' : 'en';
}

// Latin: 160 chars/segment. Arabic (UCS-2): 70 chars/segment. Long messages
// use concatenated segments: 153 (Latin) or 67 (Arabic) per segment.
function smsSegmentCount(body: string, lang: 'en' | 'ar'): number {
  const len = body.length;
  if (len === 0) return 0;
  if (lang === 'ar') return len <= 70 ? 1 : Math.ceil(len / 67);
  return len <= 160 ? 1 : Math.ceil(len / 153);
}

export default function SmsPage() {
  const queryClient = useQueryClient();
  const toast = useToast();

  const [body, setBody] = useState('');
  const [mode, setMode] = useState<Mode>('customers');
  const [manualNumbers, setManualNumbers] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  const lang = useMemo(() => detectLanguage(body), [body]);
  const segments = useMemo(() => smsSegmentCount(body, lang), [body, lang]);

  // Recipient count preview — refreshes when mode or manual list changes.
  const { data: preview, isFetching: previewFetching } = useQuery({
    queryKey: ['sms', 'preview', mode, manualNumbers.join(',')],
    queryFn: () => api.previewSmsRecipients(mode, mode === 'manual' ? manualNumbers : undefined),
    enabled: mode !== 'manual' || manualNumbers.length > 0,
  });

  const recipientCount = mode === 'manual' ? manualNumbers.length : (preview?.count ?? 0);

  const sendMutation = useMutation({
    mutationFn: () =>
      api.sendSms({
        body,
        language: lang,
        mode,
        manualNumbers: mode === 'manual' ? manualNumbers : undefined,
      }),
    onSuccess: (res) => {
      const msg = res.failedCount === 0
        ? `Sent ${res.successCount} SMS`
        : `Sent ${res.successCount}, failed ${res.failedCount}`;
      toast.success(msg);
      setBody('');
      setManualNumbers([]);
      setConfirmOpen(false);
      queryClient.invalidateQueries({ queryKey: ['sms', 'batches'] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err));
      setConfirmOpen(false);
    },
  });

  const { data: batchesData, isLoading: batchesLoading } = useQuery({
    queryKey: ['sms', 'batches'],
    queryFn: () => api.getSmsBatches({ limit: 20 }),
  });

  const addManualNumber = () => {
    const raw = manualInput.trim();
    if (!raw) return;
    // Split on commas/spaces/newlines so a paste of a list works too.
    const parts = raw.split(/[\s,;]+/).map((p) => p.trim()).filter(Boolean);
    setManualNumbers((prev) => Array.from(new Set([...prev, ...parts])));
    setManualInput('');
  };

  const removeManualNumber = (n: string) => {
    setManualNumbers((prev) => prev.filter((x) => x !== n));
  };

  const canSend = body.trim().length > 0 && recipientCount > 0 && !sendMutation.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">SMS</h1>
        <p className="text-sm text-muted-foreground">
          Send announcements or notifications to customers, drivers, or a custom list.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ====== Compose ====== */}
        <div className="rounded-lg border bg-card p-5 space-y-4">
          <h2 className="font-semibold flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> Compose
          </h2>

          <div>
            <label className="text-sm font-medium block mb-1.5">Message</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={5}
              maxLength={1000}
              placeholder="Write your message…"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              <span>
                Language: <span className="font-medium">{lang === 'ar' ? 'Arabic (Unicode)' : 'Latin'}</span>
              </span>
              <span>
                {body.length} chars · {segments} segment{segments === 1 ? '' : 's'}
              </span>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">Recipients</label>
            <div className="grid grid-cols-3 gap-2">
              <ModeButton
                active={mode === 'customers'}
                onClick={() => setMode('customers')}
                icon={<Users className="h-4 w-4" />}
                label="All customers"
              />
              <ModeButton
                active={mode === 'drivers'}
                onClick={() => setMode('drivers')}
                icon={<Car className="h-4 w-4" />}
                label="All drivers"
              />
              <ModeButton
                active={mode === 'manual'}
                onClick={() => setMode('manual')}
                icon={<Hash className="h-4 w-4" />}
                label="Manual"
              />
            </div>
          </div>

          {mode === 'manual' && (
            <div>
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
                  placeholder="+97455123456 (Enter to add)"
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
              {manualNumbers.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {manualNumbers.map((n) => (
                    <span
                      key={n}
                      className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs"
                    >
                      {n}
                      <button
                        type="button"
                        onClick={() => removeManualNumber(n)}
                        className="hover:text-destructive"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="rounded-md bg-muted/50 px-3 py-2 text-sm">
            {mode === 'manual' ? (
              <>
                Will send to <strong>{recipientCount}</strong> number{recipientCount === 1 ? '' : 's'}
              </>
            ) : previewFetching ? (
              <span className="text-muted-foreground">Counting recipients…</span>
            ) : (
              <>
                Will send to <strong>{recipientCount}</strong>{' '}
                {mode === 'customers' ? 'active customer' : 'active driver'}
                {recipientCount === 1 ? '' : 's'}
              </>
            )}
          </div>

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={!canSend}
            className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sendMutation.isPending ? 'Sending…' : `Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}`}
          </button>
        </div>

        {/* ====== History ====== */}
        <div className="rounded-lg border bg-card p-5">
          <h2 className="font-semibold mb-4">History</h2>
          {batchesLoading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : !batchesData?.batches.length ? (
            <p className="text-sm text-muted-foreground">No SMS sent yet.</p>
          ) : (
            <div className="space-y-2">
              {batchesData.batches.map((b) => (
                <BatchRow key={b.batchId} batch={b} />
              ))}
            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={() => sendMutation.mutate()}
        title={`Send to ${recipientCount} recipient${recipientCount === 1 ? '' : 's'}?`}
        message={`This will send "${body.slice(0, 80)}${body.length > 80 ? '…' : ''}" via Ooredoo SMS. ${segments > 1 ? `${segments} segments per message — check your billing.` : ''}`}
        confirmText="Send"
        cancelText="Cancel"
        variant="warning"
        isLoading={sendMutation.isPending}
      />
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        'flex flex-col items-center justify-center gap-1.5 rounded-md border px-3 py-3 text-xs font-medium transition-colors',
        active
          ? 'border-primary bg-primary/10 text-primary'
          : 'border-border bg-card text-muted-foreground hover:bg-muted',
      ].join(' ')}
    >
      {icon}
      {label}
    </button>
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
        {expanded ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0" />}
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
              <span className="text-muted-foreground truncate flex-1">
                {m.recipientName || ''}
              </span>
              <StatusBadge status={m.status} error={m.errorMessage} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, error }: { status: string; error: string | null }) {
  if (status === 'sent')
    return <span className="text-green-600 text-xs">✓ sent</span>;
  if (status === 'pending')
    return <span className="text-amber-600 text-xs">pending</span>;
  return (
    <span className="text-red-600 text-xs" title={error || ''}>
      ✕ failed
    </span>
  );
}
