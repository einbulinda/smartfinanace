package com.smartfinance.app.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.navigation.compose.rememberNavController
import com.smartfinance.app.ui.navigation.AppNavGraph
import com.smartfinance.app.ui.theme.SmartFinanceTheme
import dagger.hilt.android.AndroidEntryPoint
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var dataStore: DataStore<Preferences>

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartFinanceTheme {
                val navController = rememberNavController()
                AppNavGraph(navController = navController, dataStore = dataStore)
            }
        }
    }
}
