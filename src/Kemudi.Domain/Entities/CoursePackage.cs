using Kemudi.Domain.Enums;

namespace Kemudi.Domain.Entities;

/// <summary>Paket kursus spesifik dengan harga, jumlah sesi, dan level.</summary>
public sealed class CoursePackage
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Slug { get; set; } = string.Empty; // mis. "motor-reguler"
    public Guid CourseId { get; set; }
    public Course? Course { get; set; }

    public string Label { get; set; } = string.Empty;
    public CourseLevel Level { get; set; }
    public decimal Price { get; set; }          // IDR
    public int Sessions { get; set; }
    public int SessionDurationMin { get; set; }
    public string Description { get; set; } = string.Empty;
    public string Includes { get; set; } = string.Empty; // dipisah baris baru ("\n")
}
