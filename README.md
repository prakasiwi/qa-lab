# QA Lab

Aplikasi pembelajaran QA dengan simple invoice dan master data.

## Login Seed

- Email: `admin@qalab.id`
- Password: `password123`

## Run Local

```bash
docker compose up -d
cd backend
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

Terminal lain:

```bash
cd frontend
npm run dev
```

Akses:

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/api/health
- Swagger: http://localhost:3001/api/docs
- OpenAPI JSON: http://localhost:3001/api/docs/openapi.json
- Swagger assets: http://localhost:3001/swagger/swagger-ui.css

## Konfigurasi autentikasi dan email

Salin `backend/.env.example` menjadi `backend/.env`, lalu isi minimal `DATABASE_URL`, `JWT_SECRET`, `RESEND_API_KEY`, dan `MAIL_FROM`. Resend adalah satu-satunya pengirim email runtime; Mailpit, SMTP, dan `MAIL_TRANSPORT` tidak digunakan.

Email action menggunakan `FRONTEND_URL`, yang harus sama dengan salah satu origin di `CORS_ORIGIN`. Durasi default: OTP MFA 5 menit, verifikasi email 24 jam, invitation 24 jam, reset password 15 menit, dan cooldown kirim ulang 60 detik.

Login selalu berakhir dengan pemilihan Role secara eksplisit. Setiap session menyimpan satu pasangan Role + Permission. Saat role diganti, session sebelumnya dicabut dan frontend me-remount rute terproteksi agar data serta akses role lama tidak dipertahankan.

Migration `20261022000000_finalize_phase7_source_cleanup` aman diterapkan pada database berisi data karena tidak melakukan penghapusan. Kolom/tabel legacy fisik tetap ada sebagai kompatibilitas, tetapi tidak lagi dimodelkan atau digunakan aplikasi. Penghapusan fisiknya memerlukan keputusan retensi data dan migration terpisah yang disetujui.

## API Documentation URL

Sidebar menu **API Documentation** opens Swagger in a new browser tab using the frontend build-time environment variable `VITE_API_DOCS_URL`.

Local development example:

```env
VITE_API_BASE_URL=http://localhost:3001/api
VITE_API_DOCS_URL=http://localhost:3001/api/docs/
```

Vercel Preview/Production example:

```env
VITE_API_BASE_URL=https://qa-lab-api.com/api
VITE_API_DOCS_URL=https://qa-lab-api.com/api/docs/
```

Backend Swagger server URL example:

```env
PUBLIC_API_URL=https://qa-lab-api.com/api
```

Swagger UI assets are copied from `swagger-ui-dist` to `backend/public/swagger` by backend `postinstall`. On Vercel, redeploy the backend after dependency or environment changes and verify `/swagger/swagger-ui.css` and `/swagger/swagger-ui-bundle.js` return CSS/JavaScript, not HTML.

If Swagger "Try it out" calls localhost in production, set backend `PUBLIC_API_URL` to the deployed API URL, for example `https://qa-lab-api.vercel.app/api`, then redeploy. If `PUBLIC_API_URL` is not set, `/api/docs/openapi.json` derives the API server URL from the current request host. Swagger UI online validator is disabled to avoid external validator image calls being blocked by Helmet CSP.

Set the variable in the correct Vercel frontend project:

```text
Vercel Project → Settings → Environment Variables → Add VITE_API_DOCS_URL
```

Configure it for the needed environments: Development, Preview, and Production. Redeploy the frontend after changing the variable because Vite embeds `VITE_` variables at build time.

Do not use a localhost URL for Vercel Preview or Production. The backend Swagger URL must be publicly reachable over HTTPS if the frontend is served over HTTPS.

## Race Condition Lab

Endpoint fixed:

```http
POST /api/invoices/:id/submit
```

Endpoint buggy untuk latihan concurrent test:

```http
POST /api/invoices/:id/submit?mode=buggy
```
