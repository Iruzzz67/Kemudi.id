using Kemudi.App.Models;
using Microsoft.AspNetCore.Identity;

namespace Kemudi.App.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();

        // Seed test user
        const string testEmail = "test@kemudi.id";
        var existing = await userManager.FindByEmailAsync(testEmail);
        if (existing is null)
        {
            var user = new ApplicationUser
            {
                UserName = testEmail,
                Email = testEmail,
                DisplayName = "Test User",
                EmailConfirmed = true
            };
            await userManager.CreateAsync(user, "test123");
        }
    }
}
