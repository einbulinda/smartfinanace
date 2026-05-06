package com.smartfinance.app.ui.debts

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartfinance.app.domain.model.Debt
import com.smartfinance.app.domain.repository.DebtRepository
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.time.LocalDate
import javax.inject.Inject

@HiltViewModel
class DebtViewModel @Inject constructor(
    private val repository: DebtRepository
) : ViewModel() {

    val activeDebts = repository.getActive()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), emptyList<Debt>())

    val totalDebt = repository.getTotalDebt()
        .stateIn(viewModelScope, SharingStarted.WhileSubscribed(5_000), 0.0)

    fun add(
        name: String, type: String, originalAmount: Double, currentBalance: Double,
        interestRate: Double, minimumPayment: Double?, dueDate: Int?, startDate: String
    ) {
        viewModelScope.launch {
            repository.save(
                Debt(
                    name = name, type = type, originalAmount = originalAmount,
                    currentBalance = currentBalance, interestRate = interestRate,
                    minimumPayment = minimumPayment, dueDate = dueDate, startDate = startDate
                )
            )
        }
    }

    fun delete(debt: Debt) {
        viewModelScope.launch { repository.delete(debt) }
    }
}
