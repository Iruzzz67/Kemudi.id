using Kemudi.Infrastructure.Data;
using Kemudi.Shared.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.Api.Controllers;

[ApiController]
[Route("api/vehicles")]
[AllowAnonymous]
public sealed class VehiclesController : ControllerBase
{
    private readonly AppDbContext _db;

    public VehiclesController(AppDbContext db) => _db = db;

    /// <summary>Daftar kendaraan yang tersedia untuk simulasi.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IEnumerable<VehicleDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetAll()
    {
        // Urutan tetap: MOTOR, MOBIL, TRUK (enum tersimpan sebagai string di DB).
        var order = new[] { "MOTOR", "MOBIL", "TRUK" };
        var vehicles = await _db.Vehicles.AsNoTracking().ToListAsync();
        vehicles = vehicles
            .OrderBy(v => Array.IndexOf(order, v.Type.ToString()))
            .ToList();

        return Ok(vehicles.Select(v => new VehicleDto(
            Type: v.Type.ToString(),
            Label: v.Label,
            Description: v.Description,
            Color: v.Color,
            MaxSpeed: v.MaxSpeed,
            GearCount: v.GearCount)));
    }
}
