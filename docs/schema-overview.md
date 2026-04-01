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
        uuid scheduling_id
        int duration_minutes
        int price
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }

    service_schedules {
        uuid id PK
        uuid service_id FK
        jsonb data
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

    services ||--o| service_schedules : "has schedule"
    profiles ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "booked via"
    profiles ||--o{ coaching_sessions : "coaches"
    profiles ||--o{ coaching_sessions : "attends"
    services ||--o{ coaching_sessions : "fulfilled by"
```

## Enums

| Enum | Values |
|---|---|
| `role` | `user`, `admin`, `coach` |
| `service_type` | `coaching_session`, `booking` |
| `booking_status` | `pending`, `confirmed`, `cancelled` |
| `webinar_tier` | `free`, `premium` |
| `session_status` | `pending`, `confirmed`, `cancelled`, `completed` |
