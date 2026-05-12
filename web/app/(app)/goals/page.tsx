'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, Target, Trash2, X, Pencil, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Goal, CreateGoalRequest, GoalType, GoalStatus, ProgressStatus } from '@/lib/types'

const GOAL_TYPES: { value: GoalType; label: string }[] = [
  { value: 'SAVINGS', label: 'Build Savings' },
  { value: 'DEBT_PAYOFF', label: 'Pay Off Debt' },
  { value: 'INVESTMENT_GROWTH', label: 'Grow Investments' },
  { value: 'INCOME', label: 'Increase Income' },
  { value: 'EXPENSE_REDUCTION', label: 'Reduce Expenses' },
  { value: 'NET_WORTH', label: 'Grow Net Worth' },
  { value: 'CUSTOM', label: 'Custom Goal' },
]

const STATUS_OPTIONS: { value: GoalStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'PAUSED', label: 'Paused' },
  { value: 'ABANDONED', label: 'Abandoned' },
]

const PROGRESS_BADGE: Record<ProgressStatus, { label: string; cls: string }> = {
  AHEAD: { label: 'Ahead', cls: 'bg-blue-100 text-blue-700' },
  ON_TRACK: { label: 'On Track', cls: 'bg-green-100 text-green-700' },
  BEHIND: { label: 'Behind', cls: 'bg-red-100 text-red-600' },
  ACHIEVED: { label: 'Achieved ✓', cls: 'bg-purple-100 text-purple-700' },
  NO_PLAN: { label: 'No Plan', cls: 'bg-gray-100 text-gray-500' },
}

function kes(n: number) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

const today = new Date().toISOString().split('T')[0]

const EMPTY_FORM: CreateGoalRequest = {
  title: '',
  type: 'SAVINGS',
  description: '',
  targetValue: undefined,
  currentValue: undefined,
  unit: 'KES',
  startDate: today,
  targetDate: '',
}

export default function GoalsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateGoalRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const { data: goals = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateGoalRequest) => api.post('/goals', req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); closeForm() },
    onError: () => setFormError('Failed to save goal.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateGoalRequest> }) =>
      api.patch(`/goals/${id}`, req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); closeForm() },
    onError: () => setFormError('Failed to update goal.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); setPendingDeleteId(null) },
  })

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')
  const onTrackCount = activeGoals.filter((g) => g.progressStatus === 'ON_TRACK' || g.progressStatus === 'AHEAD').length
  const pendingDeleteGoal = goals.find((g) => g.id === pendingDeleteId)
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const canSubmit = !!form.title.trim() && !!form.targetDate

  function closeForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }

  function handleEdit(goal: Goal) {
    setForm({
      title: goal.title,
      type: goal.type,
      description: goal.description ?? '',
      targetValue: goal.targetValue ?? undefined,
      currentValue: goal.currentValue ?? undefined,
      unit: goal.unit ?? 'KES',
      startDate: goal.startDate,
      targetDate: goal.targetDate,
      status: goal.status,
    })
    setEditingId(goal.id)
    setFormError('')
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateGoalRequest = {
      ...form,
      description: form.description || undefined,
      targetValue: form.targetValue || undefined,
      currentValue: form.currentValue || undefined,
      unit: form.unit || undefined,
    }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Goals</h2>
          <p className="text-sm text-gray-400 mt-0.5">Set targets, generate AI plans, track progress</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Goal</span>
        </button>
      </div>

      {/* Summary strip */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">Active</p>
            <p className="text-xl font-bold text-gray-900">{activeGoals.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">On Track / Ahead</p>
            <p className="text-xl font-bold text-green-700">{onTrackCount}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">Achieved</p>
            <p className="text-xl font-bold text-purple-700">{goals.filter((g) => g.status === 'ACHIEVED').length}</p>
          </div>
        </div>
      )}

      {isError ? (
        <ErrorState message="Failed to load goals." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-28 bg-white rounded-xl animate-pulse" />)}
        </div>
      ) : goals.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
          <Target className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No goals yet.</p>
          <p className="text-xs text-gray-300 mt-1">Create a goal and let AI build you a personalised plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => {
            const badge = PROGRESS_BADGE[goal.progressStatus]
            const typeLabel = GOAL_TYPES.find((t) => t.value === goal.type)?.label ?? goal.type
            return (
              <div key={goal.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{goal.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badge.cls}`}>
                        {badge.label}
                      </span>
                      <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0">
                        {typeLabel}
                      </span>
                    </div>

                    {goal.description && (
                      <p className="text-xs text-gray-400 truncate mb-2">{goal.description}</p>
                    )}

                    {/* Progress bar */}
                    {goal.progressPct > 0 && (
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>{goal.progressPct.toFixed(0)}% complete</span>
                          {goal.targetValue !== null && (
                            <span>{kes(goal.currentValue ?? 0)} / {kes(goal.targetValue)}</span>
                          )}
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              goal.progressStatus === 'AHEAD' ? 'bg-blue-500' :
                              goal.progressStatus === 'ON_TRACK' ? 'bg-green-500' :
                              goal.progressStatus === 'ACHIEVED' ? 'bg-purple-500' : 'bg-red-400'
                            }`}
                            style={{ width: `${Math.min(100, goal.progressPct)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-3 text-xs text-gray-300">
                      <span>Target: {goal.targetDate}</span>
                      {goal.daysRemaining > 0 && (
                        <span>{goal.daysRemaining}d remaining</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleEdit(goal)} className="text-gray-300 hover:text-blue-400 p-1 transition-colors">
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setPendingDeleteId(goal.id)} className="text-gray-300 hover:text-red-400 p-1 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <Link href={`/goals/${goal.id}`} className="text-gray-300 hover:text-green-600 p-1 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete goal?"
          message={pendingDeleteGoal ? `Remove "${pendingDeleteGoal.title}" and its AI plan.` : 'This cannot be undone.'}
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Goal' : 'New Goal'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Goal title *</label>
                <input className={inputCls} value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} placeholder="e.g. Save for emergency fund" required />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className={`${inputCls} bg-white`} value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as GoalType }))}>
                  {GOAL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description / qualitative context (optional)</label>
                <textarea className={`${inputCls} resize-none`} rows={3} value={form.description ?? ''} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="Describe what achieving this goal means to you, or steps you have in mind…" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target amount (optional)</label>
                  <input type="number" min="0" step="1" className={inputCls} value={form.targetValue ?? ''} onChange={(e) => setForm((f) => ({ ...f, targetValue: parseFloat(e.target.value) || undefined }))} placeholder="e.g. 500000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input className={inputCls} value={form.unit ?? ''} onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))} placeholder="KES, %, units…" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current value (optional)</label>
                <input type="number" min="0" step="1" className={inputCls} value={form.currentValue ?? ''} onChange={(e) => setForm((f) => ({ ...f, currentValue: parseFloat(e.target.value) || undefined }))} placeholder="Where you are today" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date *</label>
                  <input type="date" className={inputCls} value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target date *</label>
                  <input type="date" className={inputCls} value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} required />
                </div>
              </div>

              {editingId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className={`${inputCls} bg-white`} value={form.status ?? 'ACTIVE'} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as GoalStatus }))}>
                    {STATUS_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                  </select>
                </div>
              )}

              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

              <button type="submit" disabled={isPending || !canSubmit} className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {isPending ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update Goal' : 'Create Goal')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
