'use client'

import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, Info } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { Alert, DashboardSnapshot, PaginatedTransactions } from '@/lib/types'

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function kes(n: number | string) {
  return 'KES ' + Math.abs(Number(n)).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function Delta({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) return null
  const positive = value > 0
  const good = invert ? !positive : positive
  return (
    <p className={`text-xs mt-1 ${good ? 'text-green-500' : 'text-red-400'}`}>
      {positive ? '↑' : '↓'} {kes(value)} vs last month
    </p>
  )
}

function StatCard({
  label,
  value,
  variant,
  delta,
  deltaInvert = false,
}: {
  label: string
  value: number
  variant: 'green' | 'red' | 'auto'
  delta?: number
  deltaInvert?: boolean
}) {
  const isNeg = value < 0
  const color = variant === 'auto' ? (isNeg ? 'red' : 'green') : variant
  return (
    <div className={`rounded-xl p-4 ${color === 'green' ? 'bg-green-50' : 'bg-red-50'}`}>
      <p className={`text-xs font-semibold uppercase tracking-wider ${color === 'green' ? 'text-green-600' : 'text-red-500'}`}>
        {label}
      </p>
      <p className={`text-xl font-bold mt-1 ${color === 'green' ? 'text-green-800' : 'text-red-700'}`}>
        {isNeg && variant === 'auto' ? '−' : ''}{kes(value)}
      </p>
      {delta !== undefined && <Delta value={delta} invert={deltaInvert} />}
    </div>
  )
}

export default function DashboardPage() {
  const now = new Date()
  const month = now.getMonth() + 1
  const year = now.getFullYear()

  const {
    data: snap,
    isLoading: snapLoading,
    isError: snapError,
    refetch: refetchSnap,
  } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSnapshot>('/dashboard').then((r) => r.data),
  })

  const { data: txns, isLoading: txnsLoading, isError: txnsError, refetch: refetchTxns } = useQuery({
    queryKey: ['transactions', 'recent'],
    queryFn: () =>
      api.get<PaginatedTransactions>('/transactions', { params: { limit: 5, page: 1 } }).then((r) => r.data),
  })

  const { data: alerts = [] } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => api.get<Alert[]>('/dashboard/alerts').then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  })

  const income = Number(snap?.currentMonth.income ?? 0)
  const expense = Number(snap?.currentMonth.expense ?? 0)
  const net = Number(snap?.currentMonth.net ?? 0)
  const totalDebt = Number(snap?.totalDebt ?? 0)
  const totalInvestments = Number(snap?.totalInvestments ?? 0)
  const totalReceivables = Number(snap?.totalReceivables ?? 0)
  const totalManualAssets = Number(snap?.totalManualAssets ?? 0)
  const monthlyInsuranceCost = Number(snap?.monthlyInsuranceCost ?? 0)
  const netWorth = Number(snap?.netWorth ?? 0)
  const netWorthChange = Number(snap?.netWorthChange ?? 0)

  const incomeDelta = snap ? Number(snap.currentMonth.income) - Number(snap.lastMonth.income) : undefined
  const expenseDelta = snap ? Number(snap.currentMonth.expense) - Number(snap.lastMonth.expense) : undefined
  const netDelta = snap ? Number(snap.currentMonth.net) - Number(snap.lastMonth.net) : undefined

  const warnings = alerts.filter((a) => a.severity === 'warning')
  const infos = alerts.filter((a) => a.severity === 'info')

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-sm text-gray-400 mt-0.5">{MONTHS[month - 1]} {year}</p>
      </div>

      {/* Alerts banner */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-5">
          {warnings.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-amber-800">{alert.title}</p>
                <p className="text-xs text-amber-600 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
          {infos.map((alert, i) => (
            <div key={i} className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-blue-800">{alert.title}</p>
                <p className="text-xs text-blue-500 mt-0.5">{alert.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Net Worth hero + stat cards */}
      {snapError ? (
        <ErrorState message="Failed to load dashboard data." onRetry={refetchSnap} />
      ) : snapLoading ? (
        <>
          <div className="rounded-xl bg-gray-100 animate-pulse h-24 mb-4" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-gray-100 animate-pulse h-20" />
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Net Worth</p>
            <p className={`text-3xl font-bold mt-1 ${netWorth >= 0 ? 'text-gray-900' : 'text-red-700'}`}>
              {netWorth < 0 ? '−' : ''}{kes(netWorth)}
            </p>
            {netWorthChange !== 0 && (
              <p className={`text-sm mt-1 ${netWorthChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                {netWorthChange >= 0 ? '↑' : '↓'} {kes(netWorthChange)} this month
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
            <StatCard label="Income" value={income} variant="green" delta={incomeDelta} />
            <StatCard label="Expenses" value={expense} variant="red" delta={expenseDelta} deltaInvert />
            <StatCard label="Net Savings" value={net} variant="auto" delta={netDelta} />
            <StatCard label="Total Debt" value={totalDebt} variant="red" />
          </div>

          {/* Portfolio strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-600">Investments</p>
              <p className="text-lg font-bold text-blue-800 mt-1">{kes(totalInvestments)}</p>
            </div>
            {totalReceivables > 0 && (
              <div className="bg-amber-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-amber-600">Receivables</p>
                <p className="text-lg font-bold text-amber-800 mt-1">{kes(totalReceivables)}</p>
              </div>
            )}
            {totalManualAssets > 0 && (
              <div className="bg-purple-50 rounded-xl p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-purple-600">Assets</p>
                <p className="text-lg font-bold text-purple-800 mt-1">{kes(totalManualAssets)}</p>
              </div>
            )}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Insurance/mo</p>
              <p className="text-lg font-bold text-gray-900 mt-1">{kes(monthlyInsuranceCost)}</p>
            </div>
          </div>
        </>
      )}

      {/* Recent transactions */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 text-sm">Recent Transactions</h3>
          <a href="/transactions" className="text-xs text-green-700 hover:underline font-medium">
            View all
          </a>
        </div>

        {txnsError ? (
          <ErrorState message="Failed to load recent transactions." onRetry={refetchTxns} />
        ) : txnsLoading ? (
          <div className="divide-y divide-gray-50">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex items-center gap-3">
                <div className="flex-1 h-4 bg-gray-100 rounded animate-pulse" />
                <div className="w-20 h-4 bg-gray-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : txns?.data.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-10">No transactions yet</p>
        ) : (
          <div className="divide-y divide-gray-50">
            {txns?.data.map((tx) => (
              <div key={tx.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{tx.category}</p>
                  {tx.description && (
                    <p className="text-xs text-gray-400 truncate max-w-45">{tx.description}</p>
                  )}
                  <p className="text-xs text-gray-400">{tx.date}</p>
                </div>
                <span className={`text-sm font-semibold tabular-nums ${tx.type === 'INCOME' ? 'text-green-600' : 'text-red-500'}`}>
                  {tx.type === 'INCOME' ? '+' : '−'}{kes(tx.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
