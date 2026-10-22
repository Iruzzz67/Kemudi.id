using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Sesi latihan terjadwal dari sebuah pendaftaran kursus.</summary>
public sealed class TrainingSession
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegistrationId { get; set; }
    public CourseRegistration? Registration { get; set; }

    public int SessionNumber { get; set; }
    public DateTime ScheduledAt { get; set; }
    public bool Completed { get; set; }
    public int? Score { get; set; }
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
