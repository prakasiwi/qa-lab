# Katalog Fitur: Reset Password

## Tujuan

Memungkinkan pengguna yang tidak dapat login untuk membuat password baru melalui verifikasi kepemilikan Identifier, tanpa mengungkap keberadaan akun atau membuka akses tidak sah.

## Terminologi

`Identifier` adalah data untuk mengenali pengguna, misalnya email, nomor telepon, username, atau NRP. Reset password berbeda dari ubah password: reset dilakukan saat pengguna belum memiliki sesi login yang valid.

## Pola Reset Password

```text
Pengguna memilih Lupa Password
→ Pengguna memasukkan Identifier
→ Sistem menampilkan respons generik
→ Sistem mengirim tautan reset atau OTP ke Identifier terverifikasi
→ Pengguna memverifikasi tautan atau OTP
→ Pengguna mengisi password baru dan konfirmasi password
→ Sistem menyimpan password baru dan mencabut sesi lama
→ Sistem mengirim notifikasi perubahan password
→ Pengguna login kembali
```

## Validasi & Behavior

### Baseline

| Scope | Field | Aturan |
| --- | --- | --- |
| Request reset | Identifier | Mandatory dan format mengikuti jenis Identifier yang dikonfigurasi aplikasi. |
| Request reset | Respons | Sistem memberikan respons generik yang tidak mengungkap apakah Identifier terdaftar, misalnya: “Jika akun tersedia, instruksi reset akan dikirim.” |
| Request reset | Pengiriman | Instruksi reset hanya dikirim ke kanal Identifier yang telah terverifikasi. |
| Request reset | Kirim ulang | Pengiriman ulang dibatasi untuk mencegah spam dan penyalahgunaan. |
| Request reset | Audit | Sistem mencatat request reset, pengiriman, verifikasi, keberhasilan, dan kegagalan tanpa menyimpan password atau token. |
| Verifikasi reset | Token / OTP | Token atau OTP dibuat aman, sekali pakai, memiliki masa berlaku, serta tidak dicatat atau ditampilkan dalam bentuk terbuka. |
| Verifikasi reset | Token / OTP gagal | Token atau OTP salah, sudah dipakai, atau kedaluwarsa tidak dapat digunakan untuk mengubah password. |
| Password baru | Password | Mandatory dan mengikuti kebijakan password aplikasi. Nilai password disembunyikan secara default serta memiliki kontrol tampil/sembunyikan. |
| Password baru | Konfirmasi Password | Mandatory dan harus sama dengan password baru. |
| Password baru | Error | Error input ditampilkan dekat field terkait dan dapat dipahami pengguna. |
| Reset berhasil | Password | Password lama tidak dapat digunakan kembali untuk login. |
| Reset berhasil | Sesi | Sistem mencabut sesi aktif, refresh token, dan token reset lain yang masih berlaku. |
| Reset berhasil | Notifikasi | Sistem mengirim notifikasi perubahan password ke kanal terverifikasi, termasuk petunjuk pelaporan bila pengguna tidak melakukan perubahan. |
| Reset berhasil | Login | Pengguna login kembali menggunakan password baru; reset password tidak membuat sesi login secara otomatis. |

### MFA, SSO, OTP, dan Passkey

| Capability | Aturan |
| --- | --- |
| MFA | Reset password tidak otomatis menghapus atau menonaktifkan faktor MFA. Pemulihan MFA menggunakan flow terpisah dengan verifikasi tambahan sesuai kebijakan aplikasi. |
| SSO | Pengguna SSO diarahkan ke penyedia identitas untuk mengatur password. Aplikasi tidak menyediakan reset password lokal bila password dikelola oleh penyedia identitas. |
| OTP | OTP reset hanya berlaku untuk satu proses reset, memiliki masa berlaku, dan percobaan verifikasinya dibatasi. |
| Passkey | Reset password tidak menghapus passkey. Penghapusan atau pemulihan passkey memerlukan flow pemulihan autentikator terpisah. |