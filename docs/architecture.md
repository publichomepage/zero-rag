# Architecture Guide

## Design Principles
NovaPlatform follows these core architectural principles:
1. **Convention over Configuration** - Sensible defaults that work out of the box
2. **Modular Design** - Independent, composable services
3. **Type Safety** - Full TypeScript support with strict mode
4. **Observable** - Built-in metrics, tracing, and logging
5. **Cloud Native** - Designed for containerized deployments

## Application Lifecycle
```
Bootstrap → Register Middleware → Register Routes → Connect Services → Start Server
    │              │                    │                  │              │
    └── Load       └── Logger,         └── API Routes,    └── DB,       └── Listen
        Config         Auth,               WebSocket         Redis,        on Port
                       CORS                Handlers          Queues
```

## Service Layer Pattern
NovaPlatform encourages a service layer pattern for business logic:

```
Route Handler → Service → Repository → Database
     │              │          │
     └── HTTP       └── Biz    └── Data
         concerns       logic      access
```

### Example
```typescript
// routes/users.ts - HTTP layer
router.get('/users/:id', authenticated(), async (ctx) => {
  const user = await UserService.getProfile(ctx.params.id);
  return { user };
});

// services/user.service.ts - Business logic
class UserService {
  async getProfile(id: string) {
    const user = await UserRepository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    const stats = await StatsService.getUserStats(id);
    return { ...user, stats };
  }
}

// repositories/user.repository.ts - Data access
class UserRepository {
  async findById(id: string) {
    return db('users').where('id', id).first();
  }
}
```

## Event System
NovaPlatform includes an event-driven architecture:

```typescript
import { events } from '@nova/core';

// Emit events
events.emit('user:created', { userId: '123', email: 'alice@example.com' });

// Listen for events
events.on('user:created', async (data) => {
  await EmailService.sendWelcome(data.email);
  await AnalyticsService.track('signup', data);
});
```

## Plugin System
Extend NovaPlatform with plugins:

```typescript
import { definePlugin } from '@nova/core';

const analyticsPlugin = definePlugin({
  name: 'analytics',
  version: '1.0.0',

  install(app) {
    app.use(async (ctx, next) => {
      await next();
      trackPageView(ctx.path, ctx.status);
    });

    app.addRoute('GET', '/analytics', async () => {
      return getAnalyticsData();
    });
  },
});

// Register the plugin
app.use(analyticsPlugin);
```

## WebSocket Support
NovaPlatform supports real-time communication:

```typescript
import { ws } from '@nova/core';

ws.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('message', (data) => {
    // Broadcast to all connected clients
    ws.broadcast('message', data);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});
```

## Queue System
Background job processing:

```typescript
import { queue } from '@nova/core';

// Define a job
queue.define('send-email', async (job) => {
  await EmailService.send(job.data.to, job.data.subject, job.data.body);
});

// Enqueue a job
await queue.add('send-email', {
  to: 'alice@example.com',
  subject: 'Welcome!',
  body: 'Thanks for signing up.',
});

// Schedule recurring jobs
queue.schedule('cleanup-expired-sessions', '0 */6 * * *'); // Every 6 hours
```
