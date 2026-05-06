package com.smartfinance.app.data.local.entity

import androidx.room.Entity
import androidx.room.PrimaryKey

@Entity(tableName = "transactions")
data class TransactionEntity(
    @PrimaryKey(autoGenerate = true) val localId: Long = 0,
    val remoteId: String? = null,       // UUID from server, null until synced
    val type: String,                    // "INCOME" | "EXPENSE"
    val amount: Double,
    val category: String,
    val description: String? = null,
    val date: String,                    // "YYYY-MM-DD"
    val isRecurring: Boolean = false,
    val recurringFrequency: String? = null,
    val createdAt: String? = null,
    val isSynced: Boolean = false        // false = pending push to server
)
