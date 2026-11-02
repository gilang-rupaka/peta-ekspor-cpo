# Peta Regulasi Ekspor CPO

Bahan ajar Transportasi Multimoda, D3 Manajemen Logistik, Poltrada Bali. Halaman berisi peta regulasi ekspor CPO dan lembar jawaban diskusi taruna. Jawaban masuk ke Google Sheet milik dosen. Dosen mengunduh rekap dalam format xlsx dari halaman admin.

## Isi repo

| File | Fungsi |
|---|---|
| `index.html` | Peta regulasi dan formulir jawaban untuk taruna |
| `admin.html` | Rekap jawaban, Skor PG, dan tombol unduh xlsx, dilindungi kata sandi |
| `apps-script/Code.gs` | Skrip penerima jawaban, ditempel di Google Apps Script |

Kata sandi admin tidak tersimpan di repo. Kata sandi berada di Script Properties milik akun Google Anda.

## Langkah pemasangan

Total waktu sekitar 20 menit.

### Bagian A. Google Sheet dan Apps Script

1. Buka https://sheets.new dengan akun Google Anda. Beri nama file `Jawaban Diskusi Ekspor CPO`.
2. Pilih menu **Ekstensi > Apps Script**. Editor skrip terbuka di tab baru.
3. Hapus seluruh isi file `Code.gs` di editor. Tempel seluruh isi `apps-script/Code.gs` dari repo ini. Tekan **Simpan** (ikon disket).
4. Pilih fungsi `siapkanSheet` di daftar fungsi bagian atas editor. Tekan **Jalankan**.
5. Google meminta izin. Pilih **Tinjau izin**, pilih akun Anda, lalu **Lanjutan > Buka (nama proyek) (tidak aman) > Izinkan**. Peringatan ini muncul karena skrip buatan sendiri belum diverifikasi Google.
6. Kembali ke tab Sheet. Tab baru bernama `Jawaban` muncul dengan delapan judul kolom.
7. Di editor Apps Script, buka **Setelan proyek** (ikon roda gigi di kiri). Gulir ke **Properti skrip**, tekan **Tambahkan properti skrip**.
   - Properti: `ADMIN_KEY`
   - Nilai: kata sandi admin pilihan Anda, minimal 10 karakter
   - Tambahkan properti kedua. Properti: `KUNCI_PG`. Nilai: kunci 10 soal pilihan ganda berurutan tanpa spasi, contoh `ABCDABCDAB`. Kunci sengaja tidak ditulis di repo karena repo bersifat publik.
   - Tekan **Simpan properti skrip**.
8. Tekan **Terapkan > Deployment baru**. Klik ikon roda gigi di samping "Pilih jenis", pilih **Aplikasi web**. Isi:
   - Deskripsi: `Penerima jawaban v1`
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
9. Tekan **Terapkan**. Salin **URL aplikasi web** yang berakhiran `/exec`. Simpan URL ini untuk langkah berikutnya.

Bila pilihan **Siapa saja** tidak muncul, admin Google Workspace kampus membatasi akses aplikasi web. Pakai akun Gmail pribadi untuk Bagian A.

### Bagian B. Repo GitHub

10. Semua file sudah berada di branch `main` repo ini. Lanjut ke langkah 11.
11. Buka `index.html` di GitHub, tekan ikon pensil. Cari baris berikut:
    ```js
    const SCRIPT_URL = 'TEMPEL_URL_WEB_APP_DI_SINI';
    ```
    Ganti teks di dalam tanda kutip dengan URL dari langkah 9. Tekan **Commit changes**.
12. Ulangi langkah 11 untuk `admin.html`.
13. Buka **Settings > Pages**. Pada **Source** pilih **Deploy from a branch**. Pilih branch `main` dan folder `/ (root)`. Tekan **Save**.
14. Tunggu satu sampai dua menit. Alamat halaman muncul di bagian atas Settings > Pages, berbentuk `https://<username>.github.io/<nama-repo>/`.

### Bagian C. Uji coba

15. Buka alamat halaman dari HP. Isi identitas uji, jawab ketiga pertanyaan, tekan **Kirim jawaban**. Pesan hijau "Jawaban terkirim" muncul.
16. Buka Google Sheet. Baris uji muncul di tab `Jawaban`.
17. Kirim ulang dengan Notar yang sama. Baris lama tertimpa, jumlah baris tetap.
18. Buka `https://<username>.github.io/<nama-repo>/admin.html`. Masukkan kata sandi dari langkah 7, tekan **Muat rekap**, lalu **Unduh xlsx**.
19. Hapus baris uji di Google Sheet sebelum kelas dimulai.

## Pemakaian di kelas

- Bagikan alamat `index.html` ke taruna lewat grup kelas. Taruna tidak butuh akun apa pun.
- Satu Notar menyimpan satu jawaban. Kiriman ulang menimpa kiriman sebelumnya.
- Isian taruna tersimpan sementara di perangkatnya. Isian tidak hilang bila sinyal putus saat mengirim.
- File xlsx memuat kolom **Nilai** kosong untuk penilaian.
- Filter **Kelas** di halaman admin memisahkan unduhan per kelas.

## Pilihan ganda

Formulir memuat 10 soal pilihan ganda materi pertemuan 1 sampai 5 (Bagian A) dan 3 pertanyaan diskusi (Bagian B). Apps Script menghitung **Skor PG** skala 0 sampai 100 memakai kunci di Script Properties `KUNCI_PG`. Taruna tidak melihat skor maupun kunci. Bila kunci diperbaiki setelah taruna mengirim, jalankan fungsi `hitungUlangSkor` dari editor Apps Script.

Soal pilihan ganda tersimpan di konstanta `PG` dalam `index.html`. Bila urutan atau isi soal diubah, perbarui juga `KUNCI_PG`.

## Bila Code.gs diubah

Perubahan skrip tidak otomatis aktif. Pilih **Terapkan > Kelola deployment**, tekan ikon pensil, ubah **Versi** menjadi **Versi baru**, lalu **Terapkan**. URL tetap sama sehingga `index.html` tidak perlu diubah.

## Mengatasi masalah

| Pesan | Penyebab | Tindakan |
|---|---|---|
| Formulir belum tersambung ke Google Sheet | `SCRIPT_URL` belum diganti | Ulangi langkah 11 dan 12 |
| Server tidak terjangkau | Akses aplikasi web bukan "Siapa saja", atau URL salah | Periksa langkah 8 dan URL berakhiran `/exec` |
| ADMIN_KEY belum diisi | Properti skrip kosong | Ulangi langkah 7 |
| Kata sandi salah | Kata sandi berbeda dengan `ADMIN_KEY` | Cek ulang di Properti skrip |
| Pustaka xlsx gagal dimuat | Internet admin terputus | Muat ulang halaman admin |

## Keamanan

- Siapa pun yang memegang tautan `index.html` bisa mengirim jawaban. Nama dan Notar tidak diverifikasi.
- Kolom tersembunyi di formulir menyaring kiriman bot sederhana.
- Teks jawaban yang diawali `=`, `+`, `-`, atau `@` disimpan sebagai teks biasa agar tidak terbaca sebagai rumus.
- Ganti `ADMIN_KEY` tiap semester.
