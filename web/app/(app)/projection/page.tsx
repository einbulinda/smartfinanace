'use client'

import { useState, useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { ChevronDown, TrendingUp } from 'lucide-react'
import { api } from '@/lib/api'
import type { ProjectionResult, ProjectionMonth } from '@/lib/types'

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const HORIZONS: (12 | 24 | 36 | 60)[] = [12, 24, 36, 60]

function kes(n: number) {
  const abs = Math.abs(n)
  if (abs >= 1_000_000) return (n < 0 ? '−' : '') + 'KES ' + (abs / 1_000_000).toFixed(1) + 'M'
  if (abs >= 1_000) return (n < 0 ? '−' : '') + 'KES ' + (abs / 1_000).toFixed(0) + 'K'
  return (n < 0 ? '−' : '') + 'KES ' + abs.toLocaleString()
}

function kesRaw(n: number) {
  return 'KES ' + Math.abs(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

// --- SVG Line Chart ---
function NetWorthChart({
  months,
  debtFreeMonths,
}: {
  months: ProjectionMonth[]
  debtFreeMonths: number | null
}) {
  if (months.length < 2) return null

  const W = 600, H = 200
  const PAD = { top: 16, right: 16, bottom: 36, left: 64 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const allVals = months.flatMap((m) => [m.netWorth, m.savings, 0])
  const rawMin = Math.min(...allVals)
  const rawMax = Math.max(...allVals)
  const padding = (rawMax - rawMin) * 0.08 || 1000
  const minY = rawMin - padding
  const maxY = rawMax + padding
  const range = maxY - minY

  const sx = (i: number) => PAD.left + (i / (months.length - 1)) * innerW
  const sy = (v: number) => PAD.top + ((maxY - v) / range) * innerH
  const zeroY = sy(0)

  const nwPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(m.netWorth).toFixed(1)}`).join(' ')
  const svPath = months.map((m, i) => `${i === 0 ? 'M' : 'L'}${sx(i).toFixed(1)},${sy(m.savings).toFixed(1)}`).join(' ')

  // X-axis ticks: first, every 6 months, last
  const xTickIndices = months.reduce<number[]>((acc, _, i) => {
    if (i === 0 || (i + 1) % 6 === 0 || i === months.length - 1) acc.push(i)
    return acc
  }, [])

  // Y-axis ticks: min, 0, max
  const yTicks = [rawMin, 0, rawMax].filter((v, i, arr) => arr.indexOf(v) === i)

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {/* Grid lines */}
      {yTicks.map((v) => (
        <line key={v} x1={PAD.left} y1={sy(v)} x2={W - PAD.right} y2={sy(v)}
          stroke="#f3f4f6" strokeWidth="1" />
      ))}

      {/* Zero line */}
      {rawMin < 0 && rawMax > 0 && (
        <line x1={PAD.left} y1={zeroY} x2={W - PAD.right} y2={zeroY}
          stroke="#e5e7eb" strokeWidth="1.5" strokeDasharray="4 3" />
      )}

      {/* Debt-free milestone */}
      {debtFreeMonths !== null && debtFreeMonths > 0 && debtFreeMonths <= months.length && (
        <>
          <line
            x1={sx(debtFreeMonths - 1)} y1={PAD.top}
            x2={sx(debtFreeMonths - 1)} y2={H - PAD.bottom}
            stroke="#16a34a" strokeWidth="1" strokeDasharray="3 3" opacity="0.5"
          />
          <text x={sx(debtFreeMonths - 1) + 4} y={PAD.top + 10}
            fontSize="8" fill="#16a34a" opacity="0.7">Debt free</text>
        </>
      )}

      {/* Savings line (dashed, gray) */}
      <path d={svPath} fill="none" stroke="#94a3b8" strokeWidth="1.5"
        strokeDasharray="5 3" strokeLinecap="round" />

      {/* Net worth line */}
      <path d={nwPath} fill="none" stroke="#16a34a" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" />

      {/* Y-axis labels */}
      {yTicks.map((v) => (
        <text key={v} x={PAD.left - 4} y={sy(v) + 3.5}
          textAnchor="end" fontSize="9" fill="#9ca3af">
          {kes(v)}
        </text>
      ))}

      {/* X-axis labels */}
      {xTickIndices.map((i) => (
        <text key={i} x={sx(i)} y={H - 6}
          textAnchor="middle" fontSize="9" fill="#9ca3af">
          {MONTHS_SHORT[months[i].month - 1]} {String(months[i].year).slice(2)}
        </text>
      ))}
    </svg>
  )
}

// --- Page ---
interface FormState {
  months: 12 | 24 | 36 | 60
  monthlyIncome: string
  monthlyExpense: string
}

export default function ProjectionPage() {
  const [form, setForm] = useState<FormState>({
    months: 12,
    monthlyIncome: '',
    monthlyExpense: '',
  })
  const [result, setResult] = useState<ProjectionResult | null>(null)
  const [showTable, setShowTable] = useState(false)

  const mutation = useMutation({
    mutationFn: (f: FormState) =>
      api.post<ProjectionResult>('/projection/forecast', {
        months: f.months,
        ...(f.monthlyIncome && { monthlyIncome: parseFloat(f.monthlyIncome) }),
        ...(f.monthlyExpense && { monthlyExpense: parseFloat(f.monthlyExpense) }),
      }).then((r) => r.data),
    onSuccess: (data) => {
      setResult(data)
      // Pre-fill form with actuals used on first load
      setForm((f) => ({
        ...f,
        monthlyIncome: f.monthlyIncome || String(data.inputs.monthlyIncome),
        monthlyExpense: f.monthlyExpense || String(data.inputs.monthlyExpense),
      }))
    },
  })

  // Auto-run on mount
  useEffect(() => {
    mutation.mutate(form)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    mutation.mutate(form)
  }

  const { summary, inputs, months } = result ?? {}
  const netWorthPositive = (summary?.projectedNetWorth ?? 0) >= 0

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Financial Projection</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Simulate your net worth trajectory based on current cash flow and debts
        </p>
      </div>

      {/* Input controls */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-5">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Horizon */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Projection horizon</label>
            <div className="flex gap-1.5">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, months: h }))}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg transition-colors ${
                    form.months === h
                      ? 'bg-green-700 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {h}mo
                </button>
              ))}
            </div>
          </div>

          {/* Income / Expense */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly income (KES)
              </label>
              <input
                type="number"
                min="0"
                value={form.monthlyIncome}
                onChange={(e) => setForm((f) => ({ ...f, monthlyIncome: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder={inputs ? String(inputs.monthlyIncome) : 'Last month actual'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monthly expenses (KES)
              </label>
              <input
                type="number"
                min="0"
                value={form.monthlyExpense}
                onChange={(e) => setForm((f) => ({ ...f, monthlyExpense: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
                placeholder={inputs ? String(inputs.monthlyExpense) : 'Last month actual'}
              />
            </div>
          </div>

          {mutation.error && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(mutation.error as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? 'Failed to run projection. Please try again.'}
            </p>
          )}

          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-lg bg-green-700 text-white py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
          >
            {mutation.isPending ? 'Calculating…' : 'Recalculate'}
          </button>
        </form>
      </div>

      {/* Results */}
      {mutation.isPending && !result && (
        <div className="space-y-3">
          <div className="bg-gray-100 rounded-xl h-20 animate-pulse" />
          <div className="bg-gray-100 rounded-xl h-48 animate-pulse" />
        </div>
      )}

      {result && summary && inputs && months && (
        <>
          {/* Assumptions banner */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 px-4 py-3 mb-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-blue-700">
            <span>Income: <strong>{kesRaw(inputs.monthlyIncome)}/mo</strong></span>
            <span>Expenses: <strong>{kesRaw(inputs.monthlyExpense)}/mo</strong></span>
            <span>Cash flow: <strong className={inputs.monthlyCashFlow < 0 ? 'text-red-600' : ''}>{kesRaw(inputs.monthlyCashFlow)}/mo</strong></span>
            {inputs.totalDebt > 0 && (
              <span>Current debt: <strong>{kesRaw(inputs.totalDebt)}</strong></span>
            )}
          </div>

          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            <div className={`rounded-xl p-4 ${netWorthPositive ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className={`text-xs font-semibold uppercase tracking-wider ${netWorthPositive ? 'text-green-600' : 'text-red-500'}`}>
                Net Worth in {form.months}mo
              </p>
              <p className={`text-lg font-bold mt-1 leading-tight ${netWorthPositive ? 'text-green-800' : 'text-red-700'}`}>
                {kes(summary.projectedNetWorth)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Savings built
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1 leading-tight">
                {kes(summary.projectedSavings)}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">
                Debt-free
              </p>
              <p className="text-lg font-bold text-gray-900 mt-1 leading-tight">
                {summary.debtFreeDate === 'already'
                  ? 'Now'
                  : summary.debtFreeDate
                  ? summary.debtFreeDate
                  : `>${form.months}mo`}
              </p>
            </div>
          </div>

          {/* Chart */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">Net Worth Trajectory</p>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-green-600 inline-block rounded" />
                  Net worth
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-5 h-0.5 bg-slate-400 inline-block rounded" style={{ borderTop: '1.5px dashed #94a3b8', height: 0 }} />
                  Savings
                </span>
              </div>
            </div>
            <NetWorthChart months={months} debtFreeMonths={summary.debtFreeMonths} />
          </div>

          {/* Month-by-month table */}
          <button
            onClick={() => setShowTable((v) => !v)}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors mb-2"
          >
            <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showTable ? 'rotate-180' : ''}`} />
            Month-by-month breakdown
          </button>

          {showTable && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-500">Month</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Savings</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Debt</th>
                      <th className="text-right px-4 py-2.5 font-semibold text-gray-500">Net Worth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {months.map((m, i) => (
                      <tr key={i} className={m.totalDebt === 0 && months[i - 1]?.totalDebt !== 0 ? 'bg-green-50' : ''}>
                        <td className="px-4 py-2.5 text-gray-600">
                          {MONTHS_SHORT[m.month - 1]} {m.year}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-gray-700">
                          {kes(m.savings)}
                        </td>
                        <td className="px-4 py-2.5 text-right tabular-nums text-red-500">
                          {m.totalDebt > 0 ? kes(m.totalDebt) : '—'}
                        </td>
                        <td className={`px-4 py-2.5 text-right tabular-nums font-medium ${m.netWorth >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                          {kes(m.netWorth)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!result && !mutation.isPending && !mutation.error && (
        <div className="text-center text-gray-400 text-sm py-12 flex flex-col items-center gap-2">
          <TrendingUp className="w-8 h-8 text-gray-200" />
          Configure your projection above
        </div>
      )}
    </div>
  )
}
