import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"
import { BANK_DETAILS } from "@/lib/invoice"

// GET - Generate and download PDF
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const session = await getServerSession(authOptions)
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const { id } = await params

        const invoice = await prisma.invoice.findUnique({
            where: { id },
            include: {
                order: {
                    include: {
                        stokis: { select: { name: true, email: true, phone: true, address: true } },
                        items: {
                            include: {
                                product: true
                            }
                        }
                    }
                }
            }
        })

        if (!invoice) {
            return NextResponse.json({ error: "Invoice tidak ditemukan" }, { status: 404 })
        }

        // Generate PDF
        const doc = new jsPDF()
        const pageWidth = doc.internal.pageSize.getWidth()

        // Header
        doc.setFontSize(24)
        doc.setFont("helvetica", "bold")
        doc.text("D'Fresto", 14, 20)

        doc.setFontSize(10)
        doc.setFont("helvetica", "normal")
        doc.text("Franchise Ayam Goreng Premium", 14, 26)

        doc.setFontSize(20)
        doc.setFont("helvetica", "bold")
        doc.setTextColor(220, 38, 38)
        doc.text("INVOICE", pageWidth - 14, 20, { align: "right" })

        doc.setTextColor(0, 0, 0)
        doc.setFontSize(11)
        doc.setFont("helvetica", "normal")
        doc.text(invoice.invoiceNumber, pageWidth - 14, 28, { align: "right" })

        // Line separator
        doc.setLineWidth(0.5)
        doc.line(14, 34, pageWidth - 14, 34)

        // Invoice details
        let y = 44
        doc.setFontSize(10)
        doc.text(`Order #: ${invoice.order.orderNumber}`, 14, y)
        doc.text(`Tanggal: ${formatDate(invoice.createdAt)}`, pageWidth - 14, y, { align: "right" })

        y += 6
        doc.text(`Jatuh Tempo: ${formatDate(invoice.dueDate)}`, 14, y)

        // Status badge
        const statusText = invoice.status
        const statusColor = invoice.status === "PAID" ? [34, 197, 94] :
            invoice.status === "OVERDUE" ? [239, 68, 68] : [234, 179, 8]
        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2])
        doc.roundedRect(pageWidth - 40, y - 4, 26, 7, 1, 1, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(8)
        doc.setFont("helvetica", "bold")
        doc.text(statusText, pageWidth - 27, y, { align: "center" })

        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")

        // Bill To / From section
        y += 15
        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("TAGIHAN KEPADA:", 14, y)
        doc.text("DARI:", pageWidth / 2 + 10, y)

        y += 6
        doc.setFont("helvetica", "normal")
        doc.text(invoice.order.stokis.name, 14, y)
        doc.text("D'Fresto Pusat", pageWidth / 2 + 10, y)

        y += 5
        doc.setFontSize(9)
        if (invoice.order.stokis.address) {
            doc.text(invoice.order.stokis.address, 14, y)
        }
        doc.text("Jl. Pusat No. 1, Jakarta", pageWidth / 2 + 10, y)

        y += 5
        if (invoice.order.stokis.phone) {
            doc.text(`Tel: ${invoice.order.stokis.phone}`, 14, y)
        }
        if (invoice.order.stokis.email) {
            y += 5
            doc.text(invoice.order.stokis.email, 14, y)
        }

        // Items table
        y += 15

        // Table header
        doc.setFillColor(50, 50, 50)
        doc.rect(14, y - 5, pageWidth - 28, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.setFontSize(9)
        doc.text("No", 16, y)
        doc.text("SKU", 26, y)
        doc.text("Produk", 50, y)
        doc.text("Qty", 120, y)
        doc.text("Harga", 140, y)
        doc.text("Subtotal", pageWidth - 16, y, { align: "right" })

        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")

        y += 8

        // Table rows
        invoice.order.items.forEach((item, idx) => {
            const subtotal = Number(item.price) * item.quantity
            const bgColor = idx % 2 === 0 ? 245 : 255
            doc.setFillColor(bgColor, bgColor, bgColor)
            doc.rect(14, y - 4, pageWidth - 28, 7, "F")

            doc.text(`${idx + 1}`, 16, y)
            doc.text(item.product.sku, 26, y)
            doc.text(item.product.name.substring(0, 30), 50, y)
            doc.text(`${item.quantity}`, 120, y)
            doc.text(formatCurrency(Number(item.price)), 140, y)
            doc.text(formatCurrency(subtotal), pageWidth - 16, y, { align: "right" })

            y += 7
        })

        // Total
        doc.setFillColor(50, 50, 50)
        doc.rect(14, y - 4, pageWidth - 28, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text("TOTAL:", 140, y)
        doc.text(formatCurrency(Number(invoice.amount)), pageWidth - 16, y, { align: "right" })

        doc.setTextColor(0, 0, 0)

        // Payment info
        y += 20
        doc.setFillColor(240, 240, 240)
        doc.rect(14, y - 5, pageWidth - 28, 30, "F")

        y += 2
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.text("Pembayaran ke:", 18, y)

        y += 7
        doc.setFont("helvetica", "normal")
        doc.text(`Bank ${BANK_DETAILS.bank} - ${BANK_DETAILS.accountNumber}`, 18, y)
        y += 5
        doc.text(`a.n. ${BANK_DETAILS.accountName}`, 18, y)
        y += 7
        doc.setFontSize(9)
        doc.setTextColor(100, 100, 100)
        doc.text("*Mohon sertakan nomor invoice saat transfer", 18, y)

        doc.setTextColor(0, 0, 0)

        // Footer
        y = doc.internal.pageSize.getHeight() - 15
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(`Dicetak dari sistem D'Fresto pada ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, y, { align: "center" })

        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${invoice.invoiceNumber}.pdf"`
            }
        })
    } catch (error) {
        console.error("Error generating PDF:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount).replace("IDR", "Rp")
}

function formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric"
    })
}
