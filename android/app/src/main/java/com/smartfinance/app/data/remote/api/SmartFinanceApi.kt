package com.smartfinance.app.data.remote.api

import com.smartfinance.app.data.remote.dto.*
import retrofit2.http.*

interface SmartFinanceApi {

    // ── Auth ──────────────────────────────────────────────────────────────
    @POST("auth/register")
    suspend fun register(@Body request: RegisterRequest): AuthResponse

    @POST("auth/login")
    suspend fun login(@Body request: LoginRequest): AuthResponse

    // ── Transactions ──────────────────────────────────────────────────────
    @GET("transactions")
    suspend fun getTransactions(
        @Query("type") type: String? = null,
        @Query("category") category: String? = null,
        @Query("startDate") startDate: String? = null,
        @Query("endDate") endDate: String? = null,
        @Query("page") page: Int = 1,
        @Query("limit") limit: Int = 20
    ): PaginatedTransactionsResponse

    @POST("transactions")
    suspend fun createTransaction(@Body request: CreateTransactionRequest): TransactionDto

    @GET("transactions/summary")
    suspend fun getTransactionSummary(
        @Query("month") month: Int? = null,
        @Query("year") year: Int? = null
    ): TransactionSummaryResponse

    @GET("transactions/{id}")
    suspend fun getTransaction(@Path("id") id: String): TransactionDto

    @PATCH("transactions/{id}")
    suspend fun updateTransaction(
        @Path("id") id: String,
        @Body request: CreateTransactionRequest
    ): TransactionDto

    @DELETE("transactions/{id}")
    suspend fun deleteTransaction(@Path("id") id: String)

    // ── Debts ─────────────────────────────────────────────────────────────
    @GET("debts")
    suspend fun getDebts(): List<DebtDto>

    @POST("debts")
    suspend fun createDebt(@Body request: CreateDebtRequest): DebtDto

    @GET("debts/{id}")
    suspend fun getDebt(@Path("id") id: String): DebtDto

    @PATCH("debts/{id}")
    suspend fun updateDebt(@Path("id") id: String, @Body request: CreateDebtRequest): DebtDto

    @POST("debts/{id}/payment")
    suspend fun makePayment(@Path("id") id: String, @Body request: MakePaymentRequest): DebtDto

    @DELETE("debts/{id}")
    suspend fun deleteDebt(@Path("id") id: String)

    // ── Optimizer ─────────────────────────────────────────────────────────
    @POST("optimizer/calculate")
    suspend fun calculate(@Body request: OptimizeRequest): OptimizationResult

    @POST("optimizer/compare")
    suspend fun compare(@Body request: CompareRequest): ComparisonResponse

    // ── Dashboard ─────────────────────────────────────────────────────────
    @GET("dashboard")
    suspend fun getDashboard(): DashboardSnapshotResponse

    @GET("dashboard/net-worth")
    suspend fun getNetWorth(): NetWorthResponse

    @GET("dashboard/monthly/{year}/{month}")
    suspend fun getMonthlyOverview(
        @Path("year") year: Int,
        @Path("month") month: Int
    ): MonthlyOverviewResponse
}
