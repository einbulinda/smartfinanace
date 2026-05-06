package com.smartfinance.app.domain.model

data class Transaction(
    val localId: Long = 0,
    val remoteId: String? = null,
    val type: String,
    val amount: Double,
    val category: String,
    val description: String? = null,
    val date: String,
    val isRecurring: Boolean = false,
    val recurringFrequency: String? = null,
    val createdAt: String? = null,
    val isSynced: Boolean = false
)
