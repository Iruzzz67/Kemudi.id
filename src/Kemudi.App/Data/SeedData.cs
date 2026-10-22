using Kemudi.App.Models;
using Microsoft.AspNetCore.Identity;

namespace Kemudi.App.Data;

public static class SeedData
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        var userManager = services.GetRequiredService<UserManager<ApplicationUser>>();
        var roleManager = services.GetRequiredService<RoleManager<IdentityRole>>();

        // Ensure ADMIN role exists
        if (!await roleManager.RoleExistsAsync("ADMIN"))
        {
            await roleManager.CreateAsync(new IdentityRole("ADMIN"));
        }

        // Seed admin user
        const string adminEmail = "admin@kemudi.id";
        var admin = await userManager.FindByEmailAsync(adminEmail);
        if (admin is null)
        {
            admin = new ApplicationUser
            {
                UserName = adminEmail,
                Email = adminEmail,
                DisplayName = "Admin",
                EmailConfirmed = true
            };
            await userManager.CreateAsync(admin, "admin123");
            await userManager.AddToRoleAsync(admin, "ADMIN");
        }

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
