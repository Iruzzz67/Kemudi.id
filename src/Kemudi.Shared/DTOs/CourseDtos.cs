namespace Kemudi.Shared.DTOs;

/// <summary>Ringkasan paket kursus yang ditampilkan di halaman kursus.</summary>
public sealed record CoursePackageDto(
    string Id,
    string VehicleType,
    string Label,
    string Level,
    decimal Price,
    int Sessions,
    int SessionDurationMin,
    string Description,
    string[] Includes);

/// <summary>Profil mentor untuk halaman kursus & portofolio.</summary>
public sealed record MentorDto(
    string Id,
    string Name,
    string Title,
    string[] VehicleTypes,
    int ExperienceYears,
    double Rating,
    int StudentsTrained,
    string Bio,
    string Initials,
    string AvatarColor,
    string? Phone,
    MentorPortfolioDto Portfolio);

public sealed record MentorPortfolioDto(
    string[] Certifications,
    string[] Achievements,
    TestimonialDto[] Testimonials);

public sealed record TestimonialDto(string Name, string Quote);

/// <summary>Slot jadwal kursus.</summary>
public sealed record ScheduleSlotDto(
    string Id,
    string Days,
    string Time,
    string? Note);

/// <summary>Payload pendaftaran kursus dari halaman data diri.</summary>
public sealed record CourseRegistrationRequest(
    string MentorId,
    string CoursePackageId,
    string Name,
    string Email,
    string Phone,
    string NIK,
    string Address,
    string PaymentMethod); // transfer | e-wallet | cash

/// <summary>Ringkasan pendaftaran yang dikembalikan API.</summary>
public sealed record CourseRegistrationDto(
    string Id,
    string MentorId,
    string CoursePackageId,
    string Name,
    string Status,       // pending | paid
    decimal Amount,
    string PaymentMethod,
    DateTime StartDate,
    DateTime CreatedAt);

/// <summary>Payload konfirmasi pembayaran.</summary>
public sealed record PaymentRequest(
    string RegistrationId,
    string Method,      // transfer | e-wallet | cash
    string? Reference); // no. transfer / e-wallet reference

public sealed record PaymentDto(
    string Id,
    string RegistrationId,
    string Method,
    string Status,
    string? Reference,
    decimal Amount,
    DateTime PaidAt);
