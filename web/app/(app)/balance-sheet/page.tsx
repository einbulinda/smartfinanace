'use client'

import { useQuery } from '@tanstack/react-query'
import { Scale } from 'lucide-react'
import { api } from '@/lib/api'
import { ErrorState } from '@/components/ErrorState'
import type { Account, Investment, ManualAsset, Receivable, Debt } from '@/lib/types'

function kes(n: number) {
  return 'KES ' + Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })
}

function SectionHeader({ title, total, positive }: { title: string; total: number; positive: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 bg-gray-50 border-b border-gray-100">
      <p className="text-xs font-bold uppercase tracking-wider text-gray-500">{title}</p>
      <p className={`text-sm font-bold tabular-nums ${positive ? 'text-green-700' : 'text-red-600'}`}>{kes(total)}</p>
    </div>
  )
}

function LineItem({ label, sub, value, positive }: { label: string; sub?: string; value: number; positive: boolean }) {
  return (
    <div className="flex items-center justify-between px-5 py-3 border-b border-gray-50 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-gray-700 truncate">{label}</p>
        {sub && <p className="text-xs text-gray-400">{sub}</p>}
      </div>
      <p className={`text-sm tabular-nums font-medium shrink-0 ml-4 ${positive ? 'text-gray-800' : 'text-red-600'}`}>
        {kes(value)}
      </p>
    </div>
  )
}

export default function BalanceSheetPage() {
  const today = new Date().toLocaleDateString('en-KE', { day: 'numeric', month: 'long', year: 'numeric' })

  const { data: accounts = [], isLoading: aLoad, isError: aErr, refetch: aRefetch } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<Account[]>('/accounts').then((r) => r.data),
  })

  const { data: investments = [], isLoading: iLoad, isError: iErr, refetch: iRefetch } = useQuery({
    queryKey: ['investments'],
    queryFn: () => api.get<Investment[]>('/investments').then((r) => r.data),
  })

  const { data: assets = [], isLoading: mLoad, isError: mErr, refetch: mRefetch } = useQuery({
    queryKey: ['assets'],
    queryFn: () => api.get<ManualAsset[]>('/assets').then((r) => r.data),
  })

  const { data: receivables = [], isLoading: rLoad, isError: rErr, refetch: rRefetch } = useQuery({
    queryKey: ['receivables'],
    queryFn: () => api.get<Receivable[]>('/receivables').then((r) => r.data),
  })

  const { data: debts = [], isLoading: dLoad, isError: dErr, refetch: dRefetch } = useQuery({
    queryKey: ['debts'],
    queryFn: () => api.get<Debt[]>('/debts').then((r) => r.data),
  })

  const isLoading = aLoad || iLoad || mLoad || rLoad || dLoad
  const isError = aErr || iErr || mErr || rErr || dErr

  function retryAll() {
    if (aErr) aRefetch()
    if (iErr) iRefetch()
    if (mErr) mRefetch()
    if (rErr) rRefetch()
    if (dErr) dRefetch()
  }

  // Partition accounts: CREDIT = liability, rest = asset
  const assetAccounts = accounts.filter((a) => a.isActive && a.type !== 'CREDIT' && a.currentBalance > 0)
  const creditAccounts = accounts.filter((a) => a.isActive && a.type === 'CREDIT' && a.currentBalance > 0)

  const activeInvestments = investments
  const activeAssets = assets

  const outstandingReceivables = receivables.filter(
    (r) => r.status === 'OUTSTANDING' || r.status === 'PARTIALLY_REPAID',
  )
  const activeDebts = debts.filter((d) => !d.isPaidOff)

  // Totals
  const totalCashAccounts = assetAccounts.reduce((s, a) => s + a.currentBalance, 0)
  const totalInvestments = activeInvestments.reduce((s, i) => s + i.currentValue, 0)
  const totalPhysicalAssets = activeAssets.reduce((s, a) => s + a.currentValue, 0)
  const totalReceivables = outstandingReceivables.reduce((s, r) => s + (r.amount - r.amountRepaid), 0)
  const totalAssets = totalCashAccounts + totalInvestments + totalPhysicalAssets + totalReceivables

  const totalDebt = activeDebts.reduce((s, d) => s + d.currentBalance, 0)
  const totalCreditOwed = creditAccounts.reduce((s, a) => s + a.currentBalance, 0)
  const totalLiabilities = totalDebt + totalCreditOwed

  const netWorth = totalAssets - totalLiabilities

  if (isLoading) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-white rounded-xl animate-pulse" />
        ))}
      </div>
    )
  }

  if (isError) {
    return (
      <div className="p-4 lg:p-8 max-w-2xl mx-auto">
        <ErrorState message="Failed to load balance sheet data." onRetry={retryAll} />
      </div>
    )
  }

  return (
    <div className="p-4 lg:p-8 max-w-2xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <Scale className="w-5 h-5 text-gray-400" />
          <h2 className="text-2xl font-bold text-gray-900">Balance Sheet</h2>
        </div>
        <p className="text-sm text-gray-400">As at {today}</p>
      </div>

      {/* ASSETS */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">Assets</p>
        </div>

        {assetAccounts.length > 0 && (
          <>
            <SectionHeader title="Cash & Bank Accounts" total={totalCashAccounts} positive />
            {assetAccounts.map((a) => (
              <LineItem key={a.id} label={a.name} sub={a.type.replace('_', ' ')} value={a.currentBalance} positive />
            ))}
          </>
        )}

        {activeInvestments.length > 0 && (
          <>
            <SectionHeader title="Investments" total={totalInvestments} positive />
            {activeInvestments.map((i) => (
              <LineItem key={i.id} label={i.name} sub={i.type} value={i.currentValue} positive />
            ))}
          </>
        )}

        {activeAssets.length > 0 && (
          <>
            <SectionHeader title="Physical Assets" total={totalPhysicalAssets} positive />
            {activeAssets.map((a) => (
              <LineItem key={a.id} label={a.name} sub={a.type} value={a.currentValue} positive />
            ))}
          </>
        )}

        {outstandingReceivables.length > 0 && (
          <>
            <SectionHeader title="Receivables" total={totalReceivables} positive />
            {outstandingReceivables.map((r) => (
              <LineItem
                key={r.id}
                label={r.borrowerName}
                sub={r.status.replace('_', ' ').toLowerCase()}
                value={r.amount - r.amountRepaid}
                positive
              />
            ))}
          </>
        )}

        <div className="flex items-center justify-between px-5 py-4 bg-green-50 border-t-2 border-green-100">
          <p className="text-sm font-bold text-green-800 uppercase tracking-wide">Total Assets</p>
          <p className="text-base font-bold text-green-800 tabular-nums">{kes(totalAssets)}</p>
        </div>
      </div>

      {/* LIABILITIES */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100">
          <p className="text-base font-bold text-gray-900">Liabilities</p>
        </div>

        {activeDebts.length > 0 && (
          <>
            <SectionHeader title="Loans & Debts" total={totalDebt} positive={false} />
            {activeDebts.map((d) => (
              <LineItem key={d.id} label={d.name} sub={d.type} value={d.currentBalance} positive={false} />
            ))}
          </>
        )}

        {creditAccounts.length > 0 && (
          <>
            <SectionHeader title="Credit Accounts" total={totalCreditOwed} positive={false} />
            {creditAccounts.map((a) => (
              <LineItem key={a.id} label={a.name} sub="Credit" value={a.currentBalance} positive={false} />
            ))}
          </>
        )}

        {totalLiabilities === 0 && (
          <p className="px-5 py-6 text-sm text-gray-300 text-center">No liabilities recorded.</p>
        )}

        <div className="flex items-center justify-between px-5 py-4 bg-red-50 border-t-2 border-red-100">
          <p className="text-sm font-bold text-red-700 uppercase tracking-wide">Total Liabilities</p>
          <p className="text-base font-bold text-red-700 tabular-nums">{kes(totalLiabilities)}</p>
        </div>
      </div>

      {/* NET WORTH */}
      <div className={`rounded-xl p-5 flex items-center justify-between ${netWorth >= 0 ? 'bg-green-700' : 'bg-red-600'}`}>
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-white/70">Net Worth</p>
          <p className="text-xs text-white/60 mt-0.5">Total Assets − Total Liabilities</p>
        </div>
        <p className="text-2xl font-bold text-white tabular-nums">
          {netWorth >= 0 ? '' : '−'}{kes(Math.abs(netWorth))}
        </p>
      </div>
    </div>
  )
}
