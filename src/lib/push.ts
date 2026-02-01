import webpush from 'web-push'
import { prisma } from './prisma'
import { Role } from '@prisma/client'

// Configure web-push with VAPID details
if (process.env.VAPID_PRIVATE_KEY && process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    webpush.setVapidDetails(
        `mailto:${process.env.VAPID_EMAIL || 'admin@dfresto.com'}`,
        process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
        process.env.VAPID_PRIVATE_KEY
    )
}

export interface PushPayload {
    title: string
    body: string
    url?: string
    tag?: string
}

/**
 * Send push notification to a specific user
 */
export async function sendPushToUser(userId: string, payload: PushPayload) {
    try {
        const subscriptions = await prisma.pushSubscription.findMany({
            where: { userId }
        })

        if (subscriptions.length === 0) {
            console.log(`No push subscriptions for user ${userId}`)
            return { success: false, reason: 'no_subscriptions' }
        }

        const results = await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webpush.sendNotification(
                        JSON.parse(sub.subscription),
                        JSON.stringify(payload)
                    )
                    return { id: sub.id, success: true }
                } catch (error: unknown) {
                    const err = error as { statusCode?: number }
                    // If subscription expired (410 Gone), delete it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await prisma.pushSubscription.delete({ where: { id: sub.id } })
                        console.log(`Deleted expired subscription ${sub.id}`)
                    }
                    return { id: sub.id, success: false, error }
                }
            })
        )

        const successful = results.filter(r => r.status === 'fulfilled').length
        console.log(`Push sent to ${successful}/${subscriptions.length} devices for user ${userId}`)

        return { success: true, sent: successful, total: subscriptions.length }
    } catch (error) {
        console.error('Error sending push notification:', error)
        return { success: false, error }
    }
}

/**
 * Send push notification to all users with a specific role
 */
export async function sendPushToRole(role: Role, payload: PushPayload) {
    try {
        const users = await prisma.user.findMany({
            where: { role },
            select: { id: true }
        })

        const results = await Promise.allSettled(
            users.map(user => sendPushToUser(user.id, payload))
        )

        const successful = results.filter(r =>
            r.status === 'fulfilled' && (r.value as { success: boolean }).success
        ).length

        console.log(`Push sent to ${successful}/${users.length} users with role ${role}`)
        return { success: true, sent: successful, total: users.length }
    } catch (error) {
        console.error('Error sending push to role:', error)
        return { success: false, error }
    }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
    const results = await Promise.allSettled(
        userIds.map(userId => sendPushToUser(userId, payload))
    )

    const successful = results.filter(r =>
        r.status === 'fulfilled' && (r.value as { success: boolean }).success
    ).length

    return { success: true, sent: successful, total: userIds.length }
}

// Notification templates
export const PushTemplates = {
    newOrder: (orderNumber: string, mitraName: string, amount: string) => ({
        title: '🍗 Order Baru!',
        body: `${mitraName} membuat order ${orderNumber} - ${amount}`,
        url: '/dashboard/order-mitra',
        tag: 'new-order'
    }),

    orderApproved: (orderNumber: string) => ({
        title: '✅ Order Disetujui',
        body: `Order ${orderNumber} telah disetujui dan sedang diproses`,
        url: '/dashboard/history',
        tag: 'order-status'
    }),

    orderShipped: (orderNumber: string) => ({
        title: '📦 Pesanan Dikirim',
        body: `Order ${orderNumber} sedang dalam perjalanan`,
        url: '/dashboard/history',
        tag: 'order-status'
    }),

    orderReceived: (orderNumber: string) => ({
        title: '🎉 Pesanan Diterima',
        body: `Order ${orderNumber} telah dikonfirmasi diterima`,
        url: '/dashboard/order-mitra',
        tag: 'order-status'
    }),

    lowStock: (productName: string, quantity: number) => ({
        title: '⚠️ Stok Menipis',
        body: `${productName} tersisa ${quantity} unit`,
        url: '/dashboard/inventory',
        tag: 'low-stock'
    }),

    poApproved: (orderNumber: string) => ({
        title: '📋 PO Disetujui',
        body: `PO ${orderNumber} siap diproses`,
        url: '/dashboard/po-masuk',
        tag: 'po-status'
    }),

    poNeedsApproval: (orderNumber: string, stokisName: string) => ({
        title: '🔔 PO Perlu Approval',
        body: `PO ${orderNumber} dari ${stokisName} menunggu persetujuan`,
        url: '/dashboard/approve-po',
        tag: 'po-pending'
    })
}
