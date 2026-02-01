import jsPDF from "jspdf"
import autoTable from "jspdf-autotable"

interface OrderData {
    orderNumber: string
    date: string
    customer: string
    status: string
    total: number
    items: { name: string; qty: number; price: number }[]
}

export function generateOrdersPDF(orders: OrderData[], title: string = "Laporan Order") {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(220, 38, 38) // Red
    doc.text("D'Fresto", 14, 20)

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(title, 14, 30)

    doc.setFontSize(10)
    doc.setTextColor(100, 100, 100)
    doc.text(`Tanggal Export: ${new Date().toLocaleDateString("id-ID")}`, 14, 38)

    // Table
    const tableData = orders.map((order) => [
        order.orderNumber,
        order.date,
        order.customer,
        order.status,
        formatCurrency(order.total),
    ])

    autoTable(doc, {
        startY: 45,
        head: [["No. Order", "Tanggal", "Customer", "Status", "Total"]],
        body: tableData,
        headStyles: {
            fillColor: [220, 38, 38],
            textColor: [255, 255, 255],
        },
        alternateRowStyles: {
            fillColor: [249, 250, 251],
        },
        styles: {
            fontSize: 9,
        },
    })

    // Summary
    const finalY = (doc as jsPDF & { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
    const totalAmount = orders.reduce((sum, o) => sum + o.total, 0)

    doc.setFontSize(12)
    doc.setTextColor(0, 0, 0)
    doc.text(`Total Order: ${orders.length}`, 14, finalY)
    doc.text(`Total Nilai: ${formatCurrency(totalAmount)}`, 14, finalY + 7)

    // Footer
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i)
        doc.setFontSize(8)
        doc.setTextColor(150, 150, 150)
        doc.text(
            `Halaman ${i} dari ${pageCount}`,
            doc.internal.pageSize.width / 2,
            doc.internal.pageSize.height - 10,
            { align: "center" }
        )
    }

    return doc.output("arraybuffer")
}

export function generateOrderDetailPDF(order: OrderData) {
    const doc = new jsPDF()

    // Header
    doc.setFontSize(20)
    doc.setTextColor(220, 38, 38)
    doc.text("D'Fresto", 14, 20)

    doc.setFontSize(14)
    doc.setTextColor(0, 0, 0)
    doc.text(`Invoice: ${order.orderNumber}`, 14, 30)

    // Order Info
    doc.setFontSize(10)
    doc.text(`Tanggal: ${order.date}`, 14, 45)
    doc.text(`Customer: ${order.customer}`, 14, 52)
    doc.text(`Status: ${order.status}`, 14, 59)

    // Items Table
    const tableData = order.items.map((item) => [
        item.name,
        item.qty.toString(),
        formatCurrency(item.price),
        formatCurrency(item.qty * item.price),
    ])

    autoTable(doc, {
        startY: 70,
        head: [["Produk", "Qty", "Harga", "Subtotal"]],
        body: tableData,
        headStyles: {
            fillColor: [220, 38, 38],
        },
        foot: [["", "", "Total", formatCurrency(order.total)]],
        footStyles: {
            fillColor: [249, 250, 251],
            textColor: [0, 0, 0],
            fontStyle: "bold",
        },
    })

    return doc.output("arraybuffer")
}

function formatCurrency(amount: number): string {
    return new Intl.NumberFormat("id-ID", {
        style: "currency",
        currency: "IDR",
        minimumFractionDigits: 0,
    }).format(amount)
}
