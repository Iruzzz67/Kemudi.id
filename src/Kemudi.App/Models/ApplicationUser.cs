using Microsoft.AspNetCore.Identity;

namespace Kemudi.App.Models;

public class ApplicationUser : IdentityUser
{
    public string? DisplayName { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<SimulationAttempt> Attempts { get; set; } = new();
}
