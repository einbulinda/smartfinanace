package com.smartfinance.app.data.remote.dto

data class OptimizeRequest(
    val strategy: String,
    val monthlyBudget: Double
)

data class CompareRequest(
    val monthlyBudget: Double
)

data class MonthBreakdown(
    val id: String,
    val name: String,
    val interest: Double,
    val payment: Double,
    val balance: Double
)

data class MonthlySnapshot(
    val month: Int,
    val totalRemaining: Double,
    val breakdown: List<MonthBreakdown>
)

data class OptimizationResult(
    val strategy: String,
    val monthlyBudget: Double,
    val totalMonths: Int,
    val totalInterestPaid: Double,
    val debtFreeDate: String,
    val interestSaved: Double,
    val monthsSaved: Int,
    val schedule: List<MonthlySnapshot>
)

data class ComparisonResponse(
    val avalanche: OptimizationResult,
    val snowball: OptimizationResult
)
