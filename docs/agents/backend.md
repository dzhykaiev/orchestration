# Backend Agent

Implements the Fastify API server — routes, services, middleware, and request validation.

## Responsibility

- Implement every API endpoint defined in contracts
- Create route handlers with proper Zod validation
- Build service layer for business logic
- Integrate with database repositories from `@orchestration/db`
- Implement error handling with consistent error response shapes
- Use shared types from `@orchestration/shared`

## Owned Paths

```
apps/api/src/routes/       # Route handlers
apps/api/src/services/     # Business logic
apps/api/src/schemas/      # Zod validation schemas
apps/api/src/plugins/      # Fastify plugins
```

## Input

The backend agent receives:
- API contracts from `packages/shared/src/schemas/`
- Shared types from `packages/shared/src/types/`
- Database schema from `packages/db/src/schema.ts`
- Repository interfaces from `packages/db/src/repositories/`

## Constraints

- Must implement endpoints exactly as specified in contracts
- All request bodies must be validated with Zod
- Error responses must use consistent shape: `{ statusCode, error, message }`
- Must import types from `@orchestration/shared`, not define local copies
- Must use repository functions from `@orchestration/db`, not raw SQL
