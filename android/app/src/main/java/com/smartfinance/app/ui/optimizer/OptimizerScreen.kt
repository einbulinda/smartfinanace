package com.smartfinance.app.ui.optimizer

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import com.smartfinance.app.data.remote.dto.OptimizationResult
import com.smartfinance.app.ui.theme.ExpenseRed
import com.smartfinance.app.ui.theme.IncomeGreen

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun OptimizerScreen(viewModel: OptimizerViewModel = hiltViewModel()) {
    val result  = viewModel.result

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Debt Optimizer") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary
                )
            )
        }
    ) { padding ->
        Column(
            Modifier
                .fillMaxSize()
                .padding(padding)
                .verticalScroll(rememberScrollState())
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            Text(
                "Enter your monthly debt payment budget to see which strategy pays off your debt faster.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f)
            )

            Row(
                Modifier.fillMaxWidth(),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                OutlinedTextField(
                    value = viewModel.monthlyBudget,
                    onValueChange = { viewModel.monthlyBudget = it },
                    label = { Text("Monthly Budget (KES)") },
                    modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                    singleLine = true
                )
                Button(
                    onClick = { viewModel.compare() },
                    enabled = viewModel.monthlyBudget.toDoubleOrNull() != null && !viewModel.isLoading
                ) {
                    Text("Compare")
                }
            }

            viewModel.errorMessage?.let {
                Text(it, color = MaterialTheme.colorScheme.error, style = MaterialTheme.typography.bodySmall)
            }

            if (viewModel.isLoading) {
                Box(Modifier.fillMaxWidth(), contentAlignment = Alignment.Center) {
                    CircularProgressIndicator()
                }
            }

            if (result != null) {
                StrategyCard("Avalanche", result.avalanche, isRecommended = true)
                StrategyCard("Snowball", result.snowball, isRecommended = false)

                val monthsSaved   = result.avalanche.monthsSaved
                val interestSaved = result.avalanche.interestSaved

                if (monthsSaved > 0 || interestSaved > 0) {
                    ElevatedCard(Modifier.fillMaxWidth()) {
                        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(4.dp)) {
                            Text("Avalanche vs Snowball", style = MaterialTheme.typography.titleMedium)
                            if (monthsSaved > 0)
                                Text("Saves $monthsSaved months", color = IncomeGreen)
                            if (interestSaved > 0)
                                Text("Saves KES %,.2f in interest".format(interestSaved), color = IncomeGreen)
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun StrategyCard(name: String, result: OptimizationResult, isRecommended: Boolean) {
    ElevatedCard(Modifier.fillMaxWidth()) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
            Row(
                Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Text(name, style = MaterialTheme.typography.titleMedium, fontWeight = FontWeight.Bold)
                if (isRecommended) {
                    SuggestionChip(onClick = {}, label = { Text("Recommended") })
                }
            }
            HorizontalDivider()
            ResultRow("Months to payoff", "${result.totalMonths} months")
            ResultRow("Debt-free date", result.debtFreeDate)
            ResultRow("Total interest paid", "KES %,.2f".format(result.totalInterestPaid))
            ResultRow("Total paid", "KES %,.2f".format(result.totalInterestPaid + result.monthlyBudget * result.totalMonths),
                color = ExpenseRed)
        }
    }
}

@Composable
private fun ResultRow(label: String, value: String, color: androidx.compose.ui.graphics.Color = MaterialTheme.colorScheme.onSurface) {
    Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
        Text(label, style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface.copy(alpha = 0.7f))
        Text(value, style = MaterialTheme.typography.bodyMedium, fontWeight = FontWeight.Medium, color = color)
    }
}
