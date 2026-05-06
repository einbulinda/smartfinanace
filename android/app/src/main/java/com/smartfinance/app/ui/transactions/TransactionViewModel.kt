package com.smartfinance.app.ui.transactions

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartfinance.app.domain.model.Transaction
import com.smartfinance.app.domain.repository.TransactionRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class TransactionViewModel @Inject constructor(
    private val repository: TransactionRepository
) : ViewModel() {

    private val now   = LocalDate.now()
    private val month = "%02d".format(now.monthValue)
    private val year  = now.year.toString()

    val transactions = repository.getAll()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<Transaction>())

    val monthlyIncome = repository.getMonthlyIncome(month, year)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    val monthlyExpense = repository.getMonthlyExpense(month, year)
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    fun add(type: String, amount: Double, category: String, description: String?, date: String) {
        viewModelScope.launch {
            repository.save(
                Transaction(type = type, amount = amount, category = category,
                    description = description, date = date)
            )
        }
    }

    fun delete(transaction: Transaction) {
        viewModelScope.launch { repository.delete(transaction) }
    }
}
