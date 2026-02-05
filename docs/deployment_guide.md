# Panduan Deployment D'Fresto ke VPS (DigitalOcean / Vultr)

Panduan ini menjelaskan langkah-langkah untuk men-deploy aplikasi D'Fresto (Next.js + Prisma + PostgreSQL) ke Virtual Private Server (VPS) berbasis Ubuntu 22.04 / 24.04.

## Prasyarat

1.  **VPS**: Minimal 1GB RAM (Disarankan 2GB+ untuk Next.js build process).
    *   OS: Ubuntu 22.04 LTS atau 24.04 LTS.
2.  **Domain**: Sebuah domain yang sudah diarahkan (A Record) ke IP Address VPS Anda.
    *   Contoh: `dfresto.com` -> `123.456.78.90`
3.  **Akses SSH**: Kemampuan untuk login ke server via terminal.

---

## Langkah 1: Persiapan Server (Initial Server Setup)

Login ke server Anda sebagai root:
```bash
ssh root@your_server_ip
```

### 1.1 Update & Upgrade Sistem
```bash
apt update && apt upgrade -y
```

### 1.2 Buat User Baru (Opsional tapi Disarankan)
Jangan menjalankan aplikasi sebagai root demi keamanan.
```bash
adduser dfresto
# Ikuti instruksi membuat password
usermod -aG sudo dfresto
su - dfresto
```

### 1.3 Install Node.js (via NVM)
Kita akan menginstall Node.js versi LTS (v20+).
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
node -v # Pastikan versi v20.x.x atau lebih baru
npm -v
```

> **Masalah Umum:** Jika muncul error `No such file or directory` atau `Command 'nvm' not found`:
> 1.  Cek apakah folder ada: `ls -ld ~/.nvm`
> 2.  **Jika tidak ada**, berarti install gagal. Jalankan ulang:
>     ```bash
>     curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
>     ```
> 3.  Jika sudah sukses install, baru jalankan:
>     ```bash
>     export NVM_DIR="$HOME/.nvm"
>     source "$HOME/.nvm/nvm.sh"
>     ```

### 1.4 Install Git & PM2
Git untuk clone repo, PM2 untuk menjalankan aplikasi di background.
```bash
sudo apt install git -y
npm install -g pm2
```

---

## Langkah 2: Setup Database (PostgreSQL)

Jika Anda tidak menggunakan Managed Database (seperti Supabase/Neon), install PostgreSQL di VPS yang sama.

### 2.1 Install PostgreSQL
```bash
sudo apt install postgresql postgresql-contrib -y
```

### 2.2 Buat User & Database
Masuk ke prompt Postgres:
```bash
sudo -u postgres psql
```

Jalankan perintah SQL berikut:
```sql
CREATE DATABASE dfresto_db;
CREATE USER dfresto_user WITH ENCRYPTED PASSWORD 'dFresto!';
GRANT ALL PRIVILEGES ON DATABASE dfresto_db TO dfresto_user;
\c dfresto_db
GRANT ALL ON SCHEMA public TO dfresto_user;
\q
```
*(Ganti `dFresto!` dengan password yang kuat)*

---

## Langkah 3: Setup Aplikasi (Next.js)

### 3.1 Upload Kode Aplikasi
Anda bisa memilih antara menggunakan Git (Disarankan) atau Upload Manual.

#### Opsi A: Clone Repository (Disarankan)
Pastikan kode Anda sudah ada di GitHub/GitLab.
```bash
cd ~
git clone https://github.com/username/dfresto.git
cd dfresto
```

#### Opsi B: Upload Manual (SCP / SFTP)
Jika tidak menggunakan Git, Anda bisa upload file project dari komputer lokal ke VPS.
1.  **Gunakan FileZilla / WinSCP**:
    *   Host: `your_server_ip`
    *   User: `dfresto`
    *   Password: (password user dfresto)
    *   Port: 22
2.  **Upload File**:
    *   Upload isi folder project lokal Anda ke `/home/dfresto/dfresto/`.
    *   **PENTING**: JANGAN upload folder berikut:
        *   `node_modules/`
        *   `.next/`
        *   `.git/`
        *   `.env` (Kita buat manual di server)
3.  **Verifikasi**:
    ```bash
    cd ~/dfresto
    ls -la # Pastikan file seperti package.json dan prisma/ ada
    ```

### 3.2 Install Dependencies
```bash
npm install
```

### 3.3 Setup Environment Variables
Buat file `.env` produksi.
```bash
cp .env.example .env
nano .env
```
Isi sesuai konfigurasi server:
```env
DATABASE_URL="postgresql://dfresto_user:dFresto!@localhost:5432/dfresto_db"
NEXTAUTH_URL="https://tokomau.my.id"
NEXTAUTH_SECRET="buat_random_string_panjang_di_sini"

# Email (SMTP) - Untuk kirim notifikasi email
# Gunakan Gmail dengan App Password: https://myaccount.google.com/apppasswords
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="adibahardani@gmail.com"
SMTP_PASS="ewlm ywdt ndbm kgdc"
SMTP_FROM="D'Fresto <noreply@dfresto.com>"

# Push Notifications (Web Push VAPID Keys)
# Generate dengan: npx web-push generate-vapid-keys
NEXT_PUBLIC_VAPID_PUBLIC_KEY="BFUN4MG9H3KytgPwBwMyAuZoBvyCPNxJK8Zn0OP-71f2zoyjAXAT62CQ0ZMtTubYiP81koY1NeXCYp0F3FPDI60"
VAPID_PRIVATE_KEY="80r3Is6mexWjLrcurt4JIwLZfjyGj0wyvbqjBadU7zo"
VAPID_EMAIL="admin@dfresto.com"
# Isi variabel lain sesuai kebutuhan
```
Simpan dengan `Ctrl+X`, lalu `Y`, lalu `Enter`.

```bash
# Push schema ke database
npx prisma db push

# Generate client
npx prisma generate

# Seed database (jika perlu data awal)
npx prisma db seed

# Build aplikasi Next.js
npm run build
```
*Note: Jika build gagal karena memory (OOM), Anda mungkin perlu menambah Swap file pada VPS 1GB RAM.*

---

## Langkah 4: Menjalankan Aplikasi dengan PM2

Jalankan aplikasi Next.js menggunakan PM2 agar tetap hidup (restart otomatis jika crash/reboot).

```bash
pm2 start npm --name "dfresto" -- start
pm2 save
pm2 startup
```
*(Copy paste command yang muncul dari output `pm2 startup` jika diminta)*

---

## Langkah 5: Setup Nginx (Reverse Proxy)

Nginx bertugas menerima request dari internet (Port 80/443) dan meneruskannya ke aplikasi Next.js (Port 3000).

### 5.1 Install Nginx
```bash
sudo apt install nginx -y
```

### 5.2 Konfigurasi Server Block
Buat config baru untuk domain Anda.
```bash
sudo nano /etc/nginx/sites-available/dfresto
```

Isi dengan konfigurasi berikut:
```nginx
server {
    server_name tokomau.my.id www.tokomau.my.id;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 5.3 Aktifkan Konfigurasi
```bash
sudo ln -s /etc/nginx/sites-available/dfresto /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default  # Hapus default jika tidak dipakai
sudo nginx -t # Cek error syntax
sudo systemctl restart nginx
```

---

## Langkah 6: Amankan dengan SSL (HTTPS)

Gunakan Certbot (Let's Encrypt) untuk SSL gratis.

```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tokomau.my.id -d www.tokomau.my.id
```
Ikuti instruksi di layar. Pilih opsi **Redirect** (2) agar semua traffic HTTP dipaksa ke HTTPS.

---

## Langkah Tambahan: Firewall (UFW)

Aktifkan firewall sederhana untuk keamanan.
```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

## Selesai! 🚀
Aplikasi D'Fresto Anda sekarang sudah live di `https://yourdomain.com`.

### Tips Maintenance:
- **Lihat Logs Aplikasi:** `pm2 logs dfresto`
- **Update Aplikasi (Via Git):**
  ```bash
  cd ~/dfresto
  git pull
  npm install
  npx prisma db push
  npm run build
  pm2 restart dfresto
  ```
- **Update Aplikasi (Manual):**
  1. Upload file yang berubah via FileZilla/SCP (overwrite file lama).
  2. Jangan upload `node_modules` atau `.next`.
  3. Jalankan command di server:
     ```bash
     cd ~/dfresto
     npm install        # Jika package.json berubah
     npx prisma db push # Jika schema.prisma berubah
     npm run build      # Wajib jika ada perubahan code
     pm2 restart dfresto
     ```

---

## Update Phase 5: Finance & Stokis Management (4 Feb 2026)

### Ringkasan Perubahan

Phase 5 menambahkan fitur-fitur berikut:
- **Component 10**: Finance Enhancements (Outstanding Check, Adjust PO)
- **Component 11**: Pembayaran (Payment Input, Partial Payment)
- **Component 12**: Adjust PO - Stokis
- **Component 13**: PO PDF Export (Unified approach)
- **Component 5**: Dashboard Laporan Harga (Finance)

### ⚠️ PENTING: Perubahan Database Schema

Update ini menambahkan model dan field baru di Prisma schema:
- **Model baru**: `Payment` (untuk tracking pembayaran)
- **Enum baru**: `PaymentMethod` (TRANSFER_BCA, TRANSFER_MANDIRI, dll)
- **Field baru**: `Invoice.paidAmount` (untuk partial payment)

---

### Langkah Update ke VPS

#### 1. Backup Database (WAJIB!)
```bash
# Login ke VPS
ssh dfresto@your_server_ip

# Backup database
pg_dump -h localhost -U dfresto_user -d dfresto_db > ~/backup_$(date +%Y%m%d_%H%M%S).sql
```

password db : dfresto!

#### 2. Pull/Upload Kode Terbaru

**Opsi A: Menggunakan Git**
```bash
cd ~/dfresto
git fetch origin
git pull origin main
```

**Opsi B: Upload Manual (FileZilla/SCP)**
Upload file-file berikut ke VPS:
```
prisma/schema.prisma                    # WAJIB - schema berubah
src/app/api/payments/route.ts           # NEW
src/app/api/payments/[id]/route.ts      # NEW
src/app/api/stokis/[id]/outstanding/route.ts  # NEW
src/app/dashboard/pembayaran/page.tsx   # NEW
src/app/dashboard/laporan-harga/page.tsx # NEW
src/app/dashboard/history-pusat/page.tsx # MODIFIED
src/app/dashboard/approve-po/page.tsx   # MODIFIED
src/app/dashboard/po-masuk/page.tsx     # MODIFIED
src/components/dashboard/Sidebar.tsx    # MODIFIED
```

#### 3. Install Dependencies (jika ada package baru)
```bash
cd ~/dfresto
npm install
```

#### 4. Apply Database Schema Changes
```bash
# Generate Prisma client dengan model baru
npx prisma generate

# Apply schema ke database (HATI-HATI!)
npx prisma db push
```

> **⚠️ Warning**: `prisma db push` akan menambah tabel dan kolom baru. 
> Untuk production, disarankan gunakan `prisma migrate deploy` dengan migration files.

#### 5. Verifikasi Schema
```bash
# Cek apakah tabel Payment sudah ada
sudo -u postgres psql -d dfresto_db -c "\\dt"

# Cek kolom paidAmount di Invoice
sudo -u postgres psql -d dfresto_db -c "\\d \"Invoice\""
```

Output yang diharapkan:
```
         Column     |           Type           
--------------------+--------------------------
 paidAmount         | numeric(12,2)
```

#### 6. Build Aplikasi
```bash
npm run build
```

> **Jika Out of Memory (OOM) Error:**
> ```bash
> # Tambah swap jika belum ada
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> # Lalu coba build lagi
> npm run build
> ```

#### 7. Restart Aplikasi
```bash
pm2 restart dfresto
pm2 logs dfresto --lines 50
```

#### 8. Verifikasi Deployment
Cek halaman-halaman baru:
- [ ] `https://yourdomain.com/dashboard/pembayaran` (Finance)
- [ ] `https://yourdomain.com/dashboard/laporan-harga` (Finance)
- [ ] `https://yourdomain.com/dashboard/history-pusat` (Stokis)
- [ ] `https://yourdomain.com/po/stokis/[id]` (Print Preview)

---

### Rollback Jika Gagal

Jika terjadi masalah setelah update:

#### 1. Restore Kode Sebelumnya
```bash
cd ~/dfresto

# Jika pakai Git
git reset --hard HEAD~1

# Jika upload manual
# Upload file backup dari lokal
```

#### 2. Restore Database (Jika Schema Corrupt)
```bash
# Drop database dan buat ulang
sudo -u postgres psql -c "DROP DATABASE dfresto_db;"
sudo -u postgres psql -c "CREATE DATABASE dfresto_db OWNER dfresto_user;"

# Restore dari backup
psql -U dfresto_user -d dfresto_db < ~/backup_YYYYMMDD_HHMMSS.sql
```

#### 3. Rebuild & Restart
```bash
npx prisma generate
npm run build
pm2 restart dfresto
```

---

### Troubleshooting Phase 5

#### Error: "Payment" model not found
```bash
# Regenerate Prisma client
npx prisma generate
npm run build
pm2 restart dfresto
```

#### Error: Column "paidAmount" does not exist
```bash
# Schema belum di-push
npx prisma db push
```

#### Halaman Pembayaran blank / error
1. Cek logs: `pm2 logs dfresto --lines 100`
2. Pastikan ada invoice di database
3. Cek API response: `curl https://yourdomain.com/api/invoices`

#### Print PO tidak buka halaman baru
1. Cek console browser untuk error
2. Pastikan route `/po/stokis/[id]` ada di build output
3. Cek nginx tidak block request

---

### Checklist Post-Deployment

| Item | Status |
|------|--------|
| Database backup tersimpan | ☐ |
| Schema berhasil di-push | ☐ |
| Build berhasil tanpa error | ☐ |
| PM2 restart berhasil | ☐ |
| Halaman pembayaran accessible | ☐ |
| Halaman laporan-harga accessible | ☐ |
| Print PO berfungsi | ☐ |
| Adjust PO berfungsi | ☐ |
| Menu sidebar Finance lengkap | ☐ |

---

### File yang Berubah (Phase 5)

```
prisma/
├── schema.prisma                         # Payment model, PaymentMethod enum

src/app/api/
├── payments/
│   ├── route.ts                          # NEW: GET/POST payments
│   └── [id]/
│       └── route.ts                      # NEW: GET/DELETE payment
├── stokis/
│   └── [id]/
│       └── outstanding/
│           └── route.ts                  # NEW: GET outstanding data

src/app/dashboard/
├── pembayaran/
│   └── page.tsx                          # NEW: Payment input page
├── laporan-harga/
│   └── page.tsx                          # NEW: Price report page
├── history-pusat/
│   └── page.tsx                          # MODIFIED: Adjust PO, Print PO
├── approve-po/
│   └── page.tsx                          # MODIFIED: Outstanding check, Print PO
├── po-masuk/
│   └── page.tsx                          # MODIFIED: Print PO button

src/components/dashboard/
└── Sidebar.tsx                           # MODIFIED: New menu items

docs/
├── testing_checklist_phase5.md           # NEW: Testing checklist
└── deployment_guide.md                   # MODIFIED: This update section
```

