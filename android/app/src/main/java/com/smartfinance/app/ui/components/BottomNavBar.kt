package com.smartfinance.app.ui.components

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccountBalance
import androidx.compose.material.icons.filled.AutoGraph
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.ReceiptLong
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.navigation.NavHostController
import com.smartfinance.app.ui.navigation.Screen

private data class NavItem(val label: String, val icon: ImageVector, val route: String)

@Composable
fun BottomNavBar(navController: NavHostController, currentRoute: String) {
    val items = listOf(
        NavItem("Dashboard",     Icons.Filled.Home,           Screen.Dashboard.route),
        NavItem("Transactions",  Icons.Filled.ReceiptLong,    Screen.Transactions.route),
        NavItem("Debts",         Icons.Filled.AccountBalance, Screen.Debts.route),
        NavItem("Optimizer",     Icons.Filled.AutoGraph,      Screen.Optimizer.route),
    )

    NavigationBar {
        items.forEach { item ->
            NavigationBarItem(
                icon    = { Icon(item.icon, contentDescription = item.label) },
                label   = { Text(item.label) },
                selected = currentRoute == item.route,
                onClick = {
                    if (currentRoute != item.route) {
                        navController.navigate(item.route) {
                            popUpTo(Screen.Dashboard.route) { saveState = true }
                            launchSingleTop = true
                            restoreState    = true
                        }
                    }
                }
            )
        }
    }
}
