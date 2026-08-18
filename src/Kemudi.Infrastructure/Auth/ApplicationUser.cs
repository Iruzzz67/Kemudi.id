using Microsoft.AspNetCore.Identity;

namespace Kemudi.Infrastructure.Auth;

/// <summary>
/// Pengguna aplikasi (Identity). Melengkapi <see cref="IdentityUser"/> dengan
/// data profil yang dibutuhkan dashboard & registrasi kursus.
/// </summary>
public sealed class ApplicationUser : IdentityUser
{
    public string? FullName { get; set; }
    public string? NIK { get; set; }
    public string? Address { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Akun dinonaktifkan oleh admin — tidak bisa login.</summary>
    public bool IsActive { get; set; } = true;
}
