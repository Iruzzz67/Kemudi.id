using Kemudi.Api.Controllers.Admin;
using Kemudi.Infrastructure.Auth;
using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

/// <summary>Manajemen pengguna untuk panel admin.</summary>
[ApiController]
[Route("api/admin/users")]
[Authorize(Roles = AdminAuthController.AdminRole)]
public sealed class AdminUsersController : ControllerBase
{
    private readonly AppDbContext _db;
    private readonly UserManager<ApplicationUser> _userManager;

    public AdminUsersController(AppDbContext db, UserManager<ApplicationUser> userManager)
    {
        _db = db;
        _userManager = userManager;
    }

    [HttpGet]
    [ProducesResponseType(typeof(AdminUserDto[]), StatusCodes.Status200OK)]
    public async Task<IActionResult> List(
        [FromQuery] string? q = null,
        [FromQuery] string? role = null)
    {
        var query = _db.Users.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(q))
        {
            var term = q.Trim().ToLowerInvariant();
            query = query.Where(u =>
                (u.Email != null && u.Email.ToLower().Contains(term)) ||
                (u.FullName != null && u.FullName.ToLower().Contains(term)));
        }

        var users = await query
            .OrderByDescending(u => u.CreatedAt)
            .Take(200)
            .ToListAsync();

        var adminIds = await _userManager.GetUsersInRoleAsync(AdminAuthController.AdminRole);
        var adminSet = adminIds.Select(u => u.Id).ToHashSet();

        var registrationCounts = await _db.CourseRegistrations
            .GroupBy(r => r.UserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.UserId, x => x.Count);

        var result = users
            .Where(u => role is null
                || (role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase) && adminSet.Contains(u.Id))
                || (role.Equals("USER", StringComparison.OrdinalIgnoreCase) && !adminSet.Contains(u.Id)))
            .Select(u => new AdminUserDto(
                u.Id,
                u.FullName,
                u.Email ?? string.Empty,
                adminSet.Contains(u.Id),
                u.IsActive,
                registrationCounts.GetValueOrDefault(u.Id, 0),
                u.CreatedAt))
            .ToArray();

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(AdminUserDetailDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Detail(Guid id)
    {
        var user = await _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == id.ToString());
        if (user is null) return NotFound(new { error = "Pengguna tidak ditemukan." });

        var isAdmin = await _userManager.IsInRoleAsync(user, AdminAuthController.AdminRole);
        var registrations = await _db.CourseRegistrations.CountAsync(r => r.UserId == user.Id);
        var attempts = await _db.SimulationAttempts.CountAsync(a => a.UserId == user.Id);

        return Ok(new AdminUserDetailDto(
            user.Id, user.FullName, user.Email ?? string.Empty,
            isAdmin, user.IsActive, registrations, attempts, user.CreatedAt));
    }

    [HttpPatch("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Update(Guid id, [FromBody] AdminUserUpdateRequest request)
    {
        var user = await _userManager.FindByIdAsync(id.ToString());
        if (user is null) return NotFound(new { error = "Pengguna tidak ditemukan." });

        var isAdmin = await _userManager.IsInRoleAsync(user, AdminAuthController.AdminRole);
        var self = user.Id == User.AdminId();

        // Admin tidak boleh menonaktifkan/menurunkan akun sendiri.
        if (self && (request.IsActive == false || string.Equals(request.Role, "USER", StringComparison.OrdinalIgnoreCase)))
            return BadRequest(new { error = "Anda tidak dapat menonaktifkan atau menurunkan akun sendiri." });

        var changes = new Dictionary<string, object>();

        if (request.IsActive is bool active)
        {
            user.IsActive = active;
            changes["IsActive"] = active;
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var promote = request.Role.Equals("ADMIN", StringComparison.OrdinalIgnoreCase);
            if (promote && !isAdmin)
            {
                await _userManager.AddToRoleAsync(user, AdminAuthController.AdminRole);
                changes["Role"] = "ADMIN";
            }
            else if (!promote && isAdmin)
            {
                await _userManager.RemoveFromRoleAsync(user, AdminAuthController.AdminRole);
                changes["Role"] = "USER";
            }
        }

        await _userManager.UpdateAsync(user);
        await AdminHelpers.LogAsync(
            _db, User,
            changes.TryGetValue("IsActive", out var v) && v is false ? "user.deactivate" : "user.update",
            "user", user.Id, changes);

        var finalIsAdmin = await _userManager.IsInRoleAsync(user, AdminAuthController.AdminRole);
        return Ok(new { id = user.Id, role = finalIsAdmin ? "ADMIN" : "USER", active = user.IsActive });
    }
}
