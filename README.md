# City Connect API

NestJS backend scaffold optimized for scale using:
- NestJS + TypeScript
- PostgreSQL + Drizzle ORM
- Redis (search/result cache)
- Cloudinary image upload middleware
- Structured logging + request IDs
- Dockerized DB infrastructure
- Feature modules aligned to MVP: directory, messaging, favorites, and advisories

## Quick Start

1. Copy env and set secrets.

```bash
cp .env.example .env
```

2. Start dependencies.

```bash
docker compose up -d
```

3. Install packages.

```bash
npm install
```

4. Push schema to local Postgres.

```bash
npm run drizzle:push
```

5. Run API.

```bash
npm run start:dev
```

## API Endpoints

- `GET /api/v1/health`
- `POST /api/v1/users`
- `GET /api/v1/users/:id`
- `GET /api/v1/users?search=<text>&page=1&pageSize=10`
- `POST /api/v1/users/:id/avatar` (`multipart/form-data`, file key: `photo`)
- `POST /api/v1/auth/register-establishment`
- `POST /api/v1/auth/register-lgu-admin`
- `POST /api/v1/auth/login`
- `GET /api/v1/admin/dashboard` (LGU admin JWT)
- `POST /api/v1/establishments`
- `GET /api/v1/establishments`
- `GET /api/v1/establishments/mine` (establishment/LGU JWT)
- `PATCH /api/v1/establishments/:id/verify`
- `PATCH /api/v1/establishments/:id/status`
- `POST /api/v1/establishments/:id/cover-photo` (`multipart/form-data`, file key: `photo`)
- `POST /api/v1/messages/guest` (no auth, requires `fullName` + `email` or `phone`)
- `GET /api/v1/messages/guest-thread` (public guest polling using signed conversation token)
- `POST /api/v1/messages/reply` (establishment/LGU JWT)
- `GET /api/v1/messages/guest-conversation` (establishment/LGU JWT)
- `GET /api/v1/messages/conversations` (establishment/LGU JWT)
- `POST /api/v1/favorites`
- `GET /api/v1/favorites?userId=<uuid>&page=1&pageSize=20`
- `DELETE /api/v1/favorites/:id`
- `POST /api/v1/announcements`
- `GET /api/v1/announcements?city=<city>&limit=20`
- `POST /api/v1/reports`
- `GET /api/v1/reports?status=open&limit=20`
- `PATCH /api/v1/reports/:id/resolve`
- `POST /api/v1/reviews`
- `GET /api/v1/reviews?establishmentId=<uuid>&sort=recent&page=1&pageSize=10`
- Swagger docs: `GET /api/v1/docs`

## LGU Admin Essential APIs

- `POST /api/v1/auth/login`
- `GET /api/v1/admin/dashboard`
- `GET /api/v1/establishments?listingStatus=pending&page=1&pageSize=30`
- `PATCH /api/v1/establishments/:id/verify`
- `GET /api/v1/reports?status=open&limit=100`
- `PATCH /api/v1/reports/:id/resolve`
- `GET /api/v1/announcements?city=<city>&limit=30`
- `POST /api/v1/announcements`
- `GET /api/v1/health`

Detailed contract: `docs/lgu-admin-api-contract.md`

## Folder Design

```text
src/
  common/
    cloudinary/
    config/
    constants/
    database/
      repositories/base.repository.ts
      schema/
    filters/
    interceptors/
    logger/
    redis/
  modules/
    announcements/
    auth/
    establishments/
    favorites/
    health/
    messages/
    reports/
    reviews/
    users/
      dto/
      repositories/
```

## Repository Pattern

- `base.repository.ts`: common CRUD/query helpers.
- Module repositories (example: `users.repository.ts`): domain-specific custom queries.

## Important Additions Included

- Global validation pipe (`class-validator`)
- Global exception filter
- Request/response timing logs with request ID
- Health endpoint checks for PostgreSQL and Redis
- Caching strategy for search-heavy endpoint
- `base.repository` + per-module custom repositories
- JWT auth + role-based guards for establishment and LGU admin
- Socket.IO real-time chat namespace at `/chat`
- Public guest-thread polling endpoint for inquiry follow-up
- Public reviews module with summaries and anonymous visitor support

## Real-Time Chat (Socket.IO)

- Namespace: `/chat`
- Handshake auth: send JWT in `auth.token` (or `Authorization: Bearer <token>`)
- Allowed websocket roles: `establishment`, `lgu_admin`
- Event `joinEstablishmentInbox`: `{ establishmentId }`
- Event `joinGuestConversation`: `{ establishmentId, guestEmail?, guestPhone? }`
- Event `leaveGuestConversation`: `{ establishmentId, guestEmail?, guestPhone? }`
- Server emits `message.new` when guest/establishment sends a message
- Server emits `message.sent` with `{ clientRequestId?, message }`
- Server emits `message.failed` with `{ clientRequestId?, establishmentId, reason, at }`

## Notes for Scaling

- Add modules under `src/modules/*` using the same repository/service/controller split.
- Keep reusable infra in `src/common/*`.
- For larger workloads, move cache key logic to dedicated cache adapters per module.
- Introduce queue processing (BullMQ) for heavy background tasks.
