'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, CheckCircle, History, ChevronDown, ChevronUp } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { InsurancePolicy, InsurancePayment, CreateInsuranceRequest } from '@/lib/types'

const INSURANCE_TYPES = ['HEALTH', 'LIFE', 'CAR', 'HOME', 'EDUCATION', 'BUSINESS', 'OTHER']
const TYPE_LABELS: Record<string, string> = {
  HEALTH: 'Health', LIFE: 'Life', CAR: 'Car', HOME: 'Home',
  EDUCATION: 'Education', BUSINESS: 'Business', OTHER: 'Other',
}
const FREQUENCIES = ['MONTHLY', 'QUARTERLY', 'ANNUALLY'] as const
const FREQ_LABELS: Record<string, string> = { MONTHLY: 'Monthly', QUARTERLY: 'Quarterly', ANNUALLY: 'Annually' }

const today = new Date().toISOString().split('T')[0]

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function toMonthly(amount: number, freq: string) {
  if (freq === 'QUARTERLY') return amount / 3
  if (freq === 'ANNUALLY') return amount / 12
  return amount
}

const EMPTY_FORM: CreateInsuranceRequest = {
  provider: '', type: '', coverageAmount: 0, premiumAmount: 0,
  premiumFrequency: 'MONTHLY', startDate: today, isActive: true,
}

function policyToForm(p: InsurancePolicy): CreateInsuranceRequest {
  return {
    provider: p.provider, type: p.type, policyNumber: p.policyNumber ?? undefined,
    coverageAmount: Number(p.coverageAmount), premiumAmount: Number(p.premiumAmount),
    premiumFrequency: p.premiumFrequency, startDate: p.startDate,
    endDate: p.endDate ?? undefined, nextPaymentDate: p.nextPaymentDate ?? undefined,
    notes: p.notes ?? undefined, isActive: p.isActive,
  }
}

export default function InsurancePage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateInsuranceRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [historyPolicyId, setHistoryPolicyId] = useState<string | null>(null)

  const { data: policies = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['insurance'],
    queryFn: () => api.get<InsurancePolicy[]>('/insurance').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateInsuranceRequest) => api.post('/insurance', req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurance'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to save policy. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateInsuranceRequest> }) =>
      api.patch(`/insurance/${id}`, req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurance'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to update policy. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/insurance/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['insurance'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPendingDeleteId(null) },
  })

  const confirmDeductionMutation = useMutation({
    mutationFn: (id: string) => api.post(`/insurance/${id}/confirm-deduction`).then((r) => r.data),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ['insurance'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['insurance-payments', id] })
    },
  })

  const { data: policyHistory = [] } = useQuery({
    queryKey: ['insurance-payments', historyPolicyId],
    queryFn: () => api.get<InsurancePayment[]>(`/insurance/${historyPolicyId}/payments`).then((r) => r.data),
    enabled: !!historyPolicyId,
  })

  const activePolicies = policies.filter((p) => p.isActive)
  const monthlyTotal = activePolicies.reduce((s, p) => s + toMonthly(Number(p.premiumAmount), p.premiumFrequency), 0)
  const annualTotal = monthlyTotal * 12

  const canSubmit = form.provider && form.type && form.coverageAmount >= 0 && form.premiumAmount >= 0 && form.startDate
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const pendingDeletePolicy = policies.find((p) => p.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormError('')
  }

  function handleEdit(p: InsurancePolicy) {
    setForm(policyToForm(p)); setEditingId(p.id); setFormError(''); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const payload = {
      ...form,
      policyNumber: form.policyNumber || undefined,
      endDate: form.endDate || undefined,
      nextPaymentDate: form.nextPaymentDate || undefined,
      notes: form.notes || undefined,
    }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Insurance</h2>
          <p className="text-sm text-gray-400 mt-0.5">{activePolicies.length} active policies</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add policy</span>
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Monthly cost</p>
          <p className="text-xl font-bold text-blue-800 mt-1">{kes(Math.round(monthlyTotal))}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Annual cost</p>
          <p className="text-xl font-bold text-gray-900 mt-1">{kes(Math.round(annualTotal))}</p>
        </div>
      </div>

      {/* Policy list */}
      <div className="space-y-3">
        {isError ? (
          <ErrorState message="Failed to load insurance policies." onRetry={refetch} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-20 animate-pulse" />
          ))
        ) : policies.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">No insurance policies yet</p>
          </div>
        ) : (
          policies.map((p) => (
            <div key={p.id} className={`bg-white rounded-xl border shadow-sm p-4 ${p.isActive ? 'border-gray-100' : 'border-gray-100 opacity-60'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-gray-900 truncate">{p.provider}</p>
                    {!p.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full font-medium">Inactive</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      {TYPE_LABELS[p.type] ?? p.type}
                    </span>
                    {p.policyNumber && (
                      <span className="text-xs text-gray-400">#{p.policyNumber}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => handleEdit(p)} className="text-gray-300 hover:text-blue-400 transition-colors p-1" aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPendingDeleteId(p.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-x-4 text-sm">
                <div>
                  <p className="text-xs text-gray-400">Premium</p>
                  <p className="font-semibold text-gray-900">{kes(p.premiumAmount)}</p>
                  <p className="text-xs text-gray-400">{FREQ_LABELS[p.premiumFrequency]}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Coverage</p>
                  <p className="font-semibold text-gray-900">{kes(p.coverageAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Monthly equiv.</p>
                  <p className="font-semibold text-gray-700">{kes(Math.round(toMonthly(Number(p.premiumAmount), p.premiumFrequency)))}</p>
                </div>
              </div>

              {p.nextPaymentDate && (
                <p className="text-xs text-gray-400 mt-2">Next payment: {p.nextPaymentDate}</p>
              )}
              {p.notes && <p className="text-xs text-gray-400 mt-1 truncate">{p.notes}</p>}
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                {p.isActive && (
                  <button
                    onClick={() => confirmDeductionMutation.mutate(p.id)}
                    disabled={confirmDeductionMutation.isPending}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    <CheckCircle className="w-3.5 h-3.5" />
                    {confirmDeductionMutation.isPending ? 'Confirming…' : 'Confirm premium paid'}
                  </button>
                )}
                <button
                  onClick={() => setHistoryPolicyId(historyPolicyId === p.id ? null : p.id)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors rounded-lg px-2 py-1.5 text-xs font-medium ml-auto"
                >
                  <History className="w-3.5 h-3.5" />
                  History
                  {historyPolicyId === p.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              </div>

              {historyPolicyId === p.id && (
                <div className="mt-3 border-t border-gray-50 pt-3">
                  {policyHistory.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-2">No premiums confirmed yet</p>
                  ) : (
                    <div className="space-y-1.5">
                      {policyHistory.map((pay) => (
                        <div key={pay.id} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{pay.date}</span>
                          <span className="font-medium text-gray-700">{kes(pay.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete policy?"
          message={
            pendingDeletePolicy
              ? `This will permanently delete the ${TYPE_LABELS[pendingDeletePolicy.type] ?? pendingDeletePolicy.type} policy from ${pendingDeletePolicy.provider}.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Add / Edit panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Policy' : 'Add Policy'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <input type="text" value={form.provider}
                    onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g. Jubilee" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                    <option value="">Select</option>
                    {INSURANCE_TYPES.map((t) => <option key={t} value={t}>{TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Policy number (optional)</label>
                <input type="text" value={form.policyNumber ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, policyNumber: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="Optional" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Coverage amount</label>
                  <input type="number" min="0" value={form.coverageAmount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, coverageAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Premium amount</label>
                  <input type="number" min="0" step="0.01" value={form.premiumAmount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, premiumAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0" required />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Premium frequency</label>
                <div className="flex gap-1.5">
                  {FREQUENCIES.map((f) => (
                    <button key={f} type="button" onClick={() => setForm((s) => ({ ...s, premiumFrequency: f }))}
                      className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${form.premiumFrequency === f ? 'bg-green-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {FREQ_LABELS[f]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input type="date" value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Next payment</label>
                  <input type="date" value={form.nextPaymentDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, nextPaymentDate: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent" />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="isActive" checked={form.isActive ?? true}
                  onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  className="w-4 h-4 accent-green-700" />
                <label htmlFor="isActive" className="text-sm font-medium text-gray-700">Active policy</label>
              </div>

              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

              <button type="submit" disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update Policy' : 'Save Policy')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
