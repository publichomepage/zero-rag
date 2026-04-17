# Configuration Guide

## Configuration File
NovaPlatform uses `nova.config.ts` as the main configuration file. This file is located at the root of your project.

```typescript
import { defineConfig } from '@nova/core';

export default defineConfig({
  name: 'my-app',
  port: 3000,
  environment: 'development',
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    name: 'myapp_db',
  },
  cache: {
    provider: 'redis',
    ttl: 3600,
  },
  logging: {
    level: 'info',
    format: 'json',
  },
});
```

## Environment Variables
NovaPlatform supports environment variables via `.env` files. Create a `.env` file in your project root:

```
NOVA_PORT=3000
NOVA_DB_HOST=localhost
NOVA_DB_PORT=5432
NOVA_DB_NAME=myapp_db
NOVA_DB_USER=admin
NOVA_DB_PASSWORD=secret
NOVA_REDIS_URL=redis://localhost:6379
NOVA_JWT_SECRET=your-secret-key
NOVA_LOG_LEVEL=info
```

Environment variables take precedence over values in `nova.config.ts`.

## Configuration Profiles
You can define different configurations for different environments:

```typescript
export default defineConfig({
  profiles: {
    development: {
      port: 3000,
      database: { host: 'localhost' },
    },
    staging: {
      port: 8080,
      database: { host: 'staging-db.nova.dev' },
    },
    production: {
      port: 80,
      database: { host: 'prod-db.nova.dev' },
    },
  },
});
```

Switch profiles using: `nova dev --profile staging`

## Hot Reload
By default, NovaPlatform watches for file changes and automatically reloads. You can configure this behavior:

```typescript
export default defineConfig({
  hotReload: {
    enabled: true,
    watchPaths: ['src/**/*.ts'],
    ignorePaths: ['node_modules', 'dist'],
    debounce: 300, // milliseconds
  },
});
```

## Feature Flags
NovaPlatform has a built-in feature flag system:

```typescript
export default defineConfig({
  features: {
    experimentalApi: false,
    betaDashboard: true,
    newAuthFlow: process.env.NOVA_ENV === 'staging',
  },
});
```

Access feature flags in your code:
```typescript
import { isFeatureEnabled } from '@nova/core';

if (isFeatureEnabled('betaDashboard')) {
  // Show the new dashboard
}
```
