'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, FolderKanban, ArrowUpRight, ArrowDownRight, Receipt } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Project, CreateProjectRequest, ProjectStatus, CreateTransactionRequest } from '@/lib/types'

const INCOME_CATEGORIES = [
  'Salary / Employment', 'Business Income', 'Freelance / Gig',
  'Agricultural', 'Investment Returns', 'Rental Income',
  'Government Benefits', 'Remittances', 'Other Income',
]

const EXPENSE_CATEGORIES = [
  'Food & Groceries', 'Transport & Fuel', 'Rent & Housing',
  'Utilities (Electricity/Water/Gas)', 'Airtime & Data', 'Healthcare',
  'Education & School Fees', 'Clothing', 'Entertainment & Leisure',
  'Household & Repairs', 'Faith & Giving / Tithe', 'Extended Family Support',
  'Chama / Investment Group', 'Debt Repayment', 'Insurance',
  'Shopping & Personal Items', 'Self-Care & Wellness', 'Travel',
  'Business Expenses', 'Other',
]

const STATUS_OPTIONS: { value: ProjectStatus; label: string }[] = [
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ARCHIVED', label: 'Archived' },
]

const STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700',
  COMPLETED: 'bg-blue-100 text-blue-700',
  ARCHIVED: 'bg-gray-100 text-gray-500',
}

const DEFAULT_COLORS = [
  '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed', '#db2777', '#65a30d',
]

function kes(n: number) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

const today = new Date().toISOString().split('T')[0]

const EMPTY_FORM: CreateProjectRequest = {
  name: '',
  description: '',
  color: DEFAULT_COLORS[0],
  status: 'ACTIVE',
  budget: undefined,
  startDate: today,
  endDate: '',
}

type TxForm = { type: 'INCOME' | 'EXPENSE'; amount: number; category: string; date: string; description: string }

const EMPTY_TX: TxForm = { type: 'EXPENSE', amount: 0, category: '', date: today, description: '' }

export default function ProjectsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateProjectRequest>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  // transaction quick-add state
  const [txProjectId, setTxProjectId] = useState<string | null>(null)
  const [txForm, setTxForm] = useState<TxForm>(EMPTY_TX)
  const [txError, setTxError] = useState('')

  const { data: projects = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateProjectRequest) => api.post('/projects', req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); closeForm() },
    onError: () => setFormError('Failed to save project.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateProjectRequest> }) =>
      api.patch(`/projects/${id}`, req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); closeForm() },
    onError: () => setFormError('Failed to update project.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); setPendingDeleteId(null) },
  })

  const addTxMutation = useMutation({
    mutationFn: (req: CreateTransactionRequest) => api.post('/transactions', req).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['projects'] })
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setTxProjectId(null)
      setTxForm(EMPTY_TX)
      setTxError('')
    },
    onError: () => setTxError('Failed to save transaction.'),
  })

  function openTxForm(projectId: string) {
    setTxProjectId(projectId)
    setTxForm(EMPTY_TX)
    setTxError('')
  }

  function handleTxSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!txForm.amount || !txForm.category || !txProjectId) return
    addTxMutation.mutate({
      type: txForm.type,
      amount: txForm.amount,
      category: txForm.category,
      date: txForm.date,
      description: txForm.description || undefined,
      projectId: txProjectId,
    })
  }

  const pendingDeleteProject = projects.find((p) => p.id === pendingDeleteId)
  const txProject = projects.find((p) => p.id === txProjectId)
  const activeProjects = projects.filter((p) => p.status === 'ACTIVE')
  const totalIncome = projects.reduce((s, p) => s + p.totalIncome, 0)
  const totalExpenses = projects.reduce((s, p) => s + p.totalExpenses, 0)

  function closeForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setEditingId(null)
    setFormError('')
  }

  function handleEdit(project: Project) {
    setForm({
      name: project.name,
      description: project.description ?? '',
      color: project.color ?? DEFAULT_COLORS[0],
      status: project.status,
      budget: project.budget ?? undefined,
      startDate: project.startDate ?? '',
      endDate: project.endDate ?? '',
    })
    setEditingId(project.id)
    setFormError('')
    setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const payload: CreateProjectRequest = {
      ...form,
      description: form.description || undefined,
      endDate: form.endDate || undefined,
      startDate: form.startDate || undefined,
    }
    if (editingId) {
      editMutation.mutate({ id: editingId, req: payload })
    } else {
      addMutation.mutate(payload)
    }
  }

  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const canSubmit = !!form.name.trim()

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-400 mt-0.5">Track income and expenses per project</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">New Project</span>
        </button>
      </div>

      {/* Summary strip */}
      {projects.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">Active</p>
            <p className="text-xl font-bold text-gray-900">{activeProjects.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">Total Income</p>
            <p className="text-sm font-bold text-green-600">{kes(totalIncome)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 text-center">
            <p className="text-xs text-gray-400">Total Expenses</p>
            <p className="text-sm font-bold text-red-500">{kes(totalExpenses)}</p>
          </div>
        </div>
      )}

      {/* Project list */}
      {isError ? (
        <ErrorState message="Failed to load projects." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl p-5 h-28 animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center">
          <FolderKanban className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No projects yet.</p>
          <p className="text-xs text-gray-300 mt-1">Create a project and assign transactions to it to track P&L.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((project) => {
            const budgetUsed = project.budget ? (project.totalExpenses / project.budget) * 100 : null
            const netPositive = project.net >= 0
            return (
              <div
                key={project.id}
                className="bg-white rounded-xl border border-gray-100 shadow-sm p-4"
              >
                <div className="flex items-start gap-3">
                  {/* Color dot */}
                  <div
                    className="w-3 h-3 rounded-full mt-1 shrink-0"
                    style={{ backgroundColor: project.color ?? '#4f46e5' }}
                  />
                  <div className="flex-1 min-w-0">
                    {/* Header row */}
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-gray-900 truncate">{project.name}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${STATUS_COLORS[project.status]}`}>
                        {STATUS_OPTIONS.find((s) => s.value === project.status)?.label}
                      </span>
                    </div>

                    {project.description && (
                      <p className="text-xs text-gray-400 mb-2 truncate">{project.description}</p>
                    )}

                    {/* P&L row */}
                    <div className="flex items-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        {kes(project.totalIncome)}
                      </span>
                      <span className="flex items-center gap-1 text-red-500">
                        <ArrowDownRight className="w-3.5 h-3.5" />
                        {kes(project.totalExpenses)}
                      </span>
                      <span className={`font-semibold ${netPositive ? 'text-green-700' : 'text-red-600'}`}>
                        {netPositive ? '+' : ''}{kes(project.net)}
                      </span>
                      <span className="text-xs text-gray-300 ml-auto">
                        {project.transactionCount} txn{project.transactionCount !== 1 ? 's' : ''}
                      </span>
                    </div>

                    {/* Budget progress */}
                    {project.budget && (
                      <div className="mt-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Budget: {kes(project.budget)}</span>
                          <span>{Math.min(budgetUsed ?? 0, 100).toFixed(0)}% used</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${(budgetUsed ?? 0) > 100 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${Math.min(budgetUsed ?? 0, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Dates */}
                    {(project.startDate || project.endDate) && (
                      <p className="text-xs text-gray-300 mt-1.5">
                        {project.startDate ?? '—'} → {project.endDate ?? 'ongoing'}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openTxForm(project.id)}
                      title="Add transaction"
                      className="text-gray-300 hover:text-green-600 transition-colors"
                    >
                      <Receipt className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleEdit(project)} className="text-gray-300 hover:text-blue-400 transition-colors">
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button onClick={() => setPendingDeleteId(project.id)} className="text-gray-300 hover:text-red-400 transition-colors">
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
          title="Delete project?"
          message={
            pendingDeleteProject
              ? `Remove "${pendingDeleteProject.name}". Transactions assigned to it will be unlinked but not deleted.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Quick-add transaction modal */}
      {txProjectId && txProject && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Add Transaction</h3>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{ backgroundColor: txProject.color ?? '#4f46e5' }}
                  />
                  {txProject.name}
                </p>
              </div>
              <button onClick={() => setTxProjectId(null)}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleTxSubmit} className="p-5 space-y-4">
              {/* Type toggle */}
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTxForm((f) => ({ ...f, type: t, category: '' }))}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      txForm.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {t.charAt(0) + t.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Amount (KES)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={txForm.amount || ''}
                  onChange={(e) => setTxForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                  placeholder="0.00"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={txForm.category}
                  onChange={(e) => setTxForm((f) => ({ ...f, category: e.target.value }))}
                  className={`${inputCls} bg-white`}
                  required
                >
                  <option value="">Select category</option>
                  {(txForm.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={txForm.date}
                  onChange={(e) => setTxForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={txForm.description}
                  onChange={(e) => setTxForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                  placeholder="Optional note"
                />
              </div>

              {txError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{txError}</p>
              )}

              <button
                type="submit"
                disabled={addTxMutation.isPending || !txForm.amount || !txForm.category}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {addTxMutation.isPending ? 'Saving…' : `Save ${txForm.type === 'INCOME' ? 'Income' : 'Expense'}`}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Project' : 'New Project'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project name *</label>
                <input
                  className={inputCls}
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Client Website, App Launch, Farm Project"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  className={inputCls}
                  value={form.description ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Brief description of this project"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  className={`${inputCls} bg-white`}
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                >
                  {STATUS_OPTIONS.map((s) => (
                    <option key={s.value} value={s.value}>{s.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {DEFAULT_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, color: c }))}
                      className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Budget (KES, optional)</label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  className={inputCls}
                  value={form.budget ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, budget: parseFloat(e.target.value) || undefined }))}
                  placeholder="Leave blank for no budget limit"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.startDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End date</label>
                  <input
                    type="date"
                    className={inputCls}
                    value={form.endDate ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {isPending ? (editingId ? 'Updating…' : 'Creating…') : (editingId ? 'Update Project' : 'Create Project')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
