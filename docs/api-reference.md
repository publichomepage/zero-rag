# API Reference

## Router
The NovaPlatform router handles all HTTP request routing.

### `router.get(path, ...middleware, handler)`
Register a GET route handler.

```typescript
router.get('/users', async (ctx) => {
  const users = await UserService.findAll();
  return { users };
});
```

### `router.post(path, ...middleware, handler)`
Register a POST route handler.

```typescript
router.post('/users', validate(userSchema), async (ctx) => {
  const user = await UserService.create(ctx.body);
  ctx.status = 201;
  return { user };
});
```

### `router.put(path, ...middleware, handler)`
Register a PUT route handler for full resource updates.

### `router.patch(path, ...middleware, handler)`
Register a PATCH route handler for partial updates.

### `router.delete(path, ...middleware, handler)`
Register a DELETE route handler.

## Context Object (ctx)
Every route handler receives a context object with these properties:

| Property | Type | Description |
|----------|------|-------------|
| `ctx.body` | `object` | Parsed request body |
| `ctx.params` | `object` | URL parameters (e.g., `:id`) |
| `ctx.query` | `object` | Query string parameters |
| `ctx.headers` | `object` | Request headers |
| `ctx.user` | `User \| null` | Authenticated user (if any) |
| `ctx.status` | `number` | HTTP response status code |
| `ctx.ip` | `string` | Client IP address |
| `ctx.method` | `string` | HTTP method |

## Validation
Use the built-in validation middleware with Zod schemas:

```typescript
import { z } from 'zod';
import { validate } from '@nova/core';

const userSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.string().email(),
  age: z.number().int().min(18).optional(),
});

router.post('/users', validate(userSchema), async (ctx) => {
  // ctx.body is now typed and validated
  const user = await UserService.create(ctx.body);
  return { user };
});
```

## Error Handling
NovaPlatform provides built-in error classes:

```typescript
import { NotFoundError, BadRequestError, UnauthorizedError } from '@nova/core';

router.get('/users/:id', async (ctx) => {
  const user = await UserService.findById(ctx.params.id);
  if (!user) throw new NotFoundError('User not found');
  return { user };
});
```

### Error Response Format
```json
{
  "error": {
    "code": "NOT_FOUND",
    "message": "User not found",
    "statusCode": 404,
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

## Pagination
Built-in cursor-based pagination:

```typescript
import { paginate } from '@nova/core';

router.get('/users', async (ctx) => {
  const result = await paginate(UserService, {
    limit: ctx.query.limit || 20,
    cursor: ctx.query.cursor,
    orderBy: 'createdAt',
  });
  return result; // { data: [...], nextCursor: '...', hasMore: true }
});
```

## Rate Limiting
Apply rate limiting to routes:

```typescript
import { rateLimit } from '@nova/core';

router.post('/login', rateLimit({ max: 5, window: '15m' }), async (ctx) => {
  // Max 5 attempts per 15 minutes per IP
});
```
