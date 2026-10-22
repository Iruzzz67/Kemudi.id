using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Statistik pengguna, kursus, pembayaran, dan pendaftaran.</summary>
[ApiController]
[Route("api/admin/stats")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminStatsController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminStatsController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminStatsDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get()
    {
        var now = DateTime.UtcNow;
        var startOfMonth = new DateTime(now.Year, now.Month, 1, 0, 0, 0, DateTimeKind.Utc);
        var startOfWeek = now.AddDays(-7);
        var startOfToday = new DateTime(now.Year, now.Month, now.Day, 0, 0, 0, DateTimeKind.Utc);

        var totalUsers = await _db.Users.CountAsync();
        var newUsersMonth = await _db.Users.CountAsync(u => u.CreatedAt >= startOfMonth);
        var usersWithAttempts = await _db.SimulationAttempts.Select(a => a.UserId).Distinct().CountAsync();

        var totalTransactions = await _db.Payments.CountAsync();
        // SQLite tidak mendukung agregasi decimal — jumlahkan di memori.
        var paidAmounts = await _db.Payments
            .Where(p => p.Status == PaymentStatus.Paid)
            .Select(p => p.Amount)
            .ToListAsync();
        var revenue = paidAmounts.Sum();
        var pendingPayments = await _db.Payments.CountAsync(p => p.Status == PaymentStatus.Pending);
        var paidPayments = await _db.Payments.CountAsync(p => p.Status == PaymentStatus.Paid);
        var rejectedPayments = await _db.Payments.CountAsync(p => p.Status == PaymentStatus.Cancelled);

        var attemptsByVehicle = await _db.SimulationAttempts
            .GroupBy(a => a.VehicleType)
            .Select(g => new { Vehicle = g.Key, Count = g.Count() })
            .ToListAsync();

        var registrations = await _db.CourseRegistrations.AsNoTracking()
            .Include(r => r.Mentor)
            .Where(r => r.CreatedAt >= startOfWeek)
            .ToListAsync();

        var mentorNames = await _db.Mentors.AsNoTracking()
            .ToDictionaryAsync(m => m.Id, m => m.Name);

        var registrationsByMentor = registrations
            .GroupBy(r => r.MentorId)
            .Select(g => new AdminChartPoint(
                mentorNames.GetValueOrDefault(g.Key, "—"),
                g.Count()))
            .OrderByDescending(p => p.Value)
            .Take(5)
            .ToArray();

        return Ok(new AdminStatsDto(
            TotalUsers: totalUsers,
            NewUsersMonth: newUsersMonth,
            UsersWithAttempts: usersWithAttempts,
            TotalTransactions: totalTransactions,
            TotalRevenue: revenue,
            PendingPayments: pendingPayments,
            PaidPayments: paidPayments,
            RejectedPayments: rejectedPayments,
            AttemptsByVehicle: attemptsByVehicle
                .Select(a => new AdminChartPoint(a.Vehicle.ToString(), a.Count))
                .OrderByDescending(p => p.Value)
                .ToArray(),
            RegistrationsByMentor: registrationsByMentor,
            RegistrationsToday: await _db.CourseRegistrations.CountAsync(r => r.CreatedAt >= startOfToday),
            RegistrationsWeek: await _db.CourseRegistrations.CountAsync(r => r.CreatedAt >= startOfWeek),
            RegistrationsMonth: await _db.CourseRegistrations.CountAsync(r => r.CreatedAt >= startOfMonth)));
    }
}
