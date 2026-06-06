'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Account, Receivable, CreateReceivableRequest, RecordRepaymentRequest } from '@/lib/types'

const today = new Date().toISOString().split('T')[0]

const STATUS_LABELS: Record<string, string> = {
  OUTSTANDING: 'Outstanding',
  PARTIALLY_REPAID: 'Partial',
  REPAID: 'Repaid',
  WRITTEN_OFF: 'Written Off',
}

const STATUS_COLORS: Record<string, string> = {
  OUTSTANDING: 'bg-amber-50 text-amber-700',
  PARTIALLY_REPAID: 'bg-blue-50 text-blue-700',
  REPAID: 'bg-green-50 text-green-700',
  WRITTEN_OFF: 'bg-gray-100 text-gray-500',
}

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

const EMPTY_FORM: CreateReceivableRequest = {
  borrowerName: '', amount: 0, dateGiven: today,
}

function recToForm(r: Receivable): CreateReceivableRequest {
  return {
    borrowerName: r.borrowerName,
    phone: r.phone ?? undefined,
    amount: Number(r.amount),
    dateGiven: r.dateGiven,
    dueDate: r.dueDate ?? undefined,
    notes: r.notes ?? undefined,
  }
}

export default function ReceivablesPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateReceivableRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [repaymentId, setRepaymentId] = useState<string | null>(null)
  const [repaymentAmount, setRepaymentAmount] = useState('')
  const [repaymentDate, setRepaymentDate] = useState(today)
  const [repaymentNotes, setRepaymentNotes] = useState('')
  const [repaymentAccountId, setRepaymentAccountId] = useState('')
  const [repaymentError, setRepaymentError] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showRepaid, setShowRepaid] = useState(false)

  const { data: receivables = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => api.get<Receivable[]>('/receivables').then((r) => r.data),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['receivables'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
  }

  const addMutation = useMutation({
    mutationFn: (req: CreateReceivableRequest) => api.post('/receivables', req).then((r) => r.data),
    onSuccess: () => { invalidate(); closeForm() },
    onError: () => setFormError('Failed to save. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateReceivableRequest> }) =>
      api.patch(`/receivables/${id}`, req).then((r) => r.data),
    onSuccess: () => { invalidate(); closeForm() },
    onError: () => setFormError('Failed to update. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/receivables/${id}`),
    onSuccess: () => { invalidate(); setPendingDeleteId(null) },
  })

  const writeOffMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/receivables/${id}/write-off`, {}),
    onSuccess: () => invalidate(),
  })

  const repaymentMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: RecordRepaymentRequest }) =>
      api.post(`/receivables/${id}/repayments`, req).then((r) => r.data),
    onSuccess: () => {
      invalidate()
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setRepaymentId(null); setRepaymentAmount(''); setRepaymentNotes(''); setRepaymentAccountId('')
    },
    onError: () => setRepaymentError('Failed to record repayment.'),
  })

  const active = receivables.filter((r) => r.status !== 'REPAID' && r.status !== 'WRITTEN_OFF')
  const settled = receivables.filter((r) => r.status === 'REPAID' || r.status === 'WRITTEN_OFF')
  const totalOutstanding = active.reduce((s, r) => s + (Number(r.amount) - Number(r.amountRepaid)), 0)

  const canSubmit = form.borrowerName && form.amount > 0 && form.dateGiven
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const pendingDeleteRec = receivables.find((r) => r.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormError('')
  }

  function handleEdit(r: Receivable) {
    setForm(recToForm(r)); setEditingId(r.id); setFormError(''); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const payload = { ...form, phone: form.phone || undefined, notes: form.notes || undefined, dueDate: form.dueDate || undefined }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  function handleRepaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!repaymentId || !repaymentAmount) return
    setRepaymentError('')
    repaymentMutation.mutate({
      id: repaymentId,
      req: {
        amount: parseFloat(repaymentAmount),
        date: repaymentDate,
        notes: repaymentNotes || undefined,
        accountId: repaymentAccountId || undefined,
      },
    })
  }

  function RecCard({ r }: { r: Receivable }) {
    const outstanding = Number(r.amount) - Number(r.amountRepaid)
    const pct = Number(r.amount) > 0 ? (Number(r.amountRepaid) / Number(r.amount)) * 100 : 0
    const isExpanded = expandedId === r.id

    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold text-gray-900">{r.borrowerName}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[r.status]}`}>
                {STATUS_LABELS[r.status]}
              </span>
            </div>
            {r.phone && <p className="text-xs text-gray-400 mt-0.5">{r.phone}</p>}
            <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
              <span>Given: {r.dateGiven}</span>
              {r.dueDate && <span>Due: {r.dueDate}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {r.status !== 'REPAID' && r.status !== 'WRITTEN_OFF' && (
              <>
                <button onClick={() => handleEdit(r)} className="text-gray-300 hover:text-blue-400 p-1 transition-colors" aria-label="Edit">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => { setRepaymentId(r.id); setRepaymentDate(today); setRepaymentAmount(''); setRepaymentNotes(''); setRepaymentAccountId(''); setRepaymentError('') }}
                  className="text-xs text-green-700 hover:text-green-800 font-medium px-2 py-1 rounded-lg border border-green-200 hover:bg-green-50 transition-colors">
                  Record payment
                </button>
              </>
            )}
            <button onClick={() => setPendingDeleteId(r.id)} className="text-gray-300 hover:text-red-400 p-1 transition-colors" aria-label="Delete">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {Number(r.amountRepaid) > 0 && (
          <div className="mt-3">
            <div className="flex justify-between text-xs text-gray-400 mb-1">
              <span>Repaid: {kes(r.amountRepaid)}</span>
              <span>{pct.toFixed(0)}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-green-500 rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
            </div>
          </div>
        )}

        <div className="mt-3 flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400">Outstanding</p>
            <p className="font-bold text-gray-900">{kes(outstanding)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-400">Total loaned</p>
            <p className="text-sm font-medium text-gray-600">{kes(r.amount)}</p>
          </div>
        </div>

        {r.notes && <p className="text-xs text-gray-400 mt-2 truncate">{r.notes}</p>}

        {/* Repayment history toggle */}
        {r.repayments && r.repayments.length > 0 && (
          <button
            onClick={() => setExpandedId(isExpanded ? null : r.id)}
            className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            {r.repayments.length} repayment{r.repayments.length !== 1 ? 's' : ''}
          </button>
        )}

        {isExpanded && r.repayments && (
          <div className="mt-2 border-t border-gray-50 pt-2 space-y-1">
            {r.repayments.map((rep) => (
              <div key={rep.id} className="flex justify-between text-xs text-gray-500">
                <span>{rep.date}{rep.notes ? ` — ${rep.notes}` : ''}</span>
                <span className="font-medium text-green-700">+{kes(rep.amount)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Write-off option for outstanding */}
        {r.status === 'OUTSTANDING' || r.status === 'PARTIALLY_REPAID' ? (
          <button
            onClick={() => writeOffMutation.mutate(r.id)}
            className="mt-2 text-xs text-gray-400 hover:text-gray-600 underline transition-colors"
          >
            Mark as written off
          </button>
        ) : null}
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Receivables</h2>
          <p className="text-sm text-gray-400 mt-0.5">Money owed to you</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-amber-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Outstanding</p>
          <p className="text-xl font-bold text-amber-800 mt-0.5">{kes(totalOutstanding)}</p>
          <p className="text-xs text-amber-600 mt-0.5">{active.length} borrower{active.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Total recovered</p>
          <p className="text-xl font-bold text-green-800 mt-0.5">
            {kes(receivables.reduce((s, r) => s + Number(r.amountRepaid), 0))}
          </p>
        </div>
      </div>

      {/* Active list */}
      <div className="space-y-3">
        {isError ? (
          <ErrorState message="Failed to load receivables." onRetry={refetch} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))
        ) : active.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">No outstanding receivables</p>
          </div>
        ) : (
          active.map((r) => <RecCard key={r.id} r={r} />)
        )}
      </div>

      {/* Settled / written-off */}
      {settled.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowRepaid(!showRepaid)}
            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 mb-3 transition-colors"
          >
            {showRepaid ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Settled &amp; Written Off ({settled.length})
          </button>
          {showRepaid && (
            <div className="space-y-3 opacity-70">
              {settled.map((r) => <RecCard key={r.id} r={r} />)}
            </div>
          )}
        </div>
      )}

      {/* Delete confirm */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Remove receivable?"
          message={
            pendingDeleteRec
              ? `Remove "${pendingDeleteRec.borrowerName}"'s loan record?`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Removing…' : 'Remove'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Repayment modal */}
      {repaymentId && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Record Repayment</h3>
              <button onClick={() => setRepaymentId(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleRepaymentSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount received</label>
                <input type="number" min="0.01" step="0.01" value={repaymentAmount}
                  onChange={(e) => setRepaymentAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="0" required autoFocus />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={repaymentDate}
                  onChange={(e) => setRepaymentDate(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={repaymentNotes}
                  onChange={(e) => setRepaymentNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Optional note" />
              </div>
              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit to account (optional)</label>
                  <select
                    value={repaymentAccountId}
                    onChange={(e) => setRepaymentAccountId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
                  >
                    <option value="">— No account (manual tracking) —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {repaymentAccountId && (
                    <p className="text-xs text-gray-400 mt-1">This will credit the received amount to your account balance.</p>
                  )}
                </div>
              )}
              {repaymentError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{repaymentError}</p>}
              <button type="submit" disabled={repaymentMutation.isPending || !repaymentAmount}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {repaymentMutation.isPending ? 'Saving…' : 'Record Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Receivable' : 'Add Receivable'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Borrower name</label>
                <input type="text" value={form.borrowerName}
                  onChange={(e) => setForm((f) => ({ ...f, borrowerName: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g. John Kamau" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
                <input type="tel" value={form.phone ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="+254 7XX XXX XXX" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount loaned</label>
                <input type="number" min="0" step="0.01" value={form.amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="0" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date given</label>
                  <input type="date" value={form.dateGiven}
                    onChange={(e) => setForm((f) => ({ ...f, dateGiven: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due date (optional)</label>
                  <input type="date" value={form.dueDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Optional note" />
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

              <button type="submit" disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update' : 'Save')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
