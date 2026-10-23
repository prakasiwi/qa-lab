| ID     | Behavior                    | Aturan Standar                                                                                                                                        |
| ------ | --------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| SRC-01 | Cakupan pencarian           | Pencarian berlaku pada seluruh data yang boleh diakses pengguna, sebelum pagination. Field yang dicari ditentukan pada FSD.                           |
| SRC-02 | Pemicu pencarian            | Pencarian dijalankan ketika pengguna menekan Enter atau mengklik tombol Search.                                                                       |
| SRC-03 | Pencocokan teks             | Data ditampilkan jika salah satu field pencarian mengandung kata kunci yang dimasukkan (*partial match*).                                           |
| SRC-04 | Huruf besar dan kecil       | Pencarian tidak membedakan huruf besar dan kecil. `Andi`, `andi`, dan `ANDI` memberikan hasil yang sama.                                        |
| SRC-05 | Spasi awal dan akhir        | Spasi di awal dan akhir kata kunci diabaikan. Spasi di tengah tetap dipertahankan.                                                                    |
| SRC-06 | Beberapa kata               | Kata kunci yang terdiri dari beberapa kata diperlakukan sebagai satu frasa. `Alex Pulalo` mencari teks yang mengandung frasa tersebut.              |
| SRC-07 | Karakter khusus             | Karakter seperti `'`, `%`, dan `_` diperlakukan sebagai teks literal, bukan perintah atau wildcard.                                             |
| SRC-08 | Kata kunci kosong           | Pencarian dengan input kosong atau hanya spasi menghapus pembatasan pencarian. Filter aktif tetap berlaku.                                            |
| SRC-09 | Hasil ditemukan             | Daftar menampilkan data yang sesuai dengan kata kunci beserta total hasilnya.                                                                         |
| SRC-10 | Hasil tidak ditemukan       | Daftar menampilkan pesan misalnya **Tidak ada hasil yang sesuai** dan total hasil nol. Pengguna tetap dapat mengubah atau menghapus kata kunci. |
| SRC-11 | Hapus pencarian             | Aksi clear mengosongkan input dan langsung memuat ulang daftar tanpa pembatasan pencarian. Filter dan sortir aktif tetap berlaku.                     |
| SRC-12 | Interaksi dengan filter     | Pencarian diterapkan bersama filter aktif. Data harus memenuhi kondisi pencarian sekaligus filter.                                                    |
| SRC-13 | Interaksi dengan sortir     | Hasil pencarian mengikuti kolom dan arah sortir yang sedang aktif.                                                                                    |
| SRC-14 | Interaksi dengan pagination | Pencarian baru atau penghapusan pencarian mengembalikan pengguna ke halaman pertama. Jumlah item per halaman tetap.                                   |
| SRC-15 | Proses pencarian            | Selama pencarian berlangsung, tampilkan indikator loading. Kondisi loading tidak ditampilkan sebagai hasil kosong.                                    |
| SRC-16 | Pencarian gagal             | Tampilkan pesan gagal dan opsi mencoba kembali. Kata kunci tetap tersimpan; kegagalan tidak ditampilkan sebagai hasil tidak ditemukan.                |
| SRC-17 | Pencarian berurutan         | Jika beberapa pencarian dijalankan berdekatan, daftar hanya menampilkan hasil untuk pencarian terakhir yang dijalankan.                               |
| SRC-18 | Memuat ulang halaman        | Setelah halaman di-refresh, kata kunci kembali kosong dan daftar mengikuti kondisi awal halaman.                                                      |
