# Services, Schedules & Service Bookings Tables

## Services

The central catalog of offerings on the platform. Two types:
- **`booking`** — a bookable service; has an associated `service_schedules` row (via `scheduling_id`).
- **`coaching_session`** — a coaching offering; `scheduling_id` is null — the scheduling is handled through the `coaching_sessions` table.

```mermaid
erDiagram
    services {
        uuid id PK
        text title
        text description
        service_type type "coaching_session | booking"
        uuid scheduling_id "null for coaching_session"
        int duration_minutes
        int price "in cents"
        boolean is_active
        timestamp created_at
    }
```

## Service Schedules

Holds the scheduling data for `booking`-type services. Format of `data` is TBD.

```mermaid
erDiagram
    service_schedules {
        uuid id PK
        uuid service_id FK
        jsonb data "scheduling format TBD"
        timestamp created_at
        timestamp updated_at
    }
```

## Service Bookings

A user's booking of a service.

```mermaid
erDiagram
    service_bookings {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        booking_status status "pending | confirmed | cancelled"
        text notes
        boolean is_active
        timestamp created_at
    }

    services ||--o| service_schedules : "has schedule"
    services ||--o{ service_bookings : "booked via"
```

## Notes

- `price` is stored in **cents** (integer) to avoid floating-point issues.
- `is_active = false` hides a service without deleting historical bookings.
- `scheduling_id` is a soft reference to `service_schedules.id` — cascade is handled from `service_schedules.service_id → services.id`.
