using System.Globalization;
using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Entities;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>CRUD mentor untuk panel admin.</summary>
[ApiController]
[Route("api/admin/mentors")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminMentorsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminMentorsController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminMentorDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        var mentors = await _db.Mentors.AsNoTracking()
            .OrderBy(m => m.Name)
            .ToListAsync();
        return Ok(mentors.Select(ToDto).ToArray());
    }

    [HttpPost]
    [ProducesResponseType(typeof(AdminMentorDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Create([FromBody] AdminMentorUpsertRequest request)
    {
        var mentor = new Mentor
        {
            Name = request.Name,
            Title = request.Title,
            VehicleTypes = request.VehicleTypes,
            ExperienceYears = request.ExperienceYears,
            Rating = request.Rating,
            StudentsTrained = request.StudentsTrained,
            Bio = request.Bio,
            Status = request.Status,
            Phone = request.Phone,
            Slug = Slugify(request.Name),
            Initials = InitialsOf(request.Name),
            AvatarColor = "#3b82f6"
        };

        _db.Mentors.Add(mentor);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "mentor.create", "mentor", mentor.Id.ToString());

        return Ok(ToDto(mentor));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminMentorDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AdminMentorUpsertRequest request)
    {
        var mentor = await _db.Mentors.FirstOrDefaultAsync(m => m.Id == id);
        if (mentor is null) return NotFound(new { error = "Mentor tidak ditemukan." });

        mentor.Name = request.Name;
        mentor.Title = request.Title;
        mentor.VehicleTypes = request.VehicleTypes;
        mentor.ExperienceYears = request.ExperienceYears;
        mentor.Rating = request.Rating;
        mentor.StudentsTrained = request.StudentsTrained;
        mentor.Bio = request.Bio;
        mentor.Status = request.Status;
        mentor.Phone = request.Phone;
        mentor.Slug = Slugify(request.Name);
        mentor.Initials = InitialsOf(request.Name);

        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "mentor.update", "mentor", mentor.Id.ToString());

        return Ok(ToDto(mentor));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var mentor = await _db.Mentors.FirstOrDefaultAsync(m => m.Id == id);
        if (mentor is null) return NotFound(new { error = "Mentor tidak ditemukan." });

        _db.Mentors.Remove(mentor);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "mentor.delete", "mentor", mentor.Id.ToString());

        return Ok(new { id });
    }

    private static AdminMentorDto ToDto(Mentor m) => new(
        m.Id, m.Name, m.Title, m.VehicleTypes, m.ExperienceYears,
        m.Rating, m.StudentsTrained, m.Bio, m.Status, m.Phone);

    private static string Slugify(string name)
    {
        var slug = new string(name.ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray());
        slug = string.Join('-', slug.Split('-', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrEmpty(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }

    private static string InitialsOf(string name)
    {
        var parts = name.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length == 0) return "?";
        var initials = parts.Length == 1
            ? parts[0][..Math.Min(2, parts[0].Length)]
            : $"{parts[0][0]}{parts[^1][0]}";
        return initials.ToUpperInvariant();
    }
}
