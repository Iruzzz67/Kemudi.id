using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

[ApiController]
[Route("api/courses")]
[AllowAnonymous]
public sealed class CoursesController : ControllerBase
{
    private readonly AppDbContext _db;

    public CoursesController(AppDbContext db) => _db = db;

    /// <summary>Daftar semua paket kursus.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<CoursePackageDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetPackages([FromQuery] string? vehicleType = null)
    {
        var query = _db.CoursePackages.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(vehicleType) &&
            Enum.TryParse<VehicleType>(vehicleType, true, out var vt))
        {
            query = query.Where(p => p.Course!.VehicleType == vt);
        }

        // SQLite tidak mendukung ORDER BY decimal — urutkan di memori setelah
        // materialisasi (urutkan berdasarkan harga per kendaraan).
        var packages = (await query
            .Select(p => new
            {
                p.Slug,
                VehicleType = p.Course!.VehicleType,
                p.Label,
                Level = p.Level,
                p.Price,
                p.Sessions,
                p.SessionDurationMin,
                p.Description,
                p.Includes
            })
            .ToListAsync())
            .OrderBy(p => p.Price)
            .ToList();

        var result = packages.Select(p => new CoursePackageDto(
            Id: p.Slug,
            VehicleType: p.VehicleType.ToString(),
            Label: p.Label,
            Level: p.Level.ToString(),
            Price: p.Price,
            Sessions: p.Sessions,
            SessionDurationMin: p.SessionDurationMin,
            Description: p.Description,
            Includes: p.Includes.Split('\n', StringSplitOptions.RemoveEmptyEntries)));

        return Ok(result);
    }

    /// <summary>Detail satu paket kursus berdasarkan slug.</summary>
    [HttpGet("{slug}")]
    [ProducesResponseType(typeof(CoursePackageDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetPackage(string slug)
    {
        var package = await _db.CoursePackages.AsNoTracking()
            .Include(p => p.Course)
            .FirstOrDefaultAsync(p => p.Slug == slug);

        if (package is null) return NotFound(new { error = "Paket tidak ditemukan." });

        return Ok(new CoursePackageDto(
            Id: package.Slug,
            VehicleType: package.Course!.VehicleType.ToString(),
            Label: package.Label,
            Level: package.Level.ToString(),
            Price: package.Price,
            Sessions: package.Sessions,
            SessionDurationMin: package.SessionDurationMin,
            Description: package.Description,
            Includes: package.Includes.Split('\n', StringSplitOptions.RemoveEmptyEntries)));
    }
}
