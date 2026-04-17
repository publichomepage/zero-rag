# Performance Optimization

## Caching
NovaPlatform has a built-in caching layer that supports Redis, in-memory, and file-based caching.

### Route-Level Caching
```typescript
import { cache } from '@nova/core';

router.get('/products', cache('5m'), async (ctx) => {
  // This response will be cached for 5 minutes
  return await ProductService.findAll();
});
```

### Manual Cache Operations
```typescript
import { cacheStore } from '@nova/core';

// Set a cached value
await cacheStore.set('user:123', userData, { ttl: 3600 });

// Get a cached value
const user = await cacheStore.get('user:123');

// Delete a cached value
await cacheStore.delete('user:123');

// Clear all cache
await cacheStore.flush();
```

### Cache Invalidation
```typescript
// Invalidate cache when data changes
router.put('/products/:id', async (ctx) => {
  const product = await ProductService.update(ctx.params.id, ctx.body);
  await cacheStore.delete(`products:${ctx.params.id}`);
  await cacheStore.deletePattern('products:list:*');
  return { product };
});
```

## Connection Pooling
Configure database connection pools for optimal performance:

```typescript
export default defineConfig({
  database: {
    pool: {
      min: 5,          // Minimum connections
      max: 20,         // Maximum connections
      idle: 10000,     // Close idle connections after 10s
      acquire: 30000,  // Max time to acquire connection
    },
  },
});
```

## Response Compression
Enable Brotli compression for smaller payloads:

```typescript
export default defineConfig({
  performance: {
    compression: {
      enabled: true,
      algorithm: 'br',      // Brotli (better ratio than gzip)
      threshold: 1024,      // Only compress responses > 1KB
      level: 4,             // Compression level (1-11)
    },
  },
});
```

## Lazy Loading
Lazy-load heavy services to improve startup time:

```typescript
import { lazy } from '@nova/core';

const ReportService = lazy(() => import('./services/report.service'));

router.get('/reports', async (ctx) => {
  const service = await ReportService();
  return service.generate();
});
```

## Database Query Optimization
Use the query analyzer to find slow queries:

```bash
nova analyze --performance
```

Output:
```
⚠️ Slow Queries Detected:
  1. SELECT * FROM orders WHERE user_id = ? (avg: 450ms)
     Suggestion: Add index on orders.user_id

  2. SELECT * FROM products (avg: 200ms)
     Suggestion: Add pagination, currently returning 10,000+ rows
```

### Adding Indexes
```typescript
// In a migration
export default class AddIndexes extends Migration {
  async up() {
    await this.addIndex('orders', ['user_id']);
    await this.addIndex('orders', ['created_at', 'status']);
  }
}
```

## CDN Integration
Configure a CDN for static assets:

```typescript
export default defineConfig({
  performance: {
    cdn: {
      enabled: true,
      provider: 'cloudflare',
      domain: 'cdn.myapp.com',
      cacheControl: 'public, max-age=31536000',
    },
  },
});
```

## Benchmarking
Profile your application:
```bash
nova benchmark --duration 30s --connections 100
```

Output:
```
Benchmark Results (30s, 100 concurrent connections):
  Requests/sec: 12,450
  Latency (avg): 8ms
  Latency (p99): 25ms
  Transfer/sec: 15.2MB
  Errors: 0
```
