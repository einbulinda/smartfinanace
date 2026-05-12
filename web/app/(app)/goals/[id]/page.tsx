'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Sparkles, RefreshCw, CheckSquare, Square,
  AlertTriangle, TrendingUp, Info, Clock, Target,
} from 'lucide-react'
import Link from 'next/link'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { Goal, GoalPlan, ProgressStatus } from '@/lib/types'

const PROGRESS_CONFIG: Record<ProgressStatus, { label: string; bar: string; text: string }> = {
  AHEAD:    { label: 'Ahead of Plan',  bar: 'bg-blue-500',   text: 'text-blue-700' },
  ON_TRACK: { label: 'On Track',       bar: 'bg-green-500',  text: 'text-green-700' },
  BEHIND:   { label: 'Behind Plan',    bar: 'bg-red-400',    text: 'text-red-600' },
  ACHIEVED: { label: 'Achieved ✓',     bar: 'bg-purple-500', text: 'text-purple-700' },
  NO_PLAN:  { label: 'No Plan Yet',    bar: 'bg-gray-300',   text: 'text-gray-500' },
}

function kes(n: number) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

export default function GoalDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const qc = useQueryClient()
  const [progressInput, setProgressInput] = useState('')
  const [showProgressInput, setShowProgressInput] = useState(false)

  const { data: goal, isLoading, isError, refetch } = useQuery({
    queryKey: ['goals', id],
    queryFn: () => api.get<Goal>(`/goals/${id}`).then((r) => r.data),
  })

  const generatePlanMutation = useMutation({
    mutationFn: () => api.post(`/goals/${id}/generate-plan`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', id] }),
  })

  const reviewPlanMutation = useMutation({
    mutationFn: () => api.post(`/goals/${id}/review-plan`).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['goals', id] }),
  })

  const progressMutation = useMutation({
    mutationFn: (value: number) => api.patch(`/goals/${id}/progress`, { value }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', id] })
      qc.invalidateQueries({ queryKey: ['goals'] })
      setShowProgressInput(false)
      setProgressInput('')
    },
  })

  const milestoneMutation = useMutation({
    mutationFn: ({ mid, isCompleted }: { mid: string; isCompleted: boolean }) =>
      api.patch(`/goals/${id}/milestones/${mid}`, { isCompleted }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['goals', id] })
      qc.invalidateQueries({ queryKey: ['goals'] })
    },
  })

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => <div key={i} className="h-32 bg-white rounded-xl animate-pulse" />)}
      </div>
    )
  }

  if (isError || !goal) {
    return (
      <div className="p-4 lg:p-8 max-w-3xl mx-auto">
        <ErrorState message="Failed to load goal." onRetry={refetch} />
      </div>
    )
  }

  const cfg = PROGRESS_CONFIG[goal.progressStatus]
  const plan: GoalPlan | null = goal.plan
  const hasQuantitative = goal.targetValue !== null
  const aiPending = generatePlanMutation.isPending || reviewPlanMutation.isPending

  return (
    <div className="p-4 lg:p-8 max-w-3xl mx-auto">
      {/* Back */}
      <Link href="/goals" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-5 transition-colors">
        <ChevronLeft className="w-4 h-4" />
        Goals
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 mb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900">{goal.title}</h2>
            {goal.description && (
              <p className="text-sm text-gray-500 mt-1">{goal.description}</p>
            )}
          </div>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            goal.progressStatus === 'AHEAD' ? 'bg-blue-100 text-blue-700' :
            goal.progressStatus === 'ON_TRACK' ? 'bg-green-100 text-green-700' :
            goal.progressStatus === 'BEHIND' ? 'bg-red-100 text-red-600' :
            goal.progressStatus === 'ACHIEVED' ? 'bg-purple-100 text-purple-700' :
            'bg-gray-100 text-gray-500'
          }`}>
            {cfg.label}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex justify-between text-xs text-gray-400 mb-1.5">
            <span className={`font-semibold ${cfg.text}`}>{goal.progressPct.toFixed(0)}% complete</span>
            {hasQuantitative && (
              <span>{kes(goal.currentValue ?? 0)} / {kes(goal.targetValue!)}</span>
            )}
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${cfg.bar}`}
              style={{ width: `${Math.min(100, goal.progressPct)}%` }}
            />
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{goal.daysRemaining}d remaining</span>
          <span>Target: {goal.targetDate}</span>
          {goal.unit && hasQuantitative && <span>Unit: {goal.unit}</span>}
        </div>

        {/* Update progress */}
        {hasQuantitative && goal.status === 'ACTIVE' && (
          <div className="mt-4 pt-4 border-t border-gray-50">
            {showProgressInput ? (
              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600"
                  placeholder={`Current value (${goal.unit ?? 'KES'})`}
                  value={progressInput}
                  onChange={(e) => setProgressInput(e.target.value)}
                  autoFocus
                />
                <button
                  onClick={() => progressMutation.mutate(parseFloat(progressInput) || 0)}
                  disabled={progressMutation.isPending || !progressInput}
                  className="px-4 rounded-lg bg-green-700 text-white text-sm font-medium hover:bg-green-800 disabled:opacity-50 transition-colors"
                >
                  {progressMutation.isPending ? 'Saving…' : 'Save'}
                </button>
                <button onClick={() => setShowProgressInput(false)} className="px-3 rounded-lg border border-gray-200 text-sm text-gray-500 hover:bg-gray-50">Cancel</button>
              </div>
            ) : (
              <button
                onClick={() => setShowProgressInput(true)}
                className="text-sm text-green-700 font-medium hover:text-green-800 transition-colors"
              >
                + Update current value
              </button>
            )}
          </div>
        )}
      </div>

      {/* AI Plan section */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-500" />
            <p className="font-semibold text-gray-900 text-sm">AI Plan</p>
          </div>
          {!plan ? (
            <button
              onClick={() => generatePlanMutation.mutate()}
              disabled={aiPending}
              className="flex items-center gap-1.5 text-xs font-semibold bg-purple-600 text-white px-3 py-1.5 rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
            >
              {aiPending ? <><RefreshCw className="w-3 h-3 animate-spin" /> Generating…</> : <><Sparkles className="w-3 h-3" /> Generate Plan</>}
            </button>
          ) : (
            <button
              onClick={() => reviewPlanMutation.mutate()}
              disabled={aiPending}
              className="flex items-center gap-1.5 text-xs font-medium text-purple-600 border border-purple-200 px-3 py-1.5 rounded-lg hover:bg-purple-50 disabled:opacity-50 transition-colors"
            >
              {aiPending ? <><RefreshCw className="w-3 h-3 animate-spin" /> Reviewing…</> : <><RefreshCw className="w-3 h-3" /> Review Plan</>}
            </button>
          )}
        </div>

        {aiPending && (
          <div className="p-8 text-center">
            <RefreshCw className="w-6 h-6 text-purple-400 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-400">{generatePlanMutation.isPending ? 'Claude is building your plan…' : 'Claude is reviewing your progress…'}</p>
          </div>
        )}

        {(generatePlanMutation.isError || reviewPlanMutation.isError) && (
          <div className="p-4 m-4 bg-red-50 rounded-lg text-sm text-red-600 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {(() => {
                const err = generatePlanMutation.error ?? reviewPlanMutation.error
                return (err as any)?.response?.data?.message ?? (err as Error)?.message ?? 'AI error — check the backend logs.'
              })()}
            </span>
          </div>
        )}

        {!plan && !aiPending && !generatePlanMutation.isError && (
          <div className="p-10 text-center">
            <Target className="w-8 h-8 text-gray-200 mx-auto mb-2" />
            <p className="text-sm text-gray-400">No plan yet — click Generate Plan to let Claude build one.</p>
          </div>
        )}

        {plan && !aiPending && (
          <div className="p-5 space-y-5">
            {/* Feasibility */}
            <div className="flex items-center gap-4">
              <div className="text-center shrink-0">
                <div className={`text-3xl font-bold ${plan.feasibilityScore >= 70 ? 'text-green-700' : plan.feasibilityScore >= 40 ? 'text-amber-600' : 'text-red-600'}`}>
                  {plan.feasibilityScore}
                </div>
                <div className="text-xs text-gray-400">/ 100</div>
                <div className="text-xs text-gray-400">Feasibility</div>
              </div>
              <p className="text-sm text-gray-600 flex-1">{plan.feasibilityReason}</p>
            </div>

            {/* Summary */}
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Plan Overview</p>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">{plan.summary}</p>
            </div>

            {/* Milestones */}
            {plan.milestones.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">Milestones</p>
                <div className="space-y-2">
                  {plan.milestones.map((m) => (
                    <div
                      key={m.id}
                      className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${m.isCompleted ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'}`}
                    >
                      <button
                        onClick={() => milestoneMutation.mutate({ mid: m.id, isCompleted: !m.isCompleted })}
                        className={`shrink-0 mt-0.5 transition-colors ${m.isCompleted ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}
                      >
                        {m.isCompleted ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium ${m.isCompleted ? 'text-green-700 line-through' : 'text-gray-800'}`}>{m.title}</p>
                        {m.description && <p className="text-xs text-gray-500 mt-0.5">{m.description}</p>}
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span>By {m.targetDate}</span>
                          {m.targetValue !== null && <span>{kes(m.targetValue)} {m.unit ?? ''}</span>}
                          {m.isCompleted && m.completedAt && <span className="text-green-600">Completed {m.completedAt}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action steps */}
            {plan.actionSteps.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  Action Steps
                </p>
                <ul className="space-y-1.5">
                  {plan.actionSteps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="shrink-0 w-5 h-5 rounded-full bg-green-100 text-green-700 text-xs font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
                      {step}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risks */}
            {plan.risks.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Risks to Watch
                </p>
                <ul className="space-y-1.5">
                  {plan.risks.map((risk, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2">
                      <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <p className="text-xs text-gray-300">Plan generated {new Date(plan.generatedAt).toLocaleDateString()}</p>
          </div>
        )}
      </div>
    </div>
  )
}
