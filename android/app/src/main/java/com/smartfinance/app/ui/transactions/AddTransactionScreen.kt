package com.smartfinance.app.ui.transactions

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowBack
import androidx.compose.material.icons.filled.ArrowDropDown
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import java.time.LocalDate

private val INCOME_CATEGORIES  = listOf("Salary", "Business", "Investment", "Freelance", "Other")
private val EXPENSE_CATEGORIES = listOf("Food", "Transport", "Housing", "Health", "Education", "Entertainment", "Shopping", "Utilities", "Other")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddTransactionScreen(
    viewModel: TransactionViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    var type        by remember { mutableStateOf("EXPENSE") }
    var amount      by remember { mutableStateOf("") }
    var category    by remember { mutableStateOf("") }
    var description by remember { mutableStateOf("") }
    var date        by remember { mutableStateOf(LocalDate.now().toString()) }

    var categoryExpanded by remember { mutableStateOf(false) }

    val categories = if (type == "INCOME") INCOME_CATEGORIES else EXPENSE_CATEGORIES

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Transaction") },
                navigationIcon = {
                    IconButton(onClick = onBack) {
                        Icon(Icons.Filled.ArrowBack, contentDescription = "Back")
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primary,
                    titleContentColor = MaterialTheme.colorScheme.onPrimary,
                    navigationIconContentColor = MaterialTheme.colorScheme.onPrimary
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
            // Type toggle
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                listOf("INCOME", "EXPENSE").forEach { t ->
                    FilterChip(
                        selected = type == t,
                        onClick  = { type = t; category = "" },
                        label    = { Text(t.lowercase().replaceFirstChar { it.uppercase() }) },
                        modifier = Modifier.weight(1f)
                    )
                }
            }

            OutlinedTextField(
                value = amount,
                onValueChange = { amount = it },
                label = { Text("Amount (KES)") },
                modifier = Modifier.fillMaxWidth(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal),
                singleLine = true
            )

            // Category dropdown
            ExposedDropdownMenuBox(
                expanded = categoryExpanded,
                onExpandedChange = { categoryExpanded = it }
            ) {
                OutlinedTextField(
                    value = category,
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Category") },
                    trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(
                    expanded = categoryExpanded,
                    onDismissRequest = { categoryExpanded = false }
                ) {
                    categories.forEach { cat ->
                        DropdownMenuItem(
                            text = { Text(cat) },
                            onClick = { category = cat; categoryExpanded = false }
                        )
                    }
                }
            }

            OutlinedTextField(
                value = description,
                onValueChange = { description = it },
                label = { Text("Description (optional)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            OutlinedTextField(
                value = date,
                onValueChange = { date = it },
                label = { Text("Date (YYYY-MM-DD)") },
                modifier = Modifier.fillMaxWidth(),
                singleLine = true
            )

            val canSave = amount.toDoubleOrNull() != null && amount.toDouble() > 0 && category.isNotBlank()

            Button(
                onClick = {
                    viewModel.add(type, amount.toDouble(), category,
                        description.takeIf { it.isNotBlank() }, date)
                    onBack()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                enabled = canSave
            ) {
                Text("Save Transaction")
            }
        }
    }
}
