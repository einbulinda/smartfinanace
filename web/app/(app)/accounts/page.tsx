'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, ArrowRightLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Account, CreateAccountRequest, AccountTransfer, CreateTransferRequest } from '@/lib/types'

const ACCOUNT_TYPES = ['BANK', 'MOBILE_MONEY', 'CASH', 'SACCO', 'INVESTMENT', 'CREDIT'] as const
const TYPE_LABELS: Record<string, string> = {
  BANK: 'Bank', MOBILE_MONEY: 'Mobile Money', CASH: 'Cash',
  SACCO: 'SACCO', INVESTMENT: 'Investment', CREDIT: 'Credit',
}
const TYPE_COLORS: Record<string, string> = {
  BANK: 'bg-blue-50 text-blue-700',
  MOBILE_MONEY: 'bg-green-50 text-green-700',
  CASH: 'bg-gray-100 text-gray-600',
  SACCO: 'bg-purple-50 text-purple-700',
  INVESTMENT: 'bg-amber-50 text-amber-700',
  CREDIT: 'bg-red-50 text-red-600',
}

const today = new Date().toISOString().split('T')[0]

function kes(n: number | string) {
  const v = Number(n)
  return (v < 0 ? '−' : '') + 'KES ' + Math.abs(v).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

const EMPTY_FORM: CreateAccountRequest = { name: '', type: 'BANK', initialBalance: 0 }
const EMPTY_TRANSFER: CreateTransferRequest = { fromAccountId: '', toAccountId: '', amount: 0, date: today }

function acctToForm(a: Account): CreateAccountRequest {
  return { name: a.name, type: a.type, currency: a.currency, initialBalance: a.initialBalance, isActive: a.isActive, notes: a.notes ?? undefined }
}

export default function AccountsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateAccountRequest>(EMPTY_FORM)
  const [transfer, setTransfer] = useState<CreateTransferRequest>(EMPTY_TRANSFER)
  const [formError, setFormError] = useState('')
  const [transferError, setTransferError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { data: accounts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data),
  })

  const { data: transfers = [] } = useQuery({
    queryKey: ['accounts', 'transfers'],
    queryFn: () => api.get<AccountTransfer[]>('/accounts/transfers').then((r) => r.data),
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['accounts'] })
    qc.invalidateQueries({ queryKey: ['dashboard'] })
    qc.invalidateQueries({ queryKey: ['transactions'] })
  }

  const addMutation = useMutation({
    mutationFn: (req: CreateAccountRequest) => api.post('/accounts', req).then((r) => r.data),
    onSuccess: () => { invalidate(); closeForm() },
    onError: () => setFormError('Failed to save account. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateAccountRequest> }) =>
      api.patch(`/accounts/${id}`, req).then((r) => r.data),
    onSuccess: () => { invalidate(); closeForm() },
    onError: () => setFormError('Failed to update account. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/accounts/${id}`),
    onSuccess: () => { invalidate(); setPendingDeleteId(null) },
  })

  const transferMutation = useMutation({
    mutationFn: (req: CreateTransferRequest) => api.post('/accounts/transfers', req).then((r) => r.data),
    onSuccess: () => { invalidate(); setShowTransfer(false); setTransfer(EMPTY_TRANSFER); setTransferError('') },
    onError: () => setTransferError('Failed to record transfer. Please try again.'),
  })

  const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance), 0)
  const activeAccounts = accounts.filter((a) => a.isActive)

  const canSubmit = form.name && form.type
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const canTransfer = transfer.fromAccountId && transfer.toAccountId &&
    transfer.fromAccountId !== transfer.toAccountId && transfer.amount > 0 && transfer.date
  const pendingDeleteAcct = accounts.find((a) => a.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormError('')
  }

  function handleEdit(a: Account) {
    setForm(acctToForm(a)); setEditingId(a.id); setFormError(''); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const payload = { ...form, notes: form.notes || undefined }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  function handleTransferSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canTransfer) return
    setTransferError('')
    transferMutation.mutate(transfer)
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
          <p className="text-sm text-gray-400 mt-0.5">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          {activeAccounts.length >= 2 && (
            <button
              onClick={() => { setShowTransfer(true); setTransfer(EMPTY_TRANSFER) }}
              className="flex items-center gap-2 border border-gray-200 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Transfer</span>
            </button>
          )}
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Net worth from accounts */}
      {accounts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Total Balance</p>
          <p className={`text-3xl font-bold mt-1 ${totalBalance >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
            {kes(totalBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Across {activeAccounts.length} active account{activeAccounts.length !== 1 ? 's' : ''}</p>
        </div>
      )}

      {/* Account list */}
      <div className="space-y-3">
        {isError ? (
          <ErrorState message="Failed to load accounts." onRetry={refetch} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
          ))
        ) : accounts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm mb-2">No accounts yet</p>
            <p className="text-xs text-gray-300">Add your bank, M-PESA, or cash accounts to track balances</p>
          </div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className={`bg-white rounded-xl border shadow-sm p-4 ${!a.isActive ? 'opacity-50 border-gray-100' : 'border-gray-100'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900">{a.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_COLORS[a.type]}`}>
                      {TYPE_LABELS[a.type]}
                    </span>
                    {!a.isActive && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                  {a.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{a.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleEdit(a)} className="text-gray-300 hover:text-blue-400 transition-colors p-1" aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPendingDeleteId(a.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between">
                <div>
                  <p className="text-xs text-gray-400">Current balance</p>
                  <p className={`text-xl font-bold mt-0.5 ${Number(a.currentBalance) < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                    {kes(a.currentBalance)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Opening</p>
                  <p className="text-sm text-gray-500">{kes(a.initialBalance)}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent transfers */}
      {transfers.length > 0 && (
        <div className="mt-6 bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100">
            <p className="text-sm font-semibold text-gray-900">Recent Transfers</p>
          </div>
          <div className="divide-y divide-gray-50">
            {transfers.slice(0, 10).map((t) => (
              <div key={t.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-gray-900">
                    <span className="font-medium">{t.fromAccount?.name ?? '—'}</span>
                    <span className="text-gray-400 mx-1.5">→</span>
                    <span className="font-medium">{t.toAccount?.name ?? '—'}</span>
                  </p>
                  {t.notes && <p className="text-xs text-gray-400 truncate">{t.notes}</p>}
                  <p className="text-xs text-gray-400">{t.date}</p>
                </div>
                <span className="text-sm font-semibold text-gray-700 tabular-nums shrink-0">{kes(t.amount)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Remove account?"
          message={
            pendingDeleteAcct
              ? `Remove "${pendingDeleteAcct.name}"? This will not delete linked transactions.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Removing…' : 'Remove'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Transfer modal */}
      {showTransfer && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Transfer Between Accounts</h3>
              <button onClick={() => setShowTransfer(false)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleTransferSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">From</label>
                <select value={transfer.fromAccountId}
                  onChange={(e) => setTransfer((f) => ({ ...f, fromAccountId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                  <option value="">Select account</option>
                  {accounts.filter((a) => a.isActive).map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transfer.toAccountId}>
                      {a.name} ({kes(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">To</label>
                <select value={transfer.toAccountId}
                  onChange={(e) => setTransfer((f) => ({ ...f, toAccountId: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                  <option value="">Select account</option>
                  {accounts.filter((a) => a.isActive).map((a) => (
                    <option key={a.id} value={a.id} disabled={a.id === transfer.fromAccountId}>
                      {a.name} ({kes(a.currentBalance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                <input type="number" min="0.01" step="0.01" value={transfer.amount || ''}
                  onChange={(e) => setTransfer((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="0" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input type="date" value={transfer.date}
                  onChange={(e) => setTransfer((f) => ({ ...f, date: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={transfer.notes ?? ''}
                  onChange={(e) => setTransfer((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g. Moved to savings" />
              </div>

              {transferError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{transferError}</p>}

              <button type="submit" disabled={transferMutation.isPending || !canTransfer}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {transferMutation.isPending ? 'Recording…' : 'Record Transfer'}
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
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Account' : 'Add Account'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Account name</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g. Equity Bank, M-PESA" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as CreateAccountRequest['type'] }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                  {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Opening balance</label>
                <input type="number" min="0" step="0.01" value={form.initialBalance || ''}
                  onChange={(e) => setForm((f) => ({ ...f, initialBalance: parseFloat(e.target.value) || 0 }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="0" />
                <p className="text-xs text-gray-400 mt-1">Your balance before you started using this app</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input type="text" value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Optional note" />
              </div>

              {editingId && (
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={form.isActive ?? true}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                    className="rounded" />
                  <span className="text-sm text-gray-700">Active</span>
                </label>
              )}

              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

              <button type="submit" disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update Account' : 'Save Account')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
