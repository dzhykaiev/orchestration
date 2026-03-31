# Data Agent

Designs and implements the data layer — PostgreSQL schema, migrations, and repository pattern.

## Responsibility

- Define database schema using Drizzle ORM
- Create migration files
- Implement repository pattern for all entities
- Add proper indexes on foreign keys and commonly queried fields
- Ensure every table has `created_at` and `updated_at` timestamps

## Owned Paths

```
packages/db/src/schema.ts         # Schema definition (source of truth)
packages/db/src/repositories/     # Repository implementations
packages/db/src/client.ts         # Database connection
packages/db/drizzle/              # Migration files
```

## Technology

- **ORM**: Drizzle ORM 0.39+
- **Driver**: postgres.js
- **Database**: PostgreSQL 16

## Constraints

- Schema must be defined in a single file (`schema.ts`)
- Every table must have `id` (UUID), `created_at`, `updated_at`
- All foreign keys must have indexes
- JSONB columns for semi-structured data (deliverables, metadata, etc.)
- Repository functions must be stateless and composable
- Repositories are the only way to access the database — no raw SQL in apps
