# Testing Checklist - Phase 5 Implementation

**Tanggal**: 4 Februari 2026  
**Version**: 1.0  
**Tested By**: _________________

---

## 🔴 Pre-requisite (WAJIB Dilakukan Sebelum Testing)

| # | Item | Command | Status |
|---|------|---------|--------|
| 1 | Apply Prisma Schema | `npx prisma db push` | ☐ |
| 2 | Regenerate Prisma Client | `npx prisma generate` | ☐ |
| 3 | Restart Dev Server | `npm run dev` | ☐ |

---

## 1️⃣ Component 10: Finance Enhancements

### API: `/api/stokis/[id]/outstanding`

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.1 | GET outstanding untuk stokis valid | Return data outstanding | ☐ | |
| 1.2 | Verify hitung invoice UNPAID | Count dan amount benar | ☐ | |
| 1.3 | Verify hitung invoice OVERDUE | Count dan amount benar | ☐ | |
| 1.4 | Total outstanding = unpaid + overdue | Kalkulasi benar | ☐ | |
| 1.5 | Stokis tanpa tagihan | `hasOutstanding: false` | ☐ | |

### Page: `/dashboard/approve-po` (Finance Role)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.6 | Akses halaman dengan role Finance | Halaman terbuka | ☐ | |
| 1.7 | Menampilkan PO status `PENDING_FINANCE` | List PO ditampilkan | ☐ | |
| 1.8 | Klik PO → modal terbuka | Modal detail muncul | ☐ | |
| 1.9 | Modal fetch outstanding data | Banner status muncul | ☐ | |
| 1.10 | Stokis dengan tagihan → banner merah | "Stokis memiliki tagihan..." | ☐ | |
| 1.11 | Stokis tanpa tagihan → banner hijau | "Tidak ada tagihan tertunggak" | ☐ | |
| 1.12 | Tombol "Adjust PO" muncul jika ada outstanding | Button visible | ☐ | |
| 1.13 | Tombol "Print PO Preview" berfungsi | Buka tab baru `/po/stokis/[id]` | ☐ | |
| 1.14 | Klik "Approve & Issue PO" | Status → `PO_ISSUED` | ☐ | |
| 1.15 | Klik "Tolak PO" | Status → `CANCELLED` | ☐ | |

### Adjust PO Modal (Finance)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 1.16 | Klik "Adjust PO" → modal terbuka | Modal dengan items muncul | ☐ | |
| 1.17 | Tombol `-` kurangi quantity | Qty berkurang 1 | ☐ | |
| 1.18 | Tombol `+` tambah quantity | Qty bertambah 1 | ☐ | |
| 1.19 | Qty bisa dikurangi hingga 0 | Item akan dihapus saat submit | ☐ | |
| 1.20 | Preview total baru ditampilkan | Kalkulasi real-time | ☐ | |
| 1.21 | Submit adjustment | Order items diperbarui | ☐ | |
| 1.22 | Setelah adjust, status tetap `PENDING_FINANCE` | Status tidak berubah | ☐ | |

---

## 2️⃣ Component 11: Pembayaran (Payment Input)

### API: `/api/payments`

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.1 | GET - List semua payments | Return array payments | ☐ | |
| 2.2 | GET dengan filter `?invoiceId=xxx` | Filter benar | ☐ | |
| 2.3 | GET dengan filter `?stokisId=xxx` | Filter benar | ☐ | |
| 2.4 | POST - Buat payment baru | Payment created | ☐ | |
| 2.5 | POST - Amount melebihi sisa tagihan | Error 400 | ☐ | |
| 2.6 | POST - Payment lunas | Invoice → `PAID` | ☐ | |
| 2.7 | POST - Partial payment | Invoice tetap `UNPAID/OVERDUE` | ☐ | |
| 2.8 | POST - Invoice sudah PAID | Error 400 | ☐ | |

### API: `/api/payments/[id]`

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.9 | GET - Detail payment | Return payment data | ☐ | |
| 2.10 | DELETE - Hapus payment | Payment deleted | ☐ | |
| 2.11 | DELETE - Invoice paidAmount dikurangi | Kalkulasi benar | ☐ | |
| 2.12 | DELETE - Invoice status revert | PAID → UNPAID/OVERDUE | ☐ | |

### Page: `/dashboard/pembayaran` (Finance Role)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 2.13 | Akses halaman dengan role Finance | Halaman terbuka | ☐ | |
| 2.14 | Menampilkan invoice UNPAID | List ditampilkan | ☐ | |
| 2.15 | Menampilkan invoice OVERDUE | List ditampilkan | ☐ | |
| 2.16 | Filter berdasarkan status | Filter berfungsi | ☐ | |
| 2.17 | Search invoice/stokis | Search berfungsi | ☐ | |
| 2.18 | Summary card: Total Unpaid | Nilai benar | ☐ | |
| 2.19 | Summary card: Total Overdue | Nilai benar | ☐ | |
| 2.20 | Klik invoice → modal payment | Modal terbuka | ☐ | |
| 2.21 | Amount default = sisa tagihan | Pre-filled benar | ☐ | |
| 2.22 | Input amount < sisa | Partial payment | ☐ | |
| 2.23 | Input amount = sisa | Full payment | ☐ | |
| 2.24 | Pilih metode pembayaran | Dropdown berfungsi | ☐ | |
| 2.25 | Submit payment | Invoice terupdate | ☐ | |
| 2.26 | Data refresh setelah submit | List terupdate | ☐ | |

---

## 3️⃣ Component 12: Adjust PO - Stokis

### Page: `/dashboard/history-pusat` (Stokis Role)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.1 | Akses halaman dengan role Stokis | Halaman terbuka | ☐ | |
| 3.2 | Menampilkan riwayat order ke Pusat | List ditampilkan | ☐ | |
| 3.3 | Status badge `PENDING_PUSAT` | Warna kuning | ☐ | |
| 3.4 | Status badge `PENDING_FINANCE` | Warna orange | ☐ | |
| 3.5 | Status badge `PO_ISSUED` | Warna ungu | ☐ | |
| 3.6 | Status badge `SHIPPED` | Warna cyan | ☐ | |
| 3.7 | Status badge `RECEIVED` | Warna hijau | ☐ | |
| 3.8 | Klik order → modal detail | Modal terbuka | ☐ | |
| 3.9 | Status PENDING → tombol "Adjust PO" muncul | Button visible | ☐ | |
| 3.10 | Status PENDING → tombol "Batalkan Order" muncul | Button visible | ☐ | |
| 3.11 | Status PO_ISSUED+ → tombol "Print PO" muncul | Button visible | ☐ | |
| 3.12 | Status SHIPPED → tombol "Konfirmasi Terima" muncul | Button visible | ☐ | |

### Adjust PO Modal (Stokis)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.13 | Klik "Adjust PO" → modal terbuka | Modal dengan items | ☐ | |
| 3.14 | Tombol `-` kurangi quantity | Qty berkurang | ☐ | |
| 3.15 | Tombol `+` tambah quantity | Qty bertambah | ☐ | |
| 3.16 | Field "Alasan Perubahan" tersedia | Input ada | ☐ | |
| 3.17 | Preview total baru vs lama | Kalkulasi ditampilkan | ☐ | |
| 3.18 | Submit → order diupdate | Items berubah | ☐ | |
| 3.19 | Semua qty = 0 → error | Notifikasi error | ☐ | |

### Cancel Order (Stokis)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 3.20 | Klik "Batalkan Order" | Dialog konfirmasi | ☐ | |
| 3.21 | Klik OK → order dibatalkan | Status → CANCELLED | ☐ | |
| 3.22 | Order hilang dari list pending | Refresh list | ☐ | |

---

## 4️⃣ Component 13: PO PDF Export

### Page: `/po/stokis/[id]` (Print Preview)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 4.1 | Akses dengan ID valid | Halaman terbuka | ☐ | |
| 4.2 | Akses dengan ID invalid | Error "PO tidak ditemukan" | ☐ | |
| 4.3 | Header D'Fresto ditampilkan | Logo + nama | ☐ | |
| 4.4 | Info DARI (Stokis) ditampilkan | Nama, alamat | ☐ | |
| 4.5 | Info KEPADA (Pusat) ditampilkan | Nama, alamat | ☐ | |
| 4.6 | Order number ditampilkan | Nomor PO | ☐ | |
| 4.7 | Tanggal order ditampilkan | Format Indonesia | ☐ | |
| 4.8 | Tabel items lengkap | SKU, nama, qty, harga, subtotal | ☐ | |
| 4.9 | Total amount ditampilkan | Kalkulasi benar | ☐ | |
| 4.10 | Footer tanda tangan (3 kolom) | Dibuat, Disetujui, Diterima | ☐ | |
| 4.11 | Tombol "Print" berfungsi | window.print() triggered | ☐ | |
| 4.12 | Tombol "Download PDF" berfungsi | File PDF terdownload | ☐ | |
| 4.13 | Tombol "Kembali" berfungsi | Navigate back | ☐ | |

### Print PO dari Berbagai Halaman

| # | Halaman | Role | Status Order | Expected Result | Status |
|---|---------|------|--------------|-----------------|--------|
| 4.14 | `/dashboard/history-pusat` | Stokis | PO_ISSUED | Buka `/po/stokis/[id]` | ☐ |
| 4.15 | `/dashboard/history-pusat` | Stokis | PROCESSING | Buka `/po/stokis/[id]` | ☐ |
| 4.16 | `/dashboard/history-pusat` | Stokis | SHIPPED | Buka `/po/stokis/[id]` | ☐ |
| 4.17 | `/dashboard/history-pusat` | Stokis | RECEIVED | Buka `/po/stokis/[id]` | ☐ |
| 4.18 | `/dashboard/approve-po` | Finance | PENDING_FINANCE | Buka `/po/stokis/[id]` | ☐ |
| 4.19 | `/dashboard/po-masuk` | Gudang | PO_ISSUED | Buka `/po/stokis/[id]` | ☐ |
| 4.20 | `/dashboard/po-masuk` | Gudang | PROCESSING | Buka `/po/stokis/[id]` | ☐ |

---

## 5️⃣ Component 5: Finance Dashboard

### Page: `/dashboard/laporan-harga` (Finance Role)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.1 | Akses halaman dengan role Finance | Halaman terbuka | ☐ | |
| 5.2 | Menampilkan summary stokis | Tabel ditampilkan | ☐ | |
| 5.3 | Filter by Provinsi | Data terfilter | ☐ | |
| 5.4 | Filter by Stokis | Data terfilter | ☐ | |
| 5.5 | Search stokis | Hasil pencarian muncul | ☐ | |
| 5.6 | Summary: Total Stokis | Nilai benar | ☐ | |
| 5.7 | Summary: Total Produk Custom | Nilai benar | ☐ | |
| 5.8 | Summary: Total Margin | Kalkulasi benar | ☐ | |
| 5.9 | Margin negatif = warna merah | Styling benar | ☐ | |
| 5.10 | Margin positif = warna hijau | Styling benar | ☐ | |
| 5.11 | Tombol Export XLS | Download file | ☐ | |

### Sidebar Menu (Finance)

| # | Test Case | Expected Result | Status | Notes |
|---|-----------|-----------------|--------|-------|
| 5.12 | Menu "Laporan Harga" visible | Icon + label | ☐ | |
| 5.13 | Klik navigasi ke halaman | Navigate berhasil | ☐ | |

---

## 6️⃣ Cross-Role Testing

### Scenario: Order Flow Lengkap

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Stokis | Buat order baru | Order status: PENDING_PUSAT | ☐ |
| 2 | Pusat | Approve order | Order status: PENDING_FINANCE | ☐ |
| 3 | Finance | Lihat outstanding stokis | Banner status muncul | ☐ |
| 4 | Finance | Print PO Preview | Halaman preview terbuka | ☐ |
| 5 | Finance | Approve PO | Order status: PO_ISSUED | ☐ |
| 6 | Gudang | Lihat PO Masuk | PO muncul di list | ☐ |
| 7 | Gudang | Print PO (Picking List) | Halaman preview terbuka | ☐ |
| 8 | Gudang | Proses Pesanan | Order status: PROCESSING | ☐ |
| 9 | Gudang | Kirim Pesanan | Order status: SHIPPED | ☐ |
| 10 | Stokis | Konfirmasi Terima | Order status: RECEIVED | ☐ |
| 11 | Finance | Input Pembayaran | Invoice → PAID | ☐ |

### Scenario: Adjust PO by Stokis

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Stokis | Buat order dengan 3 items | Order created | ☐ |
| 2 | Stokis | Klik Adjust PO | Modal terbuka | ☐ |
| 3 | Stokis | Kurangi qty item 1 | Qty berkurang | ☐ |
| 4 | Stokis | Set qty item 2 = 0 | Item akan dihapus | ☐ |
| 5 | Stokis | Submit adjustment | Order diupdate, 2 items tersisa | ☐ |

### Scenario: Adjust PO by Finance

| Step | Actor | Action | Expected Result | Status |
|------|-------|--------|-----------------|--------|
| 1 | Finance | Buka PO dengan outstanding | Banner merah muncul | ☐ |
| 2 | Finance | Klik Adjust PO | Modal terbuka | ☐ |
| 3 | Finance | Adjust items | Qty berubah | ☐ |
| 4 | Finance | Submit adjustment | Order diupdate | ☐ |
| 5 | Finance | Approve PO | Status → PO_ISSUED | ☐ |

---

## 🚨 Known Limitations / TODOs

| Item | Description | Priority |
|------|-------------|----------|
| Upload Bukti Transfer | Placeholder, belum implementasi file upload | Medium |
| Email Notification | Notifikasi email untuk payment/PO belum ada | Low |
| Export Laporan Harga | Perlu verifikasi API export | Medium |

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

**Total Test Cases**: 76  
**Passed**: ___  
**Failed**: ___  
**Blocked**: ___
