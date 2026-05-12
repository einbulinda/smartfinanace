'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import Image from 'next/image'
import clsx from 'clsx'
import {
  LayoutDashboard, ArrowLeftRight, CreditCard, TrendingUp,
  LogOut, User, BarChart3, Shield, Landmark, HandCoins,
  PiggyBank, LineChart, Wallet, Package, FolderKanban,
  FileBarChart2, Scale, AlarmClock, Target, Sparkles,
  MoreHorizontal, X,
} from 'lucide-react'
import { isAuthenticated, getUser, clearAuth } from '@/lib/auth'
import type { User as UserType } from '@/lib/types'

const INACTIVITY_MS = 30 * 60 * 1000
const WARN_BEFORE_MS = 5 * 60 * 1000

// ─── Navigation structure ──────────────────────────────────────────────────────

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Money',
    items: [
      { href: '/accounts',     label: 'Accounts',     icon: Wallet },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
      { href: '/projects',     label: 'Projects',     icon: FolderKanban },
    ],
  },
  {
    label: 'Planning',
    items: [
      { href: '/budgets',    label: 'Budgets',    icon: PiggyBank },
      { href: '/goals',      label: 'Goals',      icon: Target },
      { href: '/projection', label: 'Projection', icon: BarChart3 },
    ],
  },
  {
    label: 'Portfolio',
    items: [
      { href: '/investments', label: 'Investments', icon: TrendingUp },
      { href: '/assets',      label: 'Assets',      icon: Package },
      { href: '/insurance',   label: 'Insurance',   icon: Shield },
      { href: '/receivables', label: 'Receivables', icon: HandCoins },
    ],
  },
  {
    label: 'Debt',
    items: [
      { href: '/debts',     label: 'Debts',     icon: CreditCard },
      { href: '/optimizer', label: 'Optimizer', icon: Landmark },
    ],
  },
  {
    label: 'Reports',
    items: [
      { href: '/trends',        label: 'Trends',        icon: LineChart },
      { href: '/reports',       label: 'P&L Report',    icon: FileBarChart2 },
      { href: '/balance-sheet', label: 'Balance Sheet', icon: Scale },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { href: '/insights', label: 'AI Insights', icon: Sparkles },
    ],
  },
]

// Bottom bar tabs always visible on mobile
const MOBILE_TABS = [
  { href: '/dashboard',    label: 'Home',  icon: LayoutDashboard },
  { href: '/transactions', label: 'Txns',  icon: ArrowLeftRight },
  { href: '/goals',        label: 'Goals', icon: Target },
  { href: '/insights',     label: 'AI',    icon: Sparkles },
]

const MOBILE_TAB_PATHS = new Set(MOBILE_TABS.map((t) => t.href))

// ─── Reusable sidebar nav link ─────────────────────────────────────────────────

function SidebarLink({
  href, label, icon: Icon, pathname,
}: {
  href: string; label: string; icon: React.ElementType; pathname: string
}) {
  const active = pathname === href
  return (
    <Link
      href={href}
      className={clsx(
        'group flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium relative transition-all duration-150',
        active
          ? 'text-emerald-400 bg-emerald-500/10'
          : 'text-white/45 hover:text-white/80 hover:bg-white/6',
      )}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.75 h-5 bg-emerald-400 rounded-r-full shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
      )}
      <Icon className={clsx(
        'w-4 h-4 shrink-0 transition-colors',
        active ? 'text-emerald-400' : 'text-white/35 group-hover:text-white/60',
      )} />
      <span className="truncate">{label}</span>
    </Link>
  )
}

// ─── Main layout ───────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const router   = useRouter()
  const pathname = usePathname()

  const [user, setUser] = useState<UserType | null>(null)
  const [ready, setReady] = useState(false)

  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false)
  // moreOpenedAt stores the pathname when "More" was opened — auto-closes on navigation
  const [moreOpenedAt, setMoreOpenedAt] = useState<string | null>(null)
  const showMore = moreOpenedAt === pathname
  const logoutTimer = useRef<ReturnType<typeof setTimeout>>()
  const warnTimer   = useRef<ReturnType<typeof setTimeout>>()

  // Runs client-side only; server + client both start with ready=false → no hydration mismatch
  useEffect(() => {
    if (!isAuthenticated()) { router.replace('/login'); return }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUser(getUser())
    setReady(true)
  }, [router])

  const resetActivity = useCallback(() => {
    clearTimeout(logoutTimer.current)
    clearTimeout(warnTimer.current)
    setShowTimeoutWarning(false)
    warnTimer.current   = setTimeout(() => setShowTimeoutWarning(true), INACTIVITY_MS - WARN_BEFORE_MS)
    logoutTimer.current = setTimeout(() => { clearAuth(); router.replace('/login') }, INACTIVITY_MS)
  }, [router])

  useEffect(() => {
    if (!ready) return
    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'] as const
    events.forEach((e) => window.addEventListener(e, resetActivity, { passive: true }))
    // Start timers directly here to avoid calling resetActivity() inside the effect body
    warnTimer.current   = setTimeout(() => setShowTimeoutWarning(true), INACTIVITY_MS - WARN_BEFORE_MS)
    logoutTimer.current = setTimeout(() => { clearAuth(); router.replace('/login') }, INACTIVITY_MS)
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetActivity))
      clearTimeout(logoutTimer.current)
      clearTimeout(warnTimer.current)
    }
  }, [ready, resetActivity, router])

  function handleLogout() { clearAuth(); router.replace('/login') }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#080e1a]">
        <div className="w-8 h-8 rounded-full border-2 border-emerald-400 border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#f0f4f8] flex">

      {/* ════════════════════════════════════════════════════════
          DESKTOP SIDEBAR
      ════════════════════════════════════════════════════════ */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#080e1a] fixed inset-y-0 z-30 border-r border-white/5">

        {/* Brand */}
        <div className="px-4 pt-5 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Image
              src="/SmartFinance/icon_only-remove-bg-io.png"
              alt=""
              width={36}
              height={36}
              priority
              style={{ width: 36, height: 'auto' }}
            />
            <div className="min-w-0">
              <p className="text-white text-sm font-bold leading-tight tracking-tight">SmartFinance</p>
              {user && (
                <p className="text-white/35 text-[11px] truncate mt-0.5">
                  {user.firstName} {user.lastName}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 dark-scroll">
          {NAV_GROUPS.map((group, gi) => (
            <div key={group.label} className={gi > 0 ? 'mt-4' : ''}>
              <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 select-none">
                {group.label}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => (
                  <SidebarLink key={item.href} {...item} pathname={pathname} />
                ))}
              </div>
            </div>
          ))}

          {/* Account group */}
          <div className="mt-4">
            <p className="px-3 mb-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/20 select-none">
              Account
            </p>
            <div className="space-y-0.5">
              <SidebarLink href="/profile" label="Profile" icon={User} pathname={pathname} />
            </div>
          </div>
        </nav>

        {/* Sign out */}
        <div className="p-2 border-t border-white/5">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium text-white/35 hover:text-white/65 hover:bg-white/6 w-full transition-all duration-150"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            Sign out
          </button>
        </div>
      </aside>

      {/* ════════════════════════════════════════════════════════
          MAIN CONTENT
      ════════════════════════════════════════════════════════ */}
      <main className="flex-1 lg:ml-64 min-w-0 pb-20 lg:pb-0">
        {children}
      </main>

      {/* ════════════════════════════════════════════════════════
          SESSION TIMEOUT MODAL
      ════════════════════════════════════════════════════════ */}
      {showTimeoutWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#080e1a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-4">
              <AlarmClock className="w-7 h-7 text-amber-400" />
            </div>
            <h3 className="text-base font-semibold text-white mb-1">Still there?</h3>
            <p className="text-sm text-white/45 mb-5">
              You&apos;ll be signed out in 5 minutes due to inactivity.
            </p>
            <div className="flex gap-3">
              <button
                onClick={resetActivity}
                className="flex-1 rounded-xl bg-linear-to-r from-emerald-500 to-green-500 text-white py-2.5 text-sm font-semibold hover:opacity-90"
              >
                Stay signed in
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 rounded-xl border border-white/10 text-white/55 py-2.5 text-sm font-medium hover:bg-white/5"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          MOBILE BOTTOM TAB BAR
      ════════════════════════════════════════════════════════ */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-[#080e1a]/95 backdrop-blur-xl border-t border-white/8">
        <div className="flex">
          {MOBILE_TABS.map(({ href, label, icon: Icon }) => {
            const active = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
                  active ? 'text-emerald-400' : 'text-white/35',
                )}
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            )
          })}

          {/* More */}
          <button
            onClick={() => setMoreOpenedAt(pathname)}
            className={clsx(
              'flex-1 flex flex-col items-center justify-center py-3 gap-1 transition-colors',
              showMore ? 'text-emerald-400' : 'text-white/35',
            )}
          >
            <MoreHorizontal className="w-5 h-5" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      </nav>

      {/* ════════════════════════════════════════════════════════
          MOBILE "MORE" BOTTOM SHEET
      ════════════════════════════════════════════════════════ */}
      {showMore && (
        <>
          {/* Backdrop */}
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/55 backdrop-blur-sm"
            onClick={() => setMoreOpenedAt(null)}
          />

          {/* Sheet */}
          <div className="lg:hidden fixed bottom-0 inset-x-0 z-50 bg-[#080e1a] border-t border-white/8 rounded-t-3xl max-h-[82vh] overflow-y-auto dark-scroll">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-white/15 rounded-full" />
            </div>
            <div className="flex items-center justify-between px-5 py-3 border-b border-white/6">
              <p className="text-white text-sm font-semibold">All Sections</p>
              <button onClick={() => setMoreOpenedAt(null)} className="text-white/35 hover:text-white/65 p-1 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Nav groups as 3-column grid */}
            <div className="px-4 pb-8 pt-3 space-y-5">
              {NAV_GROUPS.map((group) => {
                const items = group.items.filter((i) => !MOBILE_TAB_PATHS.has(i.href))
                if (items.length === 0) return null
                return (
                  <div key={group.label}>
                    <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/22 mb-2 px-0.5">
                      {group.label}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {items.map(({ href, label, icon: Icon }) => {
                        const active = pathname === href
                        return (
                          <Link
                            key={href}
                            href={href}
                            className={clsx(
                              'flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all',
                              active
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-white/4 border-white/6 text-white/55 hover:bg-white/8 hover:text-white/80',
                            )}
                          >
                            <Icon className="w-5 h-5" />
                            <span className="text-[11px] font-medium text-center leading-tight">{label}</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* Account & sign out */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-white/22 mb-2 px-0.5">Account</p>
                <div className="grid grid-cols-3 gap-2">
                  <Link
                    href="/profile"
                    className={clsx(
                      'flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border transition-all',
                      pathname === '/profile'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                        : 'bg-white/4 border-white/6 text-white/55 hover:bg-white/8 hover:text-white/80',
                    )}
                  >
                    <User className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Profile</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex flex-col items-center gap-2 py-3.5 px-2 rounded-xl border border-white/6 bg-white/4 text-white/55 hover:bg-red-500/10 hover:border-red-500/20 hover:text-red-400 transition-all"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-[11px] font-medium">Sign out</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
