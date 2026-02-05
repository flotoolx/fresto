import { prisma } from "./prisma"

// Province code mapping
const PROVINCE_CODES: Record<string, string> = {
    "Aceh": "ACEH",
    "Sumatera Utara": "SUMUT",
    "Sumatera Barat": "SUMBAR",
    "Riau": "RIAU",
    "Jambi": "JAMBI",
    "Sumatera Selatan": "SUMSEL",
    "Bengkulu": "BENGKULU",
    "Lampung": "LAMPUNG",
    "Kepulauan Bangka Belitung": "BABEL",
    "Kepulauan Riau": "KEPRI",
    "DKI Jakarta": "DKI",
    "Jawa Barat": "JABAR",
    "Jawa Tengah": "JATENG",
    "DI Yogyakarta": "DIY",
    "Jawa Timur": "JATIM",
    "Banten": "BANTEN",
    "Bali": "BALI",
    "Nusa Tenggara Barat": "NTB",
    "Nusa Tenggara Timur": "NTT",
    "Kalimantan Barat": "KALBAR",
    "Kalimantan Tengah": "KALTENG",
    "Kalimantan Selatan": "KALSEL",
    "Kalimantan Timur": "KALTIM",
    "Kalimantan Utara": "KALTARA",
    "Sulawesi Utara": "SULUT",
    "Sulawesi Tengah": "SULTENG",
    "Sulawesi Selatan": "SULSEL",
    "Sulawesi Tenggara": "SULTRA",
    "Gorontalo": "GORONTALO",
    "Sulawesi Barat": "SULBAR",
    "Maluku": "MALUKU",
    "Maluku Utara": "MALUT",
    "Papua": "PAPUA",
    "Papua Barat": "PAPBAR",
    "Papua Selatan": "PAPSEL",
    "Papua Tengah": "PAPTENG",
    "Papua Pegunungan": "PAPPEG",
    "Papua Barat Daya": "PAPBDAYA"
}

// Role prefix mapping
const ROLE_PREFIXES: Record<string, string> = {
    MITRA: "MTR",
    STOKIS: "STK",
    DC: "DC"
}

/**
 * Get province code from province name
 */
export function getProvinceCode(province: string): string {
    return PROVINCE_CODES[province] || province.toUpperCase().substring(0, 6).replace(/\s/g, "")
}

/**
 * Get all available provinces
 */
export function getProvinces(): string[] {
    return Object.keys(PROVINCE_CODES)
}

/**
 * Generate unique code for a user
 * Format: [ROLE_PREFIX]-[PROVINCE_CODE]-[NUMBER]
 * Example: MTR-JABAR-001, STK-DKI-002, DC-JATIM-003
 */
export async function generateUniqueCode(role: string, province: string): Promise<string> {
    const prefix = ROLE_PREFIXES[role]

    if (!prefix) {
        throw new Error(`Invalid role for unique code: ${role}`)
    }

    const provinceCode = getProvinceCode(province)

    // Count existing users with same role and province
    const count = await prisma.user.count({
        where: {
            role: role as "MITRA" | "STOKIS" | "DC",
            province: province
        }
    })

    // Generate next number (padded to 3 digits)
    const nextNumber = String(count + 1).padStart(3, "0")

    return `${prefix}-${provinceCode}-${nextNumber}`
}

/**
 * Update unique code for existing users (bulk)
 */
export async function updateExistingUsersCodes(): Promise<number> {
    let updated = 0

    const usersWithoutCode = await prisma.user.findMany({
        where: {
            uniqueCode: null,
            role: { in: ["MITRA", "STOKIS", "DC"] },
            province: { not: null }
        },
        select: { id: true, role: true, province: true }
    })

    for (const user of usersWithoutCode) {
        if (user.province) {
            const code = await generateUniqueCode(user.role, user.province)
            await prisma.user.update({
                where: { id: user.id },
                data: { uniqueCode: code }
            })
            updated++
        }
    }

    return updated
}

/**
 * Generate display code for export (fallback if no uniqueCode)
 */
export function getDisplayCode(user: { role: string; province?: string | null; uniqueCode?: string | null }, index: number): string {
    if (user.uniqueCode) return user.uniqueCode

    const prefix = ROLE_PREFIXES[user.role] || user.role.substring(0, 3).toUpperCase()
    const provinceCode = user.province ? getProvinceCode(user.province) : "---"

    return `${prefix}-${provinceCode}-${String(index + 1).padStart(3, "0")}`
}
