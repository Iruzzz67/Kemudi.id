export type MateriImage = {
  src: string;
  alt: string;
  caption: string;
  sourceUrl: string;
  /** Indeks paragraf (0-based) setelah foto ditampilkan. Default: 0. */
  afterParagraph?: number;
};

export type Materi = {
  slug: string;
  title: string;
  category: "Umum" | "Motor" | "Mobil" | "Truk";
  summary: string;
  content: string[];
  images?: MateriImage[];
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
    images: [
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/a/a3/ID_Rambu_peringatan_1a.svg",
        alt: "Rambu peringatan tikungan tajam ke kiri",
        caption: "Rambu peringatan: tikungan tajam ke kiri — dasar kuning, garis tepi & lambang hitam.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:ID_Rambu_peringatan_1a.svg",
        afterParagraph: 2,
      },
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/a/a6/ID_Rambu_larangan_4e.svg",
        alt: "Rambu larangan dilarang memutar balik",
        caption: "Rambu larangan: dilarang memutar balik — dasar putih, garis tepi merah, lambang hitam.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:ID_Rambu_larangan_4e.svg",
        afterParagraph: 3,
      },
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/c/c1/ID_Rambu_perintah_1e.svg",
        alt: "Rambu perintah wajib berjalan lurus",
        caption: "Rambu perintah: wajib berjalan lurus — dasar biru, lambang/huruf putih.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:ID_Rambu_perintah_1e.svg",
        afterParagraph: 4,
      },
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/e/ed/ID_Rambu_petunjuk_1b_%28variant_1%29.svg",
        alt: "Rambu petunjuk jurusan jalan luar kota",
        caption: "Rambu petunjuk jurusan (jalan luar kota/tol) — dasar hijau dengan tulisan putih.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:ID_Rambu_petunjuk_1b_(variant_1).svg",
        afterParagraph: 5,
      },
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
    images: [
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/2/23/Rider_in_black_textile_suit_and_blue_helmet_on_Honda_CBR600.jpg",
        alt: "Pengendara motor memakai helm dan jaket pelindung",
        caption: "Pengendara motor dengan perlengkapan keselamatan: helm, jaket, dan sarung tangan.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Rider_in_black_textile_suit_and_blue_helmet_on_Honda_CBR600.jpg",
        afterParagraph: 0,
      },
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
    images: [
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/0/0f/Driving_car_20170523.jpg",
        alt: "Tangan pengemudi pada setir mobil posisi jam 9 dan jam 3",
        caption: "Posisi tangan jam 9 dan jam 3 memberikan kontrol maksimal saat bermanuver.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Driving_car_20170523.jpg",
        afterParagraph: 1,
      },
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
    images: [
      {
        src: "https://upload.wikimedia.org/wikipedia/commons/3/3e/Dalton_truck_and_Sukakpak_Mountain.jpg",
        alt: "Truk besar melintasi jalan raya",
        caption: "Truk besar membutuhkan jarak pengereman panjang dan ruang manuver yang lebih lebar.",
        sourceUrl: "https://commons.wikimedia.org/wiki/File:Dalton_truck_and_Sukakpak_Mountain.jpg",
        afterParagraph: 1,
      },
    ],
  },
];

export function getMateriBySlug(slug: string) {
  return MATERI_LIST.find((m) => m.slug === slug);
}
