# Profiles Table

Mirrors Supabase `auth.users` — populated via a database trigger on signup. Stores display data and the user's role within the platform.

```mermaid
erDiagram
    profiles {
        uuid id PK "references auth.users(id)"
        text first_name
        text last_name
        role role "user | admin | coach"
        timestamp created_at
        timestamp updated_at
    }
```

## Notes

- `id` is **not** auto-generated — it is set to the corresponding `auth.users.id` from Supabase Auth.
- `role` controls access: `user` is a regular member, `coach` can manage and lead sessions, `admin` has full access.
