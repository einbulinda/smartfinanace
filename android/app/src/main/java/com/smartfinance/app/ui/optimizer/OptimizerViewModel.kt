package com.smartfinance.app.ui.optimizer

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartfinance.app.data.remote.api.SmartFinanceApi
import com.smartfinance.app.data.remote.dto.CompareRequest
import com.smartfinance.app.data.remote.dto.ComparisonResponse
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class OptimizerViewModel @Inject constructor(
    private val api: SmartFinanceApi
) : ViewModel() {

    var monthlyBudget by mutableStateOf("")
    var result        by mutableStateOf<ComparisonResponse?>(null)
    var isLoading     by mutableStateOf(false)
    var errorMessage  by mutableStateOf<String?>(null)

    fun compare() {
        val budget = monthlyBudget.toDoubleOrNull() ?: return
        viewModelScope.launch {
            isLoading    = true
            errorMessage = null
            runCatching { api.compare(CompareRequest(budget)) }
                .onSuccess { result = it }
                .onFailure { errorMessage = it.message ?: "Could not run optimizer" }
            isLoading = false
        }
    }
}
