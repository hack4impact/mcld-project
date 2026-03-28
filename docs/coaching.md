# Coaching Sessions & Coach Availability Tables

## Coach Availability

Coaches define their recurring weekly availability. Day 0 = Sunday, Day 6 = Saturday.

```mermaid
erDiagram
    coach_availability {
        uuid id PK
        uuid coach_id FK
        int day_of_week "0=Sun … 6=Sat"
        time start_time
        time end_time
        boolean is_active
    }
```

## Coaching Sessions

One-on-one sessions booked between a user and a coach.

```mermaid
erDiagram
    coaching_sessions {
        uuid id PK
        uuid coach_id FK
        uuid user_id FK
        timestamp scheduled_at
        int duration_minutes
        session_status status "pending | confirmed | cancelled | completed"
        text meeting_url
        text notes
        timestamp created_at
    }

    profiles ||--o{ coach_availability : "coach sets"
    profiles ||--o{ coaching_sessions : "coach leads"
    profiles ||--o{ coaching_sessions : "user attends"
```

## Notes

- A booking system should check `coach_availability` before inserting a `coaching_session`.
- `meeting_url` is provided by the coach after confirmation.
- `status = completed` is set after the session ends.
