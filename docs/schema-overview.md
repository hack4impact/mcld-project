# MCLD Platform — Full Schema Overview

```mermaid
erDiagram
    profiles {
        uuid id PK
        text first_name
        text last_name
        role role
        timestamp created_at
        timestamp updated_at
    }

    services {
        uuid id PK
        text title
        text description
        service_type type
        jsonb scheduled_at "null for coaching_session"
        int duration_minutes
        int price
        text stripe_product_id
        text stripe_default_price_id
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    service_bookings {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        booking_status status
        text notes
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    webinars {
        uuid id PK
        text title
        text description
        webinar_tier tier
        int duration_minutes
        text youtube_url
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    coaching_sessions {
        uuid id PK
        uuid service_id FK
        uuid coach_id FK
        uuid user_id FK
        timestamp scheduled_at
        int duration_minutes
        session_status status
        text meeting_url
        text notes
        jsonb selected_time_slots "array of {start, end} objects"
        timestamp created_at
        timestamp updated_at
    }

    subscriptions {
        uuid id PK
        uuid user_id FK
        text stripe_subscription_id
        text status
        text stripe_price_id
        boolean cancel_at_period_end
        text payment_method_brand
        text payment_method_last4
        timestamp created_at
        timestamp updated_at
    }

    profiles ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "booked via"
    profiles ||--o{ coaching_sessions : "coaches"
    profiles ||--o{ coaching_sessions : "attends"
    services ||--o{ coaching_sessions : "fulfilled by"
    profiles ||--o| subscriptions : "at most one"
```

## Enums

| Enum | Values |
|---|---|
| `role` | `user`, `admin`, `coach` |
| `service_type` | `coaching_session`, `booking` |
| `booking_status` | `pending`, `confirmed`, `cancelled` |
| `webinar_tier` | `free`, `premium` |
| `session_status` | `pending`, `confirmed`, `cancelled`, `completed` |
