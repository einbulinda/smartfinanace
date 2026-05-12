'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, Plus, Trash2, Copy } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { Budget, BudgetVsActual, BudgetItemInput } from '@/lib/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

const EXPENSE_CATEGORIES = [
  'Food & Groceries', 'Transport & Fuel', 'Rent & Housing',
  'Utilities (Electricity/Water/Gas)', 'Airtime & Data', 'Healthcare',
  'Education & School Fees', 'Clothing', 'Entertainment & Leisure',
  'Household & Repairs', 'Faith & Giving / Tithe', 'Extended Family Support',
  'Chama / Investment Group', 'Debt Repayment', 'Insurance',
  'Shopping & Personal Items', 'Self-Care & Wellness', 'Travel',
  'Business Expenses', 'Savings & Investments', 'Other',
]

function kes(n: number | string) {
  return 'KES ' + Math.abs(Number(n)).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function pct(actual: number, budgeted: number) {
  if (budgeted === 0) return null
  return Math.min((actual / budgeted) * 100, 100)
}

function toYYYYMM(year: number, month: number) {
  return `${year}-${String(month).padStart(2, '0')}`
}

export default function BudgetsPage() {
  const qc = useQueryClient()
  const now = new Date()
  const [filterYear, setFilterYear] = useState(now.getFullYear())
  const [filterMonth, setFilterMonth] = useState(now.getMonth() + 1)
  const [activeTab, setActiveTab] = useState<'plan' | 'vs-actual'>('plan')
  const [editItems, setEditItems] = useState<BudgetItemInput[]>([])
  const [isEditing, setIsEditing] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [copied, setCopied] = useState(false)

  const month = toYYYYMM(filterYear, filterMonth)
  const atCurrentMonth = filterYear === now.getFullYear() && filterMonth === now.getMonth() + 1

  function navMonth(dir: -1 | 1) {
    let m = filterMonth + dir
    let y = filterYear
    if (m < 1) { m = 12; y-- }
    if (m > 12) { m = 1; y++ }
    setFilterMonth(m); setFilterYear(y)
  }

  const { data: budget, isLoading: budgetLoading, isError: budgetError, refetch: refetchBudget } = useQuery({
    queryKey: ['budgets', month],
    queryFn: () => api.get<Budget | null>(`/budgets/${month}`).then((r) => r.data),
  })

  const { data: vsActual, isLoading: vsLoading, isError: vsError, refetch: refetchVs } = useQuery({
    queryKey: ['budgets', month, 'vs-actual'],
    queryFn: () => api.get<BudgetVsActual>(`/budgets/${month}/vs-actual`).then((r) => r.data),
    enabled: activeTab === 'vs-actual',
  })

  const prevMonth = (() => {
    const m = filterMonth - 1 < 1 ? 12 : filterMonth - 1
    const y = filterMonth - 1 < 1 ? filterYear - 1 : filterYear
    return toYYYYMM(y, m)
  })()

  const { data: prevBudget } = useQuery({
    queryKey: ['budgets', prevMonth],
    queryFn: () => api.get<Budget | null>(`/budgets/${prevMonth}`).then((r) => r.data),
  })

  useEffect(() => {
    if (budget?.items) {
      setEditItems(budget.items.map((i) => ({ category: i.category, allocatedAmount: i.allocatedAmount, isPreDeduction: i.isPreDeduction })))
    } else {
      setEditItems([])
    }
    setIsEditing(false)
  }, [budget])

  const saveMutation = useMutation({
    mutationFn: (items: BudgetItemInput[]) =>
      api.post(`/budgets/${month}`, { items }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', month] })
      qc.invalidateQueries({ queryKey: ['budgets', month, 'vs-actual'] })
      setIsEditing(false)
      setSaveError('')
    },
    onError: () => setSaveError('Failed to save budget. Please try again.'),
  })

  const copyMutation = useMutation({
    mutationFn: () => api.post(`/budgets/${month}/copy-from/${prevMonth}`, {}).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['budgets', month] })
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    },
  })

  function addItem() {
    setEditItems((prev) => [...prev, { category: '', allocatedAmount: 0, isPreDeduction: false }])
  }

  function removeItem(i: number) {
    setEditItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateItem(i: number, field: keyof BudgetItemInput, value: string | number | boolean) {
    setEditItems((prev) => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  function handleQuickFill() {
    const income = vsActual?.income ?? 0
    if (!income) return
    setEditItems([
      { category: 'Needs', allocatedAmount: Math.round(income * 0.5), isPreDeduction: false },
      { category: 'Wants', allocatedAmount: Math.round(income * 0.3), isPreDeduction: false },
      { category: 'Savings & Investments', allocatedAmount: Math.round(income * 0.2), isPreDeduction: false },
    ])
    setIsEditing(true)
  }

  const totalBudgeted = editItems.reduce((s, i) => s + Number(i.allocatedAmount), 0)
  const preDeductionTotal = editItems.filter((i) => i.isPreDeduction).reduce((s, i) => s + Number(i.allocatedAmount), 0)

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Budget</h2>
          <p className="text-sm text-gray-400 mt-0.5">Plan your spending</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => navMonth(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-gray-700 w-28 text-center">
            {MONTHS[filterMonth - 1]} {filterYear}
          </span>
          <button onClick={() => navMonth(1)} disabled={atCurrentMonth} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        {(['plan', 'vs-actual'] as const).map((tab) => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 text-sm font-medium py-1.5 rounded-md transition-colors ${activeTab === tab ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab === 'plan' ? 'Budget Plan' : 'vs. Actual'}
          </button>
        ))}
      </div>

      {/* --- PLAN TAB --- */}
      {activeTab === 'plan' && (
        <>
          {budgetError ? (
            <ErrorState message="Failed to load budget." onRetry={refetchBudget} />
          ) : budgetLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-14 animate-pulse" />
              ))}
            </div>
          ) : (
            <>
              {/* Summary cards */}
              {!isEditing && (
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-blue-50 rounded-xl p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Budgeted</p>
                    <p className="text-xl font-bold text-blue-800 mt-0.5">{kes(totalBudgeted)}</p>
                  </div>
                  {preDeductionTotal > 0 && (
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Pre-deductions</p>
                      <p className="text-xl font-bold text-gray-700 mt-0.5">{kes(preDeductionTotal)}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Edit mode */}
              {isEditing ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
                  <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">Edit allocations</p>
                    <span className="text-sm text-gray-400">Total: {kes(totalBudgeted)}</span>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {editItems.map((item, i) => (
                      <div key={i} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <select value={item.category}
                            onChange={(e) => updateItem(i, 'category', e.target.value)}
                            className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-green-600 mb-1.5">
                            <option value="">Select category</option>
                            {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                          </select>
                          <div className="flex items-center gap-2">
                            <input type="number" min="0" step="100" value={item.allocatedAmount || ''}
                              onChange={(e) => updateItem(i, 'allocatedAmount', parseFloat(e.target.value) || 0)}
                              className="w-full text-sm border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-600"
                              placeholder="Amount" />
                            <label className="flex items-center gap-1 text-xs text-gray-400 whitespace-nowrap">
                              <input type="checkbox" checked={item.isPreDeduction}
                                onChange={(e) => updateItem(i, 'isPreDeduction', e.target.checked)}
                                className="rounded" />
                              Pre-ded.
                            </label>
                          </div>
                        </div>
                        <button onClick={() => removeItem(i)} className="text-gray-300 hover:text-red-400 transition-colors p-1 shrink-0">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-3 border-t border-gray-100 flex gap-2">
                    <button onClick={addItem}
                      className="flex items-center gap-1.5 text-sm text-green-700 hover:text-green-800 font-medium transition-colors">
                      <Plus className="w-3.5 h-3.5" />Add row
                    </button>
                  </div>
                  {saveError && <p className="px-4 pb-3 text-sm text-red-600">{saveError}</p>}
                  <div className="px-4 pb-4 flex gap-2">
                    <button onClick={() => saveMutation.mutate(editItems)} disabled={saveMutation.isPending}
                      className="flex-1 rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                      {saveMutation.isPending ? 'Saving…' : 'Save Budget'}
                    </button>
                    <button onClick={() => setIsEditing(false)}
                      className="px-4 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {/* View mode */}
                  {editItems.length === 0 ? (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
                      <p className="text-gray-400 text-sm mb-3">No budget set for this month</p>
                      <div className="flex justify-center gap-2 flex-wrap">
                        <button onClick={() => setIsEditing(true)}
                          className="text-sm bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition-colors">
                          Create budget
                        </button>
                        {prevBudget?.items && prevBudget.items.length > 0 && (
                          <button onClick={() => copyMutation.mutate()}
                            disabled={copyMutation.isPending}
                            className="flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors">
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? 'Copied!' : 'Copy from last month'}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                      {/* Pre-deduction section */}
                      {editItems.some((i) => i.isPreDeduction) && (
                        <div className="border-b border-gray-100">
                          <p className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-gray-400 bg-gray-50">Pre-deductions</p>
                          {editItems.filter((i) => i.isPreDeduction).map((item, i) => (
                            <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                              <p className="text-sm text-gray-700">{item.category}</p>
                              <p className="text-sm font-semibold text-gray-900">{kes(item.allocatedAmount)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Post-deduction section */}
                      {editItems.filter((i) => !i.isPreDeduction).map((item, i) => (
                        <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-gray-50 last:border-0">
                          <p className="text-sm text-gray-700">{item.category}</p>
                          <p className="text-sm font-semibold text-gray-900">{kes(item.allocatedAmount)}</p>
                        </div>
                      ))}
                      <div className="flex gap-2 px-4 py-3 border-t border-gray-100">
                        <button onClick={() => setIsEditing(true)}
                          className="text-sm text-green-700 hover:text-green-800 font-medium transition-colors">
                          Edit
                        </button>
                        {prevBudget?.items && prevBudget.items.length > 0 && (
                          <button onClick={() => copyMutation.mutate()} disabled={copyMutation.isPending}
                            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 transition-colors ml-3">
                            <Copy className="w-3.5 h-3.5" />
                            {copied ? 'Copied!' : 'Copy from last month'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* 50/30/20 quick fill */}
                  <button onClick={handleQuickFill}
                    className="mt-3 w-full text-xs text-gray-400 hover:text-gray-600 py-2 transition-colors">
                    Apply 50/30/20 quick allocation
                  </button>
                </>
              )}
            </>
          )}
        </>
      )}

      {/* --- VS ACTUAL TAB --- */}
      {activeTab === 'vs-actual' && (
        <>
          {vsError ? (
            <ErrorState message="Failed to load vs-actual data." onRetry={refetchVs} />
          ) : vsLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="bg-white rounded-xl border border-gray-100 h-16 animate-pulse" />
              ))}
            </div>
          ) : vsActual ? (
            <>
              {/* Summary */}
              <div className="grid grid-cols-3 gap-3 mb-5">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Budgeted</p>
                  <p className="text-lg font-bold text-blue-800 mt-0.5">{kes(vsActual.totalBudgeted)}</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Spent</p>
                  <p className="text-lg font-bold text-gray-900 mt-0.5">{kes(vsActual.totalActual)}</p>
                </div>
                <div className={`rounded-xl p-3 ${vsActual.totalVariance >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className={`text-xs font-semibold uppercase tracking-wider ${vsActual.totalVariance >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {vsActual.totalVariance >= 0 ? 'Under' : 'Over'}
                  </p>
                  <p className={`text-lg font-bold mt-0.5 ${vsActual.totalVariance >= 0 ? 'text-green-800' : 'text-red-700'}`}>
                    {kes(Math.abs(vsActual.totalVariance))}
                  </p>
                </div>
              </div>

              {/* Category breakdown */}
              {vsActual.items.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-10 text-center">
                  <p className="text-gray-400 text-sm">No transactions or budget items this month</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                  {vsActual.items.map((item, i) => {
                    const bar = pct(item.actual, item.allocated)
                    const over = item.actual > item.allocated && item.allocated > 0
                    return (
                      <div key={i} className="px-4 py-3 border-b border-gray-50 last:border-0">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm text-gray-700">{item.category}</p>
                          <div className="text-right">
                            <span className={`text-sm font-semibold ${over ? 'text-red-600' : 'text-gray-900'}`}>
                              {kes(item.actual)}
                            </span>
                            {item.allocated > 0 && (
                              <span className="text-xs text-gray-400"> / {kes(item.allocated)}</span>
                            )}
                          </div>
                        </div>
                        {item.allocated > 0 && bar !== null && (
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${over ? 'bg-red-400' : 'bg-green-500'}`}
                              style={{ width: `${bar}%` }}
                            />
                          </div>
                        )}
                        {item.allocated === 0 && (
                          <p className="text-xs text-amber-500 mt-0.5">Unbudgeted spend</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : null}
        </>
      )}
    </div>
  )
}
