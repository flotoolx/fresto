# D'Fresto MVP - Task Tracking

## Phase 1: Core MVP ✅ COMPLETE

### Authentication & Setup
- [x] NextAuth.js authentication
- [x] Role-based access control (5 roles)
- [x] Prisma database setup
- [x] Database seeding
- [x] run_app.bat startup script

### Mitra Features
- [x] Dashboard with order stats
- [x] Order creation page
- [x] Order history page
- [x] Order confirmation

### Stokis Features
- [x] Dashboard overview
- [x] Mitra orders management
- [x] Order to Pusat
- [x] My Mitra page

### Pusat Features
- [x] Dashboard overview
- [x] Stokis orders management
- [x] User management (view)
- [x] Product management (view)
- [x] Gudang management (view)
- [x] Analytics dashboard

### Finance Features
- [x] Dashboard overview
- [x] Approve PO page
- [x] Tagihan monitoring

### Gudang Features
- [x] Dashboard overview
- [x] PO Masuk processing
- [x] Inventory monitoring

---

## Phase 2: Advanced Features ✅ COMPLETE

### CRUD Functional
- [x] Users API (POST, PUT, DELETE)
- [x] Products API (POST, PUT, DELETE)
- [x] Gudang API (POST, PUT, DELETE)
- [x] Inventory adjustment API (PATCH)

### Notifications
- [x] Email notification library (Nodemailer)
- [x] Push notification library (Web Push)
- [x] Service worker for push notifications

### Report Export
- [x] PDF generation library (jsPDF)
- [x] Excel generation library (xlsx)
- [x] ExportButton component with date range

### PO System
- [x] Print PO Page (/po/[type]/[id])
- [x] PO PDF generation API
- [x] Print PO buttons on history pages

---

## Phase 3: Invoice Automation ✅ COMPLETE

### Database
- [x] Invoice model with InvoiceStatus enum
- [x] Relation to StokisOrder

### Invoice Library
- [x] generateInvoice() function
- [x] generateInvoiceNumber() - INV-YYYYMMDD-XXX
- [x] markInvoiceAsPaid() function
- [x] checkOverdueInvoices() function
- [x] Bank details constant (BCA 123456789 a.n. Dfresto)

### API Endpoints
- [x] /api/invoices - List invoices (GET)
- [x] /api/invoices/[id] - Detail & Update (GET, PATCH)
- [x] /api/invoices/[id]/pdf - Download PDF

### Print Invoice Page
- [x] /invoice/[id] - Professional layout
- [x] Print button (browser print)
- [x] Download PDF button
- [x] Status badge (UNPAID/PAID/OVERDUE)
- [x] Bank payment details

### Invoice Dashboard
- [x] /dashboard/invoices - Finance role
- [x] Stats cards (Total, Unpaid, Overdue, Outstanding)
- [x] Filter by status
- [x] Search by invoice/order/stokis
- [x] Mark as Paid button
- [x] Mobile responsive cards

### Integration
- [x] Auto-generate invoice on PO_ISSUED
- [x] Invoices menu in Finance sidebar

---

## API Endpoints Summary

| Endpoint | Methods | Description |
|----------|---------|-------------|
| `/api/invoices` | GET | List invoices |
| `/api/invoices/[id]` | GET, PATCH | Invoice detail & update |
| `/api/invoices/[id]/pdf` | GET | Download PDF |
| `/api/po/mitra/[id]` | GET | Mitra PO data |
| `/api/po/stokis/[id]` | GET | Stokis PO data |
| `/api/po/[type]/[id]/pdf` | GET | Download PO PDF |

---


## Phase 4: Stokis Dashboard & Order Enhancements (Completed Feb 8, 2026) ✅ COMPLETE

### Stokis Dashboard Features
- [x] Adjust PO Logic & API Handler (Qty=0 fix) ✅
- [x] Action Buttons (Selesai, Revisi PO/Adjust, Tolak Order) ✅
- [x] Mitra Order Card (Total Mitra from API, Unique Order Count) ✅
- [x] Dashboard Layout (4 Cards, Headers, Responsive) ✅
- [x] Print PO Button (Order Mitra page only) ✅
- [x] Finance Dashboard 4-Cards Layout (DC & Stokis sections) ✅
- [x] Reports Page Cards Responsive (Overview & Umur Piutang) ✅
- [x] Git commit ✅ `26e1e2c`

---

## Phase 5: Stokis & Lokasi Management ⏳ PLANNED

### Database Schema
- [ ] Tambah enum Province (34 provinsi Indonesia)
- [ ] Tambah enum MitraRegistrationStatus (PENDING, APPROVED, REJECTED, INACTIVE)
- [ ] Tambah field lokasi pada User (province, city, district, postalCode)
- [ ] Tambah field mitraStatus, mitraApprovedAt, mitraApprovedBy pada User
- [ ] Tambah model StokisProductPrice (harga custom per stokis)
- [ ] Migration script untuk data existing (mitra dengan stokisId → APPROVED)

### API Endpoints
- [ ] /api/mitra-registration - Stokis ajukan mitra
- [ ] /api/mitra-registration/[id] - Pusat approve/reject
- [ ] /api/mitra-registration/pending - List pending untuk Pusat
- [ ] /api/stokis-prices - CRUD harga custom (Pusat set)
- [ ] /api/stokis-prices/by-stokis/[id] - Harga per stokis
- [ ] /api/locations/provinces - List provinsi
- [ ] /api/stokis/by-province - Filter stokis per provinsi
- [ ] /api/province-coverage - Statistik coverage stokis/mitra per provinsi
- [ ] Update /api/users - Tambah field lokasi, validasi province wajib untuk STOKIS
- [ ] Update /api/orders/mitra - Validasi mitraStatus APPROVED, gunakan harga custom

### Dashboard Pages - Stokis
- [ ] /dashboard/kelola-mitra - Halaman ajukan & lihat mitra (tidak bisa approve)
- [ ] /dashboard/harga-stokis - Halaman lihat harga (VIEW ONLY)

### Dashboard Pages - Pusat
- [ ] /dashboard/approve-mitra - Halaman approve/reject pengajuan mitra
- [ ] /dashboard/harga-stokis - Halaman kelola harga per stokis
- [ ] /dashboard/province-coverage - Halaman coverage provinsi (stokis/mitra per provinsi)
- [ ] Update /dashboard/users - Tambah kolom province & filter

### Dashboard Pages - Finance
- [x] /dashboard/laporan-harga - Halaman view laporan harga + margin (VIEW ONLY)
- [x] /dashboard/pembayaran - Halaman input pembayaran PO (Finance) - dari Component 11
- [ ] Update /dashboard/reports - Tambah filter by province
- [x] Update /dashboard/approve-po - Tampilkan sisa tagihan stokis, tombol Adjust PO - dari Component 10
- [ ] Update /dashboard/tagihan - Tambah view Per Stokis, summary, export

### Export Features - Mitra
- [x] /api/export/mitra-orders - Export pesanan mitra PDF/Excel (menggunakan /api/export/orders?type=mitra)
- [x] Update order page - Tambah ExportButton (sudah ada di /dashboard/history)

### Export Features - Gudang
- [x] /api/export/gudang-po - Export PO gudang PDF/Excel
- [x] Update /dashboard/po-masuk - Tambah ExportButton

### Finance Enhancements
- [x] /api/stokis/[id]/outstanding - API cek sisa tagihan stokis
- [x] Update /api/orders/stokis/[id] - Tambah action adjust PO
- [x] Tampilkan warning jika stokis punya tunggakan di Approve PO
- [x] Git commit & push ✅





### Pembayaran (Payment) - Finance
- [x] /api/payments - API input pembayaran (list, create)
- [x] /api/payments/[id] - API pembayaran detail/delete
- [x] Model Payment dengan PaymentMethod enum
- [x] Support partial payment (cicilan)
- [ ] Upload bukti transfer (placeholder ready)
- [x] Auto-update invoice status ke PAID jika lunas
- [x] /dashboard/pembayaran - Halaman input pembayaran

### Adjust PO - Stokis
- [x] Update /dashboard/history-pusat - Tambah tombol Adjust PO untuk status PENDING
- [x] Modal edit quantity items dengan +/- buttons
- [x] API adjust order sebelum diapprove (reuse dari Component 10)
- [x] Tombol batalkan order untuk status PENDING

### PO PDF Export
- [x] /api/po/stokis/[id]/pdf - Generate PO PDF (sudah ada)
- [x] Update /dashboard/history-pusat - Tambah tombol Print PO (Stokis)
- [x] Update /dashboard/approve-po - Tambah tombol Print PO (Finance)
- [x] Update /dashboard/po-masuk - Tambah tombol Print PO (Gudang)

### Order Flow
- [ ] Update order page - Cek mitraStatus APPROVED sebelum order
- [ ] Tampilkan pesan jika PENDING/REJECTED
- [ ] Gunakan harga custom stokis jika ada

### UI Updates
- [x] Update sidebar layout - Tambah menu baru per role (Stokis, Pusat, Finance, termasuk Pembayaran)

---

## Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Pusat | admin@dfresto.com | password123 |
| Finance | finance@dfresto.com | password123 |
| Gudang | gudang.ayam@dfresto.com | password123 |
| Stokis | stokis.jakarta@dfresto.com | password123 |
| Mitra | mitra1@dfresto.com | password123 |
| DC | dc.jakarta@dfresto.com | dc123456 |
---

## Brand Identity Implementation ✅ COMPLETE

### UI & Styling
- [x] Analyze brand identity from logo
- [x] Create CSS variables for D'Fresto color palette (Red, Maroon, Gold, Cream)
- [x] Copy logo to public directory
- [x] Update Login Page UI with brand colors and logo
- [x] Update Sidebar UI with brand colors and logo
- [x] Update Dashboard Layout and Stats with brand colors
- [x] Update Quick Action Buttons with brand gradients

---

## UI Konsistensi Dashboard Cards (Feb 9, 2026) ✅ COMPLETE

### Halaman Pembayaran (`/dashboard/pembayaran`)
- [x] Cards redesign: 2 kolom (Lunas, Belum Lunas) dengan gradient styling
- [x] Setiap card menampilkan nominal (Rp) dan jumlah PO
- [x] Filter dropdown: Semua Status, Belum Bayar, Jatuh Tempo

### Halaman Invoices (`/dashboard/invoices`)
- [x] Cards redesign: 3 kolom (Total, Lunas, Belum Lunas)
- [x] Setiap card menampilkan nominal dan jumlah PO
- [x] Filter dropdown diubah ke: Semua Status, Lunas, Belum Lunas

### Halaman Reports (`/dashboard/reports`)
- [x] Perbaikan responsiveness mobile (nominal tidak terpotong)
- [x] Font size lebih kecil pada mobile, line height compact

---

## Reports Page Tab Improvements (Feb 9, 2026) ✅ COMPLETE

### Tab Overview
- [x] Ubah warna Card Total DC (Slate) & Total Mitra (Orange) agar lebih kontras

### Tab Produk Terlaris
- [x] Table menjadi scrollable horizontal di mobile
- [x] Revenue column tidak terpotong (whitespace-nowrap)

### Tab Performa (sebelumnya "Performa Stokis")
- [x] Ganti nama tab: "Performa Stokis" → "Performa"
- [x] Tambah filter: Semua, DC, Stokis, Mitra
- [x] Tambah Total card dengan nominal dan jumlah PO
- [x] Table menjadi scrollable horizontal di mobile
- [x] Fix filter logic: Semua/DC/Stokis/Mitra berhasil memfilter data

### Tab Tagihan (sebelumnya "Umur Piutang")
- [x] Ganti nama tab: "Umur Piutang" → "Tagihan"

---

## Approve PO Page Improvements (Feb 9, 2026) ✅ COMPLETE

### Tagihan Warning Section
- [x] Hapus SVG icon AlertTriangle
- [x] Ubah teks warning menjadi: "⚠️ Stokis memiliki tagihan tertunggak"
- [x] Hapus detail Unpaid dan Overdue
- [x] Tambah tombol "Lihat Pembayaran" → /dashboard/pembayaran
---

## UI Adjustments (Feb 10, 2026) ✅ COMPLETE

### Halaman Pembayaran (`/dashboard/pembayaran`)
- [x] Hapus kolom "Jatuh Tempo" dari tabel invoice

### Halaman Approve PO (`/dashboard/approve-po`)
- [x] Tambah filter Semua / DC / Stokis
- [x] Update API `/api/orders/stokis` - include `role` di stokis select
- [x] Filter berdasarkan `stokis.role` (DC / STOKIS)

### Halaman Invoices (`/dashboard/invoices`)
- [x] Fix layout mobile: 3 card → 2+1 responsive (`grid-cols-2 lg:grid-cols-3`)
- [x] Card "Belum Lunas" span full width di mobile (`col-span-2 lg:col-span-1`)

### Fix Pembayaran & Finance
- [x] Separator ribuan (dot) pada input Jumlah Bayar di modal pembayaran
- [x] Fix Finance role tidak bisa lihat order Stokis (API filter tambah `PENDING_PUSAT`)
- [x] Fix filter Semua Stokis: API `/api/stokis` include role DC + STOKIS
