# D'Fresto - Testing Checklist (Semua Fitur)

**Tanggal**: 17 Februari 2026  
**Version**: 2.0  
**Tested By**: _________________

> Password semua akun: `password123`

---

## 🔴 Pre-requisite

| # | Item | Command | Status |
|---|------|---------|--------|
| 1 | Apply Prisma Schema | `npx prisma db push` | ☐ |
| 2 | Regenerate Prisma Client | `npx prisma generate` | ☐ |
| 3 | Seed Database | `npm run db:seed` | ☐ |
| 4 | Restart Dev Server | `npm run dev` | ☐ |

---

## 1️⃣ Login & Otentikasi

| # | Test Case | Akun | Expected Result | Status |
|---|-----------|------|-----------------|--------|
| 1.1 | Login PUSAT | admin@dfresto.com | Dashboard PUSAT terbuka | ☐ |
| 1.2 | Login FINANCE | finance@dfresto.com | Dashboard FINANCE terbuka | ☐ |
| 1.3 | Login FINANCE_DC | manager.palembang@dfresto.com | Dashboard FINANCE_DC terbuka | ☐ |
| 1.4 | Login FINANCE_ALL | finance.all@dfresto.com | Dashboard FINANCE_ALL terbuka | ☐ |
| 1.5 | Login GUDANG Ayam | gudang.ayam@dfresto.com | Dashboard GUDANG + sidebar Gudang Ayam | ☐ |
| 1.6 | Login GUDANG Bumbu | gudang.bumbu@dfresto.com | Dashboard GUDANG + sidebar Gudang Bumbu | ☐ |
| 1.7 | Login GUDANG Kering | gudang.kering@dfresto.com | Dashboard GUDANG + sidebar Gudang Kering | ☐ |
| 1.8 | Login GUDANG Tepung | gudang.tepung@dfresto.com | Dashboard GUDANG + sidebar Gudang Tepung | ☐ |
| 1.9 | Login STOKIS (DC) | stokis1@dfresto.com | Dashboard STOKIS terbuka | ☐ |
| 1.10 | Login STOKIS (Pusat) | stokis15@dfresto.com | Dashboard STOKIS terbuka | ☐ |
| 1.11 | Login MITRA | mitra1@dfresto.com | Dashboard MITRA terbuka | ☐ |
| 1.12 | Login DC | admin.palembang@dfresto.com | Dashboard DC terbuka | ☐ |
| 1.13 | Login password salah | Any | Error "Invalid credentials" | ☐ |
| 1.14 | Akses /dashboard tanpa login | - | Redirect ke /login | ☐ |
| 1.15 | Logout | Any | Redirect ke /login | ☐ |

---

## 2️⃣ Dashboard — PUSAT

Akun: `admin@dfresto.com`

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.1 | Stat cards tampil (Total Stokis, Pendapatan, dll) | Data terisi dari API | ☐ |
| 2.2 | Grafik Stokis vs Mitra | Bar chart tampil | ☐ |
| 2.3 | Order Terbaru tampil | List order terbaru | ☐ |
| 2.4 | Label status order (Menunggu Approval, Diterima, dll) | Label Indonesia benar | ☐ |
| 2.5 | Filter Periode: Dropdown preset (7/30/90 Hari, dll) | Filter berfungsi | ☐ |
| 2.6 | Filter Periode: Tombol Custom + Date picker | Tanggal custom berfungsi | ☐ |
| 2.7 | Data hanya menampilkan stokis pusat (dcId=null) | Isolasi data benar | ☐ |

### Halaman Order Stokis (`/dashboard/orders-stokis`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.8 | Menampilkan daftar order stokis | Tabel order tampil | ☐ |
| 2.9 | Filter Periode: Dropdown preset | Filter berfungsi | ☐ |
| 2.10 | Filter Periode: Custom date | Date picker berfungsi | ☐ |
| 2.11 | Data hanya stokis pusat (dcId=null) | Isolasi benar | ☐ |

### Halaman Users (`/dashboard/users`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.12 | Menampilkan daftar user | Tabel tampil | ☐ |
| 2.13 | Tambah user baru | User created | ☐ |
| 2.14 | Edit user | User updated | ☐ |
| 2.15 | Hapus user | User deleted | ☐ |

### Halaman Produk (`/dashboard/products`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.16 | Menampilkan daftar produk | Tabel tampil | ☐ |
| 2.17 | Tambah produk baru | Produk created | ☐ |
| 2.18 | Edit produk | Produk updated | ☐ |
| 2.19 | Hapus produk | Produk deleted | ☐ |

### Halaman Gudang (`/dashboard/gudang`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.20 | Menampilkan daftar gudang | Tabel tampil | ☐ |
| 2.21 | Tambah gudang baru | Gudang created | ☐ |
| 2.22 | Edit gudang | Gudang updated | ☐ |
| 2.23 | Hapus gudang | Gudang deleted | ☐ |

### Halaman Laporan (`/dashboard/reports`) — PUSAT

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 2.24 | Tab Overview: Stat cards tampil | Data benar | ☐ |
| 2.25 | Tab Produk Terlaris: Tabel tampil | Data benar | ☐ |
| 2.26 | Tab Performa: Filter Stokis | Tabel stokis tampil | ☐ |
| 2.27 | Tab Performa: Filter Mitra | Tabel mitra tampil | ☐ |
| 2.28 | Tab Performa: Kartu ringkasan dinamis | Angka berubah per filter | ☐ |
| 2.29 | Tab Performa: Expandable row (produk per entitas) | 5 produk teratas tampil | ☐ |
| 2.30 | Tab Tagihan: Filter status (Semua/Belum Bayar/Lunas) | Data terfilter | ☐ |
| 2.31 | Tab Tagihan: Filter periode tanggal | Data terfilter | ☐ |
| 2.32 | Export PDF — Tab Performa | File PDF terdownload | ☐ |
| 2.33 | Export Excel — Tab Performa | File Excel terdownload | ☐ |
| 2.34 | Export PDF — Tab Tagihan | File PDF terdownload | ☐ |
| 2.35 | Export Excel — Tab Tagihan | File Excel terdownload | ☐ |
| 2.36 | Tab Overview: Responsif mobile | Kartu tidak terpotong | ☐ |

---

## 3️⃣ Dashboard & Fitur — FINANCE

Akun: `finance@dfresto.com`

### Dashboard

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.1 | Stat cards: Total Stokis & Menunggu Approval | Data terisi | ☐ |
| 3.2 | Data hanya stokis pusat (dcId=null) | Isolasi benar | ☐ |

### Halaman Approve PO (`/dashboard/approve-po`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.3 | Menampilkan PO status PENDING_PUSAT | List tampil | ☐ |
| 3.4 | Default filter = "Menunggu Approval" | Selected by default | ☐ |
| 3.5 | Klik PO → modal detail terbuka | Modal dengan items | ☐ |
| 3.6 | Banner tagihan stokis muncul | Merah jika ada tagihan | ☐ |
| 3.7 | Tombol "Approve & Issue PO" | Status → PO_ISSUED, Invoice dibuat | ☐ |
| 3.8 | Tombol "Tolak PO" | Status → CANCELLED | ☐ |
| 3.9 | Tombol "Kurangi/Tambah Qty" → modal adjust | Qty bisa +/- | ☐ |
| 3.10 | Adjust: Qty bisa dikurangi hingga 0 | Item dihapus saat submit | ☐ |
| 3.11 | Adjust: Qty bisa ditambah tanpa batas atas | Qty naik | ☐ |
| 3.12 | Preview total baru ditampilkan | Kalkulasi real-time | ☐ |
| 3.13 | Submit adjustment | Items diperbarui | ☐ |
| 3.14 | Tombol "Print PO" → buka `/po/stokis/[id]` | Tab baru terbuka | ☐ |

### Halaman Pembayaran (`/dashboard/pembayaran`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.15 | Summary cards: Lunas & Belum Lunas | Nominal & PO count benar | ☐ |
| 3.16 | Filter: Semua Status | Tampil semua | ☐ |
| 3.17 | Filter: Belum Lunas | Hanya UNPAID + OVERDUE | ☐ |
| 3.18 | Filter: Jatuh Tempo | Hanya OVERDUE | ☐ |
| 3.19 | Filter: Lunas | Hanya PAID | ☐ |
| 3.20 | Search invoice/stokis | Hasil terfilter | ☐ |
| 3.21 | Klik invoice → modal payment | Modal terbuka | ☐ |
| 3.22 | Amount default = sisa tagihan | Pre-filled | ☐ |
| 3.23 | Input amount < sisa → partial payment | Invoice tetap UNPAID | ☐ |
| 3.24 | Input amount = sisa → full payment | Invoice → PAID | ☐ |
| 3.25 | Pemisah ribuan (titik) pada input amount | Format benar | ☐ |
| 3.26 | Baris Lunas dimmed (abu-abu) | Visual distinction | ☐ |
| 3.27 | Badge ✅ "Lunas" menggantikan tombol "Bayar" | Tidak ada tombol bayar | ☐ |
| 3.28 | Data hanya stokis pusat (dcId=null) | Isolasi benar | ☐ |

### Halaman Invoices (`/dashboard/invoices`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.29 | Stat cards: Total, Lunas, Belum Lunas | Nominal & PO count benar | ☐ |
| 3.30 | Filter: Semua Status | Tampil semua invoice | ☐ |
| 3.31 | Filter: Belum Lunas | Hanya UNPAID + OVERDUE (semua muncul) | ☐ |
| 3.32 | Filter: Lunas | Hanya PAID | ☐ |
| 3.33 | Search invoice/nomor PO/stokis | Hasil terfilter | ☐ |
| 3.34 | Invoice belum lunas > 20 hari → highlight merah | Row bg-red-50 | ☐ |
| 3.35 | Badge "Jatuh Tempo" + ikon ⚠️ + "X hari sejak terbit" | Tampil pada row overdue | ☐ |
| 3.36 | Invoice belum lunas ≤ 20 hari → badge kuning "Belum Lunas" | Normal display | ☐ |
| 3.37 | Layout mobile: 2+1 grid (Belum Lunas span penuh) | Responsif benar | ☐ |
| 3.38 | Data hanya stokis pusat (dcId=null) | Isolasi benar | ☐ |

### Halaman Laporan (`/dashboard/reports`) — FINANCE

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 3.39 | Semua tab (Overview, Produk, Performa, Tagihan) berfungsi | Tab switch benar | ☐ |
| 3.40 | Data hanya stokis pusat | Isolasi benar | ☐ |

---

## 4️⃣ Dashboard & Fitur — FINANCE_DC

Akun: `manager.palembang@dfresto.com`

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 4.1 | Dashboard stat cards tampil | Data area Palembang saja | ☐ |
| 4.2 | Approve PO: Semua status PO visible (bukan hanya PENDING) | Dropdown filter muncul | ☐ |
| 4.3 | Approve PO: Default filter = "Menunggu Approval" | Selected by default | ☐ |
| 4.4 | Approve PO: Tombol aksi hanya untuk PENDING_PUSAT | Approve/Tolak hanya di PENDING | ☐ |
| 4.5 | Approve PO: Bisa klik semua PO untuk lihat detail | Modal terbuka | ☐ |
| 4.6 | Approve PO: Tidak ada dropdown filter Pusat/All DC/DC | Hidden untuk FINANCE_DC | ☐ |
| 4.7 | Pembayaran: Tidak ada dropdown filter stokis | Hidden untuk FINANCE_DC | ☐ |
| 4.8 | Pembayaran: Default filter = "Belum Lunas" | Auto-select | ☐ |
| 4.9 | Pembayaran: Buat payment baru | Payment created, Invoice updated | ☐ |
| 4.10 | Invoices: Hanya invoice area Palembang | Isolasi data benar | ☐ |
| 4.11 | Invoices: Highlight overdue > 20 hari | Row merah, badge Jatuh Tempo | ☐ |
| 4.12 | Laporan: Semua tab berfungsi | Data area Palembang saja | ☐ |
| 4.13 | Laporan — Tab Performa: Tabel Area DC tersembunyi | Hidden untuk FINANCE_DC | ☐ |

---

## 5️⃣ Dashboard & Fitur — FINANCE_ALL

Akun: `finance.all@dfresto.com`

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 5.1 | Dashboard global: Area breakdown tampil | Semua DC area terlihat | ☐ |
| 5.2 | Data hanya stokis DC (dcId != null) | Pusat tidak termasuk | ☐ |
| 5.3 | Invoices: Dropdown "Filter Area DC" muncul | Bisa pilih DC | ☐ |
| 5.4 | Invoices: Filter per DC | Data sesuai DC dipilih | ☐ |
| 5.5 | Invoices: "Semua Area DC" = gabungan semua DC | Tampil semua DC | ☐ |
| 5.6 | Laporan: Dropdown "Filter Area DC" muncul | Bisa pilih DC | ☐ |
| 5.7 | Approve PO: Redirect (tidak boleh akses) | Redirect ke /dashboard | ☐ |
| 5.8 | Pembayaran: Redirect (tidak boleh akses) | Redirect ke /dashboard | ☐ |
| 5.9 | Sidebar: Menu "Approve PO" & "Pembayaran" tersembunyi | Tidak muncul | ☐ |

---

## 6️⃣ Dashboard & Fitur — GUDANG

Akun: `gudang.ayam@dfresto.com`

### Dashboard

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.1 | Stat cards: PO Masuk, Sedang Diproses, Terkirim, Stok Menipis | Data terisi | ☐ |
| 6.2 | Section "PO Terbaru" (5 PO terakhir) | List tampil | ☐ |
| 6.3 | Quick link: "Proses PO" & "Inventory" | Navigasi benar | ☐ |

### Halaman PO Masuk (`/dashboard/po-masuk`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.4 | Summary cards: PO Baru & Sedang Diproses | Count benar | ☐ |
| 6.5 | Tab "PO Aktif" | PO_ISSUED & PROCESSING tampil | ☐ |
| 6.6 | Tab "Riwayat Dikirim" | SHIPPED orders tampil | ☐ |
| 6.7 | Filter status (PO Baru / Sedang Diproses) | Filter benar | ☐ |
| 6.8 | Search nomor PO / stokis | Hasil terfilter | ☐ |
| 6.9 | Proses PO → status PROCESSING | Status berubah | ☐ |
| 6.10 | Kirim Pesanan → status SHIPPED | Status berubah | ☐ |
| 6.11 | Tombol Cetak PO | Buka `/po/stokis/[id]` | ☐ |
| 6.12 | Export PO (PDF/Excel) | File terdownload | ☐ |
| 6.13 | PO PENDING_PUSAT tampil sebagai "Belum Disetujui" | Visual indicator | ☐ |

### Halaman Inventory (`/dashboard/inventory`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.14 | Menampilkan daftar stok | Tabel tampil | ☐ |
| 6.15 | Tambah stok (+) | Stok bertambah | ☐ |
| 6.16 | Kurangi stok (-) | Stok berkurang | ☐ |

### Sidebar Badge

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 6.17 | Badge count PO baru di menu "PO Masuk" | Angka tampil | ☐ |
| 6.18 | Auto-refresh badge setiap 60 detik | Count terupdate | ☐ |

---

## 7️⃣ Dashboard & Fitur — STOKIS

Akun: `stokis1@dfresto.com`

### Dashboard

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.1 | Stat cards: Orders, Mitra, dll | Data terisi | ☐ |
| 7.2 | Quick actions tampil | Link navigasi benar | ☐ |

### Order ke Pusat (`/dashboard/order-pusat`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.3 | Membuat order baru ke Pusat | Order status: PENDING_PUSAT | ☐ |
| 7.4 | Pilih produk & qty | Total terhitung | ☐ |
| 7.5 | Submit order | Navigasi ke riwayat | ☐ |

### Riwayat Order (`/dashboard/history-pusat`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.6 | Menampilkan riwayat order ke Pusat | List tampil | ☐ |
| 7.7 | Badge status: PENDING_PUSAT (kuning) | Warna benar | ☐ |
| 7.8 | Badge status: PO_ISSUED (ungu) | Warna benar | ☐ |
| 7.9 | Badge status: SHIPPED (cyan) | Warna benar | ☐ |
| 7.10 | Badge status: RECEIVED (hijau) | Warna benar | ☐ |
| 7.11 | Klik order → modal detail | Modal terbuka | ☐ |
| 7.12 | Status PENDING → tombol "Adjust PO" | Button visible | ☐ |
| 7.13 | Status PENDING → tombol "Batalkan Order" | Button visible | ☐ |
| 7.14 | Status PO_ISSUED+ → tombol "Print PO" | Button visible | ☐ |
| 7.15 | Status SHIPPED → tombol "Konfirmasi Terima" | Button visible | ☐ |

### Adjust PO (Stokis)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.16 | Klik "Adjust PO" → modal adjust | Items tampil | ☐ |
| 7.17 | Tombol +/- kurangi/tambah qty | Qty berubah | ☐ |
| 7.18 | Field "Alasan Perubahan" | Input tersedia | ☐ |
| 7.19 | Preview total baru vs lama | Kalkulasi real-time | ☐ |
| 7.20 | Submit → order diupdate | Items berubah | ☐ |
| 7.21 | Semua qty = 0 → error | Notifikasi error | ☐ |

### Batalkan Order (Stokis)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.22 | Klik "Batalkan Order" → dialog konfirmasi | Dialog muncul | ☐ |
| 7.23 | OK → order cancelled | Status → CANCELLED | ☐ |

### Order Mitra (`/dashboard/order-mitra`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.24 | Menampilkan orderan dari Mitra | Tabel tampil | ☐ |
| 7.25 | Tombol Cetak PO Mitra | Buka `/po/mitra/[id]` | ☐ |

### Halaman Mitra Saya (`/dashboard/mitra`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.26 | Menampilkan daftar mitra | Tabel tampil | ☐ |
| 7.27 | Hanya mitra yang linked ke stokis ini | Isolasi benar | ☐ |

### Inventory Stokis (`/dashboard/inventory`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 7.28 | Menampilkan stok | Tabel tampil | ☐ |

---

## 8️⃣ Dashboard & Fitur — MITRA

Akun: `mitra1@dfresto.com`

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 8.1 | Dashboard stat cards tampil | Data benar | ☐ |
| 8.2 | Order Barang: Pilih produk & qty | Form berfungsi | ☐ |
| 8.3 | Order Barang: Submit order | Order created, status PENDING | ☐ |
| 8.4 | Riwayat order tampil | Tabel/list tampil | ☐ |
| 8.5 | Konfirmasi penerimaan barang | Status → RECEIVED | ☐ |

---

## 9️⃣ Dashboard & Fitur — DC

Akun: `admin.palembang@dfresto.com`

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 9.1 | Dashboard stat cards tampil | Data area Palembang saja | ☐ |
| 9.2 | Approve PO: Menampilkan PO stokis area-nya | List tampil | ☐ |
| 9.3 | Approve PO: Approve → status PO_ISSUED | Status berubah | ☐ |
| 9.4 | Kelola Stokis (`/dashboard/dc-stokis`) | Tabel stokis area tampil | ☐ |
| 9.5 | Monitoring Order (`/dashboard/dc-orders`) | Order area tampil | ☐ |
| 9.6 | Laporan: Data hanya area DC ini | Isolasi benar | ☐ |

---

## 🔟 Invoice & PO Print

### Halaman Invoice (`/invoice/[id]`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.1 | Akses dengan ID valid | Halaman profesional terbuka | ☐ |
| 10.2 | Akses dengan ID invalid | Error handling | ☐ |
| 10.3 | Badge status (UNPAID/PAID/OVERDUE) | Badge sesuai status | ☐ |
| 10.4 | Detail pembayaran bank (BCA) | Info BCA tampil | ☐ |
| 10.5 | Tombol "Print" | window.print() triggered | ☐ |
| 10.6 | Tombol "Download PDF" | File PDF terdownload | ☐ |

### Halaman PO Stokis (`/po/stokis/[id]`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.7 | Header D'Fresto + info | Logo + alamat tampil | ☐ |
| 10.8 | Tabel items lengkap | SKU, nama, qty, harga, subtotal | ☐ |
| 10.9 | Footer tanda tangan (3 kolom) | Dibuat, Disetujui, Diterima | ☐ |
| 10.10 | Tombol "Print" & "Download PDF" | Berfungsi | ☐ |

### Halaman PO Mitra (`/po/mitra/[id]`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 10.11 | Layout PO Mitra tampil | Format profesional | ☐ |
| 10.12 | Tombol "Print" & "Download PDF" | Berfungsi | ☐ |

---

## 1️⃣1️⃣ Invoice Logic & Jatuh Tempo

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 11.1 | Invoice auto-generated saat Approve PO | Invoice UNPAID dibuat | ☐ |
| 11.2 | Due date = 20 hari dari tanggal terbit | `dueDate` benar | ☐ |
| 11.3 | Invoice > 20 hari belum bayar → OVERDUE | Status auto-update | ☐ |
| 11.4 | Partial payment → paidAmount naik, status tetap UNPAID | Kalkulasi benar | ☐ |
| 11.5 | Full payment → status PAID, paidAt terisi | Auto-update benar | ☐ |
| 11.6 | Delete payment → paidAmount turun, status revert | Undo benar | ☐ |
| 11.7 | Payment melebihi sisa tagihan → Error 400 | Validasi API | ☐ |

---

## 1️⃣2️⃣ Isolasi Data per Role

| # | Test Case | Role | Expected Data | Status |
|---|-----------|------|---------------|--------|
| 12.1 | Orders Stokis | PUSAT | Hanya stokis dcId=null | ☐ |
| 12.2 | Orders Stokis | FINANCE | Hanya stokis dcId=null | ☐ |
| 12.3 | Orders Stokis | FINANCE_DC | Hanya stokis dcId=session.dcId | ☐ |
| 12.4 | Orders Stokis | FINANCE_ALL | Semua stokis dcId!=null | ☐ |
| 12.5 | Orders Stokis | DC | Hanya stokis dcId=userId | ☐ |
| 12.6 | Invoices | PUSAT | Hanya stokis dcId=null | ☐ |
| 12.7 | Invoices | FINANCE_DC | Hanya stokis dcId=session.dcId | ☐ |
| 12.8 | Invoices | FINANCE_ALL | Semua stokis dcId!=null + dropdown DC | ☐ |
| 12.9 | Payments | FINANCE | Hanya stokis dcId=null | ☐ |
| 12.10 | Payments | FINANCE_DC | Hanya stokis dcId=session.dcId | ☐ |
| 12.11 | Reports | Semua role finance | Data sesuai area role | ☐ |
| 12.12 | Dashboard Analytics | PUSAT | Data stokis pusat only | ☐ |

---

## 1️⃣3️⃣ Cross-Role Scenario: Alur Order Lengkap

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Stokis | Buat order baru | Status: PENDING_PUSAT | ☐ |
| 2 | Finance | Lihat outstanding stokis | Banner tagihan tampil | ☐ |
| 3 | Finance | Approve PO | Status: PO_ISSUED, Invoice dibuat | ☐ |
| 4 | Gudang | Lihat PO Masuk | PO muncul di tab PO Aktif | ☐ |
| 5 | Gudang | Proses Pesanan | Status: PROCESSING | ☐ |
| 6 | Gudang | Kirim Pesanan | Status: SHIPPED | ☐ |
| 7 | Stokis | Konfirmasi Terima | Status: RECEIVED | ☐ |
| 8 | Finance | Input Pembayaran penuh | Invoice → PAID | ☐ |

### Alur Adjust PO

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Stokis | Buat order 3 items | Order created | ☐ |
| 2 | Stokis | Adjust: kurangi qty item 1, set item 2 = 0 | 2 items tersisa | ☐ |
| 3 | Finance | Adjust: tambah qty item | Qty naik | ☐ |
| 4 | Finance | Approve PO | PO_ISSUED | ☐ |

### Alur Partial Payment

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Finance | Bayar 50% dari invoice | Status tetap UNPAID, paidAmount naik | ☐ |
| 2 | Finance | Bayar sisa 50% | Invoice → PAID | ☐ |

---

## 1️⃣4️⃣ Responsif Mobile

| # | Halaman | Item Cek | Status |
|---|---------|----------|--------|
| 14.1 | Dashboard (semua role) | Stat cards stack mobile | ☐ |
| 14.2 | Pembayaran | Tabel scroll horizontal | ☐ |
| 14.3 | Invoices | Kartu 2+1 grid, tabel scroll | ☐ |
| 14.4 | Reports — Overview | Kartu tidak terpotong | ☐ |
| 14.5 | Reports — Performa | Tabel scroll horizontal | ☐ |
| 14.6 | Reports — Tagihan | Kartu responsif | ☐ |
| 14.7 | Sidebar | Collapse/toggle di mobile | ☐ |

---

## 15️⃣ Gudang Ayam (Login: `gudang.ayam@dfresto.com`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 15.1 | Login Gudang Ayam | Dashboard GUDANG terbuka, sidebar tampil menu Gudang Ayam | ☐ |
| 15.2 | Sidebar menu | Tampil: Dashboard, Gudang Ayam, Inventory, PO Masuk | ☐ |
| 15.3 | Klik menu Gudang Ayam | Halaman `/dashboard/gudang-ayam` terbuka, tab Masuk Ayam aktif | ☐ |
| 15.4 | Tab Masuk → Tambah Masuk | Form muncul: Tanggal, SJ, Supplier, Ekor, Kg, Catatan | ☐ |
| 15.5 | Submit form Masuk | Data tersimpan, muncul di tabel, form tertutup | ☐ |
| 15.6 | Tabel Masuk Ayam | Kolom: No, Tanggal, SJ, Supplier, Ekor, Kg, Catatan, Aksi | ☐ |
| 15.7 | Search di tabel | Filter tabel berdasarkan supplier/SJ | ☐ |
| 15.8 | Tab Keluar → Tambah Keluar | Form: Tanggal, Ekor, Kg, Barang Keluar, Catatan | ☐ |
| 15.9 | Submit form Keluar | Data tersimpan, muncul di tabel | ☐ |
| 15.10 | Tab Inventory — Cards | 4 card: Total Masuk Ekor, Total Masuk Kg, Total Keluar Ekor, Stok Saat Ini Ekor | ☐ |
| 15.11 | Tab Inventory — Tabel | Ringkasan: Total Masuk, Total Keluar, Stok Saat Ini (Ekor + Kg) | ☐ |
| 15.12 | Kalkulasi Stok Ekor | Stok = Total Masuk Ekor − Total Keluar Ekor | ☐ |
| 15.13 | Kalkulasi Stok Kg | Stok Kg = Total Masuk Kg − Total Keluar Kg (bukan copy Masuk) | ☐ |
| 15.14 | Hapus transaksi | Klik Hapus → confirm → data hilang dari tabel | ☐ |
| 15.15 | Format angka Kg | Kg tampil angka formatted, bukan string panjang | ☐ |

---

## 16️⃣ Gudang Kering (Login: `gudang.kering@dfresto.com`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 16.1 | Login Gudang Kering | Sidebar tampil menu Gudang Kering | ☐ |
| 16.2 | Halaman Gudang Kering | `/dashboard/gudang-kering` terbuka, theme amber | ☐ |
| 16.3 | Tab Barang Masuk → Form | Tanggal, SJ, Supplier, Nama Produk, Kemasan, Qty, Satuan, Catatan | ☐ |
| 16.4 | Pilihan satuan | Dropdown: Kg, Pcs, Liter, Karton, Bal, Sak | ☐ |
| 16.5 | Submit Masuk | Data tersimpan + tabel ter-update | ☐ |
| 16.6 | Tab Barang Keluar → Form | Tanggal, Nama Produk, Qty, Satuan, Keterangan, Catatan | ☐ |
| 16.7 | Submit Keluar | Data tersimpan | ☐ |
| 16.8 | Tab Inventory — Cards | 3 card: Total Masuk, Total Keluar, Stok Saat Ini | ☐ |
| 16.9 | Tab Inventory — Stok per Produk | Tabel grouped by productName: Masuk, Keluar, Stok, Satuan | ☐ |
| 16.10 | Hapus transaksi | Hapus berfungsi, data hilang | ☐ |

---

## 17️⃣ Gudang Tepung (Login: `gudang.tepung@dfresto.com`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 17.1 | Login Gudang Tepung | Sidebar tampil menu Gudang Tepung | ☐ |
| 17.2 | Halaman Gudang Tepung | `/dashboard/gudang-tepung` terbuka, theme indigo, 4 tab | ☐ |
| 17.3 | Tab Bahan Masuk → Form | Tanggal, SJ, Supplier, Nama Bahan, Kategori, Qty, Satuan | ☐ |
| 17.4 | Kategori Masuk | Dropdown: Bahan Baku Tepung, Tepung Bumbu | ☐ |
| 17.5 | Submit Masuk | Data tersimpan | ☐ |
| 17.6 | Tab Barang Keluar → Form | Tanggal, Nama Produk, Qty, Satuan, Keterangan, Catatan | ☐ |
| 17.7 | Tab Produksi → Form | Tanggal, Nama Produk Hasil, Kategori, Qty, Satuan, Catatan | ☐ |
| 17.8 | Submit Produksi | Data tersimpan dengan type=PRODUKSI | ☐ |
| 17.9 | Tab Inventory — Cards | 4 card: Total Masuk, Total Keluar, Total Produksi, Stok | ☐ |
| 17.10 | Tab Inventory — Stok per Produk | Kolom: Nama, Kategori, Masuk, Produksi, Keluar, Stok, Satuan | ☐ |
| 17.11 | Kalkulasi Stok | Stok = Masuk + Produksi − Keluar | ☐ |
| 17.12 | Hapus transaksi | Hapus berfungsi | ☐ |

---

## 18️⃣ Gudang Bumbu (Login: `gudang.bumbu@dfresto.com`)

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 18.1 | Login Gudang Bumbu | Sidebar tampil menu Gudang Bumbu | ☐ |
| 18.2 | Halaman Gudang Bumbu | `/dashboard/gudang-bumbu` terbuka, theme emerald, 4 tab | ☐ |
| 18.3 | Tab Bahan Masuk → Form | Tanggal, SJ, Supplier, Nama Bahan, Kategori, Qty, Satuan | ☐ |
| 18.4 | Kategori Masuk | Dropdown: Bahan Baku Bumbu, Bumbu Jadi | ☐ |
| 18.5 | Satuan Bumbu | Dropdown: Kg, Liter, Pcs, Botol | ☐ |
| 18.6 | Submit Masuk | Data tersimpan | ☐ |
| 18.7 | Tab Barang Keluar → Form | Tanggal, Nama Produk, Qty, Satuan, Keterangan, Catatan | ☐ |
| 18.8 | Tab Produksi → Form | Tanggal, Nama Bumbu Hasil, Qty, Satuan, Catatan | ☐ |
| 18.9 | Submit Produksi Bumbu | Data tersimpan | ☐ |
| 18.10 | Tab Inventory — Cards | 4 card: Masuk, Keluar, Produksi, Stok | ☐ |
| 18.11 | Tab Inventory — Stok per Produk | Tabel grouped per produk dengan kategori label | ☐ |
| 18.12 | Hapus transaksi | Hapus berfungsi | ☐ |

---

## 19️⃣ Gudang Cross-check & Isolasi Data

| # | Test Case | Expected Result | Status |
|---|-----------|-----------------|--------|
| 19.1 | Isolasi data: Gudang Ayam | Login `gudang.ayam` → hanya lihat transaksi Gudang Ayam, bukan Kering/Tepung/Bumbu | ☐ |
| 19.2 | Isolasi data: Gudang Kering | Login `gudang.kering` → hanya lihat transaksi Gudang Kering | ☐ |
| 19.3 | Isolasi data: Gudang Tepung | Login `gudang.tepung` → hanya lihat transaksi Gudang Tepung | ☐ |
| 19.4 | Isolasi data: Gudang Bumbu | Login `gudang.bumbu` → hanya lihat transaksi Gudang Bumbu | ☐ |
| 19.5 | Sidebar: Gudang Ayam only | `gudang.ayam` login → TIDAK ada menu Gudang Kering/Tepung/Bumbu | ☐ |
| 19.6 | Sidebar: Gudang Kering only | `gudang.kering` login → TIDAK ada menu Gudang Ayam/Tepung/Bumbu | ☐ |
| 19.7 | URL protection: Gudang Ayam | `gudang.kering` akses `/dashboard/gudang-ayam` → data tetap kosong (API scoped by gudangId) | ☐ |
| 19.8 | Delete ownership | `gudang.ayam` tidak bisa hapus transaksi milik gudang lain | ☐ |

---

## 🚨 Known Limitations / TODOs

| Item | Description | Priority |
|------|-------------|----------|
| Upload Bukti Transfer | Placeholder, belum implementasi file upload | Medium |
| Email Notification | Notifikasi email untuk payment/PO belum aktif | Low |
| Auto OVERDUE Cron | `checkOverdueInvoices()` perlu dijadwalkan (cron job) | Medium |
| Province-based filtering | Fitur Fase 5 belum dimulai | Low |

---

## 📝 Testing Notes

```
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
```

---

## ✅ Sign Off

| Item | Signature | Date |
|------|-----------|------|
| Tested By | _________________ | ____/____/2026 |
| Reviewed By | _________________ | ____/____/2026 |
| Approved By | _________________ | ____/____/2026 |

---

**Total Test Cases**: 252  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___
