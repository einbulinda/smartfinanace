package com.smartfinance.app.ui.dashboard

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowDownward
import androidx.compose.material.icons.filled.ArrowUpward
import androidx.compose.material.icons.filled.Logout
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartfinance.app.domain.model.Transaction
import com.smartfinance.app.ui.auth.AuthViewModel
import com.smartfinance.app.ui.theme.ExpenseRed
import com.smartfinance.app.ui.theme.IncomeGreen
import java.time.LocalDate
import java.time.format.TextStyle
import java.util.Locale

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DashboardScreen(
    viewModel: DashboardViewModel = hiltViewModel(),
    authViewModel: AuthViewModel = hiltViewModel(),
    onLogout: () -> Unit
) {
    val income     by viewModel.monthlyIncome.collectAsState()
    val expense    by viewModel.monthlyExpense.collectAsState()
    val totalDebt  by viewModel.totalDebt.collectAsState()
    val recent     by viewModel.recentTransactions.collectAsState()

    val monthName = LocalDate.now().month.getDisplayName(TextStyle.FULL, Locale.getDefault())

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Dashboard") },
                actions = {
                    IconButton(onClick = { authViewModel.logout(onLogout) }) {
                        Icon(Icons.Filled.Logout, contentDescription = "Logout")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    actionIconContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        LazyColumn(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            contentPadding = PaddingValues(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            item {
                Text(
                    "$monthName Overview",
                    style = MaterialTheme.typography.titleLarge
                )
            }

            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Income",
                        amount = income,
                        icon = { Icon(Icons.Filled.ArrowUpward, null, tint = IncomeGreen) }
                    )
                    SummaryCard(
                        modifier = Modifier.weight(1f),
                        label = "Expenses",
                        amount = expense,
                        icon = { Icon(Icons.Filled.ArrowDownward, null, tint = ExpenseRed) }
                    )
                }
            }

            item {
                val net = income - expense
                ElevatedCard(Modifier.fillMaxWidth()) {
                    Row(
                        Modifier.fillMaxWidth().padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column {
                            Text("Net Savings", style = MaterialTheme.typography.labelSmall)
                            Text(net.toKES(), style = MaterialTheme.typography.titleMedium,
                                color = if (net >= 0) IncomeGreen else ExpenseRed)
                        }
                        Column(horizontalAlignment = Alignment.End) {
                            Text("Total Debt", style = MaterialTheme.typography.labelSmall)
                            Text(totalDebt.toKES(), style = MaterialTheme.typography.titleMedium,
                                color = ExpenseRed)
                        }
                    }
                }
            }

            if (recent.isNotEmpty()) {
                item { Text("Recent Transactions", style = MaterialTheme.typography.titleMedium) }
                items(recent) { tx -> TransactionRow(tx) }
            }
        }
    }
}

@Composable
private fun SummaryCard(modifier: Modifier, label: String, amount: Double, icon: @Composable () -> Unit) {
    ElevatedCard(modifier) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                icon()
                Text(label, style = MaterialTheme.typography.labelSmall)
            }
            Text(amount.toKES(), style = MaterialTheme.typography.titleMedium)
        }
    }
}

@Composable
private fun TransactionRow(tx: Transaction) {
    Row(
        Modifier.fillMaxWidth().padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
    ) {
        Column {
            Text(tx.category, style = MaterialTheme.typography.bodyMedium)
            Text(tx.date, style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f))
        }
        Text(
            (if (tx.type == "INCOME") "+" else "-") + tx.amount.toKES(),
            style = MaterialTheme.typography.bodyMedium,
            color = if (tx.type == "INCOME") IncomeGreen else ExpenseRed
        )
    }
    HorizontalDivider()
}

private fun Double.toKES() = "KES %,.2f".format(this)
