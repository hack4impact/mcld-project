# MCLD Platform — Full Schema Overview

```mermaid
erDiagram
    profiles {
        uuid id PK
        text first_name
        text last_name
        text avatar_url
        role role
        timestamp created_at
        timestamp updated_at
    }

    services {
        uuid id PK
        text title
        text description
        service_type type
        timestamp scheduled_at
        int duration_minutes
        int price
        boolean is_active
        timestamp created_at
    }

    service_bookings {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        timestamp scheduled_at
        booking_status status
        text notes
        timestamp created_at
    }

    webinars {
        uuid id PK
        text title
        text description
        webinar_tier tier
        timestamp scheduled_at
        int duration_minutes
        text meeting_url
        int max_seats
        int price
        boolean is_active
        timestamp created_at
    }

    webinar_registrations {
        uuid id PK
        uuid user_id FK
        uuid webinar_id FK
        timestamp registered_at
    }

    coaching_sessions {
        uuid id PK
        uuid coach_id FK
        uuid user_id FK
        timestamp scheduled_at
        int duration_minutes
        session_status status
        text meeting_url
        text notes
        timestamp created_at
    }

    coach_availability {
        uuid id PK
        uuid coach_id FK
        int day_of_week
        time start_time
        time end_time
        boolean is_active
    }

    profiles ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "has"
    profiles ||--o{ webinar_registrations : "registers"
    webinars ||--o{ webinar_registrations : "has"
    profiles ||--o{ coaching_sessions : "coaches"
    profiles ||--o{ coaching_sessions : "attends"
    profiles ||--o{ coach_availability : "sets"
```

## Enums

| Enum | Values |
|---|---|
| `role` | `user`, `admin`, `coach` |
| `service_type` | `preset`, `user_scheduling` |
| `booking_status` | `pending`, `confirmed`, `cancelled` |
| `webinar_tier` | `free`, `premium` |
| `session_status` | `pending`, `confirmed`, `cancelled`, `completed` |
