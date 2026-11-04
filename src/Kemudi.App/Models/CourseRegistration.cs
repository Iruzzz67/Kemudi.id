namespace Kemudi.App.Models;

public class CourseRegistration
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid MentorId { get; set; }
    public string CoursePackageId { get; set; } = "";
    public string Name { get; set; } = "";
    public string Email { get; set; } = "";
    public string Phone { get; set; } = "";
    public string NIK { get; set; } = "";
    public string Address { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string PaymentMethod { get; set; } = "";
    public decimal Amount { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}

public class Payment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RegistrationId { get; set; }
    public string Method { get; set; } = "";
    public string Status { get; set; } = "pending";
    public string? Reference { get; set; }
    public decimal Amount { get; set; }
    public DateTime? PaidAt { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
