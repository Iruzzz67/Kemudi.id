using System.Security.Claims;
using Kemudi.Domain.Entities;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

[ApiController]
[Route("api/payment")]
[Authorize]
public sealed class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PaymentsController(AppDbContext db) => _db = db;

    /// <summary>Mengajukan pembayaran untuk rekonsiliasi admin; bukan konfirmasi dana diterima.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Confirm([FromBody] PaymentRequest request)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        if (!Guid.TryParse(request.RegistrationId, out var registrationId) || registrationId == Guid.Empty)
            return BadRequest(new { error = "RegistrationId tidak valid." });
        var method = request.Method?.Trim().ToLowerInvariant() switch
        {
            "transfer" => PaymentMethod.Transfer,
            "e-wallet" => PaymentMethod.EWallet,
            "cash" => PaymentMethod.Cash,
            _ => (PaymentMethod?)null
        };
        if (method is null)
            return BadRequest(new { error = "Metode pembayaran tidak valid." });
        var reference = request.Reference?.Trim();
        if ((reference?.Length ?? 0) > 128 ||
            (method != PaymentMethod.Cash && (reference?.Length ?? 0) < 3))
            return BadRequest(new { error = "Referensi transaksi harus 3–128 karakter untuk pembayaran digital." });

        // SQLite reserves its writer before reading, so check-and-insert spans all API instances.
        await using var transaction = await _db.Database.BeginTransactionAsync();
        var registration = await _db.CourseRegistrations.Include(r => r.CoursePackage)
            .FirstOrDefaultAsync(r => r.Id == registrationId && r.UserId == userId);
        if (registration is null) return NotFound(new { error = "Pendaftaran tidak ditemukan." });
        if (registration.PaymentMethod != method)
            return Conflict(new { error = "Metode harus sesuai pendaftaran." });
        var payments = await _db.Payments.Where(p => p.RegistrationId == registrationId).Take(2).ToListAsync();
        if (payments.Count > 1)
            return Conflict(new { error = "Riwayat pembayaran perlu direkonsiliasi admin." });
        if (payments.Count == 1)
        {
            var existing = payments[0];
            if (existing.Status == PaymentStatus.Paid && registration.Status == RegistrationStatus.Paid)
                return Ok(ToDto(existing));
            if (existing.Status != PaymentStatus.Pending || registration.Status != RegistrationStatus.Pending)
                return Conflict(new { error = "Pembayaran tidak dapat diajukan ulang; hubungi admin." });
            if (existing.Method != method || existing.Reference != reference)
                return Conflict(new { error = "Pengajuan sudah tercatat dengan detail berbeda; hubungi admin." });
            return Ok(ToDto(existing));
        }
        if (registration.Status != RegistrationStatus.Pending)
            return Conflict(new { error = "Status pendaftaran tidak menerima pengajuan pembayaran." });
        var amount = registration.CoursePackage?.Price ?? 0;
        if (amount <= 0) return Conflict(new { error = "Nominal paket belum valid; hubungi admin." });

        var payment = new Payment
        {
            Id = registration.Id,
            RegistrationId = registration.Id,
            Method = method.Value,
            Status = PaymentStatus.Pending,
            Amount = amount,
            Reference = reference
        };

        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();
        await transaction.CommitAsync();

        return Ok(ToDto(payment));
    }

    [HttpGet("{registrationId:guid}")]
    public async Task<IActionResult> GetForRegistration(Guid registrationId)
    {
        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (string.IsNullOrWhiteSpace(userId)) return Unauthorized();
        var payments = await _db.Payments.AsNoTracking()
            .Where(p => p.RegistrationId == registrationId && p.Registration!.UserId == userId)
            .Take(2).ToListAsync();
        if (payments.Count > 1) return Conflict(new { error = "Riwayat pembayaran perlu direkonsiliasi admin." });
        return payments.Count == 0 ? NotFound() : Ok(ToDto(payments[0]));
    }

    private static PaymentDto ToDto(Payment payment) => new(
            Id: payment.Id.ToString(),
            RegistrationId: payment.RegistrationId.ToString(),
            Method: CourseRegistrationController.MethodKey(payment.Method),
            Status: payment.Status.ToString().ToLowerInvariant(),
            Reference: payment.Reference,
            Amount: payment.Amount,
            PaidAt: payment.PaidAt);
}
