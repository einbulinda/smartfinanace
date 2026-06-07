export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  avatarUrl?: string | null
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Transaction {
  id: string
  type: 'INCOME' | 'EXPENSE' | 'TRANSFER'
  amount: number
  category: string
  subCategory: string | null
  description: string | null
  date: string
  isRecurring: boolean
  recurringFrequency: string | null
  accountId: string | null
  tags: string[]
  projectId: string | null
  userId: string
  createdAt: string
}

export interface Account {
  id: string
  name: string
  type: 'BANK' | 'MOBILE_MONEY' | 'CASH' | 'SACCO' | 'INVESTMENT' | 'CREDIT'
  currency: string
  initialBalance: number
  currentBalance: number
  isActive: boolean
  notes: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateAccountRequest {
  name: string
  type: 'BANK' | 'MOBILE_MONEY' | 'CASH' | 'SACCO' | 'INVESTMENT' | 'CREDIT'
  currency?: string
  initialBalance?: number
  isActive?: boolean
  notes?: string
}

export interface AccountTransfer {
  id: string
  amount: number
  date: string
  notes: string | null
  fromAccountId: string
  toAccountId: string
  fromAccount?: { id: string; name: string }
  toAccount?: { id: string; name: string }
  userId: string
  createdAt: string
}

export interface CreateTransferRequest {
  fromAccountId: string
  toAccountId: string
  amount: number
  date: string
  notes?: string
}

export interface PaginatedTransactions {
  data: Transaction[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface CreateTransactionRequest {
  type: 'INCOME' | 'EXPENSE'
  amount: number
  category: string
  subCategory?: string
  description?: string
  date: string
  isRecurring?: boolean
  recurringFrequency?: string
  accountId?: string
  tags?: string[]
  projectId?: string
}

export type ProjectStatus = 'ACTIVE' | 'COMPLETED' | 'ARCHIVED'

export interface Project {
  id: string
  name: string
  description: string | null
  color: string | null
  status: ProjectStatus
  budget: number | null
  startDate: string | null
  endDate: string | null
  totalIncome: number
  totalExpenses: number
  net: number
  transactionCount: number
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateProjectRequest {
  name: string
  description?: string
  color?: string
  status?: ProjectStatus
  budget?: number
  startDate?: string
  endDate?: string
}

export type InterestType = 'REDUCING_BALANCE' | 'FLAT_RATE' | 'DAILY_ACCRUAL' | 'NONE'
export type DeductionMethod = 'MANUAL' | 'SALARY_DEDUCTION' | 'STANDING_ORDER' | 'AUTO_DEBIT'

export interface Debt {
  id: string
  name: string
  type: string
  originalAmount: number
  currentBalance: number
  interestRate: number
  interestType: InterestType
  deductionMethod: DeductionMethod
  lenderType: string | null
  minimumPayment: number | null
  dueDate: number | null
  startDate: string
  endDate: string | null
  isPaidOff: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateDebtRequest {
  name: string
  type: string
  originalAmount: number
  currentBalance?: number
  interestRate: number
  interestType?: InterestType
  deductionMethod?: DeductionMethod
  lenderType?: string
  minimumPayment?: number
  dueDate?: number
  startDate: string
  endDate?: string
}

export interface Investment {
  id: string
  name: string
  type: string
  amountInvested: number
  currentValue: number
  purchaseDate: string
  notes: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateInvestmentRequest {
  name: string
  type: string
  amountInvested: number
  currentValue: number
  purchaseDate: string
  notes?: string
}

export interface InsurancePolicy {
  id: string
  provider: string
  type: string
  policyNumber: string | null
  coverageAmount: number
  premiumAmount: number
  premiumFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  startDate: string
  endDate: string | null
  nextPaymentDate: string | null
  notes: string | null
  isActive: boolean
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateInsuranceRequest {
  provider: string
  type: string
  policyNumber?: string
  coverageAmount: number
  premiumAmount: number
  premiumFrequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUALLY'
  startDate: string
  endDate?: string
  nextPaymentDate?: string
  notes?: string
  isActive?: boolean
}

export interface Receivable {
  id: string
  borrowerName: string
  phone: string | null
  amount: number
  amountRepaid: number
  dateGiven: string
  dueDate: string | null
  status: 'OUTSTANDING' | 'PARTIALLY_REPAID' | 'REPAID' | 'WRITTEN_OFF'
  notes: string | null
  repayments: ReceivableRepayment[]
  userId: string
  createdAt: string
  updatedAt: string
}

export interface ReceivableRepayment {
  id: string
  amount: number
  date: string
  notes: string | null
  receivableId: string
  createdAt: string
}

export interface CreateReceivableRequest {
  borrowerName: string
  phone?: string
  amount: number
  dateGiven: string
  dueDate?: string
  notes?: string
}

export interface RecordRepaymentRequest {
  amount: number
  date: string
  notes?: string
  accountId?: string
}

export interface BudgetItemInput {
  category: string
  description?: string
  allocatedAmount: number
  isPreDeduction?: boolean
}

export interface BudgetItem {
  id: string
  category: string
  description: string | null
  allocatedAmount: number
  isPreDeduction: boolean
  budgetId: string
}

export interface Budget {
  id: string
  month: string
  items: BudgetItem[]
  userId: string
  createdAt: string
  updatedAt: string
}

export interface BudgetVsActualItem {
  category: string
  description: string | null
  allocated: number
  actual: number
  variance: number
  isPreDeduction: boolean
}

export interface BudgetVsActual {
  month: string
  totalBudgeted: number
  totalActual: number
  totalVariance: number
  income: number
  items: BudgetVsActualItem[]
}

export interface AnnualTrendMonth {
  month: number
  year: number
  income: number
  expense: number
  net: number
}

export interface AnnualTrends {
  year: number
  months: AnnualTrendMonth[]
}

export interface DashboardSnapshot {
  currentMonth: { month: number; year: number; income: number; expense: number; net: number }
  lastMonth: { month: number; year: number; income: number; expense: number; net: number }
  netWorth: number
  netWorthChange: number
  totalDebt: number
  totalInvestments: number
  totalReceivables: number
  totalManualAssets: number
  monthlyInsuranceCost: number
}

export type AssetType = 'VEHICLE' | 'REAL_ESTATE' | 'ELECTRONICS' | 'FURNITURE' | 'JEWELRY' | 'OTHER'

export interface ManualAsset {
  id: string
  name: string
  type: AssetType
  currentValue: number
  purchaseValue: number
  purchaseDate: string
  notes: string | null
  userId: string
  createdAt: string
  updatedAt: string
}

export interface CreateManualAssetRequest {
  name: string
  type?: AssetType
  currentValue: number
  purchaseValue?: number
  purchaseDate: string
  notes?: string
}

export interface Alert {
  type: 'DEBT_DUE' | 'INSURANCE_DUE' | 'RECEIVABLE_DUE' | 'RECEIVABLE_OVERDUE'
  severity: 'warning' | 'info'
  title: string
  message: string
  daysUntilDue: number
}

export interface ProjectionMonth {
  month: number
  year: number
  cashFlow: number
  debtPayments: number
  netSavings: number
  savings: number
  totalDebt: number
  netWorth: number
}

export interface ProjectionResult {
  inputs: {
    monthlyIncome: number
    monthlyExpense: number
    monthlyCashFlow: number
    totalDebt: number
    initialNetWorth: number
  }
  summary: {
    debtFreeDate: string | null
    debtFreeMonths: number | null
    projectedSavings: number
    projectedNetWorth: number
  }
  months: ProjectionMonth[]
}

export interface ForecastRequest {
  months: 12 | 24 | 36 | 60
  monthlyIncome?: number
  monthlyExpense?: number
}

export interface OptimizationResult {
  strategy: string
  monthlyBudget: number
  totalMonths: number
  totalInterestPaid: number
  debtFreeDate: string
  interestSaved: number
  monthsSaved: number
}

export interface CompareResponse {
  avalanche: OptimizationResult
  snowball: OptimizationResult
}

// ─── Goals ──────────────────────────────────────────────────────────────────

export type GoalType =
  | 'SAVINGS'
  | 'DEBT_PAYOFF'
  | 'INVESTMENT_GROWTH'
  | 'INCOME'
  | 'EXPENSE_REDUCTION'
  | 'NET_WORTH'
  | 'CUSTOM'

export type GoalStatus = 'ACTIVE' | 'ACHIEVED' | 'PAUSED' | 'ABANDONED'
export type ProgressStatus = 'AHEAD' | 'ON_TRACK' | 'BEHIND' | 'ACHIEVED' | 'NO_PLAN'

export interface GoalMilestone {
  id: string
  title: string
  description: string | null
  targetDate: string
  targetValue: number | null
  unit: string | null
  isCompleted: boolean
  completedAt: string | null
}

export interface GoalPlan {
  id: string
  goalId: string
  userId: string
  summary: string
  feasibilityScore: number
  feasibilityReason: string
  milestones: GoalMilestone[]
  actionSteps: string[]
  risks: string[]
  isActive: boolean
  generatedAt: string
}

export interface Goal {
  id: string
  title: string
  description: string | null
  type: GoalType
  targetValue: number | null
  currentValue: number | null
  unit: string | null
  startDate: string
  targetDate: string
  status: GoalStatus
  userId: string
  createdAt: string
  updatedAt: string
  // computed by backend
  plan: GoalPlan | null
  progressStatus: ProgressStatus
  progressPct: number
  daysRemaining: number
}

export interface CreateGoalRequest {
  title: string
  type: GoalType
  description?: string
  targetValue?: number
  currentValue?: number
  unit?: string
  startDate: string
  targetDate: string
  status?: GoalStatus
}

// ─── AI Insights ─────────────────────────────────────────────────────────────

export type InsightType = 'warning' | 'opportunity' | 'info' | 'celebration'
export type InsightCategory = 'cash_flow' | 'debt' | 'savings' | 'investments' | 'goals' | 'general'
export type InsightPriority = 'high' | 'medium' | 'low'

export interface InsightItem {
  id: string
  type: InsightType
  category: InsightCategory
  title: string
  body: string
  action: string | null
  priority: InsightPriority
}

export interface UserInsight {
  id: string
  userId: string
  insights: InsightItem[]
  generatedAt: string
}

export interface FinancialSnapshot {
  avgMonthlyIncome: number
  avgMonthlyExpenses: number
  avgMonthlyNet: number
  savingsRate: number
  topExpenseCategories: { category: string; amount: number }[]
  totalDebt: number
  totalInvestments: number
  netWorth: number
  goalsSummary: string
}
