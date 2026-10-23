# Katalog Fitur: Registrasi

## Tujuan

Membuat akun pengguna secara mandiri atau oleh admin dengan Identifier yang tervalidasi, akses awal yang aman, dan jejak audit yang dapat ditelusuri.

## Terminologi

`Identifier` adalah data untuk mengenali pengguna, misalnya email, nomor telepon, username, atau NRP. Validasi format Identifier tidak sama dengan verifikasi kepemilikan Identifier.

## Pola 1 — Registrasi Mandiri

```text
Pengguna mengisi form registrasi
→ Sistem memvalidasi data
→ Sistem menyimpan akun sebagai pending verification
→ Sistem mengirim verifikasi Identifier
→ Pengguna membuka tautan atau memasukkan OTP
→ Sistem menandai Identifier verified dan mengaktifkan akun
→ Pengguna dapat login
```

Pola ini sesuai untuk aplikasi publik atau internal yang mengizinkan pengguna membuat akunnya sendiri.

## Pola 2 — Registrasi oleh Admin

```text
Admin mengisi data pengguna dan akses awal
→ Sistem memvalidasi data serta kewenangan admin
→ Sistem menyimpan akun sebagai pending activation
→ Sistem mengirim undangan aktivasi ke Identifier pengguna
→ Pengguna memverifikasi Identifier dan menetapkan password sendiri
→ Sistem mengaktifkan akun
→ Pengguna dapat login
```

Undangan aktivasi lebih disarankan daripada mengirim default password melalui email. Apabila aplikasi harus memakai password sementara, password tersebut harus acak, memiliki masa berlaku, hanya dapat digunakan sekali, dan pengguna wajib menggantinya pada login pertama.

## Validasi & Behavior

### Baseline

| Scope | Field | Aturan |
| --- | --- | --- |
| Registrasi | Identifier | Mandatory. Format mengikuti jenis Identifier yang dikonfigurasi aplikasi. |
| Registrasi | Identifier | Dinormalisasi dan diperiksa keunikannya sesuai kebijakan aplikasi. |
| Registrasi | Password | Mandatory untuk registrasi mandiri. |
| Registrasi | Password | Nilai password disembunyikan secara default dan memiliki kontrol tampil/sembunyikan yang dapat diakses melalui keyboard. |
| Registrasi | Konfirmasi Password | Mandatory untuk registrasi mandiri dan harus sama dengan password. |
| Registrasi | Konfirmasi Password | Nilai konfirmasi password disembunyikan secara default dan memiliki kontrol tampil/sembunyikan yang dapat diakses melalui keyboard. |
| Registrasi | Submit | Tombol submit hanya membuat satu permintaan aktif dan menampilkan status pemrosesan. |
| Registrasi | Error | Error input ditampilkan dekat field terkait, dapat dipahami pengguna, serta fokus dapat diarahkan ke input yang tidak valid. |
| Registrasi | Audit | Sistem mencatat pembuatan akun, pengiriman undangan/verifikasi, verifikasi, aktivasi, dan kegagalan tanpa menyimpan password atau token. |

### Verifikasi Identifier

| Scope | Field | Aturan |
| --- | --- | --- |
| Registrasi | Status akun | Akun yang memerlukan verifikasi berstatus `pending verification` dan belum dapat login sebelum verifikasi berhasil. |
| Registrasi | Kanal verifikasi | Email diverifikasi melalui tautan atau OTP; nomor telepon melalui OTP; Identifier internal dapat dicocokkan dengan data master dan/atau kanal terdaftar. |
| Registrasi | Token / OTP | Dibuat secara aman, sekali pakai, memiliki masa berlaku, dan tidak boleh disimpan atau dicatat dalam bentuk terbuka. |
| Registrasi | Verifikasi | Verifikasi berhasil menandai Identifier sebagai `verified` dan mengaktifkan akun sesuai kebijakan aplikasi. |
| Registrasi | Gagal / kedaluwarsa | Tautan atau OTP yang tidak valid, sudah dipakai, atau kedaluwarsa tidak mengaktifkan akun dan menampilkan pesan yang aman. |
| Registrasi | Kirim ulang | Pengiriman ulang dibatasi untuk mencegah penyalahgunaan; token sebelumnya tidak dapat digunakan setelah token baru diterbitkan bila kebijakan tersebut diterapkan. |
| Registrasi | Identifier terdaftar | Aplikasi publik menggunakan respons yang tidak mengungkap keberadaan akun; aplikasi internal dapat mengikuti kebijakan operasional yang disetujui. |

### Provisioning oleh Admin

| Scope | Field | Aturan |
| --- | --- | --- |
| Registrasi admin | Otorisasi | Hanya admin dengan kewenangan sesuai yang dapat membuat akun atau menetapkan akses awal. |
| Registrasi admin | Akses awal | Role, unit, atau akses awal dibatasi oleh kewenangan admin pembuat akun. |
| Registrasi admin | Undangan | Undangan hanya dikirim ke Identifier yang dimasukkan atau telah tervalidasi, memiliki masa berlaku, dan dapat dikirim ulang atau dicabut oleh admin berwenang. |
| Registrasi admin | Aktivasi | Pengguna menetapkan password sendiri saat aktivasi; akun tidak dapat login sebelum aktivasi selesai. |
| Registrasi admin | Password sementara | Bila digunakan, password wajib diganti pada login pertama, kedaluwarsa, dan tidak boleh dicantumkan dalam log atau audit. |