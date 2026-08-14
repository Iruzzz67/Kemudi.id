using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Jenis kursus umum (mis. "Kursus Motor", "Kursus Mobil").</summary>
public sealed class Course
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public VehicleType VehicleType { get; set; }
    public string? Description { get; set; }

    public ICollection<CoursePackage> Packages { get; set; } = new List<CoursePackage>();
}
