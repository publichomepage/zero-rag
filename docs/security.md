# Security Best Practices

## Input Validation
Always validate and sanitize user input:

```typescript
import { validate, sanitize } from '@nova/core';

router.post('/comments', validate(commentSchema), sanitize(), async (ctx) => {
  // Input is validated and sanitized (XSS protection)
  const comment = await CommentService.create(ctx.body);
  return { comment };
});
```

## SQL Injection Prevention
Never interpolate user input directly into queries. Use parameterized queries:

```typescript
// ❌ DANGEROUS - SQL Injection
const users = await db.raw(`SELECT * FROM users WHERE name = '${name}'`);

// ✅ SAFE - Parameterized query
const users = await db('users').where('name', name);

// ✅ SAFE - Raw with bindings
const users = await db.raw('SELECT * FROM users WHERE name = ?', [name]);
```

## CORS Configuration
Configure CORS properly for production:
```typescript
export default defineConfig({
  security: {
    cors: {
      origin: process.env.NOVA_ALLOWED_ORIGINS?.split(',') || [],
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
      maxAge: 86400,
    },
  },
});
```

## Helmet Headers
NovaPlatform automatically sets security headers via Helmet:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Strict-Transport-Security: max-age=31536000`
- `Content-Security-Policy: default-src 'self'`

## Rate Limiting
Protect against brute force and DDoS:

```typescript
export default defineConfig({
  security: {
    rateLimit: {
      global: { max: 100, window: '1m' },
      routes: {
        '/login': { max: 5, window: '15m' },
        '/api/*': { max: 50, window: '1m' },
      },
    },
  },
});
```

## Secrets Management
Never commit secrets to version control:
1. Use environment variables for all secrets
2. Use `nova secrets` CLI for encrypted secrets
3. Rotate JWT secrets periodically
4. Use different secrets for each environment

```bash
nova secrets set JWT_SECRET "my-production-secret" --env production
nova secrets set DB_PASSWORD "strong-password" --env production
```

## Dependency Auditing
Regularly audit dependencies for vulnerabilities:
```bash
nova audit          # Check for known vulnerabilities
nova audit --fix    # Auto-fix where possible
```

## HTTPS
Always use HTTPS in production. NovaPlatform can handle TLS termination:
```typescript
export default defineConfig({
  security: {
    https: {
      enabled: process.env.NOVA_ENV === 'production',
      cert: '/path/to/cert.pem',
      key: '/path/to/key.pem',
    },
  },
});
```
