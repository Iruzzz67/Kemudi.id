using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Catatan pembayaran untuk satu pendaftaran kursus.</summary>
public sealed class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegistrationId { get; set; }
    public CourseRegistration? Registration { get; set; }

    public PaymentMethod Method { get; set; }
    public PaymentStatus Status { get; set; } = PaymentStatus.Pending;
    public decimal Amount { get; set; }
    public string? Reference { get; set; } // no. transfer / e-wallet reference
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
