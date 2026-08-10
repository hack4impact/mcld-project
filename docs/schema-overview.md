# MCLD Platform — Full Schema Overview

```mermaid
erDiagram
    profiles {
        uuid id PK
        text first_name
        text last_name
        role role
        text stripe_customer_id
        timestamp last_login_at
        timestamp created_at
        timestamp updated_at
    }

    forms {
        uuid id PK
        text name
        timestamp created_at
        timestamp updated_at
    }

    services {
        uuid id PK
        service_type type
        date start_date "null for private_lessons"
        date end_date "null for private_lessons"
        jsonb slots "array of {dayOfWeek, time}; null for private_lessons"
        int duration_minutes
        text stripe_product_id
        service_status status
        uuid coach_id FK "null for programs"
        uuid form_id FK "nullable"
        boolean is_for_children
        timestamp created_at
        timestamp updated_at
    }

    service_bookings {
        uuid id PK
        uuid user_id FK
        uuid service_id FK
        uuid child_id FK "nullable; null means adult registration"
        booking_status status
        text notes
        boolean is_active
        text stripe_order_id
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
        uuid child_id FK "nullable; null means adult registration"
        timestamp scheduled_at "set when slot is confirmed"
        session_status status
        text meeting_url
        text notes
        jsonb selected_time_slots "array of {start, end} objects"
        jsonb coach_time_slots
        text coach_token
        text client_token
        text stripe_order_id
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

    purchases {
        uuid id PK
        uuid user_id FK
        text stripe_price_id
        text stripe_session_id
        text product_name
        int amount
        text currency
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

    form_questions {
        uuid id PK
        uuid form_id FK
        form_question_type type
        text prompt
        jsonb options
        int sort_order
        timestamp created_at
        timestamp updated_at
    }

    form_question_answers {
        uuid id PK
        uuid form_question_id FK
        uuid child_id FK
        text answer "text[]"
        timestamp created_at
        timestamp updated_at
    }

    profiles ||--o{ service_bookings : "books"
    services ||--o{ service_bookings : "booked via"
    children |o--o{ service_bookings : "registered for"
    profiles ||--o{ coaching_sessions : "coaches"
    profiles ||--o{ coaching_sessions : "attends"
    services ||--o{ coaching_sessions : "fulfilled by"
    children |o--o{ coaching_sessions : "registered for"
    profiles ||--o{ children : "parent of"
    children ||--o{ emergency_contacts : "has"
    profiles ||--o| subscriptions : "has"
    profiles ||--o{ purchases : "makes"
    profiles |o--o{ services : "coaches"
    forms ||--o{ form_questions : "contains"
    services }o--o| forms : "uses"
    form_questions ||--o{ form_question_answers : "answered via"
    children ||--o{ form_question_answers : "submits"
```

## Indexes

| Table | Index | Type | Condition |
|---|---|---|---|
| `service_bookings` | `service_bookings_service_id_child_id_idx` | Unique (partial) | `WHERE child_id IS NOT NULL` — prevents the same child from registering for the same program twice |

## Enums

| Enum | Values |
|---|---|
| `role` | `user`, `admin`, `coach` |
| `service_type` | `private_lessons`, `programs` |
| `service_status` | `active`, `disabled`, `archived`, `deleted` |
| `booking_status` | `awaiting_payment`, `pending`, `confirmed`, `cancelled` |
| `session_status` | `awaiting_payment`, `pending`, `confirmed`, `cancelled`, `completed` |
| `webinar_tier` | `free`, `premium` |
| `gender` | `male`, `female`, `prefer_not_to_say` |
| `form_question_type` | `text`, `multiple_choices`, `checkboxes`, `user_agreement` |
