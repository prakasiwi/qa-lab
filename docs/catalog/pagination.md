| ID | Behavior | Aturan Standar |
|---|---|---|
| PAG-01 | Cakupan pagination | Pagination membagi data sesuai hak akses pengguna, setelah pencarian, filter, dan sortir diterapkan. |
| PAG-02 | Halaman awal | Saat halaman pertama kali dibuka, daftar menampilkan halaman pertama. |
| PAG-03 | Jumlah data per halaman | Jumlah data per halaman mengikuti nilai default yang disepakati tim dan dicantumkan pada FSD. |
| PAG-04 | Pilihan jumlah data | Pengguna dapat memilih jumlah data per halaman dari opsi yang ditentukan pada FSD, misalnya 10, 25, dan 50. |
| PAG-05 | Perubahan jumlah data | Saat jumlah data per halaman diubah, daftar kembali ke halaman pertama. Pencarian, filter, dan sortir aktif tetap dipertahankan. |
| PAG-06 | Perhitungan jumlah halaman | Jumlah halaman dihitung dari total hasil data dibagi jumlah data per halaman, lalu dibulatkan ke atas. Contoh: 25 data dengan 10 data per halaman menghasilkan 3 halaman. |
| PAG-07 | Perpindahan halaman | Memilih nomor halaman menampilkan data untuk halaman tersebut dan memperbarui indikator halaman aktif. |
| PAG-08 | Halaman berikutnya | Tombol Next menampilkan halaman setelah halaman aktif. Tombol dinonaktifkan ketika pengguna berada di halaman terakhir. |
| PAG-09 | Halaman sebelumnya | Tombol Previous menampilkan halaman sebelum halaman aktif. Tombol dinonaktifkan ketika pengguna berada di halaman pertama. |
| PAG-10 | Halaman pertama dan terakhir | Jika tersedia, tombol First dan Last membawa pengguna langsung ke halaman pertama dan terakhir. Tombol dinonaktifkan ketika pengguna sudah berada di halaman tujuan. |
| PAG-11 | Informasi jumlah data | Tampilkan rentang data yang sedang dilihat dan total hasil data. Contoh: “Menampilkan 11–20 dari 25 data”. |
| PAG-12 | Halaman terakhir | Halaman terakhir menampilkan sisa data yang tersedia tanpa menambahkan baris data kosong. |
| PAG-13 | Interaksi dengan pencarian dan filter | Penerapan atau penghapusan pencarian serta penerapan atau reset filter mengembalikan daftar ke halaman pertama. |
| PAG-14 | Interaksi dengan sortir | Perubahan kolom atau arah sortir mengembalikan daftar ke halaman pertama. |
| PAG-15 | Mempertahankan kondisi daftar | Perpindahan halaman mempertahankan kata kunci pencarian, filter, sortir, dan jumlah data per halaman yang aktif. |
| PAG-16 | Kondisi tanpa data | Tampilkan empty state dan informasi “0 dari 0 data”. Tombol perpindahan halaman dinonaktifkan dan tidak ada nomor halaman yang dapat dipilih. |
| PAG-17 | Hanya satu halaman | Jika seluruh hasil data cukup ditampilkan dalam satu halaman, tombol perpindahan halaman dinonaktifkan. |
| PAG-18 | Halaman tidak lagi tersedia | Jika total data berkurang sehingga halaman aktif tidak lagi tersedia, tampilkan halaman terakhir yang masih tersedia. Jika tidak ada data, gunakan kondisi PAG-16. |
| PAG-19 | Konsistensi urutan data | Gunakan urutan yang konsisten, termasuk urutan tambahan saat nilai sortir sama, agar data tidak berpindah urutan secara acak saat berganti halaman. |
| PAG-20 | Proses perpindahan | Selama data halaman tujuan dimuat, tampilkan indikator loading. Kondisi loading tidak ditampilkan sebagai hasil kosong. |
| PAG-21 | Gagal memuat halaman | Tampilkan pesan gagal dan opsi mencoba kembali. Data serta indikator halaman aktif tetap mengikuti halaman terakhir yang berhasil dimuat. |
| PAG-22 | Perpindahan berurutan | Jika pengguna memilih beberapa halaman secara berdekatan, daftar hanya menampilkan hasil dari pilihan halaman terakhir. |
| PAG-23 | Memuat ulang halaman | Setelah refresh, daftar kembali ke halaman pertama dan jumlah data per halaman kembali ke nilai default. |