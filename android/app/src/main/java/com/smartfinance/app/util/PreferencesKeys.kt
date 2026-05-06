package com.smartfinance.app.util

import androidx.datastore.preferences.core.stringPreferencesKey

object PreferencesKeys {
    val ACCESS_TOKEN = stringPreferencesKey("access_token")
    val USER_ID = stringPreferencesKey("user_id")
    val USER_EMAIL = stringPreferencesKey("user_email")
}
