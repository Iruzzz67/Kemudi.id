using Kemudi.Api.Controllers.Admin;
using Kemudi.Infrastructure.Auth;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Pengaturan panel admin: ganti password, akun admin, audit log.</summary>
[ApiController]
[Route("api/admin/settings")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminSettingsController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminSettingsController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    /// <summary>Riwayat audit log (maks. 100 terbaru).</summary>
    [HttpGet("audit-logs")]
    [ProducesResponseType(typeof(AdminAuditLogDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> AuditLogs()
    {
        var logs = await _db.AuditLogs.AsNoTracking()
            .OrderByDescending(l => l.CreatedAt)
            .Take(100)
            .Select(l => new AdminAuditLogDto(
                l.Id.ToString(), l.AdminEmail, l.Action, l.Target, l.CreatedAt))
            .ToListAsync();
        return Ok(logs);
    }

    /// <summary>Daftar akun admin.</summary>
    [HttpGet("admins")]
    [ProducesResponseType(typeof(AdminAccountDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> Admins()
    {
        var admins = await _userManager.GetUsersInRoleAsync(AdminAuthController.AdminRole);
        return Ok(admins
            .OrderBy(a => a.Email)
            .Select(a => new AdminAccountDto(
                a.Id, a.FullName, a.Email ?? string.Empty, a.IsActive, a.CreatedAt))
            .ToArray());
    }

    /// <summary>Ganti password akun admin yang sedang login.</summary>
    [HttpPost("change-password")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        var userId = User.AdminId();
        if (userId is null) return Unauthorized();

        var user = await _userManager.FindByIdAsync(userId);
        if (user is null) return Unauthorized();

        var result = await _userManager.ChangePasswordAsync(
            user, request.CurrentPassword, request.NewPassword);
        if (!result.Succeeded)
        {
            var errors = result.Errors.Select(e => e.Description);
            return BadRequest(new { error = string.Join(" ", errors) });
        }

        await AdminHelpers.LogAsync(_db, User, "admin.change_password", "admin");
        return Ok(new { success = true });
    }

    /// <summary>Jadikan akun (berdasarkan email) sebagai admin.</summary>
    [HttpPost("promote")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Promote([FromBody] AdminPromoteRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            return BadRequest(new { error = "Email wajib diisi." });

        var user = await _userManager.FindByEmailAsync(request.Email.Trim().ToLowerInvariant());
        if (user is null) return NotFound(new { error = "Pengguna dengan email tersebut tidak ditemukan." });

        if (!await _userManager.IsInRoleAsync(user, AdminAuthController.AdminRole))
            await _userManager.AddToRoleAsync(user, AdminAuthController.AdminRole);

        await AdminHelpers.LogAsync(_db, User, "admin.promote", "user", user.Id, new { email = user.Email });
        return Ok(new { email = user.Email, role = "ADMIN" });
    }
}
