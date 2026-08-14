namespace Kemudi.Web.Data;

public sealed record Materi(
    string Slug,
    string Title,
    string Category,
    string Summary,
    string[] Content);

/// <summary>
/// Data materi teori — padanan <c>lib/materi-data.ts</c> pada aplikasi lama.
/// </summary>
public static class MateriData
{
    public static readonly Materi[] List =
    {
        new(
            "rambu-lalu-lintas",
            "Mengenal Rambu Lalu Lintas",
            "Umum",
            "Pelajari arti rambu peringatan, larangan, perintah, dan petunjuk berdasarkan Peraturan Menteri Perhubungan No. 13 Tahun 2014 tentang Rambu Lalu Lintas.",
            new[]
            {
                "Rambu Lalu Lintas adalah bagian perlengkapan jalan berupa lambang, huruf, angka, kalimat, dan/atau perpaduannya yang berfungsi sebagai peringatan, larangan, perintah, atau petunjuk bagi pengguna jalan.",
                "Rambu lalu lintas dibagi menjadi empat kelompok utama: Rambu Peringatan, Rambu Larangan, Rambu Perintah, dan Rambu Petunjuk.",
                "Rambu Peringatan berwarna dasar kuning dengan garis tepi, lambang, dan huruf/angka berwarna hitam. Dipasang sebelum lokasi berbahaya seperti tikungan tajam, jalan licin, atau penyempitan jalan.",
                "Rambu Larangan berwarna dasar putih dengan garis tepi merah. Contohnya dilarang masuk, dilarang berhenti/parkir, dan batas kecepatan maksimum.",
                "Rambu Perintah berwarna dasar biru dengan lambang/huruf putih, misalnya wajib mengikuti arah yang ditentukan atau batas kecepatan minimum.",
                "Rambu Petunjuk memandu perjalanan: hijau untuk jurusan luar kota/tol, biru untuk dalam kota, dan cokelat untuk kawasan wisata.",
                "Selalu kenali rambu sebelum memasuki area baru, terutama saat mengemudikan kendaraan besar seperti truk yang membutuhkan jarak pengereman lebih panjang."
            }),
        new(
            "dasar-berkendara-motor",
            "Dasar Berkendara Sepeda Motor",
            "Motor",
            "Teknik keseimbangan, pengereman, dan posisi berkendara yang aman untuk pemula sepeda motor.",
            new[]
            {
                "Posisi tubuh yang benar: punggung tegak, siku sedikit menekuk, dan pandangan jauh ke depan untuk antisipasi dini.",
                "Gunakan rem depan dan belakang secara bersamaan dengan proporsi lebih besar di rem depan (sekitar 70%).",
                "Jaga keseimbangan dengan kecepatan minimum saat menikung, condongkan badan mengikuti arah motor.",
                "Sepeda motor memiliki lebar sempit sehingga lincah bermanuver, namun risiko jatuh lebih tinggi terutama di jalan licin."
            }),
        new(
            "dasar-mengemudikan-mobil",
            "Dasar Mengemudikan Mobil",
            "Mobil",
            "Kontrol kemudi, pedal, dan estimasi jarak yang perlu dikuasai sebelum mengemudi di jalan raya.",
            new[]
            {
                "Atur posisi kursi dan kaca spion sebelum menyalakan mesin agar jangkauan pedal dan visibilitas optimal.",
                "Teknik memegang setir yang disarankan adalah posisi jam 9 dan jam 3 untuk kontrol maksimal saat bermanuver.",
                "Pahami titik buta (blind spot) di sisi kanan dan kiri mobil, selalu tengok langsung sebelum berpindah jalur.",
                "Mobil memiliki body lebih lebar dari motor sehingga membutuhkan estimasi jarak yang lebih cermat saat menyalip atau parkir."
            }),
        new(
            "dasar-mengemudikan-truk",
            "Dasar Mengemudikan Truk",
            "Truk",
            "Karakteristik kendaraan besar: radius putar lebar, jarak pengereman panjang, dan titik buta yang luas.",
            new[]
            {
                "Truk memiliki radius putar yang jauh lebih besar dibanding mobil, sehingga perhitungan ruang saat menikung harus lebih lebar.",
                "Jarak pengereman truk bermuatan jauh lebih panjang, jaga jarak aman minimal 3-5 detik dari kendaraan di depan.",
                "Titik buta pada truk sangat luas terutama di sisi kiri dan belakang, gunakan kaca spion tambahan dan selalu asumsikan ada kendaraan di area tersebut.",
                "Saat menikung, truk cenderung mengalami off-tracking (roda belakang memotong lintasan lebih ke dalam), ambil lintasan lebih lebar dari yang terlihat perlu."
            })
    };

    public static Materi? BySlug(string slug) =>
        List.FirstOrDefault(m => m.Slug == slug);
}
