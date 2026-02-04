# Implementation Plan - Phase 5: Stokis & Lokasi Management

## Overview

Pengembangan lanjutan D'Fresto sistem dengan fokus pada:
1. **Mitra Restriction per Stokis** - Pembatasan mitra yang bisa order di stokis tertentu
2. **Stokis per Provinsi** - Pengelompokan stokis berdasarkan provinsi (WAJIB)
3. **Location-based Filtering** - Tampilan stokis/mitra berdasarkan area lokasi
4. **Custom Product Pricing** - Harga produk berbeda per stokis (diset oleh Pusat)
5. **Province Coverage Indicator** - Keterangan provinsi yang belum ada stokis/mitra

---

## Business Rules (Berdasarkan Feedback User)

| Rule | Keterangan |
|------|------------|
| **Relasi Mitra-Stokis** | 1:1 - Satu mitra hanya bisa terdaftar di satu stokis |
| **Approval Mitra** | Stokis mengajukan → Pusat yang approve |
| **Harga Custom** | Pusat yang set harga custom untuk setiap stokis |
| **Province Stokis** | Wajib diisi untuk semua Stokis |

---

## User Review Required

> [!IMPORTANT]
> **Perubahan Approval Flow:**
> - Stokis mengajukan mitra → Pusat approve/reject
> - Mitra tidak bisa order sampai diapprove Pusat
> - Harga custom diset oleh Pusat, bukan Stokis

> [!WARNING]
> **Migrasi Data Existing:**
> - Mitra dengan `stokisId` existing → otomatis ACTIVE
> - Stokis existing wajib update province melalui Pusat

---

## 1. Database Schema Changes

### New Enums

```prisma
// Provinsi di Indonesia
enum Province {
  ACEH
  SUMATERA_UTARA
  SUMATERA_BARAT
  RIAU
  KEPULAUAN_RIAU
  JAMBI
  SUMATERA_SELATAN
  BANGKA_BELITUNG
  BENGKULU
  LAMPUNG
  DKI_JAKARTA
  BANTEN
  JAWA_BARAT
  JAWA_TENGAH
  DI_YOGYAKARTA
  JAWA_TIMUR
  BALI
  NTB
  NTT
  KALIMANTAN_BARAT
  KALIMANTAN_TENGAH
  KALIMANTAN_SELATAN
  KALIMANTAN_TIMUR
  KALIMANTAN_UTARA
  SULAWESI_UTARA
  GORONTALO
  SULAWESI_TENGAH
  SULAWESI_SELATAN
  SULAWESI_BARAT
  SULAWESI_TENGGARA
  MALUKU
  MALUKU_UTARA
  PAPUA
  PAPUA_BARAT
}

// Status pendaftaran Mitra di Stokis
enum MitraRegistrationStatus {
  PENDING    // Diajukan Stokis, menunggu approval Pusat
  APPROVED   // Disetujui Pusat
  REJECTED   // Ditolak Pusat
  INACTIVE   // Dinonaktifkan
}
```

### Modified User Model

```prisma
model User {
  // ... existing fields ...
  
  // NEW: Lokasi fields (WAJIB untuk STOKIS)
  province     Province?   // Provinsi
  city         String?     // Kota/Kabupaten
  district     String?     // Kecamatan
  postalCode   String?     // Kode Pos
  
  // EXISTING: stokisId tetap digunakan untuk mitra
  // stokisId sudah ada - tidak perlu model baru
  
  // NEW: Status pendaftaran mitra
  mitraStatus  MitraRegistrationStatus?  // Hanya untuk MITRA
  mitraApprovedAt DateTime?              // Kapan diapprove Pusat
  mitraApprovedBy String?                // User ID yang approve
}
```

### New Model: StokisProductPrice

```prisma
// Harga custom produk per Stokis (diset oleh PUSAT)
model StokisProductPrice {
  id          String   @id @default(cuid())
  stokisId    String
  stokis      User     @relation(fields: [stokisId], references: [id])
  productId   String
  product     Product  @relation(fields: [productId], references: [id])
  
  customPrice Decimal  @db.Decimal(12, 2)  // Harga khusus untuk stokis ini
  isActive    Boolean  @default(true)
  notes       String?                      // Catatan dari Pusat
  
  // Audit trail
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  createdBy   String?                      // User ID Pusat yang set harga
  
  @@unique([stokisId, productId])
  @@index([stokisId])
}
```

---

## 2. Flow Diagram

### Flow Pendaftaran Mitra

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   STOKIS    │───▶│   PUSAT     │───▶│   MITRA     │
│ Ajukan mitra│    │ Approve/Rej │    │ Bisa Order  │
└─────────────┘    └─────────────┘    └─────────────┘
     │                   │                   │
     ▼                   ▼                   ▼
  PENDING            APPROVED             ACTIVE
  (menunggu)         (disetujui)        (bisa order)
```

### Flow Pengaturan Harga

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   PUSAT     │───▶│  DATABASE   │───▶│   MITRA     │
│ Set Harga   │    │ StokisProd  │    │ Lihat Harga │
│ per Stokis  │    │ Price       │    │ Custom      │
└─────────────┘    └─────────────┘    └─────────────┘
```

---

## 3. Proposed Changes

### Component 1: Database & Schema

#### [MODIFY] [schema.prisma](file:///f:/CODING/SISTEM/dfresto/prisma/schema.prisma)
- Tambah enum `Province` dan `MitraRegistrationStatus`
- Tambah field lokasi pada model `User` (province, city, district, postalCode)
- Tambah field `mitraStatus`, `mitraApprovedAt`, `mitraApprovedBy` pada User
- Tambah model `StokisProductPrice`
- Update model `Product` dengan relasi ke `StokisProductPrice`

---

### Component 2: API Endpoints

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/mitra-registration/route.ts)
**Untuk Stokis: Pengajuan Mitra**
```
GET    /api/mitra-registration              - List pengajuan mitra (Stokis view)
POST   /api/mitra-registration              - Stokis ajukan mitra baru
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/mitra-registration/[id]/route.ts)
**Untuk Pusat: Approval Mitra**
```
GET    /api/mitra-registration/[id]         - Detail pengajuan
PATCH  /api/mitra-registration/[id]         - Pusat: Approve/Reject
DELETE /api/mitra-registration/[id]         - Hapus/Batalkan pengajuan
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/mitra-registration/pending/route.ts)
**Untuk Pusat: List Pending Approval**
```
GET    /api/mitra-registration/pending      - List semua pengajuan PENDING (untuk Pusat)
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/stokis-prices/route.ts)
**Untuk Pusat: Kelola Harga per Stokis**
```
GET    /api/stokis-prices                   - List harga custom semua stokis
POST   /api/stokis-prices                   - Pusat set harga untuk stokis
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/stokis-prices/[id]/route.ts)
```
PATCH  /api/stokis-prices/[id]              - Update harga
DELETE /api/stokis-prices/[id]              - Hapus (kembali ke harga pusat)
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/stokis-prices/by-stokis/[stokisId]/route.ts)
```
GET    /api/stokis-prices/by-stokis/[stokisId]  - Harga custom untuk stokis tertentu
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/locations/provinces/route.ts)
```
GET    /api/locations/provinces             - List semua provinsi
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/stokis/by-province/route.ts)
```
GET    /api/stokis/by-province?province=JAWA_BARAT  - List stokis per provinsi
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/province-coverage/route.ts)
**API Province Coverage Indicator**
```
GET    /api/province-coverage               - Statistik coverage per provinsi
```

Response:
```json
{
  "total_provinces": 34,
  "covered_provinces": 12,
  "uncovered_provinces": 22,
  "coverage": [
    {
      "province": "DKI_JAKARTA",
      "province_label": "DKI Jakarta",
      "stokis_count": 3,
      "mitra_count": 25,
      "status": "ACTIVE"
    },
    {
      "province": "ACEH",
      "province_label": "Aceh",
      "stokis_count": 0,
      "mitra_count": 0,
      "status": "EMPTY"
    }
  ]
}
```

#### [MODIFY] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/users/route.ts)
- Tambah field lokasi pada user create/update
- Validasi: province WAJIB untuk role STOKIS
- Filter users by province

#### [MODIFY] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/orders/mitra/route.ts)
- Validasi: Mitra hanya bisa order jika `mitraStatus === APPROVED`
- Gunakan harga dari `StokisProductPrice` jika ada, fallback ke harga `Product`

---

### Component 3: Dashboard Pages - Stokis

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/kelola-mitra/page.tsx)
**Halaman "Kelola Mitra" untuk Stokis**

Features:
- Tabel daftar mitra yang diajukan/terdaftar
- Status badge (PENDING/APPROVED/REJECTED/INACTIVE)
- Tombol "Ajukan Mitra Baru" - search user MITRA yang belum punya stokis
- **Tidak bisa approve** - hanya view dan ajukan
- Filter by status
- Search by name/email

```
┌──────────────────────────────────────────────────────────────┐
│  Kelola Mitra                         [+ Ajukan Mitra Baru]  │
├──────────────────────────────────────────────────────────────┤
│  ℹ️ Pengajuan mitra harus disetujui oleh Pusat              │
├──────────────────────────────────────────────────────────────┤
│  [Filter: Semua ▼]  [Search: ____________]                   │
├──────────────────────────────────────────────────────────────┤
│  Name          Email           Status      Tanggal    Action │
│  Mitra Reza    reza@...        ✓ Approved  01/02/26   [View] │
│  Mitra Andi    andi@...        ⏳ Pending   04/02/26   [Batal]│
│  Mitra Dewi    dewi@...        ✗ Rejected  03/02/26   [View] │
└──────────────────────────────────────────────────────────────┘
```

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/harga-stokis/page.tsx)
**Halaman "Lihat Harga" untuk Stokis (VIEW ONLY)**

Features:
- Tabel produk dengan harga pusat vs harga khusus untuk stokis ini
- **Read-only** - stokis tidak bisa edit, hanya lihat
- Filter by gudang

```
┌──────────────────────────────────────────────────────────────┐
│  Harga Produk untuk Anda                                     │
├──────────────────────────────────────────────────────────────┤
│  ℹ️ Harga di bawah adalah harga khusus yang ditetapkan Pusat │
├──────────────────────────────────────────────────────────────┤
│  Produk          SKU       Harga Pusat   Harga Anda          │
│  Ayam Fillet    AYM-001    Rp 45.000     Rp 43.000 ✓         │
│  Ayam Paha      AYM-002    Rp 35.000     Rp 35.000 (standar) │
│  Bumbu Marinasi BUM-001    Rp 25.000     Rp 23.000 ✓         │
└──────────────────────────────────────────────────────────────┘
```

---

### Component 4: Dashboard Pages - Pusat

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/approve-mitra/page.tsx)
**Halaman "Approval Mitra" untuk Pusat**

Features:
- List pengajuan mitra PENDING dari semua stokis
- Info stokis yang mengajukan
- Info mitra yang diajukan
- Tombol Approve / Reject dengan alasan
- History approval

```
┌──────────────────────────────────────────────────────────────┐
│  Approval Pendaftaran Mitra                                  │
├──────────────────────────────────────────────────────────────┤
│  [Filter: Pending ▼]  [Search: ____________]                 │
├──────────────────────────────────────────────────────────────┤
│  Mitra         Stokis              Provinsi    Tgl     Action│
│  Mitra Andi    Stokis Jakarta      DKI Jakarta 04/02   [✓][✗]│
│  Mitra Budi    Stokis Bandung      Jawa Barat  04/02   [✓][✗]│
│  Mitra Cici    Stokis Surabaya     Jawa Timur  03/02   [✓][✗]│
└──────────────────────────────────────────────────────────────┘
```

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/harga-stokis/page.tsx)
**Halaman "Kelola Harga Stokis" untuk Pusat**

Features:
- Pilih stokis dari dropdown
- Set harga custom per produk untuk stokis terpilih
- Bulk update harga
- Copy harga dari stokis lain
- History perubahan harga

```
┌──────────────────────────────────────────────────────────────┐
│  Kelola Harga per Stokis                                     │
├──────────────────────────────────────────────────────────────┤
│  Pilih Stokis: [Stokis Jakarta Pusat ▼]     [Copy dari: ▼]   │
├──────────────────────────────────────────────────────────────┤
│  Produk          SKU       Harga Pusat   Harga Custom   Act  │
│  Ayam Fillet    AYM-001    Rp 45.000     [Rp 43.000]    ✓    │
│  Ayam Paha      AYM-002    Rp 35.000     [         ]    -    │
│  Bumbu Marinasi BUM-001    Rp 25.000     [Rp 23.000]    ✓    │
├──────────────────────────────────────────────────────────────┤
│                               [Reset Semua] [Simpan Perubahan]│
└──────────────────────────────────────────────────────────────┘
```

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/users/page.tsx)
- Tambah kolom Province pada tabel users
- Filter by province
- Form edit user dengan field lokasi
- Validasi: province WAJIB jika role = STOKIS

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/province-coverage/page.tsx)
**Halaman "Coverage Provinsi" untuk Pusat**

Features:
- Tabel semua 34 provinsi Indonesia
- Kolom: Provinsi, Jumlah Stokis, Jumlah Mitra, Status
- Status badge: 
  - 🟢 ACTIVE (ada stokis & mitra)
  - 🟡 PARTIAL (ada stokis, belum ada mitra)
  - 🔴 EMPTY (belum ada stokis)
- Klik provinsi untuk lihat detail stokis/mitra di provinsi tersebut
- Export ke Excel
- Summary stats di atas tabel

```
┌──────────────────────────────────────────────────────────────┐
│  Coverage Provinsi                               [Export XLS]│
├──────────────────────────────────────────────────────────────┤
│  📊 Total: 34 | ✓ Active: 12 | ⚠ Partial: 5 | ✗ Empty: 17   │
├──────────────────────────────────────────────────────────────┤
│  [Filter: Semua ▼]  [Search: ____________]                   │
├──────────────────────────────────────────────────────────────┤
│  Provinsi          Stokis   Mitra    Status                  │
│  DKI Jakarta       3        25       🟢 Active               │
│  Jawa Barat        5        42       🟢 Active               │
│  Jawa Tengah       2        0        🟡 Partial              │
│  Aceh              0        0        🔴 Empty                │
│  Sumatera Utara    0        0        🔴 Empty                │
│  ...                                                         │
└──────────────────────────────────────────────────────────────┘
```

---

### Component 5: Dashboard Pages - Finance

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/laporan-harga/page.tsx)
**Halaman "Laporan Harga" untuk Finance (VIEW ONLY)**

Features:
- View semua harga custom per stokis
- Laporan margin (harga pusat - harga stokis)
- Filter by provinsi, stokis
- Export ke Excel

```
┌──────────────────────────────────────────────────────────────┐
│  Laporan Harga per Stokis                        [Export XLS]│
├──────────────────────────────────────────────────────────────┤
│  [Provinsi: Semua ▼]  [Stokis: Semua ▼]                      │
├──────────────────────────────────────────────────────────────┤
│  Stokis           Provinsi     Produk Custom   Total Margin  │
│  Stokis Jakarta   DKI Jakarta  15 produk       -Rp 2.500.000 │
│  Stokis Bandung   Jawa Barat   8 produk        -Rp 1.200.000 │
│  Stokis Surabaya  Jawa Timur   12 produk       -Rp 1.800.000 │
└──────────────────────────────────────────────────────────────┘
```

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/reports/page.tsx)
- Tambah filter by province
- Tambah section "Omzet per Provinsi"

---

### Component 6: Order Flow Updates

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/order/page.tsx)
**Update halaman Order Mitra**

Changes:
- Cek `mitraStatus === APPROVED` sebelum bisa order
- Jika PENDING → tampilkan "Menunggu approval dari Pusat"
- Jika REJECTED → tampilkan "Pendaftaran ditolak, hubungi admin"
- Jika belum ada stokis → tampilkan info untuk daftarkan diri
- Harga produk diambil dari `StokisProductPrice` jika ada

```
┌──────────────────────────────────────────────────────────────┐
│  Buat Pesanan Baru                                           │
├──────────────────────────────────────────────────────────────┤
│  Status: ✓ Terdaftar di Stokis Jakarta                       │
│                                                              │
│  Produk tersedia:                                            │
│  ┌───────────────────────────────────────────────────────┐   │
│  │ Ayam Fillet     Rp 47.000 (harga khusus)  [+][-] 2    │   │
│  │ Bumbu Marinasi  Rp 24.000 (harga khusus)  [+][-] 1    │   │
│  │ Ayam Paha       Rp 35.000                 [+][-] 0    │   │
│  └───────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────┘
```

---

### Component 8: Export Features - Mitra

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/order/page.tsx)
**Tambah Export di halaman Order Mitra**

Features:
- Tambah ExportButton untuk export history pesanan mitra
- Export PDF/Excel dengan filter tanggal
- Include order details, status, total

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/export/mitra-orders/route.ts)
```
GET /api/export/mitra-orders?format=pdf|excel&start=date&end=date
```
- Export pesanan mitra dalam range tanggal
- Format: PDF atau Excel
- Kolom: Order Number, Tanggal, Status, Total, Items

---

### Component 9: Export Features - Gudang

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/po-masuk/page.tsx)
**Tambah Export di halaman PO Masuk Gudang**

Features:
- Tambah ExportButton untuk export PO yang diproses
- Export PDF/Excel dengan filter tanggal
- Include order details, stokis info, items

```
┌──────────────────────────────────────────────────────────────┐
│  PO Masuk                                        [Export ▼]  │
│                                           [PDF] [Excel]      │
├──────────────────────────────────────────────────────────────┤
│  ...existing content...                                      │
└──────────────────────────────────────────────────────────────┘
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/export/gudang-po/route.ts)
```
GET /api/export/gudang-po?format=pdf|excel&start=date&end=date&status=PO_ISSUED|PROCESSING|SHIPPED
```
- Export PO yang diproses gudang
- Filter by status, date range
- Kolom: Order Number, Stokis, Tanggal PO, Items, Total, Status

---

### Component 10: Finance Enhancements

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/approve-po/page.tsx)
**Update halaman Approve PO Finance dengan fitur tagihan**

Changes:
1. **Tampilkan Sisa Tagihan Stokis** di modal detail order
2. **Tombol Adjust PO** untuk stokis dengan tunggakan

Features:
- Fetch outstanding invoices untuk stokis saat buka modal
- Tampilkan total tagihan tertunggak (UNPAID + OVERDUE)
- Jika ada tunggakan, tampilkan warning badge
- Tombol "Adjust PO" - bisa kurangi quantity/tolak sebagian item
- Approve tetap bisa dilakukan dengan catatan

```
┌──────────────────────────────────────────────────────────────┐
│  Detail PO: ORD-2026020401                                   │
├──────────────────────────────────────────────────────────────┤
│  Stokis: Stokis Jakarta                                      │
│  Email: stokis.jakarta@dfresto.com                           │
├──────────────────────────────────────────────────────────────┤
│  ⚠️ PERHATIAN: Stokis memiliki tagihan tertunggak!          │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Total Tagihan Belum Lunas:   Rp 15.500.000           │  │
│  │  ├─ Unpaid (3 invoice):       Rp 10.000.000           │  │
│  │  └─ Overdue (2 invoice):      Rp  5.500.000           │  │
│  └────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────┤
│  Items:                                                      │
│  Ayam Fillet x 10 pcs            Rp 450.000                  │
│  Bumbu Marinasi x 5 pcs          Rp 125.000                  │
│  ─────────────────────────────────────────                   │
│  Total                           Rp 575.000                  │
├──────────────────────────────────────────────────────────────┤
│  [Reject]  [Adjust PO]  [Approve dengan Catatan]             │
└──────────────────────────────────────────────────────────────┘
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/stokis/[id]/outstanding/route.ts)
**API untuk cek sisa tagihan stokis**
```
GET /api/stokis/[id]/outstanding
```

Response:
```json
{
  "stokisId": "...",
  "stokisName": "Stokis Jakarta",
  "totalOutstanding": 15500000,
  "unpaidCount": 3,
  "unpaidAmount": 10000000,
  "overdueCount": 2,
  "overdueAmount": 5500000,
  "invoices": [
    {
      "invoiceNumber": "INV-20260101-001",
      "amount": 5000000,
      "dueDate": "2026-01-15",
      "status": "OVERDUE"
    }
  ]
}
```

#### [MODIFY] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/orders/stokis/[id]/route.ts)
**Tambah action untuk Adjust PO**
```
PATCH /api/orders/stokis/[id]
Body: {
  "action": "adjust",
  "adjustedItems": [
    { "itemId": "...", "newQuantity": 5 }
  ],
  "notes": "Dikurangi karena ada tunggakan"
}
```

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/tagihan/page.tsx)
**Update halaman Tagihan untuk tampilkan ringkasan per stokis**

Features:
- Tambah view "Per Stokis" selain list tagihan
- Summary card: Total stokis dengan tunggakan
- Klik stokis untuk lihat detail tagihan
- Export laporan tagihan per stokis

```
┌──────────────────────────────────────────────────────────────┐
│  Monitoring Tagihan                              [Export XLS]│
├──────────────────────────────────────────────────────────────┤
│  [Tab: Semua Tagihan] [Tab: Per Stokis]                      │
├──────────────────────────────────────────────────────────────┤
│  📊 Summary:                                                 │
│  Total Stokis: 25 | Dengan Tunggakan: 8 | Overdue: 3        │
├──────────────────────────────────────────────────────────────┤
│  Stokis           Unpaid    Overdue   Total Outstanding      │
│  Stokis Jakarta   3         2         Rp 15.500.000    [→]   │
│  Stokis Bandung   1         0         Rp  3.200.000    [→]   │
│  Stokis Surabaya  0         1         Rp  2.100.000    [→]   │
└──────────────────────────────────────────────────────────────┘
```

---

### Component 11: Pembayaran (Payment Input) - Finance

#### [NEW] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/pembayaran/page.tsx)
**Halaman "Pembayaran" untuk Finance - Input Pembayaran PO**

Features:
- List semua invoice yang belum lunas (UNPAID + OVERDUE)
- Filter by stokis, status, tanggal
- Input pembayaran untuk invoice
- Partial payment support (cicilan)
- Upload bukti transfer
- Auto-update status invoice ke PAID jika lunas
- History pembayaran per invoice

```
┌──────────────────────────────────────────────────────────────┐
│  Input Pembayaran                                [+ Bayar]   │
├──────────────────────────────────────────────────────────────┤
│  [Filter: Stokis ▼]  [Status: Semua ▼]  [Search: ________]   │
├──────────────────────────────────────────────────────────────┤
│  📊 Summary:                                                 │
│  Total Belum Lunas: Rp 125.500.000 | Overdue: Rp 35.200.000 │
├──────────────────────────────────────────────────────────────┤
│  Invoice         Stokis          Total        Sisa     Action│
│  INV-20260201    Stokis Jakarta  Rp 5.000.000 Rp 2.000.000 [Bayar]
│  INV-20260125    Stokis Bandung  Rp 3.200.000 Rp 3.200.000 [Bayar]
│  INV-20260115    Stokis Surabaya Rp 2.100.000 Rp 2.100.000 [Bayar]⚠️
└──────────────────────────────────────────────────────────────┘
```

**Modal Input Pembayaran:**
```
┌──────────────────────────────────────────────────────────────┐
│  Input Pembayaran - INV-20260201                       [X]   │
├──────────────────────────────────────────────────────────────┤
│  Stokis: Stokis Jakarta                                      │
│  Total Invoice: Rp 5.000.000                                 │
│  Sudah Dibayar: Rp 3.000.000                                 │
│  Sisa Tagihan:  Rp 2.000.000                                 │
├──────────────────────────────────────────────────────────────┤
│  Jumlah Bayar:  [Rp 2.000.000    ]  [Lunas ✓]               │
│  Tanggal:       [04/02/2026      ]                           │
│  Metode:        [Transfer BCA ▼  ]                           │
│  Bukti Transfer:[Choose File... ]                            │
│  Catatan:       [________________]                           │
├──────────────────────────────────────────────────────────────┤
│                          [Batal]  [Simpan Pembayaran]        │
└──────────────────────────────────────────────────────────────┘
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/payments/route.ts)
**API Pembayaran**
```
GET    /api/payments                    - List semua pembayaran
POST   /api/payments                    - Input pembayaran baru
```

Body POST:
```json
{
  "invoiceId": "...",
  "amount": 2000000,
  "paymentDate": "2026-02-04",
  "method": "TRANSFER_BCA",
  "proofImage": "base64...",
  "notes": "Pembayaran lunas"
}
```

#### [NEW] [route.ts](file:///f:/CODING/SISTEM/dfresto/src/app/api/payments/[id]/route.ts)
```
GET    /api/payments/[id]               - Detail pembayaran
DELETE /api/payments/[id]               - Batalkan pembayaran
```

#### Database Schema Addition
```prisma
enum PaymentMethod {
  TRANSFER_BCA
  TRANSFER_MANDIRI
  TRANSFER_BRI
  CASH
  OTHER
}

model Payment {
  id            String        @id @default(cuid())
  invoiceId     String
  invoice       Invoice       @relation(fields: [invoiceId], references: [id])
  
  amount        Decimal       @db.Decimal(12, 2)
  paymentDate   DateTime
  method        PaymentMethod
  proofImage    String?       // URL to uploaded image
  notes         String?
  
  createdAt     DateTime      @default(now())
  createdBy     String        // User ID Finance yang input
  
  @@index([invoiceId])
}

// Update Invoice model
model Invoice {
  // ... existing fields ...
  payments      Payment[]
  paidAmount    Decimal       @db.Decimal(12, 2) @default(0) // Total yang sudah dibayar
}
```

---

### Component 12: Adjust PO - Stokis

#### [MODIFY] [page.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/history/page.tsx)
**Tambah tombol Adjust PO di halaman History Stokis**

Features:
- Tombol Adjust PO untuk order dengan status PENDING_PUSAT atau PENDING_FINANCE
- Stokis bisa edit quantity atau hapus item sebelum diapprove
- Modal untuk edit order items

```
┌──────────────────────────────────────────────────────────────┐
│  History Pesanan                                             │
├──────────────────────────────────────────────────────────────┤
│  ORD-20260204001  |  PENDING_FINANCE  |  Rp 5.750.000       │
│  [Lihat Detail] [Adjust PO] [Batalkan]                       │
├──────────────────────────────────────────────────────────────┤
│  ORD-20260203002  |  PO_ISSUED        |  Rp 3.200.000       │
│  [Lihat Detail] [Print PO]                                   │
└──────────────────────────────────────────────────────────────┘
```

**Modal Adjust PO (Stokis):**
```
┌──────────────────────────────────────────────────────────────┐
│  Adjust PO - ORD-20260204001                           [X]   │
├──────────────────────────────────────────────────────────────┤
│  Status: PENDING_FINANCE                                     │
├──────────────────────────────────────────────────────────────┤
│  Items:                                                      │
│  Ayam Fillet     @Rp 45.000   [10] pcs  Rp 450.000   [🗑️]   │
│  Bumbu Marinasi  @Rp 25.000   [5 ] pcs  Rp 125.000   [🗑️]   │
│  ─────────────────────────────────────────────────────────   │
│  Total (sebelum): Rp 575.000                                 │
│  Total (baru):    Rp 575.000                                 │
├──────────────────────────────────────────────────────────────┤
│  Alasan:          [Kurangi qty karena stok cukup  ]          │
├──────────────────────────────────────────────────────────────┤
│                            [Batal]  [Simpan Perubahan]       │
└──────────────────────────────────────────────────────────────┘
```

---

### Component 13: Export PO PDF

#### [MODIFY] Existing PO Export
**Pastikan semua role bisa export PO ke PDF**

Halaman yang perlu tombol Export PO PDF:
- `/dashboard/history` (Stokis) - Print PO untuk order PO_ISSUED+
- `/dashboard/history-pusat` (Pusat) - Print PO untuk semua order
- `/dashboard/approve-po` (Finance) - Print PO setelah approve
- `/dashboard/po-masuk` (Gudang) - Print PO untuk picking list

Features:
- Satu API unified: `/api/po/stokis/[id]/pdf`
- Template PO professional dengan:
  - Header perusahaan
  - Nomor PO, Tanggal
  - Info Stokis (nama, alamat, telepon)
  - Tabel items (produk, qty, harga, subtotal)
  - Total
  - TTD/approval section

---

### Component 7: Sidebar Menu Updates

#### [MODIFY] [layout.tsx](file:///f:/CODING/SISTEM/dfresto/src/app/dashboard/layout.tsx)

**Menu untuk STOKIS:**
```typescript
const stokisMenuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Order Mitra', href: '/dashboard/order-mitra', icon: ShoppingCartIcon },
  { name: 'Kelola Mitra', href: '/dashboard/kelola-mitra', icon: UsersIcon },        // NEW
  { name: 'Lihat Harga', href: '/dashboard/harga-stokis', icon: TagIcon },           // NEW (view only)
  { name: 'Order ke Pusat', href: '/dashboard/order-pusat', icon: TruckIcon },
  { name: 'History', href: '/dashboard/history', icon: ClockIcon },
  { name: 'Inventory', href: '/dashboard/inventory', icon: ArchiveIcon },
]
```

**Menu untuk PUSAT:**
```typescript
const pusatMenuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Order Stokis', href: '/dashboard/orders-stokis', icon: ShoppingCartIcon },
  { name: 'Approve Mitra', href: '/dashboard/approve-mitra', icon: UserCheckIcon },  // NEW
  { name: 'Harga Stokis', href: '/dashboard/harga-stokis', icon: TagIcon },          // NEW
  { name: 'Coverage Provinsi', href: '/dashboard/province-coverage', icon: MapIcon },// NEW
  { name: 'Users', href: '/dashboard/users', icon: UsersIcon },
  { name: 'Products', href: '/dashboard/products', icon: PackageIcon },
  { name: 'Gudang', href: '/dashboard/gudang', icon: WarehouseIcon },
  { name: 'Analytics', href: '/dashboard/analytics', icon: ChartIcon },
]
```

**Menu untuk FINANCE:**
```typescript
const financeMenuItems = [
  { name: 'Dashboard', href: '/dashboard', icon: HomeIcon },
  { name: 'Approve PO', href: '/dashboard/approve-po', icon: CheckIcon },
  { name: 'Pembayaran', href: '/dashboard/pembayaran', icon: CreditCardIcon }, // NEW
  { name: 'Tagihan', href: '/dashboard/tagihan', icon: ReceiptIcon },
  { name: 'Invoices', href: '/dashboard/invoices', icon: DocumentIcon },
  { name: 'Laporan Harga', href: '/dashboard/laporan-harga', icon: TagIcon },  // NEW
  { name: 'Reports', href: '/dashboard/reports', icon: ChartIcon },
]
```

---

## 4. Migration Strategy

### Step 1: Schema Migration

```bash
npx prisma migrate dev --name phase5_stokis_location
```

### Step 2: Data Migration Script

```typescript
// scripts/migrate-phase5.ts

// 1. Set semua mitra existing yang punya stokisId → mitraStatus = APPROVED
await prisma.user.updateMany({
  where: {
    role: 'MITRA',
    stokisId: { not: null }
  },
  data: {
    mitraStatus: 'APPROVED',
    mitraApprovedAt: new Date()
  }
})

// 2. Mitra tanpa stokisId → mitraStatus = null (belum terdaftar)
// Tidak perlu action

// 3. Reminder: Admin harus set province untuk semua stokis existing
console.log('REMINDER: Update province untuk semua stokis existing!')
```

### Step 3: Admin Task
- Login sebagai Pusat
- Update semua Stokis existing → set Province

---

## 5. Timeline & Cost

| Phase | Feature | Duration | Cost |
|-------|---------|----------|------|
| 5.1 | Database Schema & Migration | 1 hari | - |
| 5.2 | API Endpoints (Registration, Prices) | 2 hari | Rp 2.500.000 |
| 5.3 | Stokis: Kelola Mitra + Lihat Harga | 2 hari | Rp 2.000.000 |
| 5.4 | Pusat: Approve Mitra + Kelola Harga | 2 hari | Rp 2.500.000 |
| 5.5 | Finance: Laporan Harga | 1 hari | Rp 1.000.000 |
| 5.6 | Order Flow Updates + Validation | 1 hari | Rp 1.000.000 |
| 5.7 | Testing & Bug Fix | 1 hari | - |
| | **Total** | **10 hari** | **Rp 9.000.000** |

---

## 6. Verification Plan

### Test Cases

| Test Case | Role | Expected Result |
|-----------|------|-----------------|
| Stokis ajukan mitra baru | STOKIS | Mitra status = PENDING |
| Pusat approve mitra | PUSAT | Mitra status = APPROVED |
| Pusat reject mitra | PUSAT | Mitra status = REJECTED |
| Mitra PENDING coba order | MITRA | Error: "Menunggu approval" |
| Mitra APPROVED order | MITRA | Order berhasil |
| Pusat set harga custom | PUSAT | Harga tersimpan di StokisProductPrice |
| Mitra lihat harga | MITRA | Tampil harga custom dari stokis |
| Finance lihat laporan | FINANCE | Tampil semua harga + margin |
| Create stokis tanpa province | PUSAT | Error: "Province wajib diisi" |
| Filter stokis by province | PUSAT | Hanya stokis matching yang tampil |

### Test Accounts

| Role | Email | Password |
|------|-------|----------|
| Pusat | admin@dfresto.com | password123 |
| Finance | finance@dfresto.com | password123 |
| Stokis | stokis.jakarta@dfresto.com | password123 |
| Mitra | mitra1@dfresto.com | password123 |

---

## 7. File Summary

### New Files (22 files)

| File | Description |
|------|-------------|
| `src/app/api/mitra-registration/route.ts` | API pengajuan mitra (Stokis) |
| `src/app/api/mitra-registration/[id]/route.ts` | API approval mitra (Pusat) |
| `src/app/api/mitra-registration/pending/route.ts` | API list pending (Pusat) |
| `src/app/api/stokis-prices/route.ts` | API harga custom |
| `src/app/api/stokis-prices/[id]/route.ts` | API update/delete harga |
| `src/app/api/stokis-prices/by-stokis/[stokisId]/route.ts` | API harga per stokis |
| `src/app/api/locations/provinces/route.ts` | API list provinsi |
| `src/app/api/stokis/by-province/route.ts` | API stokis per provinsi |
| `src/app/api/province-coverage/route.ts` | API coverage statistik per provinsi |
| `src/app/api/export/mitra-orders/route.ts` | API export pesanan mitra (PDF/Excel) |
| `src/app/api/export/gudang-po/route.ts` | API export PO gudang (PDF/Excel) |
| `src/app/api/stokis/[id]/outstanding/route.ts` | API cek sisa tagihan stokis |
| `src/app/api/payments/route.ts` | API input pembayaran (list, create) |
| `src/app/api/payments/[id]/route.ts` | API pembayaran detail/delete |
| `src/app/api/po/stokis/[id]/pdf/route.ts` | API generate PO PDF |
| `src/app/dashboard/kelola-mitra/page.tsx` | Halaman kelola mitra (Stokis) |
| `src/app/dashboard/approve-mitra/page.tsx` | Halaman approve mitra (Pusat) |
| `src/app/dashboard/harga-stokis/page.tsx` | Halaman harga (Stokis: view, Pusat: edit) |
| `src/app/dashboard/province-coverage/page.tsx` | Halaman coverage provinsi (Pusat) |
| `src/app/dashboard/laporan-harga/page.tsx` | Halaman laporan harga (Finance) |
| `src/app/dashboard/pembayaran/page.tsx` | Halaman input pembayaran (Finance) |

### Modified Files (12 files)

| File | Description |
|------|-------------|
| `prisma/schema.prisma` | Tambah enum, field, model baru (Payment, PaymentMethod) |
| `src/app/api/users/route.ts` | Tambah field lokasi, validasi province |
| `src/app/api/orders/mitra/route.ts` | Validasi mitraStatus, gunakan harga custom |
| `src/app/api/orders/stokis/[id]/route.ts` | Tambah action adjust PO |
| `src/app/dashboard/users/page.tsx` | Tambah kolom province & filter |
| `src/app/dashboard/order/page.tsx` | Cek approval status, tampil harga custom, export |
| `src/app/dashboard/po-masuk/page.tsx` | Tambah export PDF/Excel, tombol Print PO |
| `src/app/dashboard/approve-po/page.tsx` | Tampilkan tagihan tertunggak, tombol Adjust PO, Print PO |
| `src/app/dashboard/tagihan/page.tsx` | Tambah view Per Stokis, summary, export |
| `src/app/dashboard/history/page.tsx` | Tambah tombol Adjust PO, Print PO (Stokis) |
| `src/app/dashboard/history-pusat/page.tsx` | Tambah tombol Print PO |
| `src/app/dashboard/layout.tsx` | Tambah menu baru per role (termasuk Pembayaran) |
