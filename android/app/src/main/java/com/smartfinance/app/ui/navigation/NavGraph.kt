package com.smartfinance.app.ui.navigation

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import com.smartfinance.app.ui.auth.LoginScreen
import com.smartfinance.app.ui.auth.RegisterScreen
import com.smartfinance.app.ui.components.BottomNavBar
import com.smartfinance.app.ui.dashboard.DashboardScreen
import com.smartfinance.app.ui.debts.AddDebtScreen
import com.smartfinance.app.ui.debts.DebtListScreen
import com.smartfinance.app.ui.optimizer.OptimizerScreen
import com.smartfinance.app.ui.transactions.AddTransactionScreen
import com.smartfinance.app.ui.transactions.TransactionListScreen
import com.smartfinance.app.util.PreferencesKeys
import kotlinx.coroutines.flow.map

@Composable
fun AppNavGraph(navController: NavHostController, dataStore: DataStore<Preferences>) {
    val isLoggedIn by dataStore.data
        .map { it[PreferencesKeys.ACCESS_TOKEN] != null }
        .collectAsState(initial = null)

    when (isLoggedIn) {
        null -> Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            CircularProgressIndicator()
        }
        else -> {
            val start = if (isLoggedIn == true) Screen.Dashboard.route else Screen.Login.route
            NavHost(navController = navController, startDestination = start) {

                composable(Screen.Login.route) {
                    LoginScreen(
                        onLoginSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        },
                        onNavigateToRegister = { navController.navigate(Screen.Register.route) }
                    )
                }

                composable(Screen.Register.route) {
                    RegisterScreen(
                        onRegisterSuccess = {
                            navController.navigate(Screen.Dashboard.route) {
                                popUpTo(Screen.Login.route) { inclusive = true }
                            }
                        },
                        onNavigateToLogin = { navController.popBackStack() }
                    )
                }

                composable(Screen.Dashboard.route) {
                    MainScaffold(navController, Screen.Dashboard.route) {
                        DashboardScreen(onLogout = {
                            navController.navigate(Screen.Login.route) {
                                popUpTo(0) { inclusive = true }
                            }
                        })
                    }
                }

                composable(Screen.Transactions.route) {
                    MainScaffold(navController, Screen.Transactions.route) {
                        TransactionListScreen(
                            onAddTransaction = { navController.navigate(Screen.AddTransaction.route) }
                        )
                    }
                }

                composable(Screen.AddTransaction.route) {
                    AddTransactionScreen(onBack = { navController.popBackStack() })
                }

                composable(Screen.Debts.route) {
                    MainScaffold(navController, Screen.Debts.route) {
                        DebtListScreen(onAddDebt = { navController.navigate(Screen.AddDebt.route) })
                    }
                }

                composable(Screen.AddDebt.route) {
                    AddDebtScreen(onBack = { navController.popBackStack() })
                }

                composable(Screen.Optimizer.route) {
                    MainScaffold(navController, Screen.Optimizer.route) { OptimizerScreen() }
                }
            }
        }
    }
}

@Composable
private fun MainScaffold(
    navController: NavHostController,
    currentRoute: String,
    content: @Composable () -> Unit
) {
    Scaffold(bottomBar = { BottomNavBar(navController, currentRoute) }) { padding ->
        Box(Modifier.padding(padding)) { content() }
    }
}
