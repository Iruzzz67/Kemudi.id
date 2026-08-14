namespace Kemudi.Shared.DTOs;

/// <summary>Profil pengguna yang sedang login.</summary>
public sealed record UserProfileDto(
    string Id,
    string? Name,
    string Email,
    DateTime CreatedAt);
