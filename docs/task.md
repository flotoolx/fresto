# D'Fresto MVP - Pelacakan Tugas

## Fase 1: MVP Utama ✅ SELESAI

### Otentikasi & Pengaturan
- [x] Otentikasi NextAuth.js
- [x] Kontrol akses berbasis peran (5 role)
- [x] Pengaturan database Prisma
- [x] Seeding database
- [x] Skript startup run_app.bat

### Fitur Mitra
- [x] Dashboard dengan statistik pesanan
- [x] Halaman pembuatan pesanan
- [x] Halaman riwayat pesanan
- [x] Konfirmasi pesanan

### Fitur Stokis
- [x] Ikhtisar Dashboard
- [x] Manajemen pesanan Mitra
- [x] Pesanan ke Pusat
- [x] Halaman Mitra Saya

### Fitur Pusat
- [x] Ikhtisar Dashboard
- [x] Manajemen pesanan Stokis
- [x] Manajemen pengguna (lihat)
- [x] Manajemen produk (lihat)
- [x] Manajemen Gudang (lihat)
- [x] Dashboard analitik

### Fitur Finance
- [x] Ikhtisar Dashboard
- [x] Halaman Approve PO
- [x] Pemantauan Tagihan/Invoice

### Fitur Gudang
- [x] Ikhtisar Dashboard
- [x] Pemrosesan PO Masuk
- [x] Pemantauan Inventaris

---

## Fase 2: Fitur Lanjutan ✅ SELESAI

### Fungsional CRUD
- [x] API Users (POST, PUT, DELETE)
- [x] API Products (POST, PUT, DELETE)
- [x] API Gudang (POST, PUT, DELETE)
- [x] API penyesuaian inventaris (PATCH)

### Notifikasi
- [x] Library notifikasi email (Nodemailer)
- [x] Library push notification (Web Push)
- [x] Service worker untuk push notification

### Ekspor Laporan
- [x] Library pembuatan PDF (jsPDF)
- [x] Library pembuatan Excel (xlsx)
- [x] Komponen ExportButton dengan rentang tanggal

### Sistem PO
- [x] Halaman Cetak PO (/po/[type]/[id])
- [x] API pembuatan PDF PO
- [x] Tombol Cetak PO pada halaman riwayat

---

## Fase 3: Otomasi Invoice (Tagihan) ✅ SELESAI

### Database
- [x] Model Invoice dengan enum InvoiceStatus
- [x] Relasi ke StokisOrder

### Library Invoice
- [x] Fungsi generateInvoice()
- [x] generateInvoiceNumber() - INV-YYYYMMDD-XXX
- [x] Fungsi markInvoiceAsPaid()
- [x] Fungsi checkOverdueInvoices()
- [x] Konstanta detail bank (BCA 123456789 a.n. Dfresto)

### Endpoint API
- [x] /api/invoices - Daftar invoice (GET)
- [x] /api/invoices/[id] - Detail & Update (GET, PATCH)
- [x] /api/invoices/[id]/pdf - Download PDF

### Halaman Cetak Invoice
- [x] /invoice/[id] - Tata letak profesional
- [x] Tombol cetak (print browser)
- [x] Tombol Download PDF
- [x] Badge status (UNPAID/PAID/OVERDUE)
- [x] Detail pembayaran bank

### Dashboard Invoice
- [x] /dashboard/invoices - Role Finance
- [x] Kartu statistik (Total, Unpaid, Overdue, Outstanding)
- [x] Filter berdasarkan status
- [x] Cari berdasarkan invoice/order/stokis
- [x] Tombol Tandai Lunas
- [x] Kartu responsif mobile

### Integrasi
- [x] Buat invoice otomatis saat PO_ISSUED
- [x] Menu invoices di sidebar Finance

---

## Ringkasan Endpoint API

| Endpoint | Metode | Deskripsi |
|----------|---------|-------------|
| `/api/invoices` | GET | Daftar invoice |
| `/api/invoices/[id]` | GET, PATCH | Detail & update invoice |
| `/api/invoices/[id]/pdf` | GET | Download PDF |
| `/api/po/mitra/[id]` | GET | Data PO Mitra |
| `/api/po/stokis/[id]` | GET | Data PO Stokis |
| `/api/po/[type]/[id]/pdf` | GET | Download PDF PO |

---


## Fase 4: Peningkatan Dashboard Stokis & Pesanan (Selesai 8 Feb 2026) ✅ SELESAI

### Fitur Dashboard Stokis
- [x] Logika Adjust PO & Handler API (Perbaikan Qty=0) ✅
- [x] Tombol Aksi (Selesai, Revisi PO/Adjust, Tolak Order) ✅
- [x] Kartu Pesanan Mitra (Total Mitra dari API, Jumlah Pesanan Unik) ✅
- [x] Layout Dashboard (4 Kartu, Header, Responsif) ✅
- [x] Tombol Cetak PO (Halaman Order Mitra saja) ✅
- [x] Layout Dashboard Finance 4-Kartu (Bagian DC & Stokis) ✅
- [x] Responsivitas Kartu Halaman Laporan (Overview & Umur Piutang) ✅
- [x] Git commit ✅ `26e1e2c`

---

## Fase 5: Manajemen Stokis & Lokasi ⏳ DIRENCANAKAN

### Skema Database
- [ ] Tambah enum Province (34 provinsi Indonesia)
- [ ] Tambah enum MitraRegistrationStatus (PENDING, APPROVED, REJECTED, INACTIVE)
- [ ] Tambah field lokasi pada User (province, city, district, postalCode)
- [ ] Tambah field mitraStatus, mitraApprovedAt, mitraApprovedBy pada User
- [ ] Tambah model StokisProductPrice (harga custom per stokis)
- [ ] Script Migrasi untuk data existing (mitra dengan stokisId → APPROVED)

### Endpoint API
- [ ] /api/mitra-registration - Stokis ajukan mitra
- [ ] /api/mitra-registration/[id] - Pusat approve/reject
- [ ] /api/mitra-registration/pending - Daftar pending untuk Pusat
- [ ] /api/stokis-prices - CRUD harga custom (Pusat set)
- [ ] /api/stokis-prices/by-stokis/[id] - Harga per stokis
- [ ] /api/locations/provinces - Daftar provinsi
- [ ] /api/stokis/by-province - Filter stokis per provinsi
- [ ] /api/province-coverage - Statistik coverage stokis/mitra per provinsi
- [ ] Update /api/users - Tambah field lokasi, validasi province wajib untuk STOKIS
- [ ] Update /api/orders/mitra - Validasi mitraStatus APPROVED, gunakan harga custom

### Halaman Dashboard - Stokis
- [ ] /dashboard/kelola-mitra - Halaman ajukan & lihat mitra (tidak bisa approve)
- [ ] /dashboard/harga-stokis - Halaman lihat harga (VIEW ONLY)

### Halaman Dashboard - Pusat
- [ ] /dashboard/approve-mitra - Halaman approve/reject pengajuan mitra
- [ ] /dashboard/harga-stokis - Halaman kelola harga per stokis
- [ ] /dashboard/province-coverage - Halaman coverage provinsi (stokis/mitra per provinsi)
- [ ] Update /dashboard/users - Tambah kolom province & filter

### Halaman Dashboard - Finance
- [x] /dashboard/laporan-harga - Halaman view laporan harga + margin (VIEW ONLY)
- [x] /dashboard/pembayaran - Halaman input pembayaran PO (Finance) - dari Component 11
- [ ] Update /dashboard/reports - Tambah filter by province
- [x] Update /dashboard/approve-po - Tampilkan sisa tagihan stokis, tombol Adjust PO - dari Component 10
- [ ] Update /dashboard/tagihan - Tambah view Per Stokis, summary, export

### Fitur Ekspor - Mitra
- [x] /api/export/mitra-orders - Ekspor pesanan mitra PDF/Excel (menggunakan /api/export/orders?type=mitra)
- [x] Update halaman order - Tambah ExportButton (sudah ada di /dashboard/history)

### Fitur Ekspor - Gudang
- [x] /api/export/gudang-po - Ekspor PO gudang PDF/Excel
- [x] Update /dashboard/po-masuk - Tambah ExportButton

### Peningkatan Finance
- [x] /api/stokis/[id]/outstanding - API cek sisa tagihan stokis
- [x] Update /api/orders/stokis/[id] - Tambah aksi adjust PO
- [x] Tampilkan peringatan jika stokis punya tunggakan di Approve PO
- [x] Git commit & push ✅





### Pembayaran (Payment) - Finance
- [x] /api/payments - API input pembayaran (list, create)
- [x] /api/payments/[id] - API detail/hapus pembayaran
- [x] Model Payment dengan enum PaymentMethod
- [x] Support partial payment (cicilan)
- [ ] Upload bukti transfer (placeholder siap)
- [x] Auto-update status invoice ke PAID jika lunas
- [x] /dashboard/pembayaran - Halaman input pembayaran

### Adjust PO - Stokis
- [x] Update /dashboard/history-pusat - Tambah tombol Adjust PO untuk status PENDING
- [x] Modal edit quantity items dengan tombol +/-
- [x] API adjust order sebelum diapprove (reuse dari Component 10)
- [x] Tombol batalkan order untuk status PENDING

### Ekspor PDF PO
- [x] /api/po/stokis/[id]/pdf - Generate PO PDF (sudah ada)
- [x] Update /dashboard/history-pusat - Tambah tombol Cetak PO (Stokis)
- [x] Update /dashboard/approve-po - Tambah tombol Cetak PO (Finance)
- [x] Update /dashboard/po-masuk - Tambah tombol Cetak PO (Gudang)

### Alur Pesanan
- [ ] Update halaman order - Cek mitraStatus APPROVED sebelum order
- [ ] Tampilkan pesan jika PENDING/REJECTED
- [ ] Gunakan harga custom stokis jika ada

### Pembaruan UI
- [x] Update layout sidebar - Tambah menu baru per role (Stokis, Pusat, Finance, termasuk Pembayaran)

---

## Akun Tes

| Role | Email | Password |
|------|-------|----------|
| Pusat | admin@dfresto.com | password123 |
| Finance | finance@dfresto.com | password123 |
| Gudang | gudang.ayam@dfresto.com | password123 |
| Stokis | stokis.jakarta@dfresto.com | password123 |
| Mitra | mitra1@dfresto.com | password123 |
| DC | dc.jakarta@dfresto.com | dc123456 |
---

## Implementasi Identitas Brand ✅ SELESAI

### UI & Styling
- [x] Analisis identitas brand dari logo
- [x] Buat variabel CSS untuk palet warna D'Fresto (Merah, Merah Marun, Emas, Krem)
- [x] Salin logo ke direktori public
- [x] Update UI Halaman Login dengan warna brand dan logo
- [x] Update UI Sidebar dengan warna brand dan logo
- [x] Update Layout Dashboard dan Statistik dengan warna brand
- [x] Update Tombol Aksi Cepat dengan gradasi brand

---

## Konsistensi UI Kartu Dashboard (9 Feb 2026) ✅ SELESAI

### Halaman Pembayaran (`/dashboard/pembayaran`)
- [x] Redesign kartu: 2 kolom (Lunas, Belum Lunas) dengan gaya gradasi
- [x] Setiap kartu menampilkan nominal (Rp) dan jumlah PO
- [x] Filter dropdown: Semua Status, Belum Bayar, Jatuh Tempo

### Halaman Invoices (`/dashboard/invoices`)
- [x] Redesign kartu: 3 kolom (Total, Lunas, Belum Lunas)
- [x] Setiap kartu menampilkan nominal dan jumlah PO
- [x] Filter dropdown diubah ke: Semua Status, Lunas, Belum Lunas

### Halaman Reports (`/dashboard/reports`)
- [x] Perbaikan responsivitas mobile (nominal tidak terpotong)
- [x] Ukuran font lebih kecil pada mobile, tinggi baris lebih ringkas

---

## Peningkatan Tab Halaman Laporan (9 Feb 2026) ✅ SELESAI

### Tab Overview
- [x] Ubah warna Kartu Total DC (Slate) & Total Mitra (Oranye) agar lebih kontras

### Tab Produk Terlaris
- [x] Tabel menjadi dapat digulir horizontal di mobile
- [x] Kolom Revenue tidak terpotong (whitespace-nowrap)

### Tab Performa (sebelumnya "Performa Stokis")
- [x] Ganti nama tab: "Performa Stokis" → "Performa"
- [x] Tambah filter: Semua, DC, Stokis, Mitra
- [x] Tambah kartu Total dengan nominal dan jumlah PO
- [x] Tabel menjadi dapat digulir horizontal di mobile
- [x] Perbaiki logika filter: Semua/DC/Stokis/Mitra berhasil memfilter data

### Tab Tagihan (sebelumnya "Umur Piutang")
- [x] Ganti nama tab: "Umur Piutang" → "Tagihan"

---

## Peningkatan Halaman Approve PO (9 Feb 2026) ✅ SELESAI

### Bagian Peringatan Tagihan
- [x] Hapus ikon SVG AlertTriangle
- [x] Ubah teks peringatan menjadi: "⚠️ Stokis memiliki tagihan tertunggak"
- [x] Hapus detail Unpaid dan Overdue
- [x] Tambah tombol "Lihat Pembayaran" → /dashboard/pembayaran
---

## Penyesuaian UI (10 Feb 2026) ✅ SELESAI

### Halaman Pembayaran (`/dashboard/pembayaran`)
- [x] Hapus kolom "Jatuh Tempo" dari tabel invoice

### Halaman Approve PO (`/dashboard/approve-po`)
- [x] Tambah filter Semua / DC / Stokis
- [x] Update API `/api/orders/stokis` - sertakan `role` di select stokis
- [x] Filter berdasarkan `stokis.role` (DC / STOKIS)

### Halaman Invoices (`/dashboard/invoices`)
- [x] Perbaiki layout mobile: 3 kartu → 2+1 responsif (`grid-cols-2 lg:grid-cols-3`)
- [x] Kartu "Belum Lunas" span lebar penuh di mobile (`col-span-2 lg:col-span-1`)

### Perbaikan Pembayaran & Finance
- [x] Pemisah ribuan (titik) pada input Jumlah Bayar di modal pembayaran
- [x] Perbaiki role Finance tidak bisa lihat order Stokis (filter API tambah `PENDING_PUSAT`)
- [x] Perbaiki filter Semua Stokis: API `/api/stokis` sertakan role DC + STOKIS

---

## Fase 13: Pembaruan Role FINANCE_ALL (13 Feb 2026) ✅ SELESAI

### Ikhtisar Dashboard
- [x] Implementasi Dashboard Global untuk FINANCE_ALL (Lihat semua area: DC, Stokis, Mitra) ✅

### Keamanan & Izin
- [x] Sidebar: Hapus menu 'Approve PO' & 'Pembayaran' untuk FINANCE_ALL ✅
- [x] API: Update `orders/mitra` untuk mengizinkan akses FINANCE_ALL (untuk statistik) ✅
- [x] API: Tambah `stokisId` ke respons API user untuk pemetaan area ✅
- [x] Akses Halaman: Tambah pengalihan (redirect) pada halaman `approve-po` dan `pembayaran` untuk FINANCE_ALL ✅
- [x] Build berhasil (`next build` exit code 0) ✅

---

## Fase 6: Finance DC & Alur Pesanan (10 Feb 2026) ✅ SELESAI

### Manajemen Role
- [x] Tambah Role `FINANCE_DC` (Finance per Area)
- [x] Tambah Role `FINANCE_ALL` (Finance Pusat/Nasional)
- [x] Update Model User: field `dcId` untuk pemetaan area
- [x] Update Auth: `dcId` masuk ke session & JWT

### Alur Pesanan & Persetujuan
- [x] Logika Persetujuan DC: Stokis → Pending Pusat → DC Approve → PO Issued
- [x] Logika Isolasi Data: DC hanya lihat order stokis area-nya
- [x] Logika Isolasi Finance: Finance DC hanya lihat invoice area-nya
- [x] Update API: `/api/orders`, `/api/invoices`, `/api/reports` filter by `dcId`

### Data & Seeding
- [x] Seed 7 Area DC (Palembang, Makassar, Medan, Bengkulu, Pekanbaru, Jatim, Jateng)
- [x] Seed 7 Finance DC & 1 Finance All
- [x] Seed 42 Dummy Orders (Distribusi merata: 6 order per Area DC)
- [x] Seed 20 Mitra & 14 Stokis tertaut ke DC

### Dokumentasi
- [x] Diagram Alur Lengkap (.html) - Mitra hingga Gudang
- [x] Checklist Pengujian (.md) - Skenario pengujian lengkap

---

## Fase 7: Laporan & Performa yang Ditingkatkan (11 Feb 2026) ✅ SELESAI

### Peningkatan Laporan Performa
- [x] Update API `getStokisPerformanceReport` - return rincian `products` & `uniqueCode`
- [x] UI: 3 Kartu Ringkasan (Pendapatan, AOV, Split) pada Tab Performa
- [x] UI: Kolom Tabel "Kode" (Tautan ke `uniqueCode` User)
- [x] UI: Baris yang Dapat Diperluas (Tampilkan 5 Produk Teratas per Entitas)
- [x] Ekspor PDF: Rincian produk lengkap (bukan hanya 5 teratas)
- [x] Ekspor Excel: Multi-sheet (DC, Stokis, Mitra) dengan baris produk lengkap
- [x] Perbaikan: Logika filter "Semua" untuk tabel DC/Mitra
- [x] Perbaikan: Header Bagian (Area DC, Stokis, Mitra) untuk memisahkan tabel

### Integritas Data
- [x] Update `seed.ts` - Isi `uniqueCode` untuk DC, Stokis, Mitra
- [x] Format: `DC-PLB-001`, `STK-PLB-A01`, `MTR-001`

---

## Fase 8: Perbaikan & Pembaruan UI (13 Feb 2026) ✅ SELESAI

### Peningkatan Halaman Laporan
- [x] Tab Overview: Restrukturisasi kartu (Total Stokis, Total Pendapatan Stokis, Total Pendapatan Mitra) ✅
- [x] Tab Produk: Header '#' diubah menjadi 'No' ✅
- [x] Tab Performa: Hapus filter 'Semua' dan 'DC' (hanya Stokis & Mitra) ✅
- [x] Tab Performa: Sembunyikan tabel 'Area DC' untuk role FINANCE_DC ✅
- [x] Tab Performa: Perbaiki Ekspor Excel (Hapus kolom Revenue, hilangkan celah baris kosong) ✅
- [x] Tab Tagihan: Ubah filter menjadi Status (Semua / Belum Bayar / Lunas) ✅
- [x] Hapus halaman & menu Laporan Harga sepenuhnya ✅

### Pembaruan Halaman Invoice
- [x] Hapus status 'Overdue' (semua non-PAID tampil sebagai Belum Lunas) ✅
- [x] Ubah nama status/tombol 'Paid' menjadi 'Lunas' ✅
- [x] Perbaiki Pesan Konfirmasi ('Tandai Lunas?') ✅

### Perbaikan Finance DC
- [x] Perbaiki 403 Forbidden pada Pembuatan Pembayaran (Izinkan role FINANCE_DC/FINANCE_ALL) ✅
- [x] Git commit ✅ `95072ca`

---

## Fase 9: Grafik Dashboard Overview (13 Feb 2026) ✅ SELESAI

### Redesign Bagian Pipeline Order
- [x] Hapus grid berwarna "Pipeline Order Stokis" ✅
- [x] Implementasi Grafik Perbandingan Pendapatan (Stokis vs Mitra) ✅
- [x] Implementasi Grafik Perbandingan Total PO (Stokis vs Mitra) ✅
- [x] Gunakan Pure CSS/Tailwind (Tanpa library grafik eksternal) ✅
- [x] Layout rekursif (Bertumpuk di mobile, Berdampingan di desktop) ✅
- [x] Git commit ✅ `fc03644`
- [x] Update Grafik: Tampilkan Total Stokis/Mitra & User Aktif alih-alih Revenue/PO ✅
- [x] Hapus teks 'Rasio Order' ✅
- [x] Git commit ✅ `59ef38c`

---

## Fase 10: Perbaikan Tab Performa (13 Feb 2026) ✅ SELESAI

### Kartu Ringkasan Dinamis
- [x] Kartu Ungu: Beralih antara info Stokis & Mitra berdasarkan filter ✅
- [x] Kartu Ungu: Tampilkan jumlah Total User & User Aktif secara dinamis ✅
- [x] Kartu Revenue & Avg Order: Filter data berdasarkan tab yang dipilih (Stokis/Mitra) ✅
- [x] Kartu Revenue & Avg Order: Hitung total spesifik untuk Stokis/Mitra ✅

### Pembersihan Tabel & UI
- [x] Tabel Stokis: Hapus kolom 'Order Mitra' & 'Mitra' (redundan) ✅
- [x] Kartu Ungu: Hapus kata 'Stokis'/'Mitra' dari nilai (tampilkan angka saja) ✅
- [x] Git commit ✅ `26479b4`

---

## Fase 11: Peningkatan Ekspor Laporan (14 Feb 2026) ✅ SELESAI

### Ekspor Tab Performa (Excel & PDF)
- [x] Ratakan Baris Produk: Setiap baris produk mengulang info Stokis (Kode, Nama, Telp, dll.) ✅
- [x] Kolom Kondisional: Sembunyikan 'Order dari Mitra' saat filter STOKIS dipilih, Tampilkan saat MITRA dipilih ✅
- [x] Output Sederhana: Hapus sheet/bagian terpisah, hanya satu daftar rata berdasarkan filter aktif ✅

### Ekspor Tab Tagihan (Excel & PDF)
- [x] Perbaiki Logika Filter: `getInvoices()` sekarang memfilter berdasarkan status pembayaran (Belum Bayar/Lunas/Semua) ✅
- [x] Terapkan Filter ke Ekspor: PDF dan Excel sekarang mengikuti tampilan terfilter yang dipilih ✅

---

## Fase 12: Perbaikan Filter FINANCE_DC (14 Feb 2026) ✅ SELESAI

### Halaman Approve PO
- [x] Hapus dropdown filter Pusat/All DC/DC untuk FINANCE_DC ✅
- [x] FINANCE_DC sekarang hanya melihat PO PENDING_PUSAT + search box ✅

### Halaman Pembayaran
- [x] Hapus dropdown filter stokis (DC Palembang, Stokis Bekasi, dll) untuk FINANCE_DC ✅
- [x] FINANCE_DC sekarang langsung melihat semua data area mereka tanpa filter stokis ✅

### Git Commits
- [x] `236bf0f` — Hilangkan "Semua Stokis" + auto-select stokis pertama
- [x] `caa91c3` — Hapus filter Pusat/All DC/DC di approve-po dan filter stokis di pembayaran

---

## Fase 13: Peningkatan UI Halaman Pembayaran (14 Feb 2026) ✅ SELESAI

### Perbaikan UX
- [x] Badge ✅ "Lunas" menggantikan tombol "Bayar" untuk invoice yang sudah lunas ✅
- [x] Default filter FINANCE_DC ke "Belum Bayar" agar langsung lihat yang perlu diproses ✅
- [x] Baris invoice Lunas dimmed (abu-abu) untuk visual distinction ✅
- [x] Sorting: Invoice belum bayar di atas, Lunas di bawah ✅
- [x] Tambah opsi "Lunas" di dropdown filter status ✅
- [x] Git commit ✅ `d81ea90`

---

## Fase 14: Peningkatan Role GUDANG (14 Feb 2026) ✅ SELESAI

### Dashboard GUDANG
- [x] Tambah 4 stat cards: PO Masuk, Sedang Diproses, Terkirim Hari Ini, Stok Menipis ✅
- [x] Tambah section "PO Terbaru" (5 PO terakhir dengan status badge) ✅
- [x] Tambah quick link "Inventory" di samping "Proses PO" ✅

### Halaman PO Masuk
- [x] Tambah summary cards (PO Baru & Sedang Diproses) ✅
- [x] Tambah tab "PO Aktif" dan "Riwayat Dikirim" ✅
- [x] Tambah filter status (PO Baru / Sedang Diproses) ✅
- [x] Tambah search berdasarkan nomor PO atau nama stokis ✅
- [x] Tab Riwayat menampilkan PO yang sudah dikirim dengan tanggal kirim ✅

### Sidebar
- [x] Badge count jumlah PO baru (PO_ISSUED) di menu "PO Masuk" ✅
- [x] Auto-refresh badge setiap 60 detik ✅

### API
- [x] Perluas filter GUDANG di `/api/orders/stokis` untuk include SHIPPED orders ✅

### Git Commits
- [x] Git commit ✅ `3585c93` — Peningkatan fitur utama
- [x] Git commit ✅ `026644e` — Penyesuaian feedback (PENDING_PUSAT & stok menipis)

---

## Fase 15: Filter & Approve PO Enhancements (17 Feb 2026) ✅ SELESAI

### Halaman Approve PO (`/dashboard/approve-po`)
- [x] Tampilkan dropdown filter Status untuk role FINANCE_DC (sebelumnya tersembunyi) ✅
- [x] Hapus hard-coded filter PENDING_PUSAT untuk FINANCE_DC ✅
- [x] Default filter = "Menunggu Approval" untuk semua role ✅
- [x] Fungsi Adjust PO: Hapus batas atas qty (sekarang bisa tambah & kurangi) ✅
- [x] FINANCE_DC bisa klik semua baris PO (tidak hanya PENDING_PUSAT) untuk cek detail ✅
- [x] Tombol aksi (Approve/Adjust/Tolak) hanya muncul untuk PO berstatus PENDING_PUSAT ✅
- [x] Label tombol Adjust diubah: "Kurangi Qty" → "Kurangi/Tambah Qty" ✅

### Halaman Reports (`/dashboard/reports`) — Tab Tagihan
- [x] Tambah filter Periode Tanggal pada tab Tagihan (UI sama dengan tab Performa) ✅
- [x] Dropdown periode preset (7 Hari / 30 Hari / 90 Hari / 1 Tahun) ✅
- [x] Tombol toggle Custom dengan date pickers ✅
- [x] Update `fetchReport()` — kirim `period` atau `dateFrom`/`dateTo` untuk tab invoice ✅
- [x] Update API `getInvoiceAgingReport` — filter invoice berdasarkan `order.createdAt` ✅

### Dashboard FINANCE
- [x] Hapus 2 card DC (Total & Menunggu Approval) agar fokus ke Stokis ✅
- [x] Sederhanakan layout menjadi grid 2 kolom (Total & Menunggu Approval Stokis) ✅

### Git Commits
- [x] Git commit ✅ `0b473c7` — Filter & approve PO enhancements
- [x] Git commit ✅ `7593d5b` — Update FINANCE dashboard (remove DC cards)

### Isolasi Data Berdasarkan Role & Area DC

#### Backend API (6 endpoint diupdate):
- [x] `/api/orders/stokis` — PUSAT/FINANCE → dcId null, FINANCE_ALL → dcId not null + dcFilter ✅
- [x] `/api/invoices` — filter serupa ✅
- [x] `/api/payments` — filter serupa ✅
- [x] `/api/reports` — filter stokisFilter berdasarkan role ✅
- [x] `/api/stokis` — PUSAT/FINANCE → dcId null, FINANCE_ALL → dcId not null + dcFilter ✅
- [x] `/api/analytics/dashboard` — semua query pusat-direct only ✅

#### Seed Data:
- [x] Tambah 4 Stokis Pusat (stokis15-18, dcId=null) + custom prices ✅
- [x] Tambah 4 Mitra Pusat (mitra21-24, linked ke stokis pusat) ✅

#### Frontend DC Filter (FINANCE_ALL):
- [x] Invoices — dropdown Filter Area DC ✅
- [x] Reports — dropdown Filter Area DC ✅
- [x] Dashboard — area breakdown view (bawaan, tanpa dropdown) ✅
- [x] Approve PO & Pembayaran — redirect (view-only, tidak perlu dropdown) ✅

#### Dokumentasi:
- [x] Update `docs/accounts.md` — tambah stokis pusat & mitra pusat ✅
- [x] Update `docs/task.md` ✅

#### Git:
- [x] Git commit ✅ `5fcdb3b` — Isolasi data role-based
- [x] Git commit ✅ `32231ba` — Fix: FINANCE_ALL allowed in `/api/dc` (dropdown muncul)
- [x] Git commit ✅ `8bb01fd` — Fix: Dropdown hanya menampilkan DC yang memiliki stokis (exclude Pusat Area)

### Perbaikan Bug Data Filtering (17 Feb 2026)
- [x] Fix `/api/orders/mitra`: Tambah filter `dcId=null` untuk PUSAT/FINANCE (hanya lihat order dari stokis pusat)
- [x] Fix `/api/reports`: Fix `totalMitra` count di Summary Report agar mematuhi filter area
- [x] Result: Dashboard & Halaman Laporan Overview sekarang konsisten menampilkan data Pusat
