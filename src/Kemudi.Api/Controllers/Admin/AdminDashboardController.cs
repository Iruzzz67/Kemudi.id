using Kemudi.Api.Controllers.Admin;
using Kemudi.Domain.Enums;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Ringkasan sistem untuk dashboard admin.</summary>
[ApiController]
[Route("api/admin/dashboard")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminDashboardController : ControllerBase
{
    private readonly AppDbContext _db;

    public AdminDashboardController(AppDbContext db) => _db = db;

    [HttpGet]
    [ProducesResponseType(typeof(AdminDashboardDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get()
    {
        var now = DateTime.UtcNow;
        var sevenDaysAgo = now.AddDays(-7);

        var totalUsers = await _db.Users.CountAsync(u => u.IsActive || !u.IsActive);
        var newUsers7d = await _db.Users.CountAsync(u => u.CreatedAt >= sevenDaysAgo);
        var totalRegistrations = await _db.CourseRegistrations.CountAsync();
        var pendingRegistrations = await _db.CourseRegistrations.CountAsync(r => r.Status == RegistrationStatus.Pending);
        var paidRegistrations = await _db.CourseRegistrations.CountAsync(r => r.Status == RegistrationStatus.Paid);
        var rejectedRegistrations = await _db.CourseRegistrations.CountAsync(r => r.Status == RegistrationStatus.Rejected);
        var totalMentors = await _db.Mentors.CountAsync();
        var activeCourses = await _db.CoursePackages.CountAsync(p => p.Status == "ACTIVE");
        // SQLite tidak mendukung agregasi decimal — jumlahkan di memori.
        var paidAmounts = await _db.Payments
            .Where(p => p.Status == PaymentStatus.Paid)
            .Select(p => p.Amount)
            .ToListAsync();
        var revenue = paidAmounts.Sum();

        var registrations7d = await _db.CourseRegistrations
            .Where(r => r.CreatedAt >= sevenDaysAgo)
            .ToListAsync();
        var paidPayments7d = await _db.Payments
            .Where(p => p.Status == PaymentStatus.Paid && p.PaidAt >= sevenDaysAgo)
            .ToListAsync();

        var recentRegistrations = await _db.CourseRegistrations
            .OrderByDescending(r => r.CreatedAt)
            .Take(6)
            .Select(r => new AdminRecentRegistrationDto(
                r.Id.ToString(), r.Name, r.Email,
                r.Status.ToString().ToLowerInvariant(),
                r.CoursePackage!.Price,
                r.CreatedAt))
            .ToListAsync();

        var recentAuditLogs = await _db.AuditLogs
            .OrderByDescending(l => l.CreatedAt)
            .Take(8)
            .Select(l => new AdminAuditLogDto(
                l.Id.ToString(), l.AdminEmail, l.Action, l.Target, l.CreatedAt))
            .ToListAsync();

        var dayLabels = Enumerable.Range(0, 7)
            .Select(i => now.AddDays(i - 6).ToString("dd MMM"))
            .ToArray();

        return Ok(new AdminDashboardDto(
            TotalUsers: totalUsers,
            NewUsers7d: newUsers7d,
            TotalRegistrations: totalRegistrations,
            PendingRegistrations: pendingRegistrations,
            PaidRegistrations: paidRegistrations,
            RejectedRegistrations: rejectedRegistrations,
            TotalMentors: totalMentors,
            ActiveCourses: activeCourses,
            TotalRevenue: revenue,
            RegistrationsChart: BuildChart(dayLabels, registrations7d.Select(r => r.CreatedAt)),
            PaymentsChart: BuildChart(dayLabels, paidPayments7d.Select(p => p.PaidAt ?? DateTime.MinValue)),
            RecentRegistrations: recentRegistrations.ToArray(),
            RecentAuditLogs: recentAuditLogs.ToArray()));
    }

    private static AdminChartPoint[] BuildChart(string[] dayLabels, IEnumerable<DateTime> dates)
    {
        var byDay = dates.GroupBy(d => d.Date).ToDictionary(g => g.Key, g => g.Count());
        var today = DateTime.UtcNow.Date;
        return Enumerable.Range(0, 7)
            .Select(i => new AdminChartPoint(
                dayLabels[i],
                byDay.GetValueOrDefault(today.AddDays(i - 6), 0)))
            .ToArray();
    }
}
