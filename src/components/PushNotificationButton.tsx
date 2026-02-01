"use client"

import { useEffect, useState, useCallback } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"

interface PushNotificationButtonProps {
    className?: string
    showLabel?: boolean
}

export default function PushNotificationButton({
    className = "",
    showLabel = true
}: PushNotificationButtonProps) {
    const [supported, setSupported] = useState(false)
    const [subscribed, setSubscribed] = useState(false)
    const [loading, setLoading] = useState(true)
    const [permission, setPermission] = useState<NotificationPermission>("default")

    const checkSubscription = useCallback(async () => {
        try {
            // Check if service worker is registered
            const registration = await navigator.serviceWorker.getRegistration()
            if (!registration) {
                setSubscribed(false)
                return
            }

            // Check push subscription
            const subscription = await registration.pushManager.getSubscription()
            setSubscribed(!!subscription)

            // Also check server status
            const res = await fetch("/api/push/subscribe")
            if (res.ok) {
                const data = await res.json()
                setSubscribed(data.subscribed)
            }
        } catch (error) {
            console.error("Error checking subscription:", error)
        }
    }, [])

    useEffect(() => {
        // Check browser support
        if ("serviceWorker" in navigator && "PushManager" in window && "Notification" in window) {
            setSupported(true)
            setPermission(Notification.permission)
            checkSubscription()
        }
        setLoading(false)
    }, [checkSubscription])

    const subscribe = async () => {
        setLoading(true)
        try {
            // Register service worker
            const registration = await navigator.serviceWorker.register("/sw.js")
            await navigator.serviceWorker.ready

            // Request notification permission
            const perm = await Notification.requestPermission()
            setPermission(perm)

            if (perm !== "granted") {
                alert("Izin notifikasi ditolak. Aktifkan di pengaturan browser.")
                setLoading(false)
                return
            }

            // Get VAPID public key from server
            const statusRes = await fetch("/api/push/subscribe")
            const { vapidPublicKey } = await statusRes.json()

            if (!vapidPublicKey) {
                console.error("VAPID public key not configured")
                alert("Push notification belum dikonfigurasi. Hubungi admin.")
                setLoading(false)
                return
            }

            // Subscribe to push manager
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource
            })

            // Send subscription to server
            const res = await fetch("/api/push/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(subscription.toJSON())
            })

            if (res.ok) {
                setSubscribed(true)
                // Show test notification
                new Notification("🍗 D'Fresto", {
                    body: "Notifikasi berhasil diaktifkan!",
                    icon: "/icon-192x192.png"
                })
            }
        } catch (error) {
            console.error("Subscribe error:", error)
            alert("Gagal mengaktifkan notifikasi. Coba lagi.")
        } finally {
            setLoading(false)
        }
    }

    const unsubscribe = async () => {
        setLoading(true)
        try {
            const registration = await navigator.serviceWorker.getRegistration()
            if (registration) {
                const subscription = await registration.pushManager.getSubscription()
                if (subscription) {
                    await subscription.unsubscribe()

                    // Remove from server
                    await fetch("/api/push/subscribe", {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ endpoint: subscription.endpoint })
                    })
                }
            }
            setSubscribed(false)
        } catch (error) {
            console.error("Unsubscribe error:", error)
        } finally {
            setLoading(false)
        }
    }

    // Don't render if not supported
    if (!supported) return null

    const handleClick = () => {
        if (subscribed) {
            unsubscribe()
        } else {
            subscribe()
        }
    }

    return (
        <button
            onClick={handleClick}
            disabled={loading || permission === "denied"}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${subscribed
                ? "bg-green-100 text-green-700 hover:bg-green-200"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                } disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
            title={
                permission === "denied"
                    ? "Notifikasi diblokir di browser"
                    : subscribed ? "Matikan notifikasi" : "Aktifkan notifikasi"
            }
        >
            {loading ? (
                <Loader2 size={18} className="animate-spin" />
            ) : subscribed ? (
                <Bell size={18} className="text-green-600" />
            ) : (
                <BellOff size={18} />
            )}
            {showLabel && (
                <span className="text-sm font-medium">
                    {loading
                        ? "Loading..."
                        : permission === "denied"
                            ? "Blocked"
                            : subscribed
                                ? "Notifikasi On"
                                : "Notifikasi Off"
                    }
                </span>
            )}
        </button>
    )
}

// Helper to convert base64 to Uint8Array for VAPID key
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
    const base64 = (base64String + padding)
        .replace(/-/g, "+")
        .replace(/_/g, "/")

    const rawData = window.atob(base64)
    const outputArray = new Uint8Array(rawData.length)

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i)
    }
    return outputArray
}
