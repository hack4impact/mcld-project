# Webinars Table

Online video content hosted on the platform. Two tiers:
- **`free`** — accessible to all users.
- **`premium`** — accessible to active subscribers only.

```mermaid
erDiagram
    webinars {
        uuid id PK
        text title
        text description
        webinar_tier tier "free | premium"
        int duration_minutes
        text youtube_url
        boolean is_active
        timestamp created_at
        timestamp updated_at
    }
```

## Notes

- Access is determined by the user's subscription status, not registration — there is no sign-up flow.
- `youtube_url` is the link to the YouTube video.
- `is_active = false` hides a webinar without deleting it.
