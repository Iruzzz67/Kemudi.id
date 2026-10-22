using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Verifikasi pembayaran untuk panel admin.</summary>
[ApiController]
[Route("api/admin/payments")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminPaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminPaymentsController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminPaymentDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List([FromQuery] string? status = null)
    {
        var query = _db.Payments.AsNoTracking()
            .Include(p => p.Registration)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) &&
            Enum.TryParse<PaymentStatus>(status, true, out var ps))
        {
            query = query.Where(p => p.Status == ps);
        }

        var payments = await query
            .OrderByDescending(p => p.CreatedAt)
            .ToListAsync();

        return Ok(payments.Select(ToDto).ToArray());
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> UpdateStatus(Guid id, [FromBody] AdminPaymentUpdateRequest request)
    {
        var status = request.Status.ToLowerInvariant() switch
        {
            "pending" => PaymentStatus.Pending,
            "paid" => PaymentStatus.Paid,
            "cancelled" => PaymentStatus.Cancelled,
            _ => (PaymentStatus?)null
        };
        if (status is null)
            return BadRequest(new { error = "Status harus pending, paid, atau cancelled." });

        var payment = await _db.Payments
            .Include(p => p.Registration)
            .FirstOrDefaultAsync(p => p.Id == id);
        if (payment is null) return NotFound(new { error = "Pembayaran tidak ditemukan." });

        payment.Status = status.Value;
        payment.PaidAt = status == PaymentStatus.Paid ? DateTime.UtcNow : null;

        // Sinkronkan status pendaftaran dengan status pembayaran.
        if (payment.Registration is not null)
        {
            payment.Registration.Status = status switch
            {
                PaymentStatus.Paid => RegistrationStatus.Paid,
                PaymentStatus.Cancelled => RegistrationStatus.Rejected,
                _ => RegistrationStatus.Pending
            };
        }

        await _db.SaveChangesAsync();
        await AdminHelpers.LogAsync(
            _db, User,
            status == PaymentStatus.Paid ? "payment.confirm"
                : status == PaymentStatus.Cancelled ? "payment.reject"
                : "payment.reopen",
            "payment", payment.Id.ToString(), new { status = status.Value.ToString() });

        return Ok(new { id, status = status.Value.ToString().ToLowerInvariant() });
    }

    private static AdminPaymentDto ToDto(Payment p) => new(
        p.Id,
        p.RegistrationId,
        CourseRegistrationController.MethodKey(p.Method),
        p.Status.ToString().ToLowerInvariant(),
        p.Amount,
        p.Reference,
        p.PaidAt,
        p.CreatedAt,
        p.Registration?.Name ?? string.Empty,
        p.Registration?.Email ?? string.Empty,
        p.Registration?.Status.ToString().ToLowerInvariant() ?? string.Empty);
}
