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

    children {
        uuid id PK
        uuid parent_id FK
        gender gender
        text first_name
        text last_name
        date dob
        text allergies
        text medical_conditions
        text medications
        timestamp created_at
        timestamp updated_at
    }

    emergency_contacts {
        uuid id PK
        uuid child_id FK
        text full_name
        text email_address
        text phone_number
        text relationship
        timestamp created_at
        timestamp updated_at
    }

    extra_questions {
        uuid id PK
        uuid service_id FK
        extra_question_type type
        text prompt
        jsonb options
        timestamp created_at
        timestamp updated_at
    }

    extra_question_answers {
        uuid id PK
        uuid extra_question_id FK
        uuid child_id FK
        text answer "text[]"
        timestamp created_at
        timestamp updated_at
    }

    profiles ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "booked via"
    profiles ||--o{ coaching_sessions : "coaches"
    profiles ||--o{ coaching_sessions : "attends"
    services ||--o{ coaching_sessions : "fulfilled by"
    profiles ||--o{ children : "parent of"
    children ||--o{ emergency_contacts : "has"
    services ||--o{ extra_questions : "defines"
    extra_questions ||--o{ extra_question_answers : "answered via"
    children ||--o{ extra_question_answers : "submits"
```

## Enums

| Enum | Values |
|---|---|
| `role` | `user`, `admin`, `coach` |
| `service_type` | `coaching_session`, `booking` |
| `booking_status` | `pending`, `confirmed`, `cancelled` |
| `webinar_tier` | `free`, `premium` |
| `session_status` | `pending`, `confirmed`, `cancelled`, `completed` |
| `gender` | `male`, `female`, `prefer_not_to_say` |
| `extra_question_type` | `text`, `multiple_choices`, `checkboxes`, `user_agreement` |
