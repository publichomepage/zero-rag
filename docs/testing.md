# Testing Guide

## Overview
NovaPlatform includes a built-in testing framework based on Vitest with additional utilities for testing microservices, APIs, and database operations.

## Running Tests
```bash
nova test              # Run all tests
nova test --watch      # Run in watch mode
nova test --coverage   # Generate coverage report
nova test --filter auth  # Run tests matching "auth"
```

## Unit Tests
Create test files alongside your source files with the `.test.ts` extension:

```typescript
// src/services/user.service.test.ts
import { describe, it, expect } from '@nova/test';
import { UserService } from './user.service';

describe('UserService', () => {
  it('should create a user', async () => {
    const user = await UserService.create({
      name: 'Alice',
      email: 'alice@example.com',
    });

    expect(user.id).toBeDefined();
    expect(user.name).toBe('Alice');
    expect(user.email).toBe('alice@example.com');
  });

  it('should throw on duplicate email', async () => {
    await UserService.create({ name: 'Alice', email: 'alice@example.com' });

    await expect(
      UserService.create({ name: 'Bob', email: 'alice@example.com' })
    ).rejects.toThrow('Email already exists');
  });
});
```

## API Integration Tests
Use the built-in HTTP test client:

```typescript
import { describe, it, expect, createTestApp } from '@nova/test';

describe('Auth API', () => {
  const app = createTestApp();

  it('should login with valid credentials', async () => {
    const response = await app.post('/login').send({
      email: 'alice@example.com',
      password: 'password123',
    });

    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it('should reject invalid credentials', async () => {
    const response = await app.post('/login').send({
      email: 'alice@example.com',
      password: 'wrong',
    });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe('INVALID_CREDENTIALS');
  });
});
```

## Database Testing
NovaPlatform provides a test database that resets between tests:

```typescript
import { describe, it, expect, useTestDb } from '@nova/test';

describe('Database Operations', () => {
  useTestDb(); // Automatically migrates, seeds, and cleans up

  it('should query users', async () => {
    const users = await db('users').where('active', true);
    expect(users).toHaveLength(2); // From seed data
  });
});
```

## Mocking
Built-in mocking utilities:

```typescript
import { mock, spy } from '@nova/test';

// Mock an external service
const emailService = mock(EmailService, {
  send: async () => ({ delivered: true }),
});

// Spy on a method
const logSpy = spy(console, 'log');
expect(logSpy).toHaveBeenCalledWith('User created');
```

## Snapshot Testing
```typescript
it('should return consistent user response', async () => {
  const response = await app.get('/users/1');
  expect(response.body).toMatchSnapshot();
});
```

## Performance Testing
```typescript
import { benchmark } from '@nova/test';

benchmark('UserService.findAll', async () => {
  await UserService.findAll();
}, { iterations: 1000, maxTime: '5s' });
```

## Test Coverage
Generate coverage reports:
```bash
nova test --coverage
```

Coverage thresholds are configured in `nova.config.ts`:
```typescript
export default defineConfig({
  testing: {
    coverage: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
  },
});
```
