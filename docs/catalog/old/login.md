# Katalog Fitur: Login dan Manajemen Sesi

## Tujuan

Login memverifikasi identitas pengguna, membuat sesi, dan membatasi akses halaman serta API sesuai hak akses pengguna.


## Pola 1 — Login Sederhana

### Alur

```text
Pengguna mengisi email dan password
  → Frontend POST /auth/login
  → Backend memvalidasi input, status pengguna, dan hash password
  → Backend menerbitkan JWT
  → Frontend menyimpan token di localStorage
  → API client mengirim Authorization: Bearer <token>
  → ProtectedRoute membatasi route frontend
```

### Implementasi yang Ada

| Area | Implementasi |
| --- | --- |
| Endpoint login | `POST /api/auth/login` |
| Kredensial | Email dan password |
| Verifikasi password | `bcrypt.compare` terhadap `User.passwordHash` |
| Token | JWT berisi `id` dan `role`; masa berlaku default 8 jam |
| Penyimpanan frontend | `localStorage` dengan key `token` |
| Proteksi API | Header `Authorization: Bearer <token>` dan `authMiddleware` |
| Proteksi halaman | Komponen `ProtectedRoute` |
| Logout | `POST /auth/logout`; frontend menghapus token lokal |

## Pola 2 — IAM PAMA-SAP dengan MFA

### Alur

```text
Pengguna memasukkan email atau NRP dan password
  → POST /api/v1/auth/check-mfa
  → IAM memverifikasi password lokal atau LDAP
  → IAM mengirim prelogin token jangka pendek
  → Pengguna memasukkan kode TOTP
  → POST /api/v1/auth/check-apps
  → Pengguna memilih aplikasi, role, dan group
  → POST /api/v1/auth/login
  → IAM menerbitkan JWT sesuai konteks akses
  → Frontend GET /api/v1/auth/account untuk profil, menu, dan izin
```

### Karakteristik

| Area | Implementasi |
| --- | --- |
| Identitas | Email atau NRP |
| Sumber kredensial | Password lokal BCrypt atau LDAP untuk NRP |
| MFA | TOTP; dapat membuat QR code dan backup code saat aktivasi awal |
| Pra-login | JWT sementara membatasi tahapan yang boleh diakses |
| Konteks akses | `application_id`, `role_id`, dan `group_id` |
| Token sesi | JWT berisi identitas, aplikasi, role, group, dan atribut organisasi |
| Profil dan izin | `GET /auth/account` memuat menu, group, aplikasi yang tersedia, serta data pengguna |
| Fitur tambahan | Reset password, reset MFA, impersonation dengan audit, dan cache profil |

## Pola 3 — IAM PAMA-SAP `old-login`

### Alur

```text
Pengguna memasukkan email atau NRP dan password
  → POST /api/v1/auth/checkuser
  → IAM memverifikasi password lokal atau LDAP
  → Frontend menampilkan aplikasi yang dapat diakses pengguna
  → Pengguna memilih aplikasi
  → POST /api/v1/auth/checkrole
  → Pengguna memilih role
  → POST /api/v1/auth/checkgroup
  → Pengguna memilih group, atau sistem memilih group tunggal
  → POST /api/v1/auth/login
  → Frontend menyimpan token, memuat /auth/account, lalu membuka dashboard
```

### Karakteristik

| Area | Implementasi |
| --- | --- |
| Kredensial | Email atau NRP dan password |
| Validasi identitas | `POST /auth/checkuser` |
| Pemilihan aplikasi | Daftar aplikasi berasal dari hasil `checkuser` |
| Pemilihan role | `POST /auth/checkrole` sesudah aplikasi dipilih |
| Pemilihan group | `POST /auth/checkgroup` sesudah role dipilih; group tunggal dapat dipilih otomatis |
| Penerbitan token | `POST /auth/login` menerima `user_id`, `application_id`, `role_id`, dan `group_id` |
| Sesi | Frontend menyimpan token dan memuat akun melalui `GET /auth/account` |


## Pola 4 — SSO OIDC Umum

Pola ini merujuk praktik umum, bukan hasil eksplorasi repo QA Lab atau PAMA-SAP. OpenID Connect menambahkan autentikasi di atas OAuth 2.0; untuk aplikasi browser modern, gunakan Authorization Code Flow dengan PKCE. [OpenID Connect Core](https://openid.net/specs/openid-connect-core-1_0-18.html) menjelaskan pertukaran authorization code menjadi ID token dan access token. [RFC 9700](https://www.rfc-editor.org/info/rfc9700/) merekomendasikan PKCE untuk klien OAuth, termasuk aplikasi web.

### Alur dengan Backend-for-Frontend

```text
Pengguna membuka aplikasi
  → Frontend memeriksa sesi ke Backend-for-Frontend (BFF)
  → BFF mengarahkan browser ke identity provider
  → Pengguna login atau memakai sesi identity provider yang sudah ada
  → Identity provider mengarahkan browser kembali ke callback BFF dengan authorization code
  → BFF memverifikasi state dan menukar code dengan token menggunakan PKCE
  → BFF memvalidasi ID token dan membuat sesi aplikasi
  → BFF mengirim cookie sesi HttpOnly, Secure, dan SameSite
  → Frontend memuat profil serta izin melalui endpoint sesi aplikasi
```

### Komponen dan Tanggung Jawab

| Komponen | Tanggung jawab |
| --- | --- |
| Browser/frontend | Memulai login, mengikuti redirect, dan menampilkan status sesi |
| BFF | Menyimpan token di server, memvalidasi callback, dan meneruskan panggilan API |
| Identity provider | Mengautentikasi pengguna, menjalankan MFA atau kebijakan perusahaan, dan menerbitkan token |
| Resource server/API | Memvalidasi access token atau menerima identitas dari BFF |
| Direktori perusahaan | Menjadi sumber identitas, misalnya Active Directory atau LDAP |

### Keamanan Minimum

- Gunakan Authorization Code Flow dengan PKCE; jangan gunakan implicit flow untuk SPA baru.
- Validasi `state`, redirect URI, issuer, audience, signature, dan masa berlaku token.
- Simpan token di server melalui BFF bila tersedia. RFC 10017 menyebut BFF sebagai pola untuk aplikasi browser dan merekomendasikan penggunaan cookie `HttpOnly`; lihat [RFC 10017](https://www.rfc-editor.org/rfc/rfc10017.html).
- Atur cookie sesi dengan `Secure`, `HttpOnly`, `SameSite=Lax` atau `SameSite=Strict`, `Path=/`, dan nama `__Host-` bila sesuai. [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) menjelaskan atribut ini dan risiko token yang dapat dibaca JavaScript.
- Terapkan logout lokal dan logout dari identity provider sesuai kebutuhan; cabut atau hapus sesi server saat logout.

## Validasi & Behavior

Section ini membagi aturan baseline dan capability tambahan. Identifier dapat berupa email, username, NRP, atau nomor telepon sesuai konfigurasi aplikasi.

### Baseline

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Login | Identifier | Wajib diisi. |
| Login | Identifier | Sistem memvalidasi format sesuai tipe identifier yang dikonfigurasi aplikasi. |
| Login | Identifier | Sistem menghapus spasi di awal dan akhir sebelum mengirim identifier ke server. |
| Login | Password | Wajib diisi. |
| Login | Password | Nilai tersembunyi secara default. |
| Login | Password | Tersedia kontrol tampilkan/sembunyikan password dengan label yang dapat diakses. |
| Login | Submit | Pengguna dapat mengirim form melalui tombol Login atau tombol Enter. |
| Login | Submit | Selama autentikasi berjalan, sistem mencegah pengiriman ganda dan menampilkan status loading. |

### Authentication Behavior

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Authentication | Kredensial | Server memverifikasi kombinasi identifier dan password. |
| Authentication | Kredensial gagal | Sistem menampilkan pesan generik tanpa mengungkap apakah identifier terdaftar atau password salah. |
| Authentication | Akun tidak aktif atau terkunci | Sistem menolak login dan menampilkan pesan sesuai kebijakan aplikasi. |
| Authentication | Password berubah atau direset | Password lama tidak dapat membuat sesi baru. |

### Session Behavior

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Session | Login berhasil | Sistem membuat sesi baru dan mengarahkan pengguna ke halaman tujuan yang valid atau halaman awal aplikasi. |
| Session | Sesi berakhir | Sistem menghapus sesi client dan mengarahkan pengguna ke halaman login. |
| Session | Route dan API terlindungi | Sistem menolak akses tanpa sesi yang valid. |
| Session | Logout | Sistem mengakhiri sesi client dan mencabut sesi server bila aplikasi mengelolanya. |

### Security & Audit

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Security | Percobaan login | Sistem membatasi percobaan login berulang untuk mengurangi brute force dan credential stuffing. |
| Security | Data sensitif | Password dan token tidak boleh tampil pada log aplikasi, audit trail, respons error, atau antarmuka pengguna. |
| Audit | Event autentikasi | Sistem mencatat login berhasil, login gagal, logout, dan perubahan atau reset password tanpa menyimpan password atau token. |

### Accessibility & UX

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Accessibility | Validasi | Pesan validasi dapat dipahami pengguna; fokus berpindah ke field invalid pertama saat submit gagal. |
| Accessibility | Password | Kontrol tampilkan/sembunyikan password dapat dioperasikan dengan keyboard. |

### MFA

Aturan ini berlaku hanya jika aplikasi mengaktifkan multi-factor authentication.

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| MFA | Faktor kedua | Sistem meminta faktor kedua setelah faktor pertama berhasil diverifikasi, sesuai kebijakan aplikasi. |
| MFA | Kode verifikasi | Kode wajib diisi dan diverifikasi sebelum sesi dibuat. |
| MFA | Kode salah atau kedaluwarsa | Sistem menolak autentikasi dan menampilkan pesan yang sesuai tanpa membuat sesi. |
| MFA | Percobaan verifikasi | Sistem membatasi percobaan kode yang berulang. |
| MFA | Faktor kedua berhasil | Sistem melanjutkan proses login atau membuat sesi baru. |

### SSO

Aturan ini berlaku hanya jika aplikasi mengaktifkan single sign-on melalui identity provider.

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| SSO | Mulai login | Sistem mengarahkan pengguna ke identity provider yang dikonfigurasi. |
| SSO | Callback | Sistem memvalidasi respons dari identity provider sebelum membuat sesi aplikasi. |
| SSO | Login berhasil | Sistem membuat sesi aplikasi dan mengarahkan pengguna ke halaman tujuan yang valid. |
| SSO | Login gagal atau dibatalkan | Sistem tidak membuat sesi dan menampilkan pesan yang sesuai. |
| SSO | Logout | Sistem mengakhiri sesi aplikasi; logout dari identity provider mengikuti kebijakan aplikasi. |

### OTP

Aturan ini berlaku jika aplikasi memakai one-time password sebagai metode verifikasi atau autentikasi.

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| OTP | Pengiriman kode | Sistem mengirim kode ke channel yang telah diverifikasi atau dikonfigurasi pengguna. |
| OTP | Kode verifikasi | Kode hanya dapat digunakan sekali dan memiliki masa berlaku terbatas. |
| OTP | Kirim ulang kode | Sistem membatasi frekuensi pengiriman ulang kode. |
| OTP | Kode salah atau kedaluwarsa | Sistem menolak proses tanpa membuat sesi atau menyelesaikan aksi yang dilindungi. |
| OTP | Kode berhasil diverifikasi | Sistem melanjutkan proses autentikasi atau aksi yang meminta verifikasi. |

### Passkey

Aturan ini berlaku jika aplikasi mengaktifkan passkey berbasis WebAuthn.

| Scope | Field/Area | Aturan |
| --- | --- | --- |
| Passkey | Registrasi | Sistem meminta verifikasi pengguna sebelum mendaftarkan passkey baru. |
| Passkey | Autentikasi | Sistem memvalidasi respons passkey sebelum membuat sesi baru. |
| Passkey | Perangkat tidak tersedia atau dibatalkan | Sistem tidak membuat sesi dan menyediakan metode login lain bila aplikasi mendukungnya. |
| Passkey | Pengelolaan | Pengguna dapat melihat dan menghapus passkey miliknya setelah autentikasi. |
