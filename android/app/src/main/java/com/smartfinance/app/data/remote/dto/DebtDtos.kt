package com.smartfinance.app.data.remote.dto

data class DebtDto(
    val id: String,
    val name: String,
    val type: String,
    val originalAmount: Double,
    val currentBalance: Double,
    val interestRate: Double,
    val minimumPayment: Double?,
    val dueDate: Int?,
    val startDate: String,
    val endDate: String?,
    val isPaidOff: Boolean,
    val userId: String,
    val createdAt: String,
    val updatedAt: String
)

data class CreateDebtRequest(
    val name: String,
    val type: String,
    val originalAmount: Double,
    val currentBalance: Double? = null,
    val interestRate: Double = 0.0,
    val minimumPayment: Double? = null,
    val dueDate: Int? = null,
    val startDate: String,
    val endDate: String? = null
)

data class MakePaymentRequest(
    val amount: Double
)
