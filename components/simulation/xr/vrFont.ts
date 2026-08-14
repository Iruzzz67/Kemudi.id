// Font lokal untuk semua teks 3D di VR. Drei <Text> (troika) defaultnya
// menyelesaikan font dari CDN — di headset yang tidak bisa mengakses internet
// (sering terjadi saat tes VR lewat LAN), teks dashboard/HUD/panel tidak akan
// muncul sama sekali. Dengan memakai font dari folder /public (served
// same-origin), teks selalu tampil dan tidak bergantung koneksi.
export const VR_FONT = "/fonts/Roboto-Regular.woff";
