import * as XLSX from "xlsx"

interface OrderData {
    orderNumber: string
    date: string
    customer: string
    status: string
    total: number
    items?: { name: string; qty: number; price: number }[]
}

export function generateOrdersExcel(orders: OrderData[], sheetName: string = "Orders") {
    // Prepare data
    const data = orders.map((order) => ({
        "No. Order": order.orderNumber,
        Tanggal: order.date,
        Customer: order.customer,
        Status: order.status,
        Total: order.total,
    }))

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)

    // Set column widths
    ws["!cols"] = [
        { wch: 15 }, // No. Order
        { wch: 12 }, // Tanggal
        { wch: 25 }, // Customer
        { wch: 12 }, // Status
        { wch: 15 }, // Total
    ]

    // Add to workbook
    XLSX.utils.book_append_sheet(wb, ws, sheetName)

    // Generate buffer
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    return buffer
}

export function generateOrderDetailExcel(order: OrderData) {
    const wb = XLSX.utils.book_new()

    // Order Info Sheet
    const infoData = [
        { Field: "No. Order", Value: order.orderNumber },
        { Field: "Tanggal", Value: order.date },
        { Field: "Customer", Value: order.customer },
        { Field: "Status", Value: order.status },
        { Field: "Total", Value: order.total },
    ]
    const infoWs = XLSX.utils.json_to_sheet(infoData)
    infoWs["!cols"] = [{ wch: 15 }, { wch: 30 }]
    XLSX.utils.book_append_sheet(wb, infoWs, "Info")

    // Items Sheet
    if (order.items && order.items.length > 0) {
        const itemsData = order.items.map((item) => ({
            Produk: item.name,
            Qty: item.qty,
            Harga: item.price,
            Subtotal: item.qty * item.price,
        }))
        const itemsWs = XLSX.utils.json_to_sheet(itemsData)
        itemsWs["!cols"] = [{ wch: 30 }, { wch: 8 }, { wch: 15 }, { wch: 15 }]
        XLSX.utils.book_append_sheet(wb, itemsWs, "Items")
    }

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
    return buffer
}

export function generateUsersExcel(
    users: { name: string; email: string; role: string; createdAt: string }[]
) {
    const data = users.map((user) => ({
        Nama: user.name,
        Email: user.email,
        Role: user.role,
        "Terdaftar Sejak": user.createdAt,
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws["!cols"] = [{ wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 15 }]
    XLSX.utils.book_append_sheet(wb, ws, "Users")

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
}

export function generateInventoryExcel(
    inventory: { product: string; sku: string; gudang: string; qty: number; minStock: number }[]
) {
    const data = inventory.map((item) => ({
        Produk: item.product,
        SKU: item.sku,
        Gudang: item.gudang,
        Stok: item.qty,
        "Min. Stok": item.minStock,
        Status: item.qty <= item.minStock ? "LOW STOCK" : "OK",
    }))

    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.json_to_sheet(data)
    ws["!cols"] = [{ wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }, { wch: 12 }]
    XLSX.utils.book_append_sheet(wb, ws, "Inventory")

    return XLSX.write(wb, { type: "buffer", bookType: "xlsx" })
}
