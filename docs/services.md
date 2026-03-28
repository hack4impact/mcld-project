# Services & Service Bookings Tables

## Services

Represents offerings on the platform. Two types:
- **`preset`** — fixed date/time set by admin; `scheduled_at` is populated.
- **`user_scheduling`** — user picks their own slot; `scheduled_at` on the service is null, the chosen time is on `service_bookings.scheduled_at`.

```mermaid
erDiagram
    services {
        uuid id PK
        text title
        text description
        service_type type "preset | user_scheduling"
        timestamp scheduled_at "null for user_scheduling"
        int duration_minutes
        int price "in cents"
        boolean is_active
        timestamp created_at
    }

    service_bookings {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        timestamp scheduled_at "null for preset services"
        booking_status status "pending | confirmed | cancelled"
        text notes
        timestamp created_at
    }

    services ||--o{ service_bookings : "has bookings"
```

## Notes

- `price` is stored in **cents** (integer) to avoid floating-point issues.
- `is_active = false` hides a service without deleting historical bookings.
