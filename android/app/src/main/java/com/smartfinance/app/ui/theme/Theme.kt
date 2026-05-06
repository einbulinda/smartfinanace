package com.smartfinance.app.ui.theme

import android.app.Activity
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.SideEffect
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.toArgb
import androidx.compose.ui.platform.LocalView
import androidx.core.view.WindowCompat

private val LightColors = lightColorScheme(
    primary          = Green700,
    onPrimary        = Color.White,
    primaryContainer = Green50,
    onPrimaryContainer = Green900,
    secondary        = Amber500,
    onSecondary      = Color.Black,
    background       = Color(0xFFF5F5F5),
    onBackground     = Color.Black,
    surface          = Color.White,
    onSurface        = Color.Black,
    error            = ExpenseRed,
    onError          = Color.White,
)

private val DarkColors = darkColorScheme(
    primary          = Green500,
    onPrimary        = Color.Black,
    primaryContainer = Green900,
    onPrimaryContainer = Green50,
    secondary        = Amber500,
    onSecondary      = Color.Black,
    background       = DarkBackground,
    onBackground     = Color.White,
    surface          = DarkSurface,
    onSurface        = Color.White,
    error            = Color(0xFFCF6679),
    onError          = Color.Black,
)

@Composable
fun SmartFinanceTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    val colorScheme = if (darkTheme) DarkColors else LightColors
    val view = LocalView.current
    if (!view.isInEditMode) {
        SideEffect {
            val window = (view.context as Activity).window
            @Suppress("DEPRECATION")
            window.statusBarColor = colorScheme.primary.toArgb()
            WindowCompat.getInsetsController(window, view).isAppearanceLightStatusBars = !darkTheme
        }
    }
    MaterialTheme(colorScheme = colorScheme, typography = Typography, content = content)
}
