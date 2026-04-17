# Authentication

## Overview
NovaPlatform provides a comprehensive authentication system supporting JWT tokens, OAuth 2.0, API keys, and session-based authentication.

## JWT Authentication (Default)
JWT is the default authentication method. To enable it:

```typescript
// nova.config.ts
export default defineConfig({
  auth: {
    provider: 'jwt',
    secret: process.env.NOVA_JWT_SECRET,
    expiresIn: '24h',
    refreshToken: {
      enabled: true,
      expiresIn: '7d',
    },
  },
});
```

### Login Endpoint
```typescript
// src/routes/auth.ts
import { router, auth } from '@nova/core';

router.post('/login', async (ctx) => {
  const { email, password } = ctx.body;
  const user = await auth.authenticate(email, password);
  const token = auth.generateToken(user);
  return { token, user };
});
```

### Protecting Routes
Use the `@authenticated` decorator or middleware:

```typescript
import { router, authenticated } from '@nova/core';

router.get('/profile', authenticated(), async (ctx) => {
  return ctx.user; // Automatically populated
});
```

## OAuth 2.0
NovaPlatform supports OAuth 2.0 with popular providers:

```typescript
export default defineConfig({
  auth: {
    oauth: {
      google: {
        clientId: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackUrl: '/auth/google/callback',
      },
      github: {
        clientId: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackUrl: '/auth/github/callback',
      },
    },
  },
});
```

## API Key Authentication
For service-to-service communication:

```typescript
router.get('/api/data', apiKey(), async (ctx) => {
  // Request must include X-API-Key header
  return { data: 'secure' };
});
```

Generate API keys via CLI: `nova auth create-key --name "my-service"`

## Role-Based Access Control (RBAC)
Define roles and permissions:

```typescript
export default defineConfig({
  auth: {
    roles: {
      admin: ['read', 'write', 'delete', 'manage-users'],
      editor: ['read', 'write'],
      viewer: ['read'],
    },
  },
});
```

Use in routes:
```typescript
router.delete('/users/:id', authorized('manage-users'), async (ctx) => {
  await UserService.delete(ctx.params.id);
  return { success: true };
});
```

## Password Hashing
NovaPlatform uses bcrypt by default with a cost factor of 12:
```typescript
import { auth } from '@nova/core';
const hash = await auth.hashPassword('my-password');
const isValid = await auth.verifyPassword('my-password', hash);
```
