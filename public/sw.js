// Service Worker for push notifications
self.addEventListener('push', (event) => {
    const data = event.data?.json() || {}
    
    const options = {
        body: data.body || 'Notifikasi baru dari D\'Fresto',
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'dfresto-notification',
        renotify: true,
        data: {
            url: data.url || '/dashboard'
        },
        actions: [
            { action: 'view', title: '👀 Lihat' },
            { action: 'close', title: '✕ Tutup' }
        ]
    }
    
    event.waitUntil(
        self.registration.showNotification(data.title || '🍗 D\'Fresto', options)
    )
})

self.addEventListener('notificationclick', (event) => {
    event.notification.close()
    
    if (event.action === 'view' || !event.action) {
        const url = event.notification.data?.url || '/dashboard'
        event.waitUntil(
            clients.matchAll({ type: 'window', includeUncontrolled: true })
                .then((clientList) => {
                    // Check if there's already a window open
                    for (const client of clientList) {
                        if (client.url.includes('/dashboard') && 'focus' in client) {
                            client.navigate(url)
                            return client.focus()
                        }
                    }
                    // Open new window if none exists
                    if (clients.openWindow) {
                        return clients.openWindow(url)
                    }
                })
        )
    }
})

// Background sync for offline support
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-notifications') {
        event.waitUntil(
            // Handle any queued notifications
            Promise.resolve()
        )
    }
})

// Install event
self.addEventListener('install', (event) => {
    console.log('Service Worker installed')
    self.skipWaiting()
})

// Activate event
self.addEventListener('activate', (event) => {
    console.log('Service Worker activated')
    event.waitUntil(clients.claim())
})
