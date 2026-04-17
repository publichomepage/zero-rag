# Troubleshooting Guide

## Common Issues

### Port Already in Use
**Error**: `EADDRINUSE: address already in use :::3000`

**Solution**: Kill the process using port 3000:
```bash
# macOS/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

Or change the port in `nova.config.ts` or use `nova dev --port 3001`.

### Database Connection Failed
**Error**: `ECONNREFUSED 127.0.0.1:5432`

**Solution**:
1. Ensure PostgreSQL is running: `pg_isready`
2. Check connection settings in `.env`
3. Verify credentials: `psql -U admin -d myapp_db`
4. If using Docker: `docker compose up db`

### Migration Failures
**Error**: `Migration failed: relation "users" already exists`

**Solution**:
```bash
nova db migrate:rollback
nova db migrate:status  # Check which migrations are applied
nova db migrate         # Re-run migrations
```

### Memory Issues
**Error**: `JavaScript heap out of memory`

**Solution**: Increase Node.js memory limit:
```bash
NODE_OPTIONS="--max-old-space-size=4096" nova dev
```

### CORS Errors
**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**: Configure CORS in `nova.config.ts`:
```typescript
export default defineConfig({
  cors: {
    origin: ['http://localhost:4200', 'https://myapp.com'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});
```

### SSL/TLS Certificate Errors
**Error**: `self-signed certificate`

**Solution for development**:
```typescript
export default defineConfig({
  database: {
    ssl: {
      rejectUnauthorized: false, // Only for development!
    },
  },
});
```

### Slow Startup
If your application takes too long to start:
1. Check for circular dependencies: `nova analyze --circular`
2. Lazy-load heavy services
3. Use connection pooling for databases
4. Reduce the number of eager-loaded modules

## Getting Help
- **Documentation**: https://docs.nova.dev
- **Discord**: https://discord.gg/novaplatform
- **GitHub Issues**: https://github.com/novaplatform/nova/issues
- **Stack Overflow**: Tag your questions with `novaplatform`
