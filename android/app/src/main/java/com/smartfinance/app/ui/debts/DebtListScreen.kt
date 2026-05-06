package com.smartfinance.app.ui.debts

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
import com.smartfinance.app.domain.model.Debt
import com.smartfinance.app.ui.theme.ExpenseRed

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DebtListScreen(
    viewModel: DebtViewModel = hiltViewModel(),
    onAddDebt: () -> Unit
) {
    val debts     by viewModel.activeDebts.collectAsState()
    val totalDebt by viewModel.totalDebt.collectAsState()

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Debts") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = onAddDebt) {
                Icon(Icons.Filled.Add, contentDescription = "Add Debt")
            }
        }
    ) { padding ->
        Column(Modifier.fillMaxSize().padding(padding)) {
            // Total debt banner
            Surface(color = MaterialTheme.colorScheme.errorContainer) {
                Row(
                    Modifier.fillMaxWidth().padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Total Outstanding Debt", style = MaterialTheme.typography.titleMedium)
                    Text(
                        "KES %,.2f".format(totalDebt),
                        style = MaterialTheme.typography.titleMedium,
                        color = ExpenseRed
                    )
                }
            }

            if (debts.isEmpty()) {
                Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Text("No active debts", color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.5f))
                }
            } else {
                LazyColumn(contentPadding = PaddingValues(bottom = 88.dp)) {
                    items(debts, key = { it.localId }) { debt ->
                        DebtItem(debt, onDelete = { viewModel.delete(debt) })
                    }
                }
            }
        }
    }
}

@Composable
private fun DebtItem(debt: Debt, onDelete: () -> Unit) {
    ListItem(
        headlineContent = { Text(debt.name) },
        supportingContent = {
            Column {
                Text("${debt.type.replace('_', ' ')} · ${debt.interestRate}% p.a.")
                if (debt.minimumPayment != null) {
                    Text("Min payment: KES %,.2f".format(debt.minimumPayment))
                }
            }
        },
        trailingContent = {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Column(horizontalAlignment = Alignment.End) {
                    Text(
                        "KES %,.2f".format(debt.currentBalance),
                        style = MaterialTheme.typography.bodyMedium,
                        color = ExpenseRed
                    )
                    Text(
                        "of KES %,.2f".format(debt.originalAmount),
                        style = MaterialTheme.typography.bodySmall,
                        color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.6f)
                    )
                }
                IconButton(onClick = onDelete) {
                    Icon(Icons.Filled.Delete, contentDescription = "Delete", tint = MaterialTheme.colorScheme.error)
                }
            }
        }
    )
    HorizontalDivider()
}
