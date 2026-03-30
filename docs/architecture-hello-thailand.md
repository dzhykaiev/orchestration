# Architecture: Привіт Тайланд

## Goal
Display "Привіт Тайланд" greeting with an interactive button on the web frontend.

## Design

### Frontend (apps/web)
- New page at `/thailand` with:
  - Large heading: "Привіт Тайланд"
  - Interactive button that triggers a greeting action
  - Button click calls API endpoint and displays response
- Reusable `ThailandGreeting` component in `apps/web/src/components/`
- Link in main layout navigation

### API (apps/api)
- `GET /api/greetings/thailand` — returns greeting message with timestamp
- Response: `{ message: "Привіт Тайланд!", timestamp: string }`
- Zod schema validation for response

### Data Layer
- No DB changes needed — stateless greeting

## Tech Stack (existing)
- Next.js 15 + React 19 (frontend)
- Fastify 5 (API)
- TypeScript 5.7

## Component Diagram

```
[Browser] → [Next.js /thailand page]
                  ↓ button click
            [GET /api/greetings/thailand]
                  ↓
            [Fastify handler] → { message, timestamp }
```
