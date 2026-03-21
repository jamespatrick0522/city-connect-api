# LGU Admin API Contract

Base URL: `/api/v1`  
Auth: `Authorization: Bearer <jwt>` for protected endpoints.

## Authentication

- `POST /auth/login`
  - Body: `{ "email": "admin@city.gov", "password": "********" }`
  - Access: `public`
  - Returns: `{ accessToken, tokenType, user }`

## Dashboard

- `GET /admin/dashboard?city=<optional>&recentLimit=5`
  - Access: `lgu_admin`
  - Returns: aggregated metrics + recent pending establishments, open reports, and announcements.

## Establishment Moderation

- `GET /establishments?listingStatus=pending&search=&city=&page=1&pageSize=30`
  - Access: `public` (LGU admin consumes this for moderation UI)
  - Returns: paginated list

- `PATCH /establishments/:id/verify`
  - Access: `lgu_admin`
  - Body: `{ "listingStatus": "verified" }` or `{ "listingStatus": "rejected" }`
  - Returns: updated establishment

## Reports Moderation

- `GET /reports?status=open&limit=100`
  - Access: `lgu_admin`
  - Returns: report list

- `PATCH /reports/:id/resolve`
  - Access: `lgu_admin`
  - Body: `{}`
  - Returns: resolved report row

## Announcements / Advisories

- `GET /announcements?city=<optional>&limit=30`
  - Access: `public`
  - Returns: active announcements

- `POST /announcements`
  - Access: `lgu_admin`
  - Body:
    - `city` (string)
    - `title` (string)
    - `content` (string)
    - `startsAt` (optional ISO date-time)
    - `endsAt` (optional ISO date-time)
  - Returns: created announcement

## Ops / Monitoring

- `GET /health`
  - Access: `public`
  - Returns: API/DB/Redis readiness

