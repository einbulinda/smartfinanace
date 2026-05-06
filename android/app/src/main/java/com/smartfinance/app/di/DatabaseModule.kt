package com.smartfinance.app.di

import android.content.Context
import androidx.room.Room
import com.smartfinance.app.data.local.dao.DebtDao
import com.smartfinance.app.data.local.dao.TransactionDao
import com.smartfinance.app.data.local.database.SmartFinanceDatabase
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object DatabaseModule {

    @Provides
    @Singleton
    fun provideDatabase(@ApplicationContext context: Context): SmartFinanceDatabase =
        Room.databaseBuilder(
            context,
            SmartFinanceDatabase::class.java,
            "smartfinance.db"
        ).build()

    @Provides
    fun provideTransactionDao(db: SmartFinanceDatabase): TransactionDao = db.transactionDao()

    @Provides
    fun provideDebtDao(db: SmartFinanceDatabase): DebtDao = db.debtDao()
}
