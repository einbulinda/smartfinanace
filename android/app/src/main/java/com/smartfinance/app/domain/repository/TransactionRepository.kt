package com.smartfinance.app.domain.repository

import com.smartfinance.app.domain.model.Transaction
import kotlinx.coroutines.flow.Flow

interface TransactionRepository {
    fun getAll(): Flow<List<Transaction>>
    fun getByType(type: String): Flow<List<Transaction>>
    fun getByMonth(month: String, year: String): Flow<List<Transaction>>
    fun getMonthlyIncome(month: String, year: String): Flow<Double>
    fun getMonthlyExpense(month: String, year: String): Flow<Double>
    suspend fun save(transaction: Transaction): Long
    suspend fun delete(transaction: Transaction)
    suspend fun sync()
}
