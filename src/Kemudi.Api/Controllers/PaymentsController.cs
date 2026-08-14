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
[AllowAnonymous]
public sealed class PaymentsController : ControllerBase
{
    private readonly AppDbContext _db;

    public PaymentsController(AppDbContext db) => _db = db;

    /// <summary>Mencatat konfirmasi pembayaran dan menandai pendaftaran lunas.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaymentDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Confirm([FromBody] PaymentRequest request)
    {
        if (!Guid.TryParse(request.RegistrationId, out var registrationId))
            return BadRequest(new { error = "RegistrationId tidak valid." });

        var registration = await _db.CourseRegistrations
            .Include(r => r.CoursePackage)
            .FirstOrDefaultAsync(r => r.Id == registrationId);
        if (registration is null) return NotFound(new { error = "Pendaftaran tidak ditemukan." });

        var method = request.Method.ToLowerInvariant() switch
        {
            "transfer" => PaymentMethod.Transfer,
            "e-wallet" => PaymentMethod.EWallet,
            "cash" => PaymentMethod.Cash,
            _ => (PaymentMethod?)null
        };
        if (method is null)
            return BadRequest(new { error = "Metode pembayaran tidak valid." });

        var amount = registration.CoursePackage?.Price ?? 0;

        var payment = new Payment
        {
            RegistrationId = registration.Id,
            Method = method.Value,
            Status = PaymentStatus.Paid,
            Amount = amount,
            Reference = request.Reference,
            PaidAt = DateTime.UtcNow
        };

        registration.Status = RegistrationStatus.Paid;
        _db.Payments.Add(payment);
        await _db.SaveChangesAsync();

        return Ok(new PaymentDto(
            Id: payment.Id.ToString(),
            RegistrationId: payment.RegistrationId.ToString(),
            Method: CourseRegistrationController.MethodKey(method.Value),
            Status: payment.Status.ToString().ToLowerInvariant(),
            Reference: payment.Reference,
            Amount: payment.Amount,
            PaidAt: payment.PaidAt!.Value));
    }
}
