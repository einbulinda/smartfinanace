package com.smartfinance.app.ui.dashboard

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartfinance.app.domain.model.Transaction
import com.smartfinance.app.domain.repository.DebtRepository
import com.smartfinance.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.flow.stateIn
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class DashboardViewModel @Inject constructor(
    transactionRepo: TransactionRepository,
    debtRepo: DebtRepository
) : ViewModel() {

    private val now   = LocalDate.now()
    private val month = "%02d".format(now.monthValue)
    private val year  = now.year.toString()

    val monthlyIncome = transactionRepo.getMonthlyIncome(month, year)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    val monthlyExpense = transactionRepo.getMonthlyExpense(month, year)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    val totalDebt = debtRepo.getTotalDebt()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    val recentTransactions = transactionRepo.getAll()
        .map { it.take(5) }
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<Transaction>())
}
