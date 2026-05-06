package com.smartfinance.app.data.remote.dto

data class RegisterRequest(
    val email: String,
    val password: String,
    val firstName: String,
    val lastName: String
)

data class LoginRequest(
    val email: String,
    val password: String
)

data class UserDto(
    val id: String,
    val email: String,
    val firstName: String,
    val lastName: String
)

data class AuthResponse(
    val accessToken: String,
    val user: UserDto
)
