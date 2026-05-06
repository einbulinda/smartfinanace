package com.smartfinance.app.data.repository

import com.smartfinance.app.data.local.dao.TransactionDao
import com.smartfinance.app.data.local.entity.TransactionEntity
import com.smartfinance.app.data.remote.api.SmartFinanceApi
import com.smartfinance.app.data.remote.dto.CreateTransactionRequest
import com.smartfinance.app.domain.model.Transaction
import com.smartfinance.app.domain.repository.TransactionRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class TransactionRepositoryImpl @Inject constructor(
    private val dao: TransactionDao,
    private val api: SmartFinanceApi
) : TransactionRepository {

    override fun getAll(): Flow<List<Transaction>> =
        dao.getAll().map { list -> list.map { it.toDomain() } }

    override fun getByType(type: String): Flow<List<Transaction>> =
        dao.getByType(type).map { list -> list.map { it.toDomain() } }

    override fun getByMonth(month: String, year: String): Flow<List<Transaction>> =
        dao.getByMonth(month, year).map { list -> list.map { it.toDomain() } }

    override fun getMonthlyIncome(month: String, year: String): Flow<Double> =
        dao.getMonthlyIncome(month, year)

    override fun getMonthlyExpense(month: String, year: String): Flow<Double> =
        dao.getMonthlyExpense(month, year)

    override suspend fun save(transaction: Transaction): Long {
        val id = dao.insert(transaction.toEntity())
        sync()
        return id
    }

    override suspend fun delete(transaction: Transaction) {
        dao.delete(transaction.toEntity())
        transaction.remoteId?.let { runCatching { api.deleteTransaction(it) } }
    }

    override suspend fun sync() {
        dao.getUnsynced().forEach { entity ->
            runCatching {
                val remoteId = if (entity.remoteId == null) {
                    api.createTransaction(entity.toCreateRequest()).id
                } else {
                    api.updateTransaction(entity.remoteId, entity.toCreateRequest()).id
                }
                dao.markSynced(entity.localId, remoteId)
            }
        }
    }
}

private fun TransactionEntity.toDomain() = Transaction(
    localId = localId,
    remoteId = remoteId,
    type = type,
    amount = amount,
    category = category,
    description = description,
    date = date,
    isRecurring = isRecurring,
    recurringFrequency = recurringFrequency,
    createdAt = createdAt,
    isSynced = isSynced
)

private fun Transaction.toEntity() = TransactionEntity(
    localId = localId,
    remoteId = remoteId,
    type = type,
    amount = amount,
    category = category,
    description = description,
    date = date,
    isRecurring = isRecurring,
    recurringFrequency = recurringFrequency,
    createdAt = createdAt,
    isSynced = isSynced
)

private fun TransactionEntity.toCreateRequest() = CreateTransactionRequest(
    type = type,
    amount = amount,
    category = category,
    description = description,
    date = date,
    isRecurring = isRecurring,
    recurringFrequency = recurringFrequency
)
