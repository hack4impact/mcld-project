# Webinars & Webinar Registrations Tables

## Webinars

Online events that platform members can register for. Two tiers:
- **`free`** — open to all users.
- **`premium`** — restricted access.

```mermaid
erDiagram
    webinars {
        uuid id PK
        text title
        text description
        webinar_tier tier "free | premium"
        int duration_minutes
        text meeting_url
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

- `meeting_url` can be a Zoom/Google Meet link, added before the event starts.
- `is_active = false` hides a webinar without losing registration history.
