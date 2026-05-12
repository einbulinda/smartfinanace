'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CompareResponse, OptimizationResult } from '@/lib/types'

function kes(n: number) {
  return 'KES ' + n.toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function ResultCard({
  result,
  recommended,
}: {
  result: OptimizationResult
  recommended?: boolean
}) {
  const label = result.strategy === 'AVALANCHE' ? 'Avalanche' : 'Snowball'
  const desc =
    result.strategy === 'AVALANCHE'
      ? 'Pay highest interest rate first — minimizes total interest paid'
      : 'Pay smallest balance first — builds momentum with quick wins'

  return (
    <div
      className={`rounded-xl border p-5 ${recommended ? 'border-green-300 bg-green-50' : 'border-gray-100 bg-white'}`}
    >
      <div className="flex items-center justify-between mb-1">
        <h3 className="font-semibold text-gray-900">{label}</h3>
        {recommended && (
          <span className="text-xs bg-green-700 text-white px-2 py-0.5 rounded-full font-medium">
            Recommended
          </span>
        )}
      </div>
      <p className="text-xs text-gray-400 mb-4">{desc}</p>

      <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
        <div>
          <p className="text-xs text-gray-400">Months to payoff</p>
          <p className="font-semibold text-gray-900">{result.totalMonths} months</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Debt-free date</p>
          <p className="font-semibold text-gray-900">{result.debtFreeDate}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Total interest</p>
          <p className="font-semibold text-red-600">{kes(result.totalInterestPaid)}</p>
        </div>
        <div>
          <p className="text-xs text-gray-400">Interest saved</p>
          <p className="font-semibold text-green-600">{kes(result.interestSaved)}</p>
        </div>
      </div>
    </div>
  )
}

export default function OptimizerPage() {
  const [budget, setBudget] = useState('')
  const [result, setResult] = useState<CompareResponse | null>(null)

  const compareMutation = useMutation({
    mutationFn: (monthlyBudget: number) =>
      api
        .post<CompareResponse>('/optimizer/compare', { monthlyBudget })
        .then((r) => r.data),
    onSuccess: (data) => setResult(data),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const val = parseFloat(budget)
    if (!val || val <= 0) return
    setResult(null)
    compareMutation.mutate(val)
  }

  const avalanche = result?.avalanche
  const snowball = result?.snowball
  const avalancheWins =
    avalanche && snowball && avalanche.totalInterestPaid <= snowball.totalInterestPaid

  const monthsSaved = avalanche && snowball ? Math.abs(avalanche.totalMonths - snowball.totalMonths) : 0
  const interestSaved =
    avalanche && snowball
      ? Math.abs(avalanche.totalInterestPaid - snowball.totalInterestPaid)
      : 0

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Debt Optimizer</h2>
        <p className="text-sm text-gray-400 mt-0.5">
          Compare Avalanche vs Snowball strategies for your debts
        </p>
      </div>

      {/* Input */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-6">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Monthly budget (KES)
            </label>
            <input
              type="number"
              min="0"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              placeholder="e.g. 50000"
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={compareMutation.isPending || !budget}
              className="rounded-lg bg-green-700 text-white px-5 py-2.5 text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors whitespace-nowrap"
            >
              {compareMutation.isPending ? 'Calculating…' : 'Compare'}
            </button>
          </div>
        </form>
      </div>

      {compareMutation.error && (
        <div className="bg-red-50 rounded-xl border border-red-100 px-4 py-3 mb-6">
          <p className="text-sm text-red-600">
            {(compareMutation.error as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? 'Calculation failed. Make sure you have active debts added.'}
          </p>
        </div>
      )}

      {result && avalanche && snowball && (
        <div className="space-y-4">
          {/* Comparison summary */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4">
            <p className="text-sm font-semibold text-blue-800 mb-2">Comparison summary</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-blue-600">Months saved (Avalanche)</p>
                <p className="font-bold text-blue-900">{monthsSaved} months</p>
              </div>
              <div>
                <p className="text-xs text-blue-600">Interest saved (Avalanche)</p>
                <p className="font-bold text-blue-900">{kes(interestSaved)}</p>
              </div>
            </div>
          </div>

          <ResultCard result={avalanche} recommended={!!avalancheWins} />
          <ResultCard result={snowball} recommended={!avalancheWins} />
        </div>
      )}

      {!result && !compareMutation.isPending && (
        <div className="text-center text-gray-400 text-sm py-12">
          Enter your monthly budget above to see the comparison
        </div>
      )}
    </div>
  )
}
