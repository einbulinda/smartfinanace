package com.smartfinance.app.ui.transactions

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Delete
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartfinance.app.domain.model.Transaction
import com.smartfinance.app.ui.theme.ExpenseRed
import com.smartfinance.app.ui.theme.IncomeGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TransactionListScreen(
    viewModel: TransactionViewModel = hiltViewModel(),
    onAddTransaction: () -> Unit
) {
    val allTransactions by viewModel.transactions.collectAsState()
    val income          by viewModel.monthlyIncome.collectAsState()
    val expense         by viewModel.monthlyExpense.collectAsState()

    var selectedFilter by remember { mutableStateOf("All") }
    val filters = listOf("All", "Income", "Expense")

    val displayed = when (selectedFilter) {
        "Income"  -> allTransactions.filter { it.type == "INCOME" }
        "Expense" -> allTransactions.filter { it.type == "EXPENSE" }
        else      -> allTransactions
    }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Transactions") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddTransaction) {
                Icon(Icons.Filled.Add, contentDescription = "Add Transaction")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Monthly summary strip
            Row(
                Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceAround
            ) {
                AmountChip("Income", income, IncomeGreen)
                AmountChip("Expenses", expense, ExpenseRed)
                AmountChip("Net", income - expense, if (income >= expense) IncomeGreen else ExpenseRed)
            }

            // Filter tabs
            TabRow(selectedTabIndex = filters.indexOf(selectedFilter)) {
                filters.forEachIndexed { index, label ->
                    Tab(
                        selected = selectedFilter == label,
                        onClick  = { selectedFilter = label },
                        text     = { Text(label) }
                    )
                }
            }

            if (displayed.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No transactions yet", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                }
            } else {
                LazyColumn(
                    contentPadding = PaddingValues(bottom = 88.dp),
                    verticalArrangement = Arrangement.spacedBy(0.dp)
                ) {
                    items(displayed, key = { it.localId }) { tx ->
                        TransactionItem(tx, onDelete = { viewModel.delete(tx) })
                    }
                }
            }
        }
    }
}

@Composable
private fun AmountChip(label: String, amount: Double, color: androidx.compose.ui.graphics.Color) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(label, style = MaterialTheme.typography.labelSmall)
        Text("KES %,.0f".format(amount), style = MaterialTheme.typography.bodyMedium, color = color)
    }
}

@Composable
private fun TransactionItem(tx: Transaction, onDelete: () -> Unit) {
    ListItem(
        headlineContent = { Text(tx.category) },
        supportingContent = { Text(tx.date) },
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(
                    (if (tx.type == "INCOME") "+" else "-") + "KES %,.2f".format(tx.amount),
                    color = if (tx.type == "INCOME") IncomeGreen else ExpenseRed,
                    style = MaterialTheme.typography.bodyMedium
                )
                IconButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    )
    HorizontalDivider()
}
