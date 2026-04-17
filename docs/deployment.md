# Deployment Guide

## Deployment Options
NovaPlatform supports multiple deployment targets:
- **Docker** (recommended)
- **Kubernetes**
- **AWS Lambda / Serverless**
- **Cloudflare Workers**
- **Traditional VPS (PM2)**

## Docker Deployment

### Building the Docker Image
NovaPlatform generates a Dockerfile automatically:
```bash
nova build --docker
```

This creates an optimized, multi-stage Docker image:
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN nova build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
CMD ["node", "dist/server.js"]
```

### Running with Docker Compose
```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NOVA_ENV=production
      - NOVA_DB_HOST=db
    depends_on:
      - db
      - redis

  db:
    image: postgres:16
    environment:
      POSTGRES_DB: myapp
      POSTGRES_PASSWORD: secret
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine

volumes:
  pgdata:
```

## Kubernetes Deployment
Generate Kubernetes manifests:
```bash
nova deploy --target k8s --output k8s/
```

This generates deployment, service, ingress, and HPA configurations.

### Applying to Cluster
```bash
kubectl apply -f k8s/
```

### Scaling
```bash
kubectl scale deployment my-app --replicas=5
```

## Serverless Deployment (AWS Lambda)
```bash
nova deploy --target lambda --region us-east-1
```

This automatically:
1. Bundles your application for Lambda
2. Creates the Lambda function
3. Sets up API Gateway
4. Configures environment variables

## Cloudflare Workers
```bash
nova deploy --target cloudflare
```

Requires a `wrangler.toml` configuration (generated automatically).

## CI/CD Pipeline
NovaPlatform generates CI/CD configurations:

### GitHub Actions
```bash
nova ci --provider github
```

Creates `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: nova test
      - run: nova build
      - run: nova deploy --target production
```

## Health Checks
NovaPlatform automatically exposes health check endpoints:
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check (includes DB connectivity)
- `GET /health/live` - Liveness check

## Environment Configuration
For production, set these environment variables:
```
NOVA_ENV=production
NOVA_PORT=3000
NOVA_DB_HOST=your-db-host
NOVA_DB_PASSWORD=your-db-password
NOVA_JWT_SECRET=your-production-secret
NOVA_LOG_LEVEL=warn
```
