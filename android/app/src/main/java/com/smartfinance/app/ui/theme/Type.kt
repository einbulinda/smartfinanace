package com.smartfinance.app.ui.theme

import androidx.compose.material3.Typography
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.sp

val Typography = Typography(
    headlineMedium = TextStyle(fontWeight = FontWeight.Bold, fontSize = 24.sp),
    titleLarge     = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp),
    titleMedium    = TextStyle(fontWeight = FontWeight.Medium, fontSize = 16.sp),
    bodyLarge      = TextStyle(fontSize = 16.sp),
    bodyMedium     = TextStyle(fontSize = 14.sp),
    labelSmall     = TextStyle(fontSize = 11.sp, fontWeight = FontWeight.Medium)
)
