'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, Package } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { ManualAsset, CreateManualAssetRequest, AssetType } from '@/lib/types'

const ASSET_TYPES: { value: AssetType; label: string }[] = [
  { value: 'VEHICLE', label: 'Vehicle' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'ELECTRONICS', label: 'Electronics' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'JEWELRY', label: 'Jewelry' },
  { value: 'OTHER', label: 'Other' },
]

const TYPE_COLORS: Record<AssetType, string> = {
  VEHICLE: 'bg-blue-100 text-blue-700',
  REAL_ESTATE: 'bg-emerald-100 text-emerald-700',
  ELECTRONICS: 'bg-purple-100 text-purple-700',
  FURNITURE: 'bg-amber-100 text-amber-700',
  JEWELRY: 'bg-pink-100 text-pink-700',
  OTHER: 'bg-gray-100 text-gray-600',
}

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

const today = new Date().toISOString().split('T')[0]

const EMPTY_FORM: CreateManualAssetRequest = {
  name: '',
  type: 'OTHER',
  currentValue: 0,
  purchaseValue: 0,
  purchaseDate: today,
  notes: '',
}

export default function AssetsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateManualAssetRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { data: assets = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get<ManualAsset[]>('/assets').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateManualAssetRequest) => api.post('/assets', req).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      closeForm()
    },
    onError: () => setFormError('Failed to save asset.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateManualAssetRequest> }) =>
      api.patch(`/assets/${id}`, req).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      closeForm()
    },
    onError: () => setFormError('Failed to update asset.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/assets/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['assets'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setPendingDeleteId(null)
    },
  })

  const totalValue = assets.reduce((s, a) => s + Number(a.currentValue), 0)
  const pendingDeleteAsset = assets.find((a) => a.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }

  function handleEdit(asset: ManualAsset) {
    setForm({
      name: asset.name,
      type: asset.type,
      currentValue: Number(asset.currentValue),
      purchaseValue: Number(asset.purchaseValue),
      purchaseDate: asset.purchaseDate,
      notes: asset.notes ?? '',
    })
    setEditingId(asset.id)
    setFormError('')
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload = { ...form, notes: form.notes || undefined, purchaseValue: form.purchaseValue || undefined }
    if (editingId) {
      editMutation.mutate({ id: editingId, req: payload })
    } else {
      addMutation.mutate(payload)
    }
  }

  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const canSubmit = form.name && form.currentValue > 0 && form.purchaseDate

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Assets</h2>
          <p className="text-sm text-gray-400 mt-0.5">Physical and personal assets</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add Asset</span>
        </button>
      </div>

      {/* Total value card */}
      {assets.length > 0 && (
        <div className="bg-green-700 rounded-2xl p-5 mb-5 text-white">
          <p className="text-sm font-medium opacity-80">Total Asset Value</p>
          <p className="text-3xl font-bold mt-1">{kes(totalValue)}</p>
          <p className="text-xs opacity-60 mt-1">{assets.length} asset{assets.length !== 1 ? 's' : ''} tracked</p>
        </div>
      )}

      {/* Asset list */}
      {isError ? (
        <ErrorState message="Failed to load assets." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-4 h-20 animate-pulse" />
          ))}
        </div>
      ) : assets.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <Package className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No assets tracked yet.</p>
          <p className="text-xs text-gray-300 mt-1">Add vehicles, property, electronics and more.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {assets.map((asset) => {
            const gain = Number(asset.currentValue) - Number(asset.purchaseValue)
            const gainPct = asset.purchaseValue > 0 ? (gain / Number(asset.purchaseValue)) * 100 : 0
            return (
              <div key={asset.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{asset.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLORS[asset.type]}`}>
                        {ASSET_TYPES.find((t) => t.value === asset.type)?.label ?? asset.type}
                      </span>
                    </div>
                    <p className="text-lg font-bold text-gray-900">{kes(asset.currentValue)}</p>
                    {asset.purchaseValue > 0 && (
                      <p className={`text-xs mt-0.5 ${gain >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {gain >= 0 ? '↑' : '↓'} {kes(Math.abs(gain))} ({Math.abs(gainPct).toFixed(1)}%) vs purchase
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1">
                      <p className="text-xs text-gray-400">Purchased {asset.purchaseDate}</p>
                      {asset.notes && (
                        <p className="text-xs text-gray-300 truncate max-w-[180px]">{asset.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleEdit(asset)}
                      className="text-gray-300 hover:text-blue-400 transition-colors"
                      aria-label="Edit"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPendingDeleteId(asset.id)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete asset?"
          message={pendingDeleteAsset ? `Remove "${pendingDeleteAsset.name}" from your assets.` : 'This action cannot be undone.'}
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Asset' : 'Add Asset'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset name</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Toyota Fielder, Laptop, Land in Kiambu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className={`${inputCls} bg-white`}
                  value={form.type ?? 'OTHER'}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as AssetType }))}
                >
                  {ASSET_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current value (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={form.currentValue || ''}
                    onChange={(e) => setForm((f) => ({ ...f, currentValue: parseFloat(e.target.value) || 0 }))}
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Purchase value (KES)</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className={inputCls}
                    value={form.purchaseValue || ''}
                    onChange={(e) => setForm((f) => ({ ...f, purchaseValue: parseFloat(e.target.value) || 0 }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase date</label>
                <input
                  type="date"
                  className={inputCls}
                  value={form.purchaseDate}
                  onChange={(e) => setForm((f) => ({ ...f, purchaseDate: e.target.value }))}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
                <input
                  className={inputCls}
                  value={form.notes ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="Registration number, location, condition…"
                />
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update Asset' : 'Save Asset')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
