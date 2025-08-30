# Push Notification Service

The Push Notification Service provides functionality for sending web push notifications to subscribed clients using the Web Push protocol.

## Setup

### 1. Generate VAPID Keys

To use push notifications, you need to generate VAPID keys:

```bash
cd apps/api
pnpm run generate-vapid-keys
```

This will output public and private keys that you need to add to your environment variables.

### 2. Environment Configuration

Add the following to your `.env` file:

```env
VAPID_PUBLIC_KEY=your-public-vapid-key
VAPID_PRIVATE_KEY=your-private-vapid-key
PUSH_SUBJECT=mailto:admin@yourdomain.com
```

## Usage

### Subscribing a User

```typescript
import { pushService } from '../services/push.service';

// Subscribe a user to push notifications
const subscription = {
  endpoint: 'https://example.com/push/endpoint',
  keys: {
    p256dh: 'user-public-key',
    auth: 'user-auth-key'
  }
};

await pushService.subscribe(userId, subscription);
```

### Unsubscribing a User

```typescript
// Unsubscribe a user from push notifications
await pushService.unsubscribe(subscription.endpoint);
```

### Sending Notifications

#### Send to a Specific Subscription

```typescript
const payload = {
  title: 'Hello World',
  body: 'This is a test notification',
  icon: '/icon.png',
  badge: '/badge.png',
  data: {
    url: '/notifications/123'
  }
};

await pushService.sendNotification(subscription, payload);
```

#### Send to All User Subscriptions

```typescript
const payload = {
  title: 'New Message',
  body: 'You have a new message from John',
  data: {
    url: '/messages/456',
    type: 'NEW_MESSAGE'
  }
};

const successfulSends = await pushService.sendToUser(userId, payload);
console.log(`Successfully sent to ${successfulSends} devices`);
```

## Error Handling

The service automatically handles expired subscriptions by removing them from the database when a `410 Gone` status code is received from the push service.

## Testing

Run the push service tests:

```bash
cd apps/api
pnpm test push
```

## Implementation Details

The service uses the following Prisma model for storing subscriptions:

```prisma
model PushSubscription {
  id        String   @id @default(cuid())
  userId    String   @map("user_id")
  user      User     @relation(fields: [userId], references: [id])
  endpoint  String   @unique
  keys      Json     // Contains p256dh and auth keys
  createdAt DateTime @default(now()) @map("created_at")

  @@index([userId])
  @@map("push_subscriptions")
}
```

The service handles:
- Storing and updating push subscriptions
- Sending notifications to individual subscriptions
- Broadcasting notifications to all user subscriptions
- Automatically removing expired subscriptions
- Proper error handling and logging