using System.Security.Claims;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>
/// Menyimpan & mengambil riwayat simulasi. Endpoint ini hanya boleh dipakai
/// user terautentikasi (dokumen §9 & §34).
/// </summary>
[ApiController]
[Route("api/progress")]
[Authorize]
public sealed class ProgressController : ControllerBase
{
    private static readonly string[] ValidVehicles = { "MOTOR", "MOBIL", "TRUK" };

    private readonly AppDbContext _db;

    public ProgressController(AppDbContext db) => _db = db;

    /// <summary>Menyimpan hasil satu percobaan simulasi.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(SimulationAttemptDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> Submit([FromBody] SubmitSimulationRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        if (!ValidVehicles.Contains(request.VehicleType) ||
            request.Score < 0 || request.Score > 100 ||   // §8: validasi 0..100
            request.TimeTakenMs < 0 ||
            request.Violations < 0 ||
            request.OffRoadCount < 0 ||
            request.ObstacleHits < 0)
        {
            return BadRequest(new { error = "Data tidak valid." });
        }

        var attempt = new SimulationAttempt
        {
            UserId = userId,
            VehicleType = Enum.Parse<VehicleType>(request.VehicleType),
            Score = request.Score,  // sudah divalidasi 0..100; tidak percaya nilai mentah (§8)
            TimeTakenMs = Math.Max(0, request.TimeTakenMs),
            Violations = Math.Max(0, request.Violations),
            OffRoadCount = Math.Max(0, request.OffRoadCount),
            ObstacleHits = Math.Max(0, request.ObstacleHits),
            Completed = request.Completed,
            TrainingMode = request.TrainingMode is null
                ? null
                : Enum.TryParse<TrainingMode>(request.TrainingMode, true, out var mode)
                    ? mode
                    : null
        };

        _db.SimulationAttempts.Add(attempt);
        await _db.SaveChangesAsync();

        return Ok(ToDto(attempt));
    }

    /// <summary>Mengambil 50 riwayat latihan terakhir user.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<SimulationAttemptDto>), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    public async Task<IActionResult> GetHistory()
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (userId is null) return Unauthorized();

        var attempts = await _db.SimulationAttempts
            .Where(a => a.UserId == userId)
            .OrderByDescending(a => a.CreatedAt)
            .Take(50)
            .Select(a => ToDto(a))
            .ToListAsync();

        return Ok(attempts);
    }

    private static SimulationAttemptDto ToDto(SimulationAttempt a) => new(
        Id: a.Id.ToString(),
        VehicleType: a.VehicleType.ToString(),
        Score: a.Score,
        TimeTakenMs: a.TimeTakenMs,
        Violations: a.Violations,
        OffRoadCount: a.OffRoadCount,
        ObstacleHits: a.ObstacleHits,
        Completed: a.Completed,
        CreatedAt: a.CreatedAt);
}
