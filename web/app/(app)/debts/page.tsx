'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, X, Banknote, Pencil, ChevronDown } from 'lucide-react'
import { api } from '@/lib/api'
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { ErrorState } from '@/components/ErrorState'
import type { Account, Debt, CreateDebtRequest, InterestType, DeductionMethod } from '@/lib/types'

const DEBT_TYPES = [
  'BANK_LOAN', 'SACCO', 'CREDIT_CARD', 'PERSONAL', 'MORTGAGE',
  'MOBILE_LOAN', 'DEVICE_FINANCE', 'STUDENT_LOAN', 'CHAMA', 'SUPPLIER_CREDIT', 'OTHER',
]

const DEBT_TYPE_LABELS: Record<string, string> = {
  BANK_LOAN: 'Bank Loan', SACCO: 'SACCO', CREDIT_CARD: 'Credit Card',
  PERSONAL: 'Personal', MORTGAGE: 'Mortgage', MOBILE_LOAN: 'Mobile Loan',
  DEVICE_FINANCE: 'Device Finance', STUDENT_LOAN: 'Student Loan',
  CHAMA: 'Chama', SUPPLIER_CREDIT: 'Supplier Credit', OTHER: 'Other',
}

const INTEREST_TYPES: { value: InterestType; label: string; hint: string }[] = [
  { value: 'REDUCING_BALANCE', label: 'Reducing Balance', hint: 'Interest on outstanding balance' },
  { value: 'FLAT_RATE', label: 'Flat Rate', hint: 'Interest on original principal' },
  { value: 'DAILY_ACCRUAL', label: 'Daily Accrual', hint: 'Daily rate × 30 days' },
  { value: 'NONE', label: 'No Interest', hint: 'Informal / interest-free' },
]

const DEDUCTION_METHODS: { value: DeductionMethod; label: string }[] = [
  { value: 'MANUAL', label: 'Manual' },
  { value: 'SALARY_DEDUCTION', label: 'Salary Deduction' },
  { value: 'STANDING_ORDER', label: 'Standing Order' },
  { value: 'AUTO_DEBIT', label: 'Auto Debit' },
]

const DEDUCTION_COLORS: Record<DeductionMethod, string> = {
  MANUAL: 'bg-gray-100 text-gray-500',
  SALARY_DEDUCTION: 'bg-blue-50 text-blue-600',
  STANDING_ORDER: 'bg-purple-50 text-purple-600',
  AUTO_DEBIT: 'bg-amber-50 text-amber-600',
}

const INTEREST_COLORS: Record<InterestType, string> = {
  REDUCING_BALANCE: 'bg-green-50 text-green-700',
  FLAT_RATE: 'bg-orange-50 text-orange-700',
  DAILY_ACCRUAL: 'bg-red-50 text-red-600',
  NONE: 'bg-gray-100 text-gray-500',
}

function kes(n: number | string) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function pct(n: number | string) {
  return Number(n).toFixed(1) + '%'
}

function monthsToLabel(months: number): string {
  if (months <= 0) return 'Paid off'
  if (months < 1) return 'Less than 1 month'
  const y = Math.floor(months / 12)
  const m = Math.round(months % 12)
  if (y === 0) return `${m} mo`
  if (m === 0) return `${y} yr`
  return `${y} yr ${m} mo`
}

function debtFreeDate(months: number): string {
  if (months <= 0) return 'Now'
  const d = new Date()
  d.setMonth(d.getMonth() + Math.round(months))
  return d.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' })
}

const today = new Date().toISOString().split('T')[0]

type FormState = CreateDebtRequest & { currentBalanceStr: string }

const EMPTY_FORM: FormState = {
  name: '',
  type: '',
  originalAmount: 0,
  currentBalance: 0,
  currentBalanceStr: '',
  interestRate: 0,
  interestType: 'REDUCING_BALANCE',
  deductionMethod: 'MANUAL',
  lenderType: '',
  minimumPayment: undefined,
  dueDate: undefined,
  startDate: today,
  endDate: undefined,
}

function debtToForm(debt: Debt): FormState {
  return {
    name: debt.name,
    type: debt.type,
    originalAmount: Number(debt.originalAmount),
    currentBalance: Number(debt.currentBalance),
    currentBalanceStr: String(Number(debt.currentBalance)),
    interestRate: Number(debt.interestRate),
    interestType: debt.interestType ?? 'REDUCING_BALANCE',
    deductionMethod: debt.deductionMethod ?? 'MANUAL',
    lenderType: debt.lenderType ?? '',
    minimumPayment: debt.minimumPayment != null ? Number(debt.minimumPayment) : undefined,
    dueDate: debt.dueDate != null ? Number(debt.dueDate) : undefined,
    startDate: debt.startDate,
    endDate: debt.endDate ?? undefined,
  }
}

export default function DebtsPage() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [formError, setFormError] = useState('')
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [paymentDebt, setPaymentDebt] = useState<Debt | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentAccountId, setPaymentAccountId] = useState('')
  const [paymentError, setPaymentError] = useState('')
  const [extraPaymentDebt, setExtraPaymentDebt] = useState<Debt | null>(null)
  const [extraAmount, setExtraAmount] = useState('')
  const [extraError, setExtraError] = useState('')
  const [showPaidOff, setShowPaidOff] = useState(false)

  const { data: debts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts').then((r) => r.data),
  })

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data),
  })

  const addMutation = useMutation({
    mutationFn: (req: CreateDebtRequest) => api.post('/debts', req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to save debt. Please try again.'),
  })

  const editMutation = useMutation({
    mutationFn: ({ id, req }: { id: string; req: Partial<CreateDebtRequest> }) =>
      api.patch(`/debts/${id}`, req).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeForm() },
    onError: () => setFormError('Failed to update debt. Please try again.'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/debts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setPendingDeleteId(null) },
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id, amount, accountId }: { id: string; amount: number; accountId?: string }) =>
      api.post<Debt>(`/debts/${id}/payment`, { amount, ...(accountId ? { accountId } : {}) }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
      qc.invalidateQueries({ queryKey: ['accounts'] })
      setPaymentDebt(null); setPaymentAmount(''); setPaymentAccountId(''); setPaymentError('')
    },
    onError: () => setPaymentError('Payment failed. Please try again.'),
  })

  const confirmDeductionMutation = useMutation({
    mutationFn: (id: string) => api.post<Debt>(`/debts/${id}/confirm-deduction`).then((r) => r.data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }) },
  })

  const extraPaymentMutation = useMutation({
    mutationFn: ({ id, amount }: { id: string; amount: number }) =>
      api.post<Debt>(`/debts/${id}/payment`, { amount }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['debts'] }); qc.invalidateQueries({ queryKey: ['dashboard'] })
      setExtraPaymentDebt(null); setExtraAmount(''); setExtraError('')
    },
    onError: () => setExtraError('Extra payment failed. Please try again.'),
  })

  const activeDebts = debts.filter((d) => !d.isPaidOff)
  const paidOffDebts = debts.filter((d) => d.isPaidOff)
  const totalDebt = activeDebts.reduce((s, d) => s + Number(d.currentBalance), 0)
  const salaryDeductionTotal = activeDebts
    .filter((d) => d.deductionMethod === 'SALARY_DEDUCTION')
    .reduce((s, d) => s + Number(d.minimumPayment ?? 0), 0)

  const canSubmit = form.name && form.type && form.originalAmount > 0 && form.startDate
  const isPending = editingId ? editMutation.isPending : addMutation.isPending
  const pendingDeleteDebt = debts.find((d) => d.id === pendingDeleteId)

  function closeForm() {
    setShowForm(false); setForm(EMPTY_FORM); setEditingId(null); setFormError('')
  }

  function handleEdit(debt: Debt) {
    setForm(debtToForm(debt)); setEditingId(debt.id); setFormError(''); setShowForm(true)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSubmit) return
    setFormError('')
    const { currentBalanceStr, ...rest } = form
    const payload = {
      ...rest,
      currentBalance: rest.currentBalance || rest.originalAmount,
      lenderType: rest.lenderType || undefined,
    }
    if (editingId) editMutation.mutate({ id: editingId, req: payload })
    else addMutation.mutate(payload)
  }

  function handlePaymentSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!paymentDebt || !paymentAmount) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) return
    setPaymentError('')
    paymentMutation.mutate({ id: paymentDebt.id, amount, accountId: paymentAccountId || undefined })
  }

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Debts</h2>
          <p className="text-sm text-gray-400 mt-0.5">{activeDebts.length} active debts</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-800 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Add debt</span>
        </button>
      </div>

      {/* Summary */}
      {(() => {
        const debtFreeMonths = (() => {
          if (activeDebts.length === 0) return null
          const debtsWithPayments = activeDebts.filter((d) => d.minimumPayment && Number(d.minimumPayment) > 0)
          if (debtsWithPayments.length === 0) return null
          return Math.max(...debtsWithPayments.map((d) => Number(d.currentBalance) / Number(d.minimumPayment)))
        })()
        return (
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Total Outstanding</p>
              <p className="text-2xl font-bold text-red-700 mt-1">{kes(totalDebt)}</p>
              {debtFreeMonths !== null && (
                <p className="text-xs text-red-400 mt-1">Debt-free by {debtFreeDate(debtFreeMonths)}</p>
              )}
            </div>
            {salaryDeductionTotal > 0 ? (
              <div className="bg-blue-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Salary Deductions/mo</p>
                <p className="text-xl font-bold text-blue-800 mt-1">{kes(salaryDeductionTotal)}</p>
              </div>
            ) : debtFreeMonths !== null ? (
              <div className="bg-gray-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Debt-free in</p>
                <p className="text-xl font-bold text-gray-700 mt-1">{monthsToLabel(debtFreeMonths)}</p>
              </div>
            ) : null}
          </div>
        )
      })()}

      {/* Debt list */}
      <div className="space-y-3">
        {isError ? (
          <ErrorState message="Failed to load debts." onRetry={refetch} />
        ) : isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 h-24 animate-pulse" />
          ))
        ) : activeDebts.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm py-12 text-center">
            <p className="text-gray-400 text-sm">No active debts</p>
          </div>
        ) : (
          activeDebts.map((debt) => (
            <div key={debt.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-gray-900 truncate">{debt.name}</p>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                      {DEBT_TYPE_LABELS[debt.type] ?? debt.type.replace('_', ' ')}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${INTEREST_COLORS[debt.interestType]}`}>
                      {INTEREST_TYPES.find((t) => t.value === debt.interestType)?.label ?? debt.interestType}
                    </span>
                    {debt.deductionMethod !== 'MANUAL' && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DEDUCTION_COLORS[debt.deductionMethod]}`}>
                        {DEDUCTION_METHODS.find((m) => m.value === debt.deductionMethod)?.label}
                      </span>
                    )}
                    {debt.lenderType && (
                      <span className="text-xs text-gray-400">{debt.lenderType}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {(debt.deductionMethod === 'MANUAL' || debt.deductionMethod === 'STANDING_ORDER') && (
                    <button
                      onClick={() => { setPaymentDebt(debt); setPaymentAmount(''); setPaymentAccountId(''); setPaymentError('') }}
                      className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 transition-colors rounded-lg px-3 py-1.5 text-xs font-medium"
                    >
                      <Banknote className="w-3.5 h-3.5" />
                      Pay
                    </button>
                  )}
                  <button onClick={() => handleEdit(debt)} className="text-gray-300 hover:text-blue-400 transition-colors p-1" aria-label="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setPendingDeleteId(debt.id)} className="text-gray-300 hover:text-red-400 transition-colors p-1" aria-label="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Auto-deduction action row */}
              {(debt.deductionMethod === 'SALARY_DEDUCTION' || debt.deductionMethod === 'AUTO_DEBIT') && (
                <div className="mt-3 flex items-center gap-2 flex-wrap">
                  <button
                    onClick={() => confirmDeductionMutation.mutate(debt.id)}
                    disabled={confirmDeductionMutation.isPending}
                    className="flex items-center gap-1.5 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                  >
                    <Banknote className="w-3.5 h-3.5" />
                    {confirmDeductionMutation.isPending ? 'Confirming…' : 'Confirm deduction'}
                  </button>
                  <button
                    onClick={() => { setExtraPaymentDebt(debt); setExtraAmount(''); setExtraError('') }}
                    className="flex items-center gap-1.5 bg-green-50 text-green-700 hover:bg-green-100 transition-colors rounded-lg px-3 py-1.5 text-xs font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Extra payment
                  </button>
                </div>
              )}

              <div className="mt-3 grid grid-cols-3 gap-x-4 text-sm">
                <div>
                  <span className="text-gray-400 text-xs">Balance</span>
                  <p className="font-semibold text-gray-900">{kes(debt.currentBalance)}</p>
                </div>
                <div>
                  <span className="text-gray-400 text-xs">Rate</span>
                  <p className="font-semibold text-gray-900">{pct(debt.interestRate)} p.a.</p>
                </div>
                {debt.minimumPayment != null && (
                  <div>
                    <span className="text-gray-400 text-xs">Min/mo</span>
                    <p className="font-medium text-gray-700">{kes(debt.minimumPayment)}</p>
                  </div>
                )}
              </div>

              {/* Progress bar + time to clear */}
              {(() => {
                const balance = Number(debt.currentBalance)
                const original = Number(debt.originalAmount)
                const paidPct = Math.round((1 - balance / original) * 100)
                const monthsLeft = debt.minimumPayment && Number(debt.minimumPayment) > 0
                  ? balance / Number(debt.minimumPayment)
                  : null
                return (
                  <div className="mt-3">
                    <div className="bg-gray-100 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-red-400 h-1.5 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (balance / original) * 100)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-gray-400">{paidPct}% paid off</p>
                      {monthsLeft !== null && (
                        <p className="text-xs text-gray-400">
                          Clear by <span className="font-medium text-gray-600">{debtFreeDate(monthsLeft)}</span>
                          {' '}({monthsToLabel(monthsLeft)})
                        </p>
                      )}
                    </div>
                  </div>
                )
              })()}
            </div>
          ))
        )}
      </div>

      {/* Paid-off debts */}
      {!isLoading && !isError && paidOffDebts.length > 0 && (
        <div className="mt-4">
          <button
            onClick={() => setShowPaidOff((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showPaidOff ? 'rotate-180' : ''}`} />
            {paidOffDebts.length} paid off
          </button>
          {showPaidOff && (
            <div className="space-y-2">
              {paidOffDebts.map((debt) => (
                <div key={debt.id} className="bg-white rounded-xl border border-gray-100 p-4 opacity-60">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-gray-900 text-sm truncate">{debt.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {DEBT_TYPE_LABELS[debt.type] ?? debt.type} · {kes(debt.originalAmount)}
                      </p>
                    </div>
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                      Paid off
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete debt?"
          message={
            pendingDeleteDebt
              ? `This will permanently delete "${pendingDeleteDebt.name}" with a balance of ${kes(pendingDeleteDebt.currentBalance)}.`
              : 'This action cannot be undone.'
          }
          confirmLabel={deleteMutation.isPending ? 'Deleting…' : 'Delete'}
          onConfirm={() => deleteMutation.mutate(pendingDeleteId)}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}

      {/* Make payment modal */}
      {paymentDebt && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Make Payment</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-56">{paymentDebt.name}</p>
              </div>
              <button onClick={() => setPaymentDebt(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handlePaymentSubmit} className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between text-sm">
                <span className="text-gray-500">Current balance</span>
                <span className="font-semibold text-gray-900">{kes(paymentDebt.currentBalance)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Payment amount (KES)</label>
                <input
                  type="number" min="0.01" step="0.01" max={Number(paymentDebt.currentBalance)}
                  value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder={paymentDebt.minimumPayment ? `Min. ${kes(paymentDebt.minimumPayment)}` : '0.00'}
                  autoFocus required
                />
              </div>
              {accounts.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pay from account (optional)</label>
                  <select
                    value={paymentAccountId}
                    onChange={(e) => setPaymentAccountId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white"
                  >
                    <option value="">— No account (manual tracking) —</option>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                  {paymentAccountId && (
                    <p className="text-xs text-gray-400 mt-1">This will deduct the payment from your account balance.</p>
                  )}
                </div>
              )}
              {paymentError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{paymentError}</p>}
              <button type="submit" disabled={paymentMutation.isPending || !paymentAmount}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {paymentMutation.isPending ? 'Processing…' : 'Confirm Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Extra payment modal (auto-deducted debts) */}
      {extraPaymentDebt && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div>
                <h3 className="font-semibold text-gray-900">Extra Payment</h3>
                <p className="text-xs text-gray-400 mt-0.5 truncate max-w-56">{extraPaymentDebt.name}</p>
              </div>
              <button onClick={() => setExtraPaymentDebt(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); const amt = parseFloat(extraAmount); if (!amt || amt <= 0) return; setExtraError(''); extraPaymentMutation.mutate({ id: extraPaymentDebt.id, amount: amt }) }}
              className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-lg px-4 py-3 flex justify-between text-sm">
                <span className="text-gray-500">Current balance</span>
                <span className="font-semibold text-gray-900">{kes(extraPaymentDebt.currentBalance)}</span>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Additional amount (KES)</label>
                <input
                  type="number" min="0.01" step="0.01" max={Number(extraPaymentDebt.currentBalance)}
                  value={extraAmount} onChange={(e) => setExtraAmount(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="0.00" autoFocus required
                />
              </div>
              {extraError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{extraError}</p>}
              <button type="submit" disabled={extraPaymentMutation.isPending || !extraAmount}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {extraPaymentMutation.isPending ? 'Processing…' : 'Confirm Extra Payment'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit debt panel */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
              <h3 className="font-semibold text-gray-900">{editingId ? 'Edit Debt' : 'Add Debt'}</h3>
              <button onClick={closeForm}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Debt name</label>
                <input type="text" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  placeholder="e.g. KCB Car Loan" required />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white" required>
                    <option value="">Select type</option>
                    {DEBT_TYPES.map((t) => <option key={t} value={t}>{DEBT_TYPE_LABELS[t]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lender (optional)</label>
                  <input type="text" value={form.lenderType ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, lenderType: e.target.value }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="e.g. Equity Bank" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest type</label>
                  <select value={form.interestType}
                    onChange={(e) => setForm((f) => ({ ...f, interestType: e.target.value as InterestType }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white">
                    {INTEREST_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {INTEREST_TYPES.find((t) => t.value === form.interestType)?.hint}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Payment method</label>
                  <select value={form.deductionMethod}
                    onChange={(e) => setForm((f) => ({ ...f, deductionMethod: e.target.value as DeductionMethod }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent bg-white">
                    {DEDUCTION_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Original amount</label>
                  <input type="number" min="0" value={form.originalAmount || ''}
                    onChange={(e) => setForm((f) => ({ ...f, originalAmount: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Current balance</label>
                  <input type="number" min="0" value={form.currentBalanceStr}
                    onChange={(e) => setForm((f) => ({ ...f, currentBalanceStr: e.target.value, currentBalance: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="Same as original" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Interest rate (% p.a.)</label>
                  <input type="number" min="0" step="0.01" value={form.interestRate || ''}
                    onChange={(e) => setForm((f) => ({ ...f, interestRate: parseFloat(e.target.value) || 0 }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="0.0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Min. payment/mo</label>
                  <input type="number" min="0" value={form.minimumPayment ?? ''}
                    onChange={(e) => setForm((f) => ({ ...f, minimumPayment: e.target.value ? parseFloat(e.target.value) : undefined }))}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                    placeholder="Optional" />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start date</label>
                <input type="date" value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                  required />
              </div>

              {form.deductionMethod === 'SALARY_DEDUCTION' && (
                <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
                  Salary deduction debts are excluded from the debt optimizer since they are handled automatically.
                </p>
              )}

              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{formError}</p>}

              <button type="submit" disabled={isPending || !canSubmit}
                className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors">
                {isPending ? (editingId ? 'Updating…' : 'Saving…') : (editingId ? 'Update Debt' : 'Save Debt')}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
