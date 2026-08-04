# QA Lab — Mentor Bug Guide

## Informasi Branch

- Stable branch: `main`
- Training branch: `qa-training`
- Frontend Vercel project: `qa-lab`
- Backend Vercel project: `qa-lab-api`
- Production deployment untuk pembelajaran menggunakan branch `qa-training`.

## Tujuan

Dokumen ini berisi daftar bug disengaja untuk kebutuhan pembelajaran QA. Dokumen hanya digunakan oleh mentor dan tidak diberikan sebagai petunjuk awal kepada siswa.

## Bug 1 — Sidebar Salah Redirect

### Area
Frontend

### Kondisi Bug
- Menu Products membuka `/customers`.
- Menu Customers membuka `/products`.

### Expected Result
- Menu Products membuka `/products`.
- Menu Customers membuka `/customers`.

### Actual Result
Menu Customers mengarah ke halaman Products, sedangkan menu Products mengarah ke halaman Customers.

### Lokasi Implementasi
`frontend/src/components/Sidebar.jsx`, komponen `Sidebar`, bagian submenu Master Data.

### Cara Reproduksi
1. Login ke aplikasi jika diperlukan.
2. Klik menu Products.
3. Amati URL dan halaman tujuan.
4. Klik menu Customers.
5. Amati URL dan halaman tujuan.

### Skill QA
- Navigation testing
- Route verification
- UI regression testing

### Cara Memperbaiki
Kembalikan target `NavLink` Customers ke `/customers` dan target `NavLink` Products ke `/products`.

---

## Bug 2 — Submit Invoice Menggunakan Endpoint Salah

### Area
Frontend integration

### Kondisi Bug
Tombol Submit Invoice memanggil endpoint atau HTTP method yang salah.

### Expected Result
Frontend mengirim `POST /api/invoices/:id/submit`.

### Actual Result
Frontend mengirim `POST /api/invoices/:id/pay` dari fungsi submit invoice.

### Lokasi Implementasi
`frontend/src/api/invoiceApi.js`, fungsi `submitInvoice`.

### Cara Reproduksi
1. Buka invoice berstatus Draft.
2. Buka browser DevTools.
3. Pilih tab Network.
4. Klik Submit Invoice.
5. Periksa URL, HTTP method, status response, dan response body.

### Skill QA
- API trace dari UI
- Network inspection
- Request-response analysis
- Technical bug reporting

### Cara Memperbaiki
Kembalikan fungsi `submitInvoice` agar memanggil `api.post(`/invoices/${id}/submit`)`.

---

## Bug 3 — Validasi Quantity Frontend Salah

### Area
Frontend validation

### Kondisi Bug
Frontend menerima:
- quantity `0`;
- quantity melebihi available stock.

Backend tetap menolak nilai yang tidak valid.

### Expected Result
Frontend menolak quantity kurang dari `1` dan quantity lebih besar dari available stock.

### Actual Result
Frontend hanya memvalidasi quantity sebagai integer. Nilai `0` dan nilai di atas available stock dapat dikirim dari form, lalu ditolak oleh backend.

### Lokasi Implementasi
`frontend/src/pages/invoices/CreateInvoicePage.jsx`, fungsi `validate` dan input quantity pada komponen `ProductRow`.

### Data Uji
Contoh jika stock `10`:
- `0` = invalid
- `1` = valid
- `10` = valid
- `11` = invalid

### Cara Reproduksi
1. Buka halaman Create Invoice.
2. Pilih customer dan product aktif.
3. Isi quantity `0`, lalu simpan.
4. Amati bahwa frontend mencoba mengirim request dan backend menolak.
5. Ulangi dengan quantity lebih besar dari available stock.

### Skill QA
- Negative testing
- Boundary value analysis
- Frontend versus backend validation

### Cara Memperbaiki
Tambahkan kembali validasi `Number(item.quantity) < 1` dan `Number(item.quantity) > Number(product.availableStock || 0)`, serta kembalikan atribut input `min="1"` dan `max={product?.availableStock ?? undefined}`.

---

## Bug 4 — Filter Active Product dan Customer Bocor

### Area
Frontend data filtering

### Kondisi Bug
Product dan customer inactive tetap muncul pada form Create Invoice.

### Expected Result
Hanya product dan customer active yang dapat dipilih.

### Actual Result
Form Create Invoice mengambil customer dan product tanpa parameter `status=active`, sehingga data inactive ikut muncul pada pilihan jika tersedia dari API.

### Lokasi Implementasi
`frontend/src/api/customerApi.js`, fungsi `getInvoiceCustomerOptions`.
`frontend/src/api/productApi.js`, fungsi `getInvoiceProductOptions`.
`frontend/src/pages/invoices/CreateInvoicePage.jsx`, pemanggilan data awal Create Invoice.

### Prasyarat Data
Pastikan tersedia melalui fitur master data:
- minimal satu product active;
- minimal satu product inactive;
- minimal satu customer active;
- minimal satu customer inactive.

Jangan mengubah struktur database.

### Cara Reproduksi
1. Buat atau pilih customer inactive dari Master Customer.
2. Buat atau pilih product inactive dari Master Product.
3. Buka halaman Create Invoice.
4. Buka dropdown Customer dan Product.
5. Bandingkan pilihan UI dengan status data di halaman master atau response API.

### Skill QA
- Requirement validation
- Data state testing
- Integration testing
- API versus UI comparison

### Cara Memperbaiki
Gunakan kembali `getActiveCustomers()` dan `getActiveProducts()` pada Create Invoice, atau pastikan query option memakai `{ status: 'active', limit: 100 }`.

---

## Bug 5 — Dashboard Revenue Salah Hitung

### Area
Backend business logic

### Kondisi Bug
Revenue ikut menghitung invoice berstatus:
- PAID
- DRAFT
- CANCELLED

### Expected Result
Revenue hanya menghitung invoice berstatus `PAID`.

### Actual Result
Filter revenue backend memakai status `PAID`, `DRAFT`, dan `CANCELLED` untuk summary revenue, legacy summary, dan monthly revenue.

### Lokasi Implementasi
`backend/src/modules/dashboard/dashboard.route.js`, konstanta `revenueStatuses`, agregasi `paidRevenue`, fungsi `getMonthlyRevenueRows`, dan agregasi total pada `buildLegacySummary`.

### Data Uji
Contoh:

- PAID: Rp100.000
- DRAFT: Rp50.000
- CANCELLED: Rp25.000

Expected revenue:
Rp100.000

Actual revenue:
Rp175.000

Sesuaikan dengan format mata uang aplikasi.

### Cara Reproduksi
1. Siapkan invoice dengan beberapa status.
2. Catat total invoice PAID.
3. Buka dashboard.
4. Bandingkan nilai revenue dashboard dengan total invoice PAID.
5. Periksa response endpoint dashboard.

### Skill QA
- Business rule testing
- Data reconciliation
- API validation
- Expected result calculation
- Root cause classification

### Cara Memperbaiki
Kembalikan filter revenue agar hanya menggunakan status `PAID`, baik pada query Prisma aggregate maupun query SQL monthly revenue.

---

## Ringkasan File yang Diubah

| Bug | Area | File | Perubahan Disengaja |
|---|---|---|---|
| 1 | Frontend | `frontend/src/components/Sidebar.jsx` | Target route Customers dan Products ditukar. |
| 2 | Frontend integration | `frontend/src/api/invoiceApi.js` | `submitInvoice` memanggil endpoint pay. |
| 3 | Frontend validation | `frontend/src/pages/invoices/CreateInvoicePage.jsx` | Validasi minimum quantity dan batas available stock dihapus dari frontend. |
| 4 | Frontend data filtering | `frontend/src/api/customerApi.js` | Menambahkan option loader customer tanpa filter active. |
| 4 | Frontend data filtering | `frontend/src/api/productApi.js` | Menambahkan option loader product tanpa filter active. |
| 4 | Frontend data filtering | `frontend/src/pages/invoices/CreateInvoicePage.jsx` | Create Invoice memakai option loader tanpa filter active. |
| 5 | Backend business logic | `backend/src/modules/dashboard/dashboard.route.js` | Revenue menghitung `PAID`, `DRAFT`, dan `CANCELLED`. |

## Validasi Mentor

- [ ] Products membuka Customers
- [ ] Customers membuka Products
- [ ] Submit Invoice mengirim request ke endpoint atau method salah
- [ ] Quantity 0 lolos validasi frontend
- [ ] Quantity melebihi stock lolos validasi frontend
- [ ] Backend tetap menolak quantity invalid
- [ ] Product inactive tampil pada Create Invoice
- [ ] Customer inactive tampil pada Create Invoice
- [ ] Revenue menghitung DRAFT
- [ ] Revenue menghitung CANCELLED
- [ ] Aplikasi tetap berhasil build
- [ ] Tidak ada perubahan schema database
- [ ] Tidak ada project Vercel baru
- [ ] Tidak ada database baru

## Cara Mengembalikan ke Versi Stabil

1. Ubah Production Branch Vercel dari `qa-training` kembali ke `main` pada project `qa-lab` dan `qa-lab-api` jika keduanya diarahkan ke branch training.
2. Kembalikan masing-masing perubahan kode berdasarkan bagian `Cara Memperbaiki` pada setiap bug.

## Prinsip Implementasi

- Buat perubahan seminimal mungkin.
- Gunakan pola coding existing.
- Jangan melakukan refactor besar.
- Jangan mengubah business logic lain.
- Bug harus disengaja dan terkontrol.
- Bug harus dapat direproduksi.
- Bug tidak boleh membuat aplikasi gagal dijalankan.
- Bug tidak boleh merusak integritas database.
- Bug harus dapat diperbaiki siswa tanpa perubahan arsitektur.
- Jangan menambahkan label seperti:
  - intentional bug;
  - training bug;
  - TODO bug;
  - wrong endpoint;
  pada UI atau response aplikasi.
- Dokumentasi detail lokasi bug hanya boleh berada pada `bug.md`.