self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  
  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/icon-192x192.png',
    badge: data.badge || '/badge-72x72.png',
    image: data.image,
    tag: data.tag || 'default',
    data: data.data || {},
    actions: data.actions || [],
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Notification', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  const actionUrl = event.notification.data?.actionUrl || '/';
  
  event.waitUntil(
    clients.openWindow(actionUrl)
  );
});