package com.smartfinance.app.ui.debts

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

private val DEBT_TYPES = listOf("BANK_LOAN", "SACCO", "CREDIT_CARD", "PERSONAL", "MORTGAGE", "OTHER")

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun AddDebtScreen(
    viewModel: DebtViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    var name           by remember { mutableStateOf("") }
    var type           by remember { mutableStateOf("") }
    var originalAmount by remember { mutableStateOf("") }
    var currentBalance by remember { mutableStateOf("") }
    var interestRate   by remember { mutableStateOf("") }
    var minimumPayment by remember { mutableStateOf("") }
    var dueDay         by remember { mutableStateOf("") }
    var startDate      by remember { mutableStateOf(LocalDate.now().toString()) }
    var typeExpanded   by remember { mutableStateOf(false) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Add Debt") },
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
            OutlinedTextField(
                value = name, onValueChange = { name = it },
                label = { Text("Debt Name") },
                modifier = Modifier.fillMaxWidth(), singleLine = true
            )

            ExposedDropdownMenuBox(expanded = typeExpanded, onExpandedChange = { typeExpanded = it }) {
                OutlinedTextField(
                    value = type.replace('_', ' '),
                    onValueChange = {},
                    readOnly = true,
                    label = { Text("Debt Type") },
                    trailingIcon = { Icon(Icons.Filled.ArrowDropDown, null) },
                    modifier = Modifier.fillMaxWidth().menuAnchor()
                )
                ExposedDropdownMenu(expanded = typeExpanded, onDismissRequest = { typeExpanded = false }) {
                    DEBT_TYPES.forEach { t ->
                        DropdownMenuItem(
                            text = { Text(t.replace('_', ' ')) },
                            onClick = { type = t; typeExpanded = false }
                        )
                    }
                }
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = originalAmount, onValueChange = { originalAmount = it },
                    label = { Text("Original Amount") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                )
                OutlinedTextField(
                    value = currentBalance, onValueChange = { currentBalance = it },
                    label = { Text("Current Balance") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                )
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = interestRate, onValueChange = { interestRate = it },
                    label = { Text("Interest Rate (%)") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                )
                OutlinedTextField(
                    value = minimumPayment, onValueChange = { minimumPayment = it },
                    label = { Text("Min Payment") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Decimal), singleLine = true
                )
            }

            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                OutlinedTextField(
                    value = dueDay, onValueChange = { dueDay = it },
                    label = { Text("Due Day (1-31)") }, modifier = Modifier.weight(1f),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Number), singleLine = true
                )
                OutlinedTextField(
                    value = startDate, onValueChange = { startDate = it },
                    label = { Text("Start Date") }, modifier = Modifier.weight(1f), singleLine = true
                )
            }

            val origVal = originalAmount.toDoubleOrNull()
            val currVal = currentBalance.toDoubleOrNull() ?: origVal
            val rateVal = interestRate.toDoubleOrNull() ?: 0.0
            val canSave = name.isNotBlank() && type.isNotBlank() && origVal != null

            Button(
                onClick = {
                    viewModel.add(
                        name = name, type = type,
                        originalAmount = origVal!!,
                        currentBalance = currVal ?: origVal,
                        interestRate = rateVal,
                        minimumPayment = minimumPayment.toDoubleOrNull(),
                        dueDate = dueDay.toIntOrNull(),
                        startDate = startDate
                    )
                    onBack()
                },
                modifier = Modifier.fillMaxWidth().height(48.dp),
                enabled = canSave
            ) {
                Text("Save Debt")
            }
        }
    }
}
