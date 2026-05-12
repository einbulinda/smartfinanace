'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Investment, CreateInvestmentRequest } from '@/lib/types'

const INVESTMENT_TYPES = [
  'STOCKS', 'BONDS', 'MUTUAL_FUNDS', 'MONEY_MARKET',
  'CRYPTO', 'REAL_ESTATE', 'SACCO', 'OTHER',
]

const TYPE_LABELS: Record<string, string> = {
  STOCKS: 'Stocks', BONDS: 'Bonds', MUTUAL_FUNDS: 'Mutual Funds',
  MONEY_MARKET: 'Money Market', CRYPTO: 'Crypto',
  REAL_ESTATE: 'Real Estate', SACCO: 'SACCO', OTHER: 'Other',
}

const today = new Date().toISOString().split('T')[0]

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function pct(n: number) {
  const sign = n >= 0 ? '+' : ''
  return sign + n.toFixed(1) + '%'
}

function returnColor(n: number) {
  return n >= 0 ? 'text-green-600' : 'text-red-500'
}

const EMPTY_FORM: CreateInvestmentRequest = {
  name: '', type: '', amountInvested: 0, currentValue: 0, purchaseDate: today,
}

function invToForm(inv: Investment): CreateInvestmentRequest {
  return {
    name: inv.name, type: inv.type,
    amountInvested: Number(inv.amountInvested),
    currentValue: Number(inv.currentValue),
    purchaseDate: inv.purchaseDate,
    notes: inv.notes ?? undefined,
  }
}

export default function InvestmentsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateInvestmentRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { data: investments = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateInvestmentRequest) => api.post('/investments', req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to save investment. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateInvestmentRequest> }) =>
      api.patch(`/investments/${id}`, req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to update investment. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/investments/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['investments'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPendingDeleteId(null) },
  })

  const totalInvested = investments.reduce((s, i) => s + Number(i.amountInvested), 0)
  const totalValue = investments.reduce((s, i) => s + Number(i.currentValue), 0)
  const totalReturn = totalValue - totalInvested
  const totalReturnPct = totalInvested > 0 ? (totalReturn / totalInvested) * 100 : 0

  const canSubmit = form.name && form.type && form.amountInvested >= 0 && form.currentValue >= 0 && form.purchaseDate
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const pendingDeleteInv = investments.find((i) => i.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormError('')
  }

  function handleEdit(inv: Investment) {
    setForm(invToForm(inv)); setEditingId(inv.id); setFormError(''); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const payload = { ...form, notes: form.notes || undefined }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Investments</h2>
          <p className="text-sm text-gray-400 mt-0.5">{investments.length} holdings</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add</span>
        </button>
      </div>

      {/* Portfolio summary */}
      <div className="grid grid-cols-3 gap-3 mb-5">
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Invested</p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">{kes(totalInvested)}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Current Value</p>
          <p className="text-lg font-bold text-green-800 mt-0.5">{kes(totalValue)}</p>
        </div>
        <div className={`rounded-xl p-4 ${totalReturn >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
          <p className={`text-xs font-semibold uppercase tracking-wider ${totalReturn >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            Return
          </p>
          <p className={`text-lg font-bold mt-0.5 ${returnColor(totalReturn)}`}>
            {pct(totalReturnPct)}
          </p>
        </div>
      </div>

      {/* Investment list */}
      <div className="space-y-3">
        {isError ? (
          <ErrorState message="Failed to load investments." onRetry={refetch} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
          ))
        ) : investments.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">No investments yet</p>
          </div>
        ) : (
          investments.map((inv) => {
            const ret = Number(inv.currentValue) - Number(inv.amountInvested)
            const retPct = Number(inv.amountInvested) > 0 ? (ret / Number(inv.amountInvested)) * 100 : 0
            return (
              <div key={inv.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-gray-900 truncate">{inv.name}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                        {TYPE_LABELS[inv.type] ?? inv.type}
                      </span>
                      <span className="text-xs text-gray-400">{inv.purchaseDate}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button onClick={() => handleEdit(inv)} className="text-gray-300 hover:text-blue-400 transition-colors p-1" aria-label="Edit">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setPendingDeleteId(inv.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1" aria-label="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-3 gap-x-4 text-sm">
                  <div>
                    <p className="text-xs text-gray-400">Invested</p>
                    <p className="font-semibold text-gray-900">{kes(inv.amountInvested)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Current</p>
                    <p className="font-semibold text-gray-900">{kes(inv.currentValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Return</p>
                    <p className={`font-semibold ${returnColor(ret)}`}>{pct(retPct)}</p>
                  </div>
                </div>

                {inv.notes && (
                  <p className="text-xs text-gray-400 mt-2 truncate">{inv.notes}</p>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Remove investment?"
          message={
            pendingDeleteInv
              ? `This will remove "${pendingDeleteInv.name}" from your portfolio.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Removing…' : 'Remove'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Add / Edit panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Investment' : 'Add Investment'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g. Safaricom Shares" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                  <option value="">Select type</option>
                  {INVESTMENT_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount invested</label>
                  <input type="number" min="0" step="0.01" value={form.amountInvested || ''}
                    onChange={(e) => setForm((f) => ({ ...f, amountInvested: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current value</label>
                  <input type="number" min="0" step="0.01" value={form.currentValue || ''}
                    onChange={(e) => setForm((f) => ({ ...f, currentValue: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase date</label>
                <input type="date" value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
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
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update Investment' : 'Save Investment')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
