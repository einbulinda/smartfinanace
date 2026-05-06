package com.smartfinance.app.data.local.dao

import androidx.room.*
import com.smartfinance.app.data.local.entity.TransactionEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface TransactionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(transaction: TransactionEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(transactions: List<TransactionEntity>)

    @Update
    suspend fun update(transaction: TransactionEntity)

    @Delete
    suspend fun delete(transaction: TransactionEntity)

    @Query("SELECT * FROM transactions ORDER BY date DESC, localId DESC")
    fun getAll(): Flow<List<TransactionEntity>>

    @Query("SELECT * FROM transactions WHERE type = :type ORDER BY date DESC, localId DESC")
    fun getByType(type: String): Flow<List<TransactionEntity>>

    // month must be zero-padded: "05", year as "2026"
    @Query("""
        SELECT * FROM transactions
        WHERE strftime('%m', date) = :month
          AND strftime('%Y', date) = :year
        ORDER BY date DESC, localId DESC
    """)
    fun getByMonth(month: String, year: String): Flow<List<TransactionEntity>>

    @Query("""
        SELECT COALESCE(SUM(amount), 0.0) FROM transactions
        WHERE type = 'INCOME'
          AND strftime('%m', date) = :month
          AND strftime('%Y', date) = :year
    """)
    fun getMonthlyIncome(month: String, year: String): Flow<Double>

    @Query("""
        SELECT COALESCE(SUM(amount), 0.0) FROM transactions
        WHERE type = 'EXPENSE'
          AND strftime('%m', date) = :month
          AND strftime('%Y', date) = :year
    """)
    fun getMonthlyExpense(month: String, year: String): Flow<Double>

    @Query("SELECT * FROM transactions WHERE isSynced = 0")
    suspend fun getUnsynced(): List<TransactionEntity>

    @Query("SELECT * FROM transactions WHERE remoteId = :remoteId LIMIT 1")
    suspend fun getByRemoteId(remoteId: String): TransactionEntity?

    @Query("UPDATE transactions SET isSynced = 1, remoteId = :remoteId WHERE localId = :localId")
    suspend fun markSynced(localId: Long, remoteId: String)

    @Query("DELETE FROM transactions WHERE remoteId = :remoteId")
    suspend fun deleteByRemoteId(remoteId: String)
}
