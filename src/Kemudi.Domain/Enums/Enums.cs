namespace Kemudi.Domain.Enums;

/// <summary>Jenis kendaraan yang disimulasikan (sama dengan enum lama di Prisma).</summary>
public enum VehicleType
{
    MOTOR = 0,
    MOBIL = 1,
    TRUK = 2
}

/// <summary>Tingkat kesulitan paket kursus.</summary>
public enum CourseLevel
{
    Pemula = 0,
    Menengah = 1,
    Mahir = 2
}

/// <summary>Metode pembayaran kursus.</summary>
public enum PaymentMethod
{
    Transfer = 0,
    EWallet = 1,
    Cash = 2
}

/// <summary>Status pembayaran.</summary>
public enum PaymentStatus
{
    Pending = 0,
    Paid = 1,
    Cancelled = 2
}

/// <summary>Status pendaftaran kursus.</summary>
public enum RegistrationStatus
{
    Pending = 0,
    Paid = 1,
    Cancelled = 2,
    Rejected = 3
}

/// <summary>Mode pelatihan simulasi.</summary>
public enum TrainingMode
{
    Beginner = 0,
    Standard = 1,
    Advanced = 2,
    Exam = 3
}
