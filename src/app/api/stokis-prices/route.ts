
import { NextResponse } from "next/server"
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

export async function GET() {
    try {
        const prices = await prisma.stokisPrice.findMany({
            include: {
                stokis: {
                    select: {
                        id: true,
                        name: true,
                        address: true,
                    }
                },
                product: {
                    select: {
                        id: true,
                        name: true,
                        unit: true,
                        price: true
                    }
                }
            }
        })

        // Map address to province (simple heuristic or use address field directly)
        const formattedPrices = prices.map(p => ({
            ...p,
            stokis: {
                ...p.stokis,
                province: p.stokis.address // Ensure address is used as province or similar
            }
        }))

        return NextResponse.json(formattedPrices)
    } catch (error) {
        console.error("Error fetching stokis prices:", error)
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
    }
}
