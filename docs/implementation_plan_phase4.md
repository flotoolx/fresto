# Implementation Plan - Phase 4: Next Development

## Overview

Pengembangan lanjutan D'Fresto sistem dengan fokus pada:
1. **WhatsApp Notification** menggunakan Baileys
2. **Invoice Reminder Automation**
3. **Report & Analytics Enhancement**
4. **VPS Deployment**

---

## 0. Infrastructure & Hosting

### Target Scale
| Metric | Value |
|--------|-------|
| Total Mitra | 3,000 |
| Total Stokis | 200 |
| Staff (Pusat, Finance, Gudang) | ~10 |
| Concurrent Users (peak) | ~300-500 |
| Daily Orders | ~500-1,000 |

### Recommended VPS Spec

| Provider | Spec | Cost/month |
|----------|------|------------|
| **DigitalOcean** ⭐ | 4 vCPU, 8GB RAM, 160GB SSD | $48 (~Rp 750.000) |
| IDCloudHost 🇮🇩 | 4 vCPU, 8GB RAM | Rp 600.000 |
| DewaWeb 🇮🇩 | 4 vCPU, 8GB RAM | Rp 550.000 |

### Architecture

```
┌─────────────────────────────────────────┐
│           VPS (Ubuntu 22.04)            │
│  ┌─────────────────────────────────┐    │
│  │ Nginx (Reverse Proxy + SSL)     │    │
│  └───────────────┬─────────────────┘    │
│                  │                       │
│  ┌───────────────┴─────────────────┐    │
│  │ PM2 (Process Manager)           │    │
│  │  ├── Next.js App (port 3000)    │    │
│  │  └── WhatsApp Service           │    │
│  └───────────────┬─────────────────┘    │
│                  │                       │
│  ┌───────────────┴─────────────────┐    │
│  │ PostgreSQL Database             │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### Deployment Stack
- **OS**: Ubuntu 22.04 LTS
- **Web Server**: Nginx
- **Process Manager**: PM2
- **Database**: PostgreSQL 15
- **Node.js**: v20 LTS
- **SSL**: Let's Encrypt (free)

### Monthly Cost
| Item | Cost |
|------|------|
| VPS (4 vCPU, 8GB) | Rp 750.000 |
| Domain .com | Rp 150.000/tahun |
| SSL Wildcard | Free (Let's Encrypt) |
| **Total** | **~Rp 762.500/bulan** |

---

## 0.1 Subdomain Architecture

### Domain Structure
```
dfresto.com           → Landing page / redirect
├── mitra.dfresto.com   → Dashboard Mitra
├── stokis.dfresto.com  → Dashboard Stokis
└── admin.dfresto.com   → Pusat, Finance, Gudang
```

### DNS Configuration
```
A     @              → VPS_IP
A     mitra          → VPS_IP
A     stokis         → VPS_IP
A     admin          → VPS_IP
```

### Nginx Config
```nginx
# /etc/nginx/sites-available/dfresto

# Mitra subdomain
server {
    listen 443 ssl;
    server_name mitra.dfresto.com;
    
    ssl_certificate /etc/letsencrypt/live/dfresto.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dfresto.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Subdomain mitra;
    }
}

# Stokis subdomain
server {
    listen 443 ssl;
    server_name stokis.dfresto.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Subdomain stokis;
    }
}

# Admin subdomain
server {
    listen 443 ssl;
    server_name admin.dfresto.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Subdomain admin;
    }
}
```

### Next.js Middleware
```typescript
// src/middleware.ts
export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const subdomain = host.split('.')[0]
  
  // Redirect based on subdomain
  if (subdomain === 'mitra') {
    // Only allow MITRA role
  } else if (subdomain === 'stokis') {
    // Only allow STOKIS role
  } else if (subdomain === 'admin') {
    // Allow PUSAT, FINANCE, GUDANG
  }
}
```

### Login Flow
| Subdomain | Allowed Roles | Redirect After Login |
|-----------|---------------|---------------------|
| mitra.dfresto.com | MITRA | /dashboard |
| stokis.dfresto.com | STOKIS | /dashboard |
| admin.dfresto.com | PUSAT, FINANCE, GUDANG | /dashboard |

### SSL Wildcard Certificate
```bash
# Generate wildcard SSL
sudo certbot certonly --dns-cloudflare \
  -d dfresto.com \
  -d "*.dfresto.com"
```

---

## 1. WhatsApp Notification (Baileys)

### Deskripsi
Integrasi WhatsApp untuk notifikasi real-time menggunakan [Baileys](https://github.com/WhiskeySockets/Baileys).

### File Structure
```
src/
├── lib/
│   └── whatsapp.ts              # WhatsApp service
├── app/
│   └── api/
│       └── whatsapp/
│           ├── route.ts         # Send message API
│           ├── qr/route.ts      # Get QR code
│           └── status/route.ts  # Connection status
└── components/
    └── WhatsAppStatus.tsx       # QR & status component
```

### Database Schema
```prisma
model WhatsAppSession {
  id        String   @id @default(cuid())
  sessionId String   @unique
  creds     Json
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WhatsAppLog {
  id        String   @id @default(cuid())
  phone     String
  message   String
  status    String   // SENT, FAILED, PENDING
  type      String   // ORDER, INVOICE, REMINDER
  orderId   String?
  createdAt DateTime @default(now())
}
```

### Message Templates
| Event | Recipient | Message |
|-------|-----------|---------|
| Order Created | Stokis | "🛒 Order baru #{orderNumber} dari {mitraName}" |
| PO Approved | Stokis | "✅ PO #{orderNumber} telah disetujui Finance" |
| Order Shipped | Stokis/Mitra | "📦 Order #{orderNumber} sedang dikirim" |
| Invoice Created | Stokis | "📄 Invoice {invoiceNumber} jatuh tempo {dueDate}" |
| Invoice Reminder | Stokis | "⏰ Reminder: Invoice jatuh tempo {daysLeft} hari lagi" |

> [!WARNING]
> Baileys adalah unofficial API. Gunakan nomor khusus dan batasi ~1000 pesan/hari.

---

## 2. Invoice Reminder Automation

### Cron Schedule
| Time | Task |
|------|------|
| 09:00 | Check & update overdue invoices |
| 09:00 | Send WA reminder (7 hari sebelum due) |
| 09:00 | Send WA alert untuk overdue |

### Implementation
```typescript
// /api/cron/invoice-reminder/route.ts
export async function GET() {
  // 1. Update UNPAID → OVERDUE jika lewat dueDate
  // 2. Get invoices due in 7 days
  // 3. Send WhatsApp reminders
}
```

---

## 3. Report & Analytics

### New Reports
| Report | Format |
|--------|--------|
| Monthly Sales | PDF/Excel |
| Top Products | PDF/Excel |
| Stokis Performance | PDF/Excel |
| Invoice Aging | PDF/Excel |

---

## Timeline & Cost

| Phase | Feature | Duration | Cost |
|-------|---------|----------|------|
| 4.0 | VPS Setup & Deploy | 1 hari | - |
| 4.1 | WhatsApp Integration | 3-4 hari | Rp 4.000.000 |
| 4.2 | Invoice Reminder | 1-2 hari | Rp 2.000.000 |
| 4.3 | Reports Enhancement | 2-3 hari | Rp 3.000.000 |
| | **Total** | **7-10 hari** | **Rp 9.000.000** |

### Monthly Operational
| Item | Cost |
|------|------|
| VPS Hosting | Rp 750.000 |
| Domain | Rp 15.000 |
| **Total/bulan** | **Rp 765.000** |

---

## Deployment Checklist

- [ ] Setup VPS di DigitalOcean/IDCloudHost
- [ ] Install Node.js, PostgreSQL, Nginx
- [ ] Configure SSL dengan Let's Encrypt
- [ ] Clone repo dan build production
- [ ] Setup PM2 untuk process management
- [ ] Configure environment variables
- [ ] Setup database migration
- [ ] Configure domain DNS
- [ ] Test semua endpoints
- [ ] Setup WhatsApp nomor khusus
