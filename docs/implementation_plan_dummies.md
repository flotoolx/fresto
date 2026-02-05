# Implementation Plan - Phase 5 Dummy Data

## Goal
Add comprehensive dummy data to `prisma/seed.ts` to support testing of Phase 5 features (Finance Dashboard, Stokis Adjust PO, Payment, Print PO).

## Proposed Changes

### `prisma/seed.ts`
Append logic to create:
1. **Orders** for Stokis Jakarta:
   - 1x `PENDING_PUSAT` (Test: Adjust by Stokis)
   - 1x `PENDING_FINANCE` (Test: Adjust by Finance)
   - 1x `PO_ISSUED` (Test: Gudang Process, Print PO)
   - 1x `SHIPPED` (Test: Confirm Receive)
   - 1x `RECEIVED` (Test: Invoice Generation)

2. **Invoices**:
   - 1x `UNPAID` (Linked to RECEIVED order)
   - 1x `OVERDUE` (Mocked date for testing overdue logic)

3. **Stokis Prices**:
   - Add custom prices for Stokis Jakarta to test "Laporan Harga"

## Verification Plan
1. Run `npx prisma db seed`
2. Check Dashboard Finance > Pembayaran (Should see Unpaid/Overdue)
3. Check Dashboard Stokis > Riwayat (Should see various statuses)
4. Check Dashboard Finance > Laporan Harga (Should see data)
