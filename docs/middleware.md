# Middleware Guide

## Overview
Middleware in NovaPlatform are functions that execute before your route handlers. They can modify the request, response, or terminate the request early.

## Built-in Middleware

### Logger
Logs all incoming requests:
```typescript
import { logger } from '@nova/core';

app.use(logger({
  format: ':method :url :status :response-time ms',
  skip: (ctx) => ctx.path === '/health',
}));
```

### Body Parser
Parses request bodies (enabled by default):
```typescript
import { bodyParser } from '@nova/core';

app.use(bodyParser({
  json: { limit: '10mb' },
  urlencoded: { extended: true },
  multipart: { maxFileSize: '50mb' },
}));
```

### Compression
Compresses response bodies:
```typescript
import { compress } from '@nova/core';

app.use(compress({
  threshold: 1024, // Minimum size to compress (bytes)
  algorithms: ['br', 'gzip'], // Brotli first, then gzip
}));
```

### Static Files
Serve static files from a directory:
```typescript
import { serveStatic } from '@nova/core';

app.use(serveStatic('public', {
  maxAge: '1d',
  index: 'index.html',
}));
```

## Custom Middleware
Create your own middleware:

```typescript
import { Middleware } from '@nova/core';

const requestTimer: Middleware = async (ctx, next) => {
  const start = Date.now();
  await next();
  const duration = Date.now() - start;
  ctx.setHeader('X-Response-Time', `${duration}ms`);
  console.log(`${ctx.method} ${ctx.path} - ${duration}ms`);
};

app.use(requestTimer);
```

## Route-Specific Middleware
Apply middleware to specific routes:

```typescript
const adminOnly: Middleware = async (ctx, next) => {
  if (ctx.user?.role !== 'admin') {
    throw new UnauthorizedError('Admin access required');
  }
  await next();
};

router.get('/admin/dashboard', adminOnly, async (ctx) => {
  return { stats: await AdminService.getStats() };
});
```

## Middleware Order
Middleware executes in the order it's registered:
```typescript
app.use(logger());      // 1. Log the request
app.use(compress());    // 2. Setup compression
app.use(bodyParser());  // 3. Parse the body
app.use(auth());        // 4. Authenticate
app.use(rateLimit());   // 5. Check rate limits
app.use(router);        // 6. Handle the route
```

## Error Handling Middleware
```typescript
const errorHandler: Middleware = async (ctx, next) => {
  try {
    await next();
  } catch (error) {
    ctx.status = error.statusCode || 500;
    return {
      error: {
        code: error.code || 'INTERNAL_ERROR',
        message: error.message,
      },
    };
  }
};

app.use(errorHandler);
```
