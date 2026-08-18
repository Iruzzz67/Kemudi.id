using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Instruktur / mentor kursus mengemudi.</summary>
public sealed class Mentor
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty; // mis. "budi-santoso"
    public string Name { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string VehicleTypes { get; set; } = string.Empty; // CSV: "MOTOR,MOBIL"
    public int ExperienceYears { get; set; }
    public double Rating { get; set; }
    public int StudentsTrained { get; set; }
    public string Bio { get; set; } = string.Empty;
    public string Initials { get; set; } = string.Empty;
    public string AvatarColor { get; set; } = "#3b82f6";
    public string? Phone { get; set; }
    public string Status { get; set; } = "ACTIVE"; // "ACTIVE" | "INACTIVE"

    // Portofolio (CSV/dipisah baris agar tetap relasional-sederhana)
    public string Certifications { get; set; } = string.Empty;
    public string Achievements { get; set; } = string.Empty;
    public string TestimonialsJson { get; set; } = "[]"; // JSON [{name, quote}]

    public ICollection<CourseRegistration> Registrations { get; set; } = new List<CourseRegistration>();

    public VehicleType[] GetVehicleTypes()
        => VehicleTypes.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .Select(v => Enum.Parse<VehicleType>(v))
            .ToArray();
}
