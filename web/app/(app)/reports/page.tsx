'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { FileBarChart2, ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { PaginatedTransactions } from '@/lib/types'

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

function kes(n: number) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function ReportsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  const startDate = `${year}-01-01`
  const endDate = `${year}-12-31`

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['report-transactions', year],
    queryFn: () =>
      api
        .get<PaginatedTransactions>('/transactions', {
          params: { startDate, endDate, limit: 2000 },
        })
        .then((r) => r.data),
  })

  const transactions = data?.data ?? []

  // Aggregate by category
  const incomeByCategory: Record<string, number> = {}
  const expenseByCategory: Record<string, number> = {}
  const byMonth: Record<number, { income: number; expense: number }> = {}

  for (const tx of transactions) {
    const month = new Date(tx.date).getMonth() // 0-based
    if (!byMonth[month]) byMonth[month] = { income: 0, expense: 0 }
    if (tx.type === 'INCOME') {
      incomeByCategory[tx.category] = (incomeByCategory[tx.category] ?? 0) + Number(tx.amount)
      byMonth[month].income += Number(tx.amount)
    } else if (tx.type === 'EXPENSE') {
      expenseByCategory[tx.category] = (expenseByCategory[tx.category] ?? 0) + Number(tx.amount)
      byMonth[month].expense += Number(tx.amount)
    }
  }

  const totalIncome = Object.values(incomeByCategory).reduce((s, v) => s + v, 0)
  const totalExpense = Object.values(expenseByCategory).reduce((s, v) => s + v, 0)
  const net = totalIncome - totalExpense
  const savingsRate = totalIncome > 0 ? (net / totalIncome) * 100 : 0

  const incomeCats = Object.entries(incomeByCategory).sort((a, b) => b[1] - a[1])
  const expenseCats = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1])

  const barCls = 'h-2 rounded-full transition-all'

  return (
    <div className="p-4 lg:p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">P&amp;L Report</h2>
          <p className="text-sm text-gray-400 mt-0.5">Income &amp; expense breakdown for {year}</p>
        </div>
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-1.5">
          <button
            onClick={() => setYear((y) => y - 1)}
            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold text-gray-800 w-12 text-center">{year}</span>
          <button
            onClick={() => setYear((y) => y + 1)}
            disabled={year >= now.getFullYear()}
            className="p-1 hover:bg-gray-100 rounded transition-colors text-gray-500 disabled:opacity-30"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isError ? (
        <ErrorState message="Failed to load transactions." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
          <FileBarChart2 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No transactions recorded for {year}.</p>
        </div>
      ) : (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Total Income</p>
              <p className="text-lg font-bold text-green-800 mt-1">{kes(totalIncome)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Total Expenses</p>
              <p className="text-lg font-bold text-red-700 mt-1">{kes(totalExpense)}</p>
            </div>
            <div className={`rounded-xl p-4 ${net >= 0 ? 'bg-blue-50' : 'bg-orange-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${net >= 0 ? 'text-blue-600' : 'text-orange-500'}`}>
                Net {net >= 0 ? 'Surplus' : 'Deficit'}
              </p>
              <p className={`text-lg font-bold mt-1 ${net >= 0 ? 'text-blue-800' : 'text-orange-700'}`}>
                {net >= 0 ? '' : '−'}{kes(Math.abs(net))}
              </p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Savings Rate</p>
              <p className={`text-lg font-bold mt-1 ${savingsRate >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                {savingsRate.toFixed(1)}%
              </p>
            </div>
          </div>

          {/* Category breakdowns */}
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            {/* Income */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Income by Category</p>
              {incomeCats.length === 0 ? (
                <p className="text-sm text-gray-300">No income recorded.</p>
              ) : (
                <div className="space-y-3">
                  {incomeCats.map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium truncate mr-2">{cat}</span>
                        <span className="text-gray-400 tabular-nums shrink-0">
                          {kes(amount)} · {totalIncome > 0 ? ((amount / totalIncome) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div
                          className={`${barCls} bg-green-500`}
                          style={{ width: `${totalIncome > 0 ? (amount / totalIncome) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Expenses */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-4">Expenses by Category</p>
              {expenseCats.length === 0 ? (
                <p className="text-sm text-gray-300">No expenses recorded.</p>
              ) : (
                <div className="space-y-3">
                  {expenseCats.map(([cat, amount]) => (
                    <div key={cat}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-gray-700 font-medium truncate mr-2">{cat}</span>
                        <span className="text-gray-400 tabular-nums shrink-0">
                          {kes(amount)} · {totalExpense > 0 ? ((amount / totalExpense) * 100).toFixed(1) : 0}%
                        </span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div
                          className={`${barCls} bg-red-400`}
                          style={{ width: `${totalExpense > 0 ? (amount / totalExpense) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-50">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Monthly Summary</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-gray-400">Month</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-green-600">Income</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-red-500">Expenses</th>
                    <th className="text-right px-5 py-3 text-xs font-semibold text-gray-400">Net</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {MONTHS.map((m, i) => {
                    const row = byMonth[i] ?? { income: 0, expense: 0 }
                    const rowNet = row.income - row.expense
                    const hasData = row.income > 0 || row.expense > 0
                    return (
                      <tr key={m} className={hasData ? '' : 'opacity-30'}>
                        <td className="px-5 py-3 text-gray-700 font-medium">{m} {year}</td>
                        <td className="px-5 py-3 text-right text-green-600 tabular-nums">{row.income > 0 ? kes(row.income) : '—'}</td>
                        <td className="px-5 py-3 text-right text-red-500 tabular-nums">{row.expense > 0 ? kes(row.expense) : '—'}</td>
                        <td className={`px-5 py-3 text-right tabular-nums font-medium ${rowNet >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                          {hasData ? `${rowNet >= 0 ? '+' : ''}${kes(rowNet)}` : '—'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
                <tfoot className="border-t-2 border-gray-100 bg-gray-50">
                  <tr>
                    <td className="px-5 py-3 text-xs font-bold text-gray-600 uppercase tracking-wider">Total</td>
                    <td className="px-5 py-3 text-right font-bold text-green-700 tabular-nums">{kes(totalIncome)}</td>
                    <td className="px-5 py-3 text-right font-bold text-red-600 tabular-nums">{kes(totalExpense)}</td>
                    <td className={`px-5 py-3 text-right font-bold tabular-nums ${net >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {net >= 0 ? '+' : ''}{kes(net)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
