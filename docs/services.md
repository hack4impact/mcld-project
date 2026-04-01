# Services & Service Bookings Tables

## Services

The central catalog of offerings on the platform. Two types:
- **`booking`** — a fixed event with predetermined time slots set by the admin. Users buy it like a product with no input on timing. `scheduled_at` holds the time slots as a JSON array.
- **`coaching_session`** — a coaching offering where the user proposes availability. `scheduled_at` is null — timing is handled through the `coaching_sessions` table.

```mermaid
erDiagram
    services {
        uuid id PK
        text title
        text description
        service_type type "coaching_session | booking"
        jsonb scheduled_at "array of {start, end} objects — null for coaching_session"
        int duration_minutes
        int price "in cents"
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
```

## Service Bookings

A user's purchase of a booking-type service.

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
        timestamp updated_at
    }

    services ||--o{ service_bookings : "booked via"
```

## Notes

- `price` is stored in **cents** (integer) to avoid floating-point issues.
- `is_active = false` hides a service without deleting historical bookings.
- `scheduled_at` is a JSON array of `{ start, end }` ISO 8601 objects e.g. `[{ "start": "2026-04-15T14:00:00Z", "end": "2026-04-15T16:00:00Z" }]`.
