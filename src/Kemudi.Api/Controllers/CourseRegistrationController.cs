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
[Route("api/course-registration")]
public sealed class CourseRegistrationController : ControllerBase
{
    private readonly AppDbContext _db;

    public CourseRegistrationController(AppDbContext db) => _db = db;

    /// <summary>
    /// Mendaftarkan kursus. User boleh anonim (UX aplikasi lama), tetapi bila
    /// membawa token JWT, userId otomatis dikaitkan.
    /// </summary>
    [HttpPost]
    [AllowAnonymous]
    [ProducesResponseType(typeof(CourseRegistrationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Register([FromBody] CourseRegistrationRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Name) ||
            string.IsNullOrWhiteSpace(request.Email) ||
            string.IsNullOrWhiteSpace(request.NIK) ||
            string.IsNullOrWhiteSpace(request.Address))
        {
            return BadRequest(new { error = "Nama, email, NIK, dan alamat wajib diisi." });
        }

        var package = await _db.CoursePackages.AsNoTracking()
            .FirstOrDefaultAsync(p => p.Slug == request.CoursePackageId);
        if (package is null) return NotFound(new { error = "Paket kursus tidak ditemukan." });

        var mentor = await _db.Mentors.AsNoTracking()
            .FirstOrDefaultAsync(m => m.Slug == request.MentorId);
        if (mentor is null) return NotFound(new { error = "Mentor tidak ditemukan." });

        var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);

        var paymentMethod = request.PaymentMethod.ToLowerInvariant() switch
        {
            "e-wallet" => PaymentMethod.EWallet,
            "cash" => PaymentMethod.Cash,
            _ => PaymentMethod.Transfer
        };

        var registration = new CourseRegistration
        {
            UserId = userId ?? string.Empty,
            CoursePackageId = package.Id,
            MentorId = mentor.Id,
            Name = request.Name,
            Email = request.Email,
            Phone = request.Phone,
            NIK = request.NIK,
            Address = request.Address,
            Status = RegistrationStatus.Pending,
            PaymentMethod = paymentMethod,
            StartDate = paymentMethod == PaymentMethod.Cash
                ? DateTime.UtcNow.AddDays(3)
                : DateTime.UtcNow.AddDays(7)
        };

        _db.CourseRegistrations.Add(registration);
        await _db.SaveChangesAsync();

        return Ok(ToDto(registration, package.Price, paymentMethod));
    }

    /// <summary>Melihat detail pendaftaran berdasarkan id.</summary>
    [HttpGet("{id}")]
    [ProducesResponseType(typeof(CourseRegistrationDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var registration = await _db.CourseRegistrations.AsNoTracking()
            .Include(r => r.CoursePackage)
            .FirstOrDefaultAsync(r => r.Id == id);

        if (registration is null) return NotFound(new { error = "Pendaftaran tidak ditemukan." });

        return Ok(ToDto(registration, registration.CoursePackage!.Price, registration.PaymentMethod));
    }

    private static CourseRegistrationDto ToDto(CourseRegistration r, decimal amount, PaymentMethod method) => new(
        Id: r.Id.ToString(),
        MentorId: r.MentorId.ToString(),
        CoursePackageId: r.CoursePackage?.Slug ?? string.Empty,
        Name: r.Name,
        Status: r.Status.ToString().ToLowerInvariant(),
        Amount: amount,
        PaymentMethod: MethodKey(method),
        StartDate: r.StartDate,
        CreatedAt: r.CreatedAt);

    /// <summary>
    /// Kunci string metode pembayaran yang dipakai UI (Blazor):
    /// "transfer" | "e-wallet" | "cash".
    /// </summary>
    public static string MethodKey(PaymentMethod method) => method switch
    {
        PaymentMethod.EWallet => "e-wallet",
        PaymentMethod.Cash => "cash",
        _ => "transfer"
    };
}
