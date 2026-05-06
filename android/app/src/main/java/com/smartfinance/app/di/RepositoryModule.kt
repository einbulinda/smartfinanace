package com.smartfinance.app.di

import com.smartfinance.app.data.repository.DebtRepositoryImpl
import com.smartfinance.app.data.repository.TransactionRepositoryImpl
import com.smartfinance.app.domain.repository.DebtRepository
import com.smartfinance.app.domain.repository.TransactionRepository
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class RepositoryModule {

    @Binds
    @Singleton
    abstract fun bindTransactionRepository(
        impl: TransactionRepositoryImpl
    ): TransactionRepository

    @Binds
    @Singleton
    abstract fun bindDebtRepository(
        impl: DebtRepositoryImpl
    ): DebtRepository
}
