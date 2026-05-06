package com.smartfinance.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "debts")
data class DebtEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val remoteId: String? = null,
    val name: String,
    val type: String,
    val originalAmount: Double,
    val currentBalance: Double,
    val interestRate: Double = 0.0,
    val minimumPayment: Double? = null,
    val dueDate: Int? = null,
    val startDate: String,
    val endDate: String? = null,
    val isPaidOff: Boolean = false,
    val updatedAt: String? = null,
    val isSynced: Boolean = false
)
