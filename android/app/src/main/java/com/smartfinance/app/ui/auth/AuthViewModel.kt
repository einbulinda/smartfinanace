package com.smartfinance.app.ui.auth

import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.smartfinance.app.data.remote.api.SmartFinanceApi
import com.smartfinance.app.data.remote.dto.AuthResponse
import com.smartfinance.app.data.remote.dto.LoginRequest
import com.smartfinance.app.data.remote.dto.RegisterRequest
import com.smartfinance.app.util.PreferencesKeys
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.launch
import javax.inject.Inject

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val api: SmartFinanceApi,
    private val dataStore: DataStore<Preferences>
) : ViewModel() {

    var isLoading by mutableStateOf(false)
        private set
    var errorMessage by mutableStateOf<String?>(null)
        private set

    fun login(email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            runCatching { api.login(LoginRequest(email.trim(), password)) }
                .onSuccess { saveAuthData(it); onSuccess() }
                .onFailure { errorMessage = it.message ?: "Login failed" }
            isLoading = false
        }
    }

    fun register(firstName: String, lastName: String, email: String, password: String, onSuccess: () -> Unit) {
        viewModelScope.launch {
            isLoading = true
            errorMessage = null
            runCatching {
                api.register(RegisterRequest(email.trim(), password, firstName.trim(), lastName.trim()))
            }
                .onSuccess { saveAuthData(it); onSuccess() }
                .onFailure { errorMessage = it.message ?: "Registration failed" }
            isLoading = false
        }
    }

    fun logout(onComplete: () -> Unit) {
        viewModelScope.launch {
            dataStore.edit { it.clear() }
            onComplete()
        }
    }

    private suspend fun saveAuthData(response: AuthResponse) {
        dataStore.edit { prefs ->
            prefs[PreferencesKeys.ACCESS_TOKEN] = response.accessToken
            prefs[PreferencesKeys.USER_ID]      = response.user.id
            prefs[PreferencesKeys.USER_EMAIL]   = response.user.email
        }
    }
}
