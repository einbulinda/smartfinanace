package com.smartfinance.app.data.repository

import com.smartfinance.app.data.local.dao.DebtDao
import com.smartfinance.app.data.local.entity.DebtEntity
import com.smartfinance.app.data.remote.api.SmartFinanceApi
import com.smartfinance.app.data.remote.dto.CreateDebtRequest
import com.smartfinance.app.domain.model.Debt
import com.smartfinance.app.domain.repository.DebtRepository
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.map
import javax.inject.Inject
import javax.inject.Singleton

@Singleton
class DebtRepositoryImpl @Inject constructor(
    private val dao: DebtDao,
    private val api: SmartFinanceApi
) : DebtRepository {

    override fun getAll(): Flow<List<Debt>> =
        dao.getAll().map { list -> list.map { it.toDomain() } }

    override fun getActive(): Flow<List<Debt>> =
        dao.getActive().map { list -> list.map { it.toDomain() } }

    override fun getTotalDebt(): Flow<Double> = dao.getTotalDebt()

    override suspend fun save(debt: Debt): Long {
        val id = dao.insert(debt.toEntity())
        sync()
        return id
    }

    override suspend fun delete(debt: Debt) {
        dao.delete(debt.toEntity())
        debt.remoteId?.let { runCatching { api.deleteDebt(it) } }
    }

    override suspend fun sync() {
        dao.getUnsynced().forEach { entity ->
            runCatching {
                val remoteId = if (entity.remoteId == null) {
                    api.createDebt(entity.toCreateRequest()).id
                } else {
                    api.updateDebt(entity.remoteId, entity.toCreateRequest()).id
                }
                dao.markSynced(entity.localId, remoteId)
            }
        }
    }
}

private fun DebtEntity.toDomain() = Debt(
    localId = localId,
    remoteId = remoteId,
    name = name,
    type = type,
    originalAmount = originalAmount,
    currentBalance = currentBalance,
    interestRate = interestRate,
    minimumPayment = minimumPayment,
    dueDate = dueDate,
    startDate = startDate,
    endDate = endDate,
    isPaidOff = isPaidOff,
    updatedAt = updatedAt,
    isSynced = isSynced
)

private fun Debt.toEntity() = DebtEntity(
    localId = localId,
    remoteId = remoteId,
    name = name,
    type = type,
    originalAmount = originalAmount,
    currentBalance = currentBalance,
    interestRate = interestRate,
    minimumPayment = minimumPayment,
    dueDate = dueDate,
    startDate = startDate,
    endDate = endDate,
    isPaidOff = isPaidOff,
    updatedAt = updatedAt,
    isSynced = isSynced
)

private fun DebtEntity.toCreateRequest() = CreateDebtRequest(
    name = name,
    type = type,
    originalAmount = originalAmount,
    currentBalance = currentBalance,
    interestRate = interestRate,
    minimumPayment = minimumPayment,
    dueDate = dueDate,
    startDate = startDate,
    endDate = endDate
)
