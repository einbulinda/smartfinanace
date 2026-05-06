package com.smartfinance.app.data.local.dao

import androidx.room.*
import com.smartfinance.app.data.local.entity.DebtEntity
import kotlinx.coroutines.flow.Flow

@Dao
interface DebtDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(debt: DebtEntity): Long

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(debts: List<DebtEntity>)

    @Update
    suspend fun update(debt: DebtEntity)

    @Delete
    suspend fun delete(debt: DebtEntity)

    @Query("SELECT * FROM debts ORDER BY isPaidOff ASC, interestRate DESC")
    fun getAll(): Flow<List<DebtEntity>>

    @Query("SELECT * FROM debts WHERE isPaidOff = 0 ORDER BY interestRate DESC")
    fun getActive(): Flow<List<DebtEntity>>

    @Query("SELECT COALESCE(SUM(currentBalance), 0.0) FROM debts WHERE isPaidOff = 0")
    fun getTotalDebt(): Flow<Double>

    @Query("SELECT * FROM debts WHERE isSynced = 0")
    suspend fun getUnsynced(): List<DebtEntity>

    @Query("SELECT * FROM debts WHERE remoteId = :remoteId LIMIT 1")
    suspend fun getByRemoteId(remoteId: String): DebtEntity?

    @Query("UPDATE debts SET isSynced = 1, remoteId = :remoteId WHERE localId = :localId")
    suspend fun markSynced(localId: Long, remoteId: String)

    @Query("DELETE FROM debts WHERE remoteId = :remoteId")
    suspend fun deleteByRemoteId(remoteId: String)
}
