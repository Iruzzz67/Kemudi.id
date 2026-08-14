namespace Kemudi.Shared.DTOs;

/// <summary>Payload pendaftaran pengguna baru.</summary>
public sealed record RegisterRequest(
    string Name,
    string Email,
    string Password);

/// <summary>Payload login pengguna.</summary>
public sealed record LoginRequest(
    string Email,
    string Password);

/// <summary>Respons setelah register/login berhasil.</summary>
public sealed record AuthResponse(
    string Token,
    string UserId,
    string? Name,
    string Email,
    DateTime ExpiresAt);
