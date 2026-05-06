package com.smartfinance.app.domain.repository

import com.smartfinance.app.domain.model.Debt
import kotlinx.coroutines.flow.Flow

interface DebtRepository {
    fun getAll(): Flow<List<Debt>>
    fun getActive(): Flow<List<Debt>>
    fun getTotalDebt(): Flow<Double>
    suspend fun save(debt: Debt): Long
    suspend fun delete(debt: Debt)
    suspend fun sync()
}
