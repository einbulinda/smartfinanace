'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Pencil, ChevronLeft, ChevronRight, Download, Tag } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { PaginatedTransactions, Transaction, CreateTransactionRequest, Account, Project } from '@/lib/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

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

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

type TabFilter = 'ALL' | 'INCOME' | 'EXPENSE'

const today = new Date().toISOString().split('T')[0]

const EMPTY_FORM: CreateTransactionRequest = {
  type: 'EXPENSE',
  amount: 0,
  category: '',
  subCategory: '',
  description: '',
  date: today,
  isRecurring: false,
  tags: [],
  projectId: undefined,
}

export default function TransactionsPage() {
  const qc = useQueryClient()
  const now = new Date()

  const [tab, setTab] = useState<TabFilter>('ALL')
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [tagFilter, setTagFilter] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<CreateTransactionRequest>(EMPTY_FORM)
  const [tagInput, setTagInput] = useState('')
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const startDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-01`
  const lastDay = new Date(filterYear, filterMonth, 0).getDate()
  const endDate = `${filterYear}-${String(filterMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  const atCurrentMonth = filterYear === now.getFullYear() && filterMonth === now.getMonth() + 1

  function prevMonth() {
    if (filterMonth === 1) { setFilterMonth(12); setFilterYear((y) => y - 1) }
    else setFilterMonth((m) => m - 1)
  }

  function nextMonth() {
    if (atCurrentMonth) return
    if (filterMonth === 12) { setFilterMonth(1); setFilterYear((y) => y + 1) }
    else setFilterMonth((m) => m + 1)
  }

  const params = {
    ...(tab !== 'ALL' && { type: tab }),
    startDate,
    endDate,
    ...(tagFilter && { tag: tagFilter }),
    limit: 100,
  }

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['transactions', tab, filterYear, filterMonth, tagFilter],
    queryFn: () =>
      api.get<PaginatedTransactions>('/transactions', { params }).then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateTransactionRequest) =>
      api.post('/transactions', req).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      closeForm()
    },
    onError: () => setFormError('Failed to save transaction. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateTransactionRequest> }) =>
      api.patch(`/transactions/${id}`, req).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      closeForm()
    },
    onError: () => setFormError('Failed to update transaction. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      setPendingDeleteId(null)
    },
  })

  const categories = form.type === 'INCOME' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const canSubmit = form.amount > 0 && form.category && form.date
  const isPending = editingId ? editMutation.isPending : addMutation.isPending

  function closeForm() {
    setShowForm(false)
    setForm(EMPTY_FORM)
    setTagInput('')
    setEditingId(null)
    setFormError('')
  }

  function handleTypeChange(type: 'INCOME' | 'EXPENSE') {
    setForm((f) => ({ ...f, type, category: '', subCategory: '' }))
  }

  function handleEdit(tx: Transaction) {
    setForm({
      type: tx.type as 'INCOME' | 'EXPENSE',
      amount: Number(tx.amount),
      category: tx.category,
      subCategory: tx.subCategory ?? '',
      description: tx.description ?? '',
      date: tx.date,
      isRecurring: tx.isRecurring,
      accountId: tx.accountId ?? undefined,
      tags: tx.tags ?? [],
      projectId: tx.projectId ?? undefined,
    })
    setTagInput('')
    setEditingId(tx.id)
    setFormError('')
    setShowForm(true)
  }

  function addTag() {
    const tag = tagInput.trim().toLowerCase().replace(/\s+/g, '-')
    if (!tag) return
    if (!(form.tags ?? []).includes(tag)) {
      setForm((f) => ({ ...f, tags: [...(f.tags ?? []), tag] }))
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setForm((f) => ({ ...f, tags: (f.tags ?? []).filter((t) => t !== tag) }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const payload: CreateTransactionRequest = {
      ...form,
      subCategory: form.subCategory || undefined,
      description: form.description || undefined,
      tags: form.tags?.length ? form.tags : undefined,
      projectId: form.projectId || undefined,
    }
    if (editingId) {
      editMutation.mutate({ id: editingId, req: payload })
    } else {
      addMutation.mutate(payload)
    }
  }

  async function handleExport() {
    setExporting(true)
    try {
      const response = await api.get('/transactions/export', {
        params: {
          ...(tab !== 'ALL' && { type: tab }),
          startDate,
          endDate,
          ...(tagFilter && { tag: tagFilter }),
        },
        responseType: 'blob',
      })
      const url = URL.createObjectURL(new Blob([response.data as BlobPart], { type: 'text/csv' }))
      const a = document.createElement('a')
      a.href = url
      a.download = `transactions-${filterYear}-${String(filterMonth).padStart(2, '0')}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data),
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => api.get<Project[]>('/projects').then((r) => r.data),
  })

  const totalIncome = data?.data.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const totalExpense = data?.data.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0) ?? 0
  const pendingDeleteTx = data?.data.find((t) => t.id === pendingDeleteId)

  const expenseByCategory = (data?.data ?? [])
    .filter((t) => t.type === 'EXPENSE')
    .reduce<Record<string, number>>((acc, t) => {
      acc[t.category] = (acc[t.category] || 0) + Number(t.amount)
      return acc
    }, {})
  const categoryEntries = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])
  const showBreakdown = tab !== 'INCOME' && categoryEntries.length > 0 && !isLoading && !isError

  // All unique tags seen in current results for the filter bar
  const allTags = Array.from(
    new Set((data?.data ?? []).flatMap((t) => t.tags ?? []))
  ).sort()

  const inputCls = 'w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent'

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Transactions</h2>
          <p className="text-sm text-gray-400 mt-0.5">{MONTHS[filterMonth - 1]} {filterYear}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            disabled={exporting}
            title="Export CSV"
            className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">{exporting ? 'Exporting…' : 'CSV'}</span>
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add</span>
          </button>
        </div>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <div className="bg-green-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Income</p>
          <p className="text-lg font-bold text-green-800 mt-0.5">{kes(totalIncome)}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Expenses</p>
          <p className="text-lg font-bold text-red-700 mt-0.5">{kes(totalExpense)}</p>
        </div>
      </div>

      {/* Expense breakdown */}
      {showBreakdown && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Expense Breakdown</p>
          <div className="space-y-2.5">
            {categoryEntries.map(([cat, amount]) => (
              <div key={cat}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 font-medium">{cat}</span>
                  <span className="text-gray-400 tabular-nums">
                    {kes(amount)} · {totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0}%
                  </span>
                </div>
                <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-red-400 h-1.5 rounded-full transition-all"
                    style={{ width: `${totalExpense > 0 ? (amount / totalExpense) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Month picker */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-2.5 mb-4">
        <button onClick={prevMonth} className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <span className="text-sm font-medium text-gray-700">{MONTHS[filterMonth - 1]} {filterYear}</span>
        <button
          onClick={nextMonth}
          disabled={atCurrentMonth}
          className="p-1 rounded-lg hover:bg-gray-100 transition-colors text-gray-500 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-4">
        {(['ALL', 'INCOME', 'EXPENSE'] as TabFilter[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              tab === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t === 'ALL' ? 'All' : t.charAt(0) + t.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Tag filter chips */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setTagFilter('')}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
              tagFilter === '' ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
            }`}
          >
            All tags
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
              className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors ${
                tagFilter === tag ? 'bg-green-700 text-white border-green-700' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400'
              }`}
            >
              <Tag className="w-2.5 h-2.5" />
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Transaction list */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isError ? (
          <ErrorState message="Failed to load transactions." onRetry={refetch} />
        ) : isLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex gap-3">
                <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : data?.data.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-12">No transactions yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {data?.data.map((tx) => {
              const isTransfer = tx.type === 'TRANSFER'
              const accountName = accounts.find((a) => a.id === tx.accountId)?.name
              return (
                <div key={tx.id} className="px-5 py-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-gray-900 truncate">{tx.category}</p>
                      {tx.subCategory && (
                        <span className="text-xs text-gray-400">/ {tx.subCategory}</span>
                      )}
                      {isTransfer && (
                        <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded font-medium shrink-0">Transfer</span>
                      )}
                    </div>
                    {tx.description && (
                      <p className="text-xs text-gray-400 truncate">{tx.description}</p>
                    )}
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs text-gray-400">{tx.date}</p>
                      {accountName && <p className="text-xs text-gray-300">· {accountName}</p>}
                    </div>
                    {tx.tags && tx.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tx.tags.map((tag) => (
                          <button
                            key={tag}
                            onClick={() => setTagFilter(tag === tagFilter ? '' : tag)}
                            className="flex items-center gap-0.5 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded hover:bg-green-50 hover:text-green-700 transition-colors"
                          >
                            <Tag className="w-2.5 h-2.5" />
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span className={`text-sm font-semibold tabular-nums ${
                      isTransfer ? 'text-gray-500' : tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'
                    }`}>
                      {isTransfer ? '' : tx.type === 'INCOME' ? '+' : '−'}{kes(tx.amount)}
                    </span>
                    {!isTransfer && (
                      <>
                        <button
                          onClick={() => handleEdit(tx)}
                          className="text-gray-300 hover:text-blue-400 transition-colors"
                          aria-label="Edit"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPendingDeleteId(tx.id)}
                          className="text-gray-300 hover:text-red-400 transition-colors"
                          aria-label="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete transaction?"
          message={
            pendingDeleteTx
              ? `This will permanently delete the ${pendingDeleteTx.type.toLowerCase()} of ${kes(pendingDeleteTx.amount)} on ${pendingDeleteTx.date}.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Add / Edit transaction panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">
                {editingId ? 'Edit Transaction' : 'Add Transaction'}
              </h3>
              <button onClick={closeForm}>
                <X className="w-5 h-5 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
                {(['EXPENSE', 'INCOME'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      form.type === t ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
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
                  value={form.amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))}
                  className={inputCls}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className={`${inputCls} bg-white`}
                  required
                >
                  <option value="">Select category</option>
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sub-category (optional)</label>
                <input
                  type="text"
                  value={form.subCategory ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, subCategory: e.target.value }))}
                  className={inputCls}
                  placeholder="e.g. NHIF, Rent arrears, School uniform…"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  className={inputCls}
                  placeholder="Optional note"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                  className={inputCls}
                  required
                />
              </div>

              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Account (optional)</label>
                  <select
                    value={form.accountId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value || undefined }))}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="">No account</option>
                    {accounts.filter((a) => a.isActive).map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tags (optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    className={`${inputCls} flex-1`}
                    placeholder="Type tag + Enter"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Add
                  </button>
                </div>
                {(form.tags ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {(form.tags ?? []).map((tag) => (
                      <span key={tag} className="flex items-center gap-1 text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                        {tag}
                        <button type="button" onClick={() => removeTag(tag)}>
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Project */}
              {projects.filter((p) => p.status === 'ACTIVE').length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Project (optional)</label>
                  <select
                    value={form.projectId ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, projectId: e.target.value || undefined }))}
                    className={`${inputCls} bg-white`}
                  >
                    <option value="">No project</option>
                    {projects.filter((p) => p.status === 'ACTIVE').map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>
              )}

              <button
                type="submit"
                disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
              >
                {isPending
                  ? (editingId ? 'Updating…' : 'Saving…')
                  : (editingId ? 'Update Transaction' : 'Save Transaction')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
