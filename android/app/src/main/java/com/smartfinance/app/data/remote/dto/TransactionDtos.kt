package com.smartfinance.app.data.remote.dto

data class TransactionDto(
    val id: String,
    val type: String,
    val amount: Double,
    val category: String,
    val description: String?,
    val date: String,
    val isRecurring: Boolean,
    val recurringFrequency: String?,
    val userId: String,
    val createdAt: String
)

data class CreateTransactionRequest(
    val type: String,
    val amount: Double,
    val category: String,
    val description: String? = null,
    val date: String,
    val isRecurring: Boolean = false,
    val recurringFrequency: String? = null
)

data class PaginatedTransactionsResponse(
    val data: List<TransactionDto>,
    val total: Int,
    val page: Int,
    val limit: Int,
    val totalPages: Int
)

data class CategoryBreakdown(
    val type: String,
    val category: String,
    val total: Double
)

data class TransactionSummaryResponse(
    val month: Int,
    val year: Int,
    val income: Double,
    val expense: Double,
    val net: Double,
    val categoryBreakdown: List<CategoryBreakdown>
)
