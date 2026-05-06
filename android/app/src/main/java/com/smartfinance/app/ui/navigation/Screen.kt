package com.smartfinance.app.ui.navigation

sealed class Screen(val route: String) {
    object Login          : Screen("login")
    object Register       : Screen("register")
    object Dashboard      : Screen("dashboard")
    object Transactions   : Screen("transactions")
    object AddTransaction : Screen("add_transaction")
    object Debts          : Screen("debts")
    object AddDebt        : Screen("add_debt")
    object Optimizer      : Screen("optimizer")
}
