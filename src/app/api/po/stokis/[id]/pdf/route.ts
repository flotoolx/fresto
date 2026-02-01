import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { jsPDF } from "jspdf"

// GET - Generate PDF for Stokis Order
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

        const order = await prisma.stokisOrder.findUnique({
            where: { id },
            include: {
                stokis: { select: { name: true, address: true, phone: true } },
                items: {
                    include: {
                        product: true
                    }
                }
            }
        })

        if (!order) {
            return NextResponse.json({ error: "Order tidak ditemukan" }, { status: 404 })
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

        doc.setFontSize(18)
        doc.setFont("helvetica", "bold")
        doc.text("PURCHASE ORDER", pageWidth - 14, 20, { align: "right" })

        doc.setFontSize(12)
        doc.setFont("helvetica", "normal")
        doc.text(order.orderNumber, pageWidth - 14, 28, { align: "right" })

        // Line separator
        doc.setLineWidth(0.5)
        doc.line(14, 32, pageWidth - 14, 32)

        // From/To section
        let y = 42

        doc.setFontSize(10)
        doc.setFont("helvetica", "bold")
        doc.text("DARI:", 14, y)
        doc.text("KEPADA:", pageWidth / 2 + 10, y)

        y += 6
        doc.setFont("helvetica", "normal")
        doc.text(order.stokis.name, 14, y)
        doc.text("D'Fresto Pusat", pageWidth / 2 + 10, y)

        if (order.stokis.address) {
            y += 5
            doc.setFontSize(9)
            doc.text(order.stokis.address, 14, y)
            doc.text("Jl. Pusat No. 1, Jakarta", pageWidth / 2 + 10, y)
        }

        // Date and Status
        y += 15
        doc.setFontSize(10)
        doc.text(`Tanggal: ${new Date(order.createdAt).toLocaleDateString("id-ID")}`, 14, y)
        doc.text(`Status: ${order.status.replace(/_/g, " ")}`, pageWidth / 2, y)

        if (order.poIssuedAt) {
            y += 6
            doc.text(`PO Diterbitkan: ${new Date(order.poIssuedAt).toLocaleDateString("id-ID")}`, 14, y)
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
        doc.text("Nama Produk", 50, y)
        doc.text("Qty", 120, y)
        doc.text("Satuan", 135, y)
        doc.text("Harga", 155, y)
        doc.text("Subtotal", pageWidth - 16, y, { align: "right" })

        doc.setTextColor(0, 0, 0)
        doc.setFont("helvetica", "normal")

        y += 8

        // Table rows
        order.items.forEach((item, idx) => {
            const subtotal = Number(item.price) * item.quantity
            const bgColor = idx % 2 === 0 ? 245 : 255
            doc.setFillColor(bgColor, bgColor, bgColor)
            doc.rect(14, y - 4, pageWidth - 28, 7, "F")

            doc.text(`${idx + 1}`, 16, y)
            doc.text(item.product.sku, 26, y)
            doc.text(item.product.name.substring(0, 30), 50, y)
            doc.text(`${item.quantity}`, 120, y)
            doc.text(item.product.unit, 135, y)
            doc.text(formatCurrency(Number(item.price)), 155, y)
            doc.text(formatCurrency(subtotal), pageWidth - 16, y, { align: "right" })

            y += 7
        })

        // Total
        doc.setFillColor(50, 50, 50)
        doc.rect(14, y - 4, pageWidth - 28, 8, "F")
        doc.setTextColor(255, 255, 255)
        doc.setFont("helvetica", "bold")
        doc.text("TOTAL:", 155, y)
        doc.text(formatCurrency(Number(order.totalAmount)), pageWidth - 16, y, { align: "right" })

        doc.setTextColor(0, 0, 0)

        // Notes
        if (order.notes) {
            y += 15
            doc.setFont("helvetica", "bold")
            doc.text("Catatan:", 14, y)
            doc.setFont("helvetica", "normal")
            y += 5
            doc.text(order.notes, 14, y)
        }

        // Approval section
        y += 20
        doc.setFont("helvetica", "bold")
        doc.setFontSize(10)
        doc.text("Riwayat Approval:", 14, y)
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)

        y += 7
        if (order.pusatApproveAt) {
            doc.text(`- Pusat Approve: ${new Date(order.pusatApproveAt).toLocaleString("id-ID")}`, 14, y)
            y += 5
        }
        if (order.financeApproveAt) {
            doc.text(`- Finance Approve: ${new Date(order.financeApproveAt).toLocaleString("id-ID")}`, 14, y)
            y += 5
        }
        if (order.shippedAt) {
            doc.text(`- Dikirim: ${new Date(order.shippedAt).toLocaleString("id-ID")}`, 14, y)
            y += 5
        }
        if (order.receivedAt) {
            doc.text(`- Diterima: ${new Date(order.receivedAt).toLocaleString("id-ID")}`, 14, y)
        }

        // Signature section
        y += 25
        doc.setFont("helvetica", "normal")
        doc.setFontSize(9)

        const sigWidth = (pageWidth - 28) / 3

        doc.text("Dibuat oleh:", 14, y)
        doc.text("Disetujui oleh:", 14 + sigWidth, y)
        doc.text("Diterima oleh:", 14 + sigWidth * 2, y)

        y += 25
        doc.line(14, y, 14 + sigWidth - 10, y)
        doc.line(14 + sigWidth, y, 14 + sigWidth * 2 - 10, y)
        doc.line(14 + sigWidth * 2, y, pageWidth - 14, y)

        y += 5
        doc.text(order.stokis.name, 14, y)
        doc.text("Finance / Pusat", 14 + sigWidth, y)
        doc.text("Gudang", 14 + sigWidth * 2, y)

        // Footer
        y = doc.internal.pageSize.getHeight() - 10
        doc.setFontSize(8)
        doc.setTextColor(128, 128, 128)
        doc.text(`Dicetak dari sistem D'Fresto pada ${new Date().toLocaleString("id-ID")}`, pageWidth / 2, y, { align: "center" })

        // Generate PDF buffer
        const pdfBuffer = Buffer.from(doc.output("arraybuffer"))

        return new NextResponse(pdfBuffer, {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="PO-${order.orderNumber}.pdf"`
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
