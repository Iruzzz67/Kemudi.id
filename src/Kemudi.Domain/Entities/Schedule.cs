using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>
/// Jadwal kursus yang dikelola admin — padanan model <c>Schedule</c> pada
/// schema Prisma aplikasi lama.
/// </summary>
public sealed class Schedule
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MentorId { get; set; }
    public Mentor? Mentor { get; set; }

    public DateTime Date { get; set; }
    public string StartTime { get; set; } = "08:00"; // "HH:mm"
    public string EndTime { get; set; } = "10:00";   // "HH:mm"
    public VehicleType VehicleType { get; set; }
    public string Location { get; set; } = string.Empty;
    public int TotalSlots { get; set; } = 4;
    public int FilledSlots { get; set; } = 0;
    public string Status { get; set; } = "AVAILABLE"; // AVAILABLE | FULL | CANCELLED | COMPLETED
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
