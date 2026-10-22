using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Pendaftaran kursus oleh pengguna (data diri + pilihan mentor & paket).</summary>
public sealed class CourseRegistration
{
    public Guid Id { get; set; } = Guid.NewGuid();

    // Relasi ke Identity user disimpan sebagai string id (userId).
    public string UserId { get; set; } = string.Empty;

    public Guid CoursePackageId { get; set; }
    public CoursePackage? CoursePackage { get; set; }

    public Guid MentorId { get; set; }
    public Mentor? Mentor { get; set; }

    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string NIK { get; set; } = string.Empty;
    public string Address { get; set; } = string.Empty;

    public RegistrationStatus Status { get; set; } = RegistrationStatus.Pending;
    public PaymentMethod PaymentMethod { get; set; } = PaymentMethod.Transfer;
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public ICollection<Payment> Payments { get; set; } = new List<Payment>();
}
