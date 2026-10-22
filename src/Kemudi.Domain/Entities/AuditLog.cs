namespace Kemudi.Domain.Entities;

/// <summary>
/// Jejak aktivitas penting admin (login, konfirmasi pembayaran, CRUD, dll) —
/// padanan model <c>AuditLog</c> pada schema Prisma aplikasi lama.
/// </summary>
public sealed class AuditLog
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? AdminId { get; set; }
    public string AdminEmail { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty; // mis. "registration.confirm"
    public string Target { get; set; } = string.Empty; // "registration" | "mentor" | ...
    public string? TargetId { get; set; }
    public string? Metadata { get; set; } // JSON string
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
