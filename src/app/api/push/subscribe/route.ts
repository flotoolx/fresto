import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

// POST - Subscribe to push notifications
export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const subscription = await request.json()
        const subscriptionString = JSON.stringify(subscription)

        // Check if already exists
        const existing = await prisma.pushSubscription.findFirst({
            where: {
                userId: session.user.id,
                subscription: subscriptionString
            }
        })

        if (existing) {
            return NextResponse.json({ success: true, message: 'Already subscribed' })
        }

        // Save subscription to database
        await prisma.pushSubscription.create({
            data: {
                userId: session.user.id,
                subscription: subscriptionString
            }
        })

        console.log(`Push subscription created for user ${session.user.id}`)
        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('Push subscribe error:', error)
        return NextResponse.json({ error: 'Failed to subscribe' }, { status: 500 })
    }
}

// DELETE - Unsubscribe from push notifications
export async function DELETE(request: Request) {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const { endpoint } = await request.json()

        // Delete all subscriptions for this user with matching endpoint
        const deleted = await prisma.pushSubscription.deleteMany({
            where: {
                userId: session.user.id,
                subscription: {
                    contains: endpoint
                }
            }
        })

        console.log(`Deleted ${deleted.count} push subscriptions for user ${session.user.id}`)
        return NextResponse.json({ success: true, deleted: deleted.count })
    } catch (error) {
        console.error('Push unsubscribe error:', error)
        return NextResponse.json({ error: 'Failed to unsubscribe' }, { status: 500 })
    }
}

// GET - Check subscription status
export async function GET() {
    try {
        const session = await getServerSession(authOptions)
        if (!session?.user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }

        const count = await prisma.pushSubscription.count({
            where: { userId: session.user.id }
        })

        return NextResponse.json({
            subscribed: count > 0,
            count,
            vapidPublicKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        })
    } catch (error) {
        console.error('Push status error:', error)
        return NextResponse.json({ error: 'Failed to check status' }, { status: 500 })
    }
}
