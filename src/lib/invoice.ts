import { prisma } from './prisma'

/**
 * Generate unique invoice number
 * Format: INV-YYYYMMDD-XXX
 */
export function generateInvoiceNumber(): string {
    const date = new Date()
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '')
    const random = Math.random().toString(36).substring(2, 5).toUpperCase()
    return `INV-${dateStr}-${random}`
}

/**
 * Calculate due date (14 days from now)
 */
export function calculateDueDate(): Date {
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 14)
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

    // Get order details
    const order = await prisma.stokisOrder.findUnique({
        where: { id: orderId },
        include: {
            stokis: true,
            items: { include: { product: true } }
        }
    })

    if (!order) {
        throw new Error(`Order ${orderId} not found`)
    }

    // Create invoice
    const invoice = await prisma.invoice.create({
        data: {
            invoiceNumber: generateInvoiceNumber(),
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
