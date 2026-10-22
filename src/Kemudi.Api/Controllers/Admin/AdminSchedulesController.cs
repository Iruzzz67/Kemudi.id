using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>CRUD jadwal kursus untuk panel admin.</summary>
[ApiController]
[Route("api/admin/schedules")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminSchedulesController : ControllerBase
{
    private static readonly string[] ValidStatuses = { "AVAILABLE", "FULL", "CANCELLED", "COMPLETED" };

    private readonly AppDbContext _db;

    public AdminSchedulesController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminScheduleDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? vehicleType = null)
    {
        var query = _db.Schedules.AsNoTracking().Include(s => s.Mentor).AsQueryable();
        if (!string.IsNullOrWhiteSpace(vehicleType) &&
            Enum.TryParse<VehicleType>(vehicleType, true, out var vt))
        {
            query = query.Where(s => s.VehicleType == vt);
        }

        var schedules = await query
            .OrderByDescending(s => s.Date)
            .ThenBy(s => s.StartTime)
            .ToListAsync();

        return Ok(schedules.Select(ToDto).ToArray());
    }

    [HttpPost]
    [ProducesResponseType(typeof(AdminScheduleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Create([FromBody] AdminScheduleUpsertRequest request)
    {
        if (!await _db.Mentors.AnyAsync(m => m.Id == request.MentorId))
            return BadRequest(new { error = "Mentor tidak ditemukan." });
        if (!ValidStatuses.Contains(request.Status))
            return BadRequest(new { error = "Status jadwal tidak valid." });
        if (!Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt))
            return BadRequest(new { error = "Jenis kendaraan tidak valid." });

        var schedule = new Schedule
        {
            MentorId = request.MentorId,
            Date = request.Date,
            StartTime = request.StartTime,
            EndTime = request.EndTime,
            VehicleType = vt,
            Location = request.Location,
            TotalSlots = request.TotalSlots,
            FilledSlots = request.FilledSlots,
            Status = request.Status
        };

        _db.Schedules.Add(schedule);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "schedule.create", "schedule", schedule.Id.ToString());

        return Ok(ToDto(schedule));
    }

    [HttpPut("{id:guid}")]
    [ProducesResponseType(typeof(AdminScheduleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AdminScheduleUpsertRequest request)
    {
        var schedule = await _db.Schedules.Include(s => s.Mentor).FirstOrDefaultAsync(s => s.Id == id);
        if (schedule is null) return NotFound(new { error = "Jadwal tidak ditemukan." });
        if (!await _db.Mentors.AnyAsync(m => m.Id == request.MentorId))
            return BadRequest(new { error = "Mentor tidak ditemukan." });
        if (!ValidStatuses.Contains(request.Status))
            return BadRequest(new { error = "Status jadwal tidak valid." });
        if (!Enum.TryParse<VehicleType>(request.VehicleType, true, out var vt))
            return BadRequest(new { error = "Jenis kendaraan tidak valid." });

        schedule.MentorId = request.MentorId;
        schedule.Date = request.Date;
        schedule.StartTime = request.StartTime;
        schedule.EndTime = request.EndTime;
        schedule.VehicleType = vt;
        schedule.Location = request.Location;
        schedule.TotalSlots = request.TotalSlots;
        schedule.FilledSlots = request.FilledSlots;
        schedule.Status = request.Status;
        schedule.UpdatedAt = DateTime.UtcNow;

        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "schedule.update", "schedule", schedule.Id.ToString());

        return Ok(ToDto(schedule));
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var schedule = await _db.Schedules.FirstOrDefaultAsync(s => s.Id == id);
        if (schedule is null) return NotFound(new { error = "Jadwal tidak ditemukan." });

        _db.Schedules.Remove(schedule);
        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(_db, User, "schedule.delete", "schedule", schedule.Id.ToString());

        return Ok(new { id });
    }

    private static AdminScheduleDto ToDto(Schedule s) => new(
        s.Id,
        s.MentorId,
        s.Mentor?.Name ?? string.Empty,
        s.Date,
        s.StartTime,
        s.EndTime,
        s.VehicleType.ToString(),
        s.Location,
        s.TotalSlots,
        s.FilledSlots,
        s.Status);
}
