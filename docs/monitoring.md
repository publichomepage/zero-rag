# Monitoring and Observability

## Built-in Metrics
NovaPlatform automatically collects and exposes metrics:

### HTTP Metrics
- Request count by method and status code
- Response time percentiles (p50, p95, p99)
- Active connections count
- Request body size
- Response body size

### System Metrics
- CPU usage
- Memory usage (heap, RSS)
- Event loop lag
- Garbage collection frequency

## Metrics Endpoint
Metrics are exposed at `GET /metrics` in Prometheus format:
```
# HELP http_requests_total Total number of HTTP requests
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200",path="/api/users"} 1234
http_requests_total{method="POST",status="201",path="/api/users"} 56

# HELP http_request_duration_seconds HTTP request duration
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01"} 890
http_request_duration_seconds_bucket{le="0.05"} 1100
http_request_duration_seconds_bucket{le="0.1"} 1200
```

## Configuration
```typescript
export default defineConfig({
  monitoring: {
    metrics: {
      enabled: true,
      path: '/metrics',
      includeDefaults: true,
    },
    tracing: {
      enabled: true,
      provider: 'opentelemetry',
      exporters: ['jaeger'],
      sampleRate: 0.1, // Sample 10% of requests
    },
    healthCheck: {
      enabled: true,
      path: '/health',
      checks: ['database', 'redis', 'disk'],
    },
  },
});
```

## Distributed Tracing
NovaPlatform integrates with OpenTelemetry for distributed tracing:

```typescript
import { trace } from '@nova/core';

router.get('/users/:id', async (ctx) => {
  const span = trace.startSpan('fetchUser');
  try {
    const user = await UserService.findById(ctx.params.id);
    span.setAttributes({ userId: user.id });
    return { user };
  } finally {
    span.end();
  }
});
```

## Alerting
Configure alerts based on metrics:

```typescript
export default defineConfig({
  monitoring: {
    alerts: [
      {
        name: 'high-error-rate',
        condition: 'rate(http_5xx_total[5m]) > 0.05',
        channels: ['slack', 'pagerduty'],
      },
      {
        name: 'slow-response',
        condition: 'http_request_duration_p99 > 2s',
        channels: ['slack'],
      },
    ],
  },
});
```

## Logging
Structured logging with context:

```typescript
import { log } from '@nova/core';

log.info('User created', { userId: user.id, email: user.email });
log.warn('Rate limit approaching', { ip: ctx.ip, count: 95 });
log.error('Payment failed', { orderId, error: err.message });
```

Log levels: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

## Grafana Dashboard
NovaPlatform provides a pre-built Grafana dashboard:
```bash
nova monitoring dashboard --export grafana
```

This generates a JSON dashboard file that you can import into Grafana.
