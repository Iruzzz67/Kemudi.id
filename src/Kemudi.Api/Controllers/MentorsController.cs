using System.Text.Json;
using Kemudi.Domain.Entities;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

[ApiController]
[Route("api/mentors")]
[AllowAnonymous]
public sealed class MentorsController : ControllerBase
{
    private readonly AppDbContext _db;

    public MentorsController(AppDbContext db) => _db = db;

    private static readonly JsonSerializerOptions JsonOptions =
        new() { PropertyNameCaseInsensitive = true };

    /// <summary>Daftar semua mentor.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<MentorDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        var mentors = await _db.Mentors.AsNoTracking()
            .OrderBy(m => m.Name)
            .ToListAsync();

        return Ok(mentors.Select(ToDto));
    }

    /// <summary>Detail portofolio satu mentor.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(MentorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetBySlug(string slug)
    {
        var mentor = await _db.Mentors.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Slug == slug);

        if (mentor is null) return NotFound(new { error = "Mentor tidak ditemukan." });

        return Ok(ToDto(mentor));
    }

    private static MentorDto ToDto(Mentor m)
    {
        var testimonials = JsonSerializer.Deserialize<TestimonialDto[]>(m.TestimonialsJson, JsonOptions)
                           ?? Array.Empty<TestimonialDto>();
        return new MentorDto(
            Id: m.Slug,
            Name: m.Name,
            Title: m.Title,
            VehicleTypes: m.GetVehicleTypes().Select(v => v.ToString()).ToArray(),
            ExperienceYears: m.ExperienceYears,
            Rating: m.Rating,
            StudentsTrained: m.StudentsTrained,
            Bio: m.Bio,
            Initials: m.Initials,
            AvatarColor: m.AvatarColor,
            Phone: m.Phone,
            Portfolio: new MentorPortfolioDto(
                Certifications: SplitLines(m.Certifications),
                Achievements: SplitLines(m.Achievements),
                Testimonials: testimonials));
    }

    private static string[] SplitLines(string value) =>
        value.Split('\n', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
}
