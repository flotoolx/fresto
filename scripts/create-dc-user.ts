import { PrismaClient } from "@prisma/client"
import * as bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function createDCUser() {
    try {
        const hashedPassword = await bcrypt.hash("dc123456", 10)

        const dcUser = await prisma.user.create({
            data: {
                name: "DC Jakarta Pusat",
                email: "dc.jakarta@dfresto.com",
                password: hashedPassword,
                role: "DC",
                phone: "081234567890",
                address: "Jakarta Pusat, DKI Jakarta",
                isActive: true,
            }
        })

        console.log("✅ DC User created successfully:")
        console.log("-----------------------------------")
        console.log("Name:", dcUser.name)
        console.log("Email:", dcUser.email)
        console.log("Password: dc123456")
        console.log("Role:", dcUser.role)
        console.log("-----------------------------------")
    } catch (error) {
        console.error("❌ Error creating DC user:", error)
    } finally {
        await prisma.$disconnect()
    }
}

createDCUser()
