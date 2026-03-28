# Webinars & Webinar Registrations Tables

## Webinars

Online events that platform members can register for. Two tiers:
- **`free`** — open to all users; `price` is `0`.
- **`premium`** — requires payment; `price` > `0`.

```mermaid
erDiagram
    webinars {
        uuid id PK
        text title
        text description
        webinar_tier tier "free | premium"
        timestamp scheduled_at
        int duration_minutes
        text meeting_url
        int max_seats "null = unlimited"
        int price "in cents; 0 for free"
        boolean is_active
        timestamp created_at
    }

    webinar_registrations {
        uuid id PK
        uuid user_id FK
        uuid webinar_id FK
        timestamp registered_at
    }

    webinars ||--o{ webinar_registrations : "has registrations"
```

## Notes

- `max_seats = null` means unlimited capacity.
- `meeting_url` can be a Zoom/Google Meet link, added before the event starts.
- `is_active = false` hides a webinar without losing registration history.
