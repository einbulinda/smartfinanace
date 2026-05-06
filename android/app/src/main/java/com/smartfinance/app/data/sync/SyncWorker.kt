package com.smartfinance.app.data.sync

import android.content.Context
import androidx.hilt.work.HiltWorker
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import com.smartfinance.app.domain.repository.DebtRepository
import com.smartfinance.app.domain.repository.TransactionRepository
import dagger.assisted.Assisted
import dagger.assisted.AssistedInject

@HiltWorker
class SyncWorker @AssistedInject constructor(
    @Assisted context: Context,
    @Assisted params: WorkerParameters,
    private val transactionRepository: TransactionRepository,
    private val debtRepository: DebtRepository
) : CoroutineWorker(context, params) {

    override suspend fun doWork(): Result {
        return runCatching {
            transactionRepository.sync()
            debtRepository.sync()
        }.fold(
            onSuccess = { Result.success() },
            onFailure = { Result.retry() }
        )
    }

    companion object {
        const val WORK_NAME = "SmartFinanceSyncWorker"
    }
}
