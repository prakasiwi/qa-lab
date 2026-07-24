# QA Lab

Aplikasi pembelajaran QA dengan simple invoice dan master data.

## Login Seed

- Email: `admin@example.com`
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
