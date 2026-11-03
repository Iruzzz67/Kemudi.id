using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>CRUD kursus & paket kursus untuk panel admin.</summary>
[ApiController]
[Route("api/admin/courses")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminCoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminCoursesController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminCourseDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List()
    {
        var courses = await _db.Courses.AsNoTracking()
            .OrderBy(c => c.Title)
            .ToListAsync();
        return Ok(courses.Select(ToCourseDto).ToArray());
    }

    [HttpGet("packages")]
    [ProducesResponseType(typeof(AdminCoursePackageDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListPackages()
    {
        var packages = await _db.CoursePackages.AsNoTracking()
            .OrderBy(p => p.Label)
            .ToListAsync();
        return Ok(packages.Select(ToPackageDto).ToArray());
    }

    [HttpPost("packages")]
    [ProducesResponseType(typeof(AdminCoursePackageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> CreatePackage([FromBody] AdminCoursePackageUpsertRequest request)
    {
        if (!await _db.Courses.AnyAsync(c => c.Id == request.CourseId))
            return BadRequest(new { error = "Kursus tidak ditemukan." });
        if (!Enum.TryParse<CourseLevel>(request.Level, true, out var level))
            return BadRequest(new { error = "Level tidak valid." });

        var package = new CoursePackage
        {
            CourseId = request.CourseId,
            Slug = string.IsNullOrWhiteSpace(request.Slug)
                ? Slugify(request.Label)
                : Slugify(request.Slug),
            Label = request.Label,
            Level = level,
            Price = request.Price,
            Sessions = request.Sessions,
            SessionDurationMin = request.SessionDurationMin,
            Description = request.Description,
            Includes = request.Includes,
            Status = request.Status
        };

        _db.CoursePackages.Add(package);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "course.create", "course", package.Id.ToString());

        return Ok(ToPackageDto(package));
    }

    [HttpPut("packages/{id:guid}")]
    [ProducesResponseType(typeof(AdminCoursePackageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdatePackage(Guid id, [FromBody] AdminCoursePackageUpsertRequest request)
    {
        var package = await _db.CoursePackages.FirstOrDefaultAsync(p => p.Id == id);
        if (package is null) return NotFound(new { error = "Paket kursus tidak ditemukan." });
        if (!Enum.TryParse<CourseLevel>(request.Level, true, out var level))
            return BadRequest(new { error = "Level tidak valid." });

        package.CourseId = request.CourseId;
        package.Slug = Slugify(string.IsNullOrWhiteSpace(request.Slug) ? request.Label : request.Slug);
        package.Label = request.Label;
        package.Level = level;
        package.Price = request.Price;
        package.Sessions = request.Sessions;
        package.SessionDurationMin = request.SessionDurationMin;
        package.Description = request.Description;
        package.Includes = request.Includes;
        package.Status = request.Status;

        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "course.update", "course", package.Id.ToString());

        return Ok(ToPackageDto(package));
    }

    [HttpDelete("packages/{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> DeletePackage(Guid id)
    {
        var package = await _db.CoursePackages.FirstOrDefaultAsync(p => p.Id == id);
        if (package is null) return NotFound(new { error = "Paket kursus tidak ditemukan." });

        _db.CoursePackages.Remove(package);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "course.delete", "course", package.Id.ToString());

        return Ok(new { id });
    }

    private static AdminCourseDto ToCourseDto(Course c) => new(
        c.Id, c.Title, c.Slug, c.VehicleType.ToString(), c.Description);

    private static AdminCoursePackageDto ToPackageDto(CoursePackage p) => new(
        p.Id, p.CourseId, p.Slug, p.Label, p.Level.ToString(), p.Price,
        p.Sessions, p.SessionDurationMin, p.Description, p.Includes, p.Status);

    private static string Slugify(string value)
    {
        var slug = new string(value.ToLowerInvariant()
            .Select(c => char.IsLetterOrDigit(c) ? c : '-')
            .ToArray());
        slug = string.Join('-', slug.Split('-', StringSplitOptions.RemoveEmptyEntries));
        return string.IsNullOrEmpty(slug) ? Guid.NewGuid().ToString("N")[..8] : slug;
    }
}
