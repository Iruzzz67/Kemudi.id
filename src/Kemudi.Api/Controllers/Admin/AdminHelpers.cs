using System.Security.Claims;
using Kemudi.Domain.Entities;
using Kemudi.Infrastructure.Data;

namespace Kemudi.Api.Controllers.Admin;

/// <summary>
/// Helper bersama untuk seluruh controller admin: membaca identitas admin dari
/// klaim JWT dan mencatat aktivitas ke audit log (padanan lib/admin.ts).
/// </summary>
public static class AdminHelpers
{
    /// <summary>Id admin dari klaim token.</summary>
    public static string? AdminId(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimTypes.NameIdentifier);

    /// <summary>Email admin dari klaim token.</summary>
    public static string AdminEmail(this ClaimsPrincipal principal)
        => principal.FindFirstValue(ClaimTypes.Email) ?? string.Empty;

    /// <summary>Mencatat aktivitas admin (best-effort, tidak menggagalkan request).</summary>
    public static async Task LogAsync(
        AppDbContext db,
        ClaimsPrincipal admin,
        string action,
        string target,
        string? targetId = null,
        object? metadata = null)
    {
        try
        {
            db.AuditLogs.Add(new AuditLog
            {
                AdminId = admin.AdminId(),
                AdminEmail = admin.AdminEmail(),
                Action = action,
                Target = target,
                TargetId = targetId,
                Metadata = metadata is null ? null : System.Text.Json.JsonSerializer.Serialize(metadata)
            });
            await db.SaveChangesAsync();
        }
        catch
        {
            // Audit log tidak boleh menggagalkan operasi utama.
        }
    }
}
