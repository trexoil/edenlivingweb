/* Firebase Messaging SW (scaffold)
 * Fill your Firebase config below (public keys), then rebuild.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js');

// TODO: Replace with your Firebase project config (public)
const firebaseConfig = {
  apiKey: 'REPLACE_ME',
  authDomain: 'REPLACE_ME.firebaseapp.com',
  projectId: 'REPLACE_ME',
  storageBucket: 'REPLACE_ME.appspot.com',
  messagingSenderId: 'REPLACE_ME',
  appId: 'REPLACE_ME',
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  // Handle background messages
  messaging.onBackgroundMessage(function(payload) {
    console.log('[firebase-messaging-sw.js] Received background message ', payload)

    const notificationTitle = payload?.notification?.title || 'Eden Living';

    // Determine click action based on message type
    let url = '/'
    if (payload.data?.type === 'sos_emergency') {
      // For SOS emergency, navigate to join page with room name
      const roomName = payload.data?.room_name || ''
      url = `/sos/join?room=${roomName}`
    } else if (payload.data?.type === 'service_request_assigned') {
      url = '/department'
    } else if (payload.data?.type === 'manual_review_required') {
      url = '/admin/service-requests'
    } else if (payload.data?.type === 'service_completed') {
      url = '/dashboard'
    } else if (payload.data?.type === 'kitchen_order_new') {
      url = '/kitchen'
    } else if (payload.data?.type === 'order_completed') {
      url = '/dashboard'
    }

    const notificationOptions = {
      body: payload?.notification?.body || 'New update',
      icon: '/vercel.svg',
      badge: '/vercel.svg',
      data: {
        url,
        ...payload.data
      },
      actions: [
        {
          action: 'open',
          title: 'Open'
        },
        {
          action: 'close',
          title: 'Close'
        }
      ]
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  // SW init can be deferred until config is filled
  console.warn('[FCM SW] Initialization skipped/misconfigured:', e);
}

// Handle notification clicks
self.addEventListener('notificationclick', event => {
  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const url = event.notification.data?.url || '/'

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Check if there's already a window/tab open
      for (const client of clientList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }

      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(url)
      }
    })
  )
})

