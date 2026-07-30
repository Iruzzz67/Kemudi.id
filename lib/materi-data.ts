export type Materi = {
  slug: string;
  title: string;
  category: "Umum" | "Motor" | "Mobil" | "Truk";
  summary: string;
  content: string[];
};

export const MATERI_LIST: Materi[] = [
  {
    slug: "rambu-lalu-lintas",
    title: "Mengenal Rambu Lalu Lintas",
    category: "Umum",
    summary:
      "Pelajari arti rambu peringatan, larangan, perintah, dan petunjuk berdasarkan Peraturan Menteri Perhubungan No. 13 Tahun 2014 tentang Rambu Lalu Lintas.",
    content: [
      "Berdasarkan Permenhub No. 13 Tahun 2014, Rambu Lalu Lintas adalah bagian perlengkapan jalan berupa lambang, huruf, angka, kalimat, dan/atau perpaduannya yang berfungsi sebagai peringatan, larangan, perintah, atau petunjuk bagi pengguna jalan. Rambu terdiri atas daun rambu (bahan retro reflektif agar terlihat jelas pada malam hari) dan tiang rambu sebagai penopangnya.",
      "Rambu lalu lintas dibagi menjadi empat kelompok utama: Rambu Peringatan, Rambu Larangan, Rambu Perintah, dan Rambu Petunjuk. Setiap kelompok memiliki warna dasar, garis tepi, serta warna lambang/huruf yang sudah ditetapkan agar mudah dikenali pengemudi.",
      "Rambu Peringatan berwarna dasar kuning dengan garis tepi, lambang, dan huruf/angka berwarna hitam. Rambu ini dipasang sebelum lokasi berbahaya seperti tikungan tajam, jalan licin, jalan menyempit, area penyeberangan, atau kawasan rawan bencana, agar pengemudi bisa menurunkan kecepatan lebih awal.",
      "Rambu Larangan berwarna dasar putih dengan garis tepi merah, lambang berwarna hitam, huruf/angka hitam, dan tulisan berwarna merah. Rambu ini wajib dipatuhi mutlak, contohnya dilarang masuk, dilarang berhenti atau parkir, larangan gerakan lalu lintas tertentu, hingga batas kecepatan maksimum dan batas berat kendaraan.",
      "Rambu Perintah berwarna dasar biru dengan garis tepi, lambang, huruf, angka, atau kata-kata berwarna putih, misalnya wajib mengikuti arah yang ditentukan, wajib berjalan lurus, batas kecepatan minimum, atau penggunaan lajur/jalur tertentu.",
      "Rambu Petunjuk memandu perjalanan dan memberikan informasi lain kepada pengguna jalan, dengan tiga variasi warna dasar: hijau untuk petunjuk jurusan di jalan luar kota/tol, biru untuk petunjuk jurusan di dalam kota (bersifat perintah mengikuti arah yang ditunjuk), dan cokelat untuk penunjuk kawasan atau objek wisata.",
      "Permenhub No. 13 Tahun 2014 juga mengenal rambu konvensional (memantulkan cahaya/retro reflektif) dan rambu elektronik yang informasinya dapat diubah sesuai keadaan, misalnya untuk peringatan cuaca, perbaikan jalan, atau kampanye keselamatan. Selalu kenali rambu di sekitar sebelum memasuki area baru, terutama saat mengemudikan kendaraan besar seperti truk yang membutuhkan jarak pengereman lebih panjang.",
    ],
  },
  {
    slug: "dasar-berkendara-motor",
    title: "Dasar Berkendara Sepeda Motor",
    category: "Motor",
    summary:
      "Teknik keseimbangan, pengereman, dan posisi berkendara yang aman untuk pemula sepeda motor.",
    content: [
      "Posisi tubuh yang benar: punggung tegak, siku sedikit menekuk, dan pandangan jauh ke depan untuk antisipasi dini.",
      "Gunakan rem depan dan belakang secara bersamaan dengan proporsi lebih besar di rem depan (sekitar 70%) untuk pengereman optimal tanpa terjatuh.",
      "Jaga keseimbangan dengan kecepatan minimum saat menikung, condongkan badan mengikuti arah motor, bukan melawan arah.",
      "Sepeda motor memiliki lebar sempit sehingga lincah bermanuver, namun risiko jatuh lebih tinggi terutama di jalan licin.",
    ],
  },
  {
    slug: "dasar-mengemudikan-mobil",
    title: "Dasar Mengemudikan Mobil",
    category: "Mobil",
    summary:
      "Kontrol kemudi, pedal, dan estimasi jarak yang perlu dikuasai sebelum mengemudi di jalan raya.",
    content: [
      "Atur posisi kursi dan kaca spion sebelum menyalakan mesin agar jangkauan pedal dan visibilitas optimal.",
      "Teknik memegang setir yang disarankan adalah posisi jam 9 dan jam 3 untuk kontrol maksimal saat bermanuver.",
      "Pahami titik buta (blind spot) di sisi kanan dan kiri mobil, selalu tengok langsung sebelum berpindah jalur.",
      "Mobil memiliki body lebih lebar dari motor sehingga membutuhkan estimasi jarak yang lebih cermat saat menyalip atau parkir.",
    ],
  },
  {
    slug: "dasar-mengemudikan-truk",
    title: "Dasar Mengemudikan Truk",
    category: "Truk",
    summary:
      "Karakteristik kendaraan besar: radius putar lebar, jarak pengereman panjang, dan titik buta yang luas.",
    content: [
      "Truk memiliki radius putar yang jauh lebih besar dibanding mobil, sehingga perhitungan ruang saat menikung harus lebih lebar.",
      "Jarak pengereman truk bermuatan jauh lebih panjang, jaga jarak aman minimal 3-5 detik dari kendaraan di depan.",
      "Titik buta pada truk sangat luas terutama di sisi kiri dan belakang, gunakan kaca spion tambahan dan selalu asumsikan ada kendaraan di area tersebut.",
      "Saat menikung, truk cenderung mengalami off-tracking (roda belakang memotong lintasan lebih ke dalam), ambil lintasan lebih lebar dari yang terlihat perlu.",
    ],
  },
];

export function getMateriBySlug(slug: string) {
  return MATERI_LIST.find((m) => m.slug === slug);
}
