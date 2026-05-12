'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { AnnualTrends } from '@/lib/types'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function kes(n: number) {
  if (Math.abs(n) >= 1_000_000) return 'KES ' + (n / 1_000_000).toFixed(1) + 'M'
  if (Math.abs(n) >= 1_000) return 'KES ' + (n / 1_000).toFixed(0) + 'K'
  return 'KES ' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function LineChart({ data }: { data: AnnualTrends['months'] }) {
  const W = 620
  const H = 220
  const PAD = { top: 16, right: 16, bottom: 32, left: 56 }
  const chartW = W - PAD.left - PAD.right
  const chartH = H - PAD.top - PAD.bottom

  const allVals = data.flatMap((d) => [d.income, d.expense, d.net])
  const maxY = Math.max(...allVals, 0)
  const minY = Math.min(...allVals, 0)
  const range = maxY - minY || 1

  const xOf = (i: number) => PAD.left + (i / (data.length - 1 || 1)) * chartW
  const yOf = (v: number) => PAD.top + ((maxY - v) / range) * chartH
  const zeroY = yOf(0)

  function polyline(getter: (d: typeof data[0]) => number, color: string, dash?: string) {
    const pts = data.map((d, i) => `${xOf(i)},${yOf(getter(d))}`).join(' ')
    return (
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    )
  }

  const yTicks = 4
  const tickStep = range / yTicks

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 220 }}>
      {/* Y grid + labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const val = maxY - i * tickStep
        const y = yOf(val)
        return (
          <g key={i}>
            <line x1={PAD.left} y1={y} x2={W - PAD.right} y2={y} stroke="#f3f4f6" strokeWidth={1} />
            <text x={PAD.left - 6} y={y + 4} textAnchor="end" fontSize={10} fill="#9ca3af">
              {kes(val)}
            </text>
          </g>
        )
      })}

      {/* Zero line */}
      {minY < 0 && (
        <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY} stroke="#d1d5db" strokeWidth={1} strokeDasharray="4 2" />
      )}

      {/* Lines */}
      {polyline((d) => d.income, '#16a34a')}
      {polyline((d) => d.expense, '#ef4444')}
      {polyline((d) => d.net, '#6b7280', '6 3')}

      {/* X labels */}
      {data.map((d, i) => (
        <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={10} fill="#9ca3af">
          {MONTHS_SHORT[d.month - 1]}
        </text>
      ))}

      {/* Dots */}
      {data.map((d, i) => (
        <g key={i}>
          <circle cx={xOf(i)} cy={yOf(d.income)} r={3} fill="#16a34a" />
          <circle cx={xOf(i)} cy={yOf(d.expense)} r={3} fill="#ef4444" />
          <circle cx={xOf(i)} cy={yOf(d.net)} r={3} fill="#6b7280" />
        </g>
      ))}
    </svg>
  )
}

export default function TrendsPage() {
  const now = new Date()
  const [year, setYear] = useState(now.getFullYear())

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['annual-trends', year],
    queryFn: () => api.get<AnnualTrends>(`/dashboard/annual-trends?year=${year}`).then((r) => r.data),
  })

  const months = data?.months ?? []
  const totalIncome = months.reduce((s, m) => s + m.income, 0)
  const totalExpense = months.reduce((s, m) => s + m.expense, 0)
  const totalNet = totalIncome - totalExpense
  const bestMonth = [...months].sort((a, b) => b.net - a.net)[0]
  const worstMonth = [...months].filter((m) => m.income > 0 || m.expense > 0).sort((a, b) => a.net - b.net)[0]

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Annual Trends</h2>
          <p className="text-sm text-gray-400 mt-0.5">12-month income & spending overview</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setYear((y) => y - 1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-gray-700 w-12 text-center">{year}</span>
          <button onClick={() => setYear((y) => y + 1)} disabled={year >= now.getFullYear()} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 disabled:opacity-30 transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isError ? (
        <ErrorState message="Failed to load annual trends." onRetry={refetch} />
      ) : isLoading ? (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 h-56 animate-pulse" />
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-20 animate-pulse" />
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Legend */}
          <div className="flex items-center gap-5 mb-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-green-600 rounded" />Income</span>
            <span className="flex items-center gap-1.5"><span className="inline-block w-3 h-0.5 bg-red-500 rounded" />Expenses</span>
            <span className="flex items-center gap-1.5 opacity-70"><span className="inline-block w-3 h-0.5 bg-gray-500 rounded" style={{ borderTop: '2px dashed #6b7280' }} />Net</span>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-5">
            {months.length > 0 ? (
              <LineChart data={months} />
            ) : (
              <div className="h-52 flex items-center justify-center text-gray-400 text-sm">No data for {year}</div>
            )}
          </div>

          {/* Annual summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-green-600">Total Income</p>
              <p className="text-lg font-bold text-green-800 mt-0.5">{kes(totalIncome)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-red-500">Total Expenses</p>
              <p className="text-lg font-bold text-red-700 mt-0.5">{kes(totalExpense)}</p>
            </div>
            <div className={`rounded-xl p-4 ${totalNet >= 0 ? 'bg-gray-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${totalNet >= 0 ? 'text-gray-500' : 'text-red-500'}`}>Net Saved</p>
              <p className={`text-lg font-bold mt-0.5 ${totalNet >= 0 ? 'text-gray-900' : 'text-red-700'}`}>{kes(totalNet)}</p>
            </div>
          </div>

          {/* Best/worst month */}
          {(bestMonth || worstMonth) && (
            <div className="grid grid-cols-2 gap-3 mb-5">
              {bestMonth && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Best month</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{MONTHS_SHORT[bestMonth.month - 1]}</p>
                  <p className="text-xs text-green-600 mt-0.5">Net: {kes(bestMonth.net)}</p>
                </div>
              )}
              {worstMonth && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Worst month</p>
                  <p className="text-sm font-bold text-gray-900 mt-1">{MONTHS_SHORT[worstMonth.month - 1]}</p>
                  <p className={`text-xs mt-0.5 ${worstMonth.net < 0 ? 'text-red-500' : 'text-gray-500'}`}>Net: {kes(worstMonth.net)}</p>
                </div>
              )}
            </div>
          )}

          {/* Month-by-month table */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-sm font-semibold text-gray-900">Month by Month</p>
            </div>
            <div className="divide-y divide-gray-50">
              {months.map((m) => {
                const hasData = m.income > 0 || m.expense > 0
                return (
                  <div key={m.month} className={`grid grid-cols-4 px-4 py-3 text-sm ${!hasData ? 'opacity-40' : ''}`}>
                    <span className="text-gray-500 font-medium">{MONTHS_SHORT[m.month - 1]}</span>
                    <span className="text-green-700 tabular-nums">{hasData ? kes(m.income) : '—'}</span>
                    <span className="text-red-500 tabular-nums">{hasData ? kes(m.expense) : '—'}</span>
                    <span className={`font-semibold tabular-nums ${m.net >= 0 ? 'text-gray-700' : 'text-red-600'}`}>
                      {hasData ? (m.net >= 0 ? '+' : '−') + kes(Math.abs(m.net)) : '—'}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="grid grid-cols-4 px-4 py-3 bg-gray-50 text-sm font-semibold border-t border-gray-100">
              <span className="text-gray-700">Total</span>
              <span className="text-green-700 tabular-nums">{kes(totalIncome)}</span>
              <span className="text-red-500 tabular-nums">{kes(totalExpense)}</span>
              <span className={`tabular-nums ${totalNet >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                {totalNet >= 0 ? '+' : '−'}{kes(Math.abs(totalNet))}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
