package com.smartfinance.app.data.remote.dto

data class MonthSummaryDto(
    val month: Int,
    val year: Int,
    val income: Double,
    val expense: Double,
    val net: Double
)

data class DashboardSnapshotResponse(
    val currentMonth: MonthSummaryDto,
    val lastMonth: MonthSummaryDto,
    val netWorth: Double,
    val netWorthChange: Double,
    val totalDebt: Double
)

data class NetWorthBreakdown(
    val totalIncome: Double,
    val totalExpenses: Double
)

data class NetWorthResponse(
    val netWorth: Double,
    val assets: Double,
    val liabilities: Double,
    val breakdown: NetWorthBreakdown
)

data class MonthlyOverviewResponse(
    val month: Int,
    val year: Int,
    val income: Double,
    val expense: Double,
    val net: Double,
    val top5Expenses: List<CategoryBreakdown>,
    val upcomingPayments: List<DebtDto>,
    val totalDebt: Double
)
