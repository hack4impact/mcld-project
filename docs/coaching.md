# Coaching Sessions Table

One-on-one sessions booked between a user and a coach. Linked to a `coaching_session`-type entry in `services`.

```mermaid
erDiagram
    coaching_sessions {
        uuid id PK
        uuid service_id FK
        uuid coach_id FK
        uuid user_id FK
        timestamp scheduled_at "null until a slot is confirmed"
        int duration_minutes
        session_status status "pending | confirmed | cancelled | completed"
        text meeting_url
        text notes
        time[] selected_time_slots
        timestamp created_at
    }

    profiles ||--o{ coaching_sessions : "coach leads"
    profiles ||--o{ coaching_sessions : "user attends"
    services ||--o{ coaching_sessions : "fulfilled by"
```

## Notes

- `scheduled_at` is null by default — it is set once the user selects a specific slot from `selected_time_slots`.
- `selected_time_slots` holds the time options offered to the user before a slot is confirmed.
- `meeting_url` is provided by the coach after confirmation.
- `status = completed` is set after the session ends.
- Coach availability is not managed by a separate table — coaches do not set recurring availability.
