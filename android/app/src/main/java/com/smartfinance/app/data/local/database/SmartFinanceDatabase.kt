package com.smartfinance.app.data.local.database

import androidx.room.Database
import androidx.room.RoomDatabase
import com.smartfinance.app.data.local.dao.DebtDao
import com.smartfinance.app.data.local.dao.TransactionDao
import com.smartfinance.app.data.local.entity.DebtEntity
import com.smartfinance.app.data.local.entity.TransactionEntity

@Database(
    entities = [TransactionEntity::class, DebtEntity::class],
    version = 1,
    exportSchema = false
)
abstract class SmartFinanceDatabase : RoomDatabase() {
    abstract fun transactionDao(): TransactionDao
    abstract fun debtDao(): DebtDao
}
