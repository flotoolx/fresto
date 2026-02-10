import "next-auth"
import { Role } from "@prisma/client"

declare module "next-auth" {
    interface User {
        id: string
        role: Role
        stokisId: string | null
        gudangId: string | null
        dcId: string | null
    }

    interface Session {
        user: {
            id: string
            email: string
            name: string
            role: string
            stokisId: string | null
            gudangId: string | null
            dcId: string | null
        }
    }
}

declare module "next-auth/jwt" {
    interface JWT {
        id: string
        role: string
        stokisId: string | null
        gudangId: string | null
        dcId: string | null
    }
}
