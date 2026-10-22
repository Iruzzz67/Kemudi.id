using Kemudi.App.Models;
using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;

namespace Kemudi.App.Data;

public class AppDbContext : IdentityDbContext<ApplicationUser>
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<SimulationAttempt> SimulationAttempts => Set<SimulationAttempt>();
    public DbSet<CourseRegistration> CourseRegistrations => Set<CourseRegistration>();
    public DbSet<Payment> Payments => Set<Payment>();

    protected override void OnModelCreating(ModelBuilder builder)
    {
        base.OnModelCreating(builder);

        builder.Entity<SimulationAttempt>(e =>
        {
            e.HasOne(a => a.User)
             .WithMany(u => u.Attempts)
             .HasForeignKey(a => a.UserId)
             .OnDelete(DeleteBehavior.Cascade);
            e.HasIndex(a => a.UserId);
        });

        builder.Entity<CourseRegistration>(e =>
        {
            e.HasKey(r => r.Id);
            e.HasIndex(r => r.Email);
        });

        builder.Entity<Payment>(e =>
        {
            e.HasKey(p => p.Id);
            e.HasIndex(p => p.RegistrationId);
        });
    }
}
