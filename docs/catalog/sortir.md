| ID     | Behavior                              | Aturan Standar Result                                                                                                |
| ------ | ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| SRT-01 | Urutan default                        | Saat halaman pertama kali dibuka, data diurutkan berdasarkan **Tanggal Dibuat, terbaru ke terlama**.                     |
| SRT-02 | Kolom yang dapat disortir             | Sortir tersedia pada kolom **Semua kolom kecuali kolom aksi / kolom yang sifatnya multiple value pada list**.            |
| SRT-03 | Sortir ascending                      | Nama diurutkan A–Z, nominal dari terkecil ke terbesar, dan tanggal dari terlama ke terbaru.                                   |
| SRT-04 | Sortir descending                     | Nama diurutkan Z–A, nominal dari terbesar ke terkecil, dan tanggal dari terbaru ke terlama.                                   |
| SRT-05 | Perubahan arah sortir                 | Klik pertama pada header kolom menerapkan ascending; klik berikutnya mengubah menjadi descending, lalu bergantian.             |
| SRT-06 | Indikator sortir                      | Kolom yang sedang disortir menampilkan ikon yang menunjukkan arah ascending atau descending.                                   |
| SRT-07 | Pergantian kolom                      | Jika pengguna memilih kolom lain, sortir sebelumnya digantikan. Hanya satu kolom sortir yang aktif.                            |
| SRT-08 | Nilai yang sama                       | Jika nilai kolom sortir sama, gunakan **ID ascending** sebagai urutan tambahan agar hasil konsisten.                     |
| SRT-09 | Nilai kosong                          | Nilai `null` atau kosong selalu ditempatkan di bagian akhir, baik ascending maupun descending.                               |
| SRT-10 | Huruf besar dan kecil                 | Sortir Nama tidak membedakan huruf besar dan kecil; `Andi` dan `andi` dianggap setara.                                     |
| SRT-11 | Cakupan data                          | Sortir diterapkan pada **seluruh hasil pencarian dan filter**, sebelum pagination.                                       |
| SRT-12 | Interaksi dengan pagination           | Saat sortir diubah, halaman kembali ke halaman pertama. Jumlah item per halaman tetap.                                         |
| SRT-13 | Interaksi dengan filter dan pencarian | Perubahan sortir mempertahankan filter dan kata kunci pencarian yang aktif.                                                    |
| SRT-14 | Kondisi tanpa data                    | Sortir pada hasil kosong tetap menampilkan empty state tanpa error.                                                            |
| SRT-15 | Memuat ulang halaman                  | Setelah refresh, pengaturan sortir kembali ke urutan default.                                                                  |
| SRT-16 | Gagal mengambil data                  | Jika permintaan sortir gagal, tampilkan pesan gagal dan pertahankan data serta indikator sortir terakhir yang berhasil dimuat. |
