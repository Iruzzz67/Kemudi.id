using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Verifikasi pendaftaran & pembayaran untuk panel admin.</summary>
[ApiController]
[Route("api/admin/registrations")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminRegistrationsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminRegistrationsController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminRegistrationDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? status = null,
        [FromQuery] string? q = null)
    {
        var query = _db.CourseRegistrations.AsNoTracking()
            .Include(r => r.Mentor)
            .Include(r => r.CoursePackage)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<RegistrationStatus>(status, true, out var st))
        {
            query = query.Where(r => r.Status == st);
        }
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(r => r.Name.ToLower().Contains(term) || r.Email.ToLower().Contains(term));
        }

        var registrations = await query
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync();

        return Ok(registrations.Select(ToDto).ToArray());
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] AdminRegistrationUpdateRequest request)
    {
        var status = request.Status.ToLowerInvariant() switch
        {
            "pending" => RegistrationStatus.Pending,
            "paid" => RegistrationStatus.Paid,
            "rejected" => RegistrationStatus.Rejected,
            _ => (RegistrationStatus?)null
        };
        if (status is null)
            return BadRequest(new { error = "Status harus pending, paid, atau rejected." });

        var registration = await _db.CourseRegistrations
            .Include(r => r.CoursePackage)
            .FirstOrDefaultAsync(r => r.Id == id);
        if (registration is null) return NotFound(new { error = "Pendaftaran tidak ditemukan." });

        registration.Status = status.Value;

        // Saat dikonfirmasi, catat pembayaran berhasil (untuk hitungan revenue).
        if (status == RegistrationStatus.Paid)
        {
            var payment = await _db.Payments
                .OrderByDescending(p => p.CreatedAt)
                .FirstOrDefaultAsync(p => p.RegistrationId == registration.Id);
            if (payment is null)
            {
                _db.Payments.Add(new Payment
                {
                    RegistrationId = registration.Id,
                    Method = registration.PaymentMethod,
                    Status = PaymentStatus.Paid,
                    Amount = registration.CoursePackage?.Price ?? 0,
                    PaidAt = DateTime.UtcNow
                });
            }
            else if (payment.Status != PaymentStatus.Paid)
            {
                payment.Status = PaymentStatus.Paid;
                payment.PaidAt = DateTime.UtcNow;
            }
        }

        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(
            _db, User,
            status == RegistrationStatus.Paid ? "registration.confirm"
                : status == RegistrationStatus.Rejected ? "registration.reject"
                : "registration.reopen",
            "registration", registration.Id.ToString(), new { status = status.Value.ToString() });

        return Ok(new { id, status = status.Value.ToString().ToLowerInvariant() });
    }

    private static AdminRegistrationDto ToDto(CourseRegistration r) => new(
        r.Id,
        string.IsNullOrEmpty(r.UserId) ? null : r.UserId,
        r.Name,
        r.Email,
        r.Phone,
        r.NIK,
        r.Address,
        r.Status.ToString().ToLowerInvariant(),
        CourseRegistrationController.MethodKey(r.PaymentMethod),
        r.CoursePackage?.Price ?? 0,
        r.StartDate,
        r.CreatedAt,
        r.Mentor?.Name ?? string.Empty,
        r.CoursePackage?.Label ?? string.Empty);
}
