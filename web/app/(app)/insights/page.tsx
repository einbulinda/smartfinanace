'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { RefreshCw, Sparkles, AlertTriangle, TrendingUp, Info, Star, Zap } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type {
  UserInsight, InsightItem, InsightType, InsightCategory,
  PaginatedTransactions, DashboardSnapshot, Goal, Debt, Investment, FinancialSnapshot,
} from '@/lib/types'

const TYPE_CONFIG: Record<InsightType, { icon: React.ElementType; cls: string; border: string }> = {
  warning:     { icon: AlertTriangle, cls: 'bg-amber-50 text-amber-700',  border: 'border-amber-200' },
  opportunity: { icon: TrendingUp,    cls: 'bg-green-50 text-green-700',  border: 'border-green-200' },
  info:        { icon: Info,          cls: 'bg-blue-50 text-blue-700',    border: 'border-blue-200' },
  celebration: { icon: Star,          cls: 'bg-purple-50 text-purple-700', border: 'border-purple-200' },
}

const CATEGORY_LABELS: Record<InsightCategory, string> = {
  cash_flow:   'Cash Flow',
  debt:        'Debt',
  savings:     'Savings',
  investments: 'Investments',
  goals:       'Goals',
  general:     'General',
}

const PRIORITY_ORDER = { high: 0, medium: 1, low: 2 }

function buildSnapshot(
  transactions: PaginatedTransactions | undefined,
  dashboard: DashboardSnapshot | undefined,
  goals: Goal[],
  debts: Debt[],
  investments: Investment[],
): FinancialSnapshot {
  const txns = transactions?.data ?? []
  const income = txns.filter((t) => t.type === 'INCOME').reduce((s, t) => s + Number(t.amount), 0)
  const expenses = txns.filter((t) => t.type === 'EXPENSE').reduce((s, t) => s + Number(t.amount), 0)
  const net = income - expenses
  const savingsRate = income > 0 ? (net / income) * 100 : 0

  const expByCat: Record<string, number> = {}
  txns.filter((t) => t.type === 'EXPENSE').forEach((t) => {
    expByCat[t.category] = (expByCat[t.category] ?? 0) + Number(t.amount)
  })
  const topExpenseCategories = Object.entries(expByCat)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([category, amount]) => ({ category, amount }))

  const activeGoals = goals.filter((g) => g.status === 'ACTIVE')
  const onTrack = activeGoals.filter((g) => g.progressStatus === 'ON_TRACK' || g.progressStatus === 'AHEAD').length
  const behind = activeGoals.filter((g) => g.progressStatus === 'BEHIND').length
  const goalsSummary = activeGoals.length > 0
    ? `${activeGoals.length} active goal(s): ${onTrack} on track/ahead, ${behind} behind`
    : 'No active goals set'

  return {
    avgMonthlyIncome: income / 3,
    avgMonthlyExpenses: expenses / 3,
    avgMonthlyNet: net / 3,
    savingsRate,
    topExpenseCategories,
    totalDebt: dashboard?.totalDebt ?? debts.reduce((s, d) => s + d.currentBalance, 0),
    totalInvestments: dashboard?.totalInvestments ?? investments.reduce((s, i) => s + i.currentValue, 0),
    netWorth: dashboard?.netWorth ?? 0,
    goalsSummary,
  }
}

export default function InsightsPage() {
  const qc = useQueryClient()
  const threeMonthsAgo = new Date()
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3)
  const startDate = threeMonthsAgo.toISOString().split('T')[0]
  const endDate = new Date().toISOString().split('T')[0]

  const { data: insight, isLoading, isError, refetch } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: () => api.get<UserInsight | null>('/ai/insights').then((r) => r.data),
  })

  // fetch supporting data for snapshot building (all cached by other pages)
  const { data: txData } = useQuery({
    queryKey: ['insight-txns'],
    queryFn: () => api.get<PaginatedTransactions>('/transactions', { params: { startDate, endDate, limit: 2000 } }).then((r) => r.data),
  })
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get<DashboardSnapshot>('/dashboard').then((r) => r.data),
  })
  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => api.get<Goal[]>('/goals').then((r) => r.data),
  })
  const { data: debts = [] } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts').then((r) => r.data),
  })
  const { data: investments = [] } = useQuery({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments').then((r) => r.data),
  })

  const generateMutation = useMutation({
    mutationFn: () => {
      const snapshot = buildSnapshot(txData, dashboard, goals, debts, investments)
      return api.post<UserInsight>('/ai/insights/generate', snapshot).then((r) => r.data)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ai-insights'] }),
  })

  const sortedInsights: InsightItem[] = [...(insight?.insights ?? [])].sort(
    (a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  )

  const groupedByCategory = sortedInsights.reduce<Record<string, InsightItem[]>>((acc, item) => {
    const cat = item.category
    acc[cat] = acc[cat] ?? []
    acc[cat].push(item)
    return acc
  }, {})

  const generatedAgo = insight?.generatedAt
    ? Math.round((Date.now() - new Date(insight.generatedAt).getTime()) / 60_000)
    : null

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <h2 className="text-2xl font-bold text-gray-900">AI Insights</h2>
          </div>
          <p className="text-sm text-gray-400">
            {generatedAgo !== null
              ? `Last generated ${generatedAgo < 60 ? `${generatedAgo}m ago` : `${Math.floor(generatedAgo / 60)}h ago`}`
              : 'No insights generated yet'}
          </p>
        </div>
        <button
          onClick={() => generateMutation.mutate()}
          disabled={generateMutation.isPending}
          className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 transition-colors"
        >
          {generateMutation.isPending
            ? <><RefreshCw className="w-4 h-4 animate-spin" /> Generating…</>
            : <><Zap className="w-4 h-4" /> {insight ? 'Refresh' : 'Generate Insights'}</>
          }
        </button>
      </div>

      {generateMutation.isError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700">Generation failed</p>
            <p className="text-xs text-red-500 mt-0.5">
              {(generateMutation.error as any)?.response?.data?.message ?? (generateMutation.error as Error)?.message ?? 'Unknown error — check the backend logs.'}
            </p>
          </div>
        </div>
      )}

      {generateMutation.isPending && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-12 text-center mb-4">
          <RefreshCw className="w-8 h-8 text-purple-400 animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Claude is analysing your financial data…</p>
          <p className="text-xs text-gray-300 mt-1">This takes 10–20 seconds</p>
        </div>
      )}

      {isError && <ErrorState message="Failed to load insights." onRetry={refetch} />}

      {!generateMutation.isPending && !insight && !isError && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-14 text-center">
          <Sparkles className="w-10 h-10 text-gray-200 mx-auto mb-3" />
          <p className="text-sm text-gray-400">No insights yet.</p>
          <p className="text-xs text-gray-300 mt-1">Click &quot;Generate Insights&quot; to get personalised AI advice based on your financial data.</p>
        </div>
      )}

      {/* Insights by category */}
      {!generateMutation.isPending && sortedInsights.length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedByCategory).map(([category, items]) => (
            <div key={category}>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">
                {CATEGORY_LABELS[category as InsightCategory] ?? category}
              </p>
              <div className="space-y-3">
                {items.map((item) => {
                  const config = TYPE_CONFIG[item.type]
                  const Icon = config.icon
                  return (
                    <div
                      key={item.id}
                      className={`rounded-xl border p-4 ${config.cls} ${config.border}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon className="w-4 h-4 shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold">{item.title}</p>
                            {item.priority === 'high' && (
                              <span className="text-xs font-medium bg-white/60 px-1.5 py-0.5 rounded-full">High priority</span>
                            )}
                          </div>
                          <p className="text-sm leading-relaxed opacity-90">{item.body}</p>
                          {item.action && (
                            <p className="text-xs font-semibold mt-2 opacity-80">
                              → {item.action}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
