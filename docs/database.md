# Database Guide

## Supported Databases
NovaPlatform supports the following databases:
- **PostgreSQL** (recommended for production)
- **MySQL** 8.0+
- **SQLite** (for development and testing)
- **MongoDB** (via the NoSQL adapter)

## Configuration
Configure your database in `nova.config.ts`:

```typescript
export default defineConfig({
  database: {
    type: 'postgres',
    host: process.env.NOVA_DB_HOST || 'localhost',
    port: parseInt(process.env.NOVA_DB_PORT || '5432'),
    name: process.env.NOVA_DB_NAME || 'myapp',
    user: process.env.NOVA_DB_USER || 'admin',
    password: process.env.NOVA_DB_PASSWORD || '',
    pool: {
      min: 2,
      max: 10,
    },
    ssl: process.env.NODE_ENV === 'production',
  },
});
```

## Models
Define your data models using the Nova ORM:

```typescript
import { Model, column, relation } from '@nova/orm';

class User extends Model {
  static tableName = 'users';

  @column({ primaryKey: true })
  id: string;

  @column()
  name: string;

  @column({ unique: true })
  email: string;

  @column({ type: 'timestamp', default: 'now()' })
  createdAt: Date;

  @relation('hasMany', () => Post)
  posts: Post[];
}
```

## Migrations
NovaPlatform includes a migration system for database schema changes.

### Creating Migrations
```bash
nova db migrate:create add-users-table
```

This creates a new migration file:
```typescript
// migrations/20250115_add_users_table.ts
import { Migration } from '@nova/orm';

export default class AddUsersTable extends Migration {
  async up() {
    await this.createTable('users', (table) => {
      table.uuid('id').primaryKey().defaultRandom();
      table.string('name').notNull();
      table.string('email').unique().notNull();
      table.timestamp('created_at').defaultNow();
    });
  }

  async down() {
    await this.dropTable('users');
  }
}
```

### Running Migrations
```bash
nova db migrate        # Run pending migrations
nova db migrate:rollback  # Rollback last migration
nova db migrate:status    # Show migration status
```

## Seeding
Create seed files for test data:

```bash
nova db seed:create users
```

```typescript
// seeds/users.ts
import { Seed } from '@nova/orm';

export default class UsersSeed extends Seed {
  async run() {
    await this.insert('users', [
      { name: 'Alice', email: 'alice@example.com' },
      { name: 'Bob', email: 'bob@example.com' },
    ]);
  }
}
```

Run seeds: `nova db seed`

## Query Builder
NovaPlatform provides a fluent query builder:

```typescript
import { db } from '@nova/orm';

// Simple queries
const users = await db('users').where('active', true).orderBy('name').limit(10);

// Complex queries
const result = await db('orders')
  .join('users', 'orders.user_id', 'users.id')
  .where('orders.total', '>', 100)
  .whereNotNull('orders.shipped_at')
  .select('users.name', 'orders.total', 'orders.shipped_at')
  .groupBy('users.name')
  .having('SUM(orders.total)', '>', 500);
```

## Transactions
Use transactions for atomic operations:

```typescript
import { db } from '@nova/orm';

await db.transaction(async (trx) => {
  const user = await trx('users').insert({ name: 'Alice', email: 'alice@example.com' });
  await trx('wallets').insert({ userId: user.id, balance: 0 });
  await trx('audit_log').insert({ action: 'user_created', userId: user.id });
});
```
