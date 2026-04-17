# Getting Started with NovaPlatform

## Overview
NovaPlatform is a modern cloud-native application framework designed for building scalable microservices. It provides built-in support for service discovery, load balancing, and distributed tracing.

## Prerequisites
Before you begin, ensure you have the following installed:
- Node.js 20 or higher
- Docker Desktop 4.x
- Git 2.40+
- A NovaPlatform account (sign up at nova.dev)

## Quick Start
1. Install the CLI: `npm install -g @nova/cli`
2. Create a new project: `nova init my-app`
3. Navigate to the project: `cd my-app`
4. Start the development server: `nova dev`

Your application will be available at `http://localhost:3000`.

## Project Structure
A new NovaPlatform project has the following structure:
```
my-app/
├── src/
│   ├── services/       # Microservice definitions
│   ├── routes/          # API route handlers
│   ├── middleware/      # Custom middleware
│   └── config/          # Configuration files
├── tests/               # Test files
├── nova.config.ts       # Main configuration
└── package.json
```

## Next Steps
- Read the [Configuration Guide](configuration.md) to customize your setup
- Learn about [Authentication](authentication.md) to secure your API
- Explore the [API Reference](api-reference.md) for detailed documentation
