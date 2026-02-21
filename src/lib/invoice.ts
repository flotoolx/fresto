import { prisma } from './prisma'

/**
 * Area code mapping for invoice numbers
 * Maps DC location name → invoice area code
 */
const DC_LOCATION_TO_AREA: Record<string, string> = {
    'Palembang': 'PLM',
    'Makassar': 'MKS',
    'Medan': 'MON',
    'Bengkulu': 'BKL',
    'Pekanbaru': 'PKU',
    'Jatim': 'JTM',
    'Jateng': 'JTG',
}

/**
 * Get area code from DC user's name
 * DC names are like "Admin Palembang", "Admin Medan", etc.
 */
function getAreaCodeFromDCName(dcName: string): string {
    for (const [location, code] of Object.entries(DC_LOCATION_TO_AREA)) {
        if (dcName.includes(location)) {
            return code
        }
    }
    return 'PST' // fallback to Pusat
}

/**
 * Get area code for a stokis by looking up their DC
 * Returns 'PST' for pusat-direct stokis (no DC)
 */
export async function getAreaCode(stokisId: string): Promise<string> {
    const stokis = await prisma.user.findUnique({
        where: { id: stokisId },
        select: {
            dcId: true,
            dc: { select: { name: true } }
        }
    })

    if (!stokis || !stokis.dcId || !stokis.dc) {
        return 'PST'
    }

    return getAreaCodeFromDCName(stokis.dc.name)
}

/**
 * Generate unique invoice number
 * Format: {AREA}-{S/M}-{DDMMYY}-{0001}
 * 
 * @param areaCode - Area code (BKL, JTG, MON, PKU, PLM, MKS, JTM, PST)
 * @param type - 'S' for Stokis, 'M' for Mitra
 */
export async function generateInvoiceNumber(areaCode: string, type: 'S' | 'M'): Promise<string> {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(-2)
    const dateStr = `${dd}${mm}${yy}`
    const prefix = `${areaCode}-${type}-${dateStr}-`

    // Count existing invoices with same prefix today for sequential numbering
    const count = await prisma.invoice.count({
        where: { invoiceNumber: { startsWith: prefix } }
    })
    const seq = String(count + 1).padStart(4, '0')
    return `${prefix}${seq}`
}

/**
 * Generate unique PO (order) number
 * Format: PO-{AREA}-{S/M}-{DDMMYY}-{0001}
 * 
 * @param areaCode - Area code (BKL, JTG, MON, PKU, PLM, MKS, JTM, PST)
 * @param type - 'S' for Stokis order, 'M' for Mitra order
 */
export async function generatePONumber(areaCode: string, type: 'S' | 'M'): Promise<string> {
    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yy = String(now.getFullYear()).slice(-2)
    const dateStr = `${dd}${mm}${yy}`
    const prefix = `PO-${areaCode}-${type}-${dateStr}-`

    // Count existing orders with same prefix from both tables
    const [stokisCount, mitraCount] = await Promise.all([
        prisma.stokisOrder.count({
            where: { orderNumber: { startsWith: prefix } }
        }),
        prisma.mitraOrder.count({
            where: { orderNumber: { startsWith: prefix } }
        })
    ])
    const seq = String(stokisCount + mitraCount + 1).padStart(4, '0')
    return `${prefix}${seq}`
}

/**
 * Calculate due date (20 days from now)
 */
export function calculateDueDate(): Date {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 20)
    return dueDate
}

/**
 * Generate invoice for a StokisOrder
 * Called when order status changes to PO_ISSUED
 */
export async function generateInvoice(orderId: string) {
    // Check if invoice already exists
    const existing = await prisma.invoice.findUnique({
        where: { orderId }
    })

    if (existing) {
        console.log(`Invoice already exists for order ${orderId}`)
        return existing
    }

    // Get order details with stokis info for area code
    const order = await prisma.stokisOrder.findUnique({
        where: { id: orderId },
        include: {
            stokis: {
                select: {
                    id: true,
                    dcId: true,
                    dc: { select: { name: true } }
                }
            },
            items: { include: { product: true } }
        }
    })

    if (!order) {
        throw new Error(`Order ${orderId} not found`)
    }

    // Determine area code from stokis DC
    const areaCode = order.stokis.dcId && order.stokis.dc
        ? getAreaCodeFromDCName(order.stokis.dc.name)
        : 'PST'

    // Create invoice with new format
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber: await generateInvoiceNumber(areaCode, 'S'),
            orderId: order.id,
            amount: order.totalAmount,
            dueDate: calculateDueDate(),
            status: 'UNPAID'
        }
    })

    console.log(`Invoice ${invoice.invoiceNumber} created for order ${order.orderNumber}`)
    return invoice
}

/**
 * Mark invoice as paid
 */
export async function markInvoiceAsPaid(invoiceId: string) {
    return await prisma.invoice.update({
        where: { id: invoiceId },
        data: {
            status: 'PAID',
            paidAt: new Date()
        }
    })
}

/**
 * Check and update overdue invoices
 */
export async function checkOverdueInvoices() {
    const now = new Date()

    const overdueInvoices = await prisma.invoice.updateMany({
        where: {
            status: 'UNPAID',
            dueDate: { lt: now }
        },
        data: {
            status: 'OVERDUE'
        }
    })

    console.log(`Updated ${overdueInvoices.count} invoices to OVERDUE`)
    return overdueInvoices.count
}

/**
 * Get invoices due in 7 days (for reminder)
 */
export async function getInvoicesDueSoon() {
    const now = new Date()
    const sevenDaysFromNow = new Date()
    sevenDaysFromNow.setDate(now.getDate() + 7)

    return await prisma.invoice.findMany({
        where: {
            status: 'UNPAID',
            dueDate: {
                gte: now,
                lte: sevenDaysFromNow
            }
        },
        include: {
            order: {
                include: {
                    stokis: true
                }
            }
        }
    })
}

// Bank details constant
export const BANK_DETAILS = {
    bank: 'BCA',
    accountNumber: '123456789',
    accountName: 'Dfresto'
}
